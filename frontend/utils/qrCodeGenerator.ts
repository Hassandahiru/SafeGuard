import { Alert, Linking, Platform } from 'react-native';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import { captureRef } from 'react-native-view-shot';

export interface VisitorQRData {
  visitorId: string;
  visitorName: string;
  hostId: string;
  hostName: string;
  visitDate: string;
  visitTime?: string;
  sixDigitCode: string;
  purpose?: string;
  phoneNumber?: string;
}

export interface QRCodeResult {
  success: boolean;
  error?: string;
  data?: any;
}

class QRCodeGenerator {
  /**
   * Generate QR code data string from visitor information
   */
  generateQRData(visitorData: VisitorQRData): string {
    const qrData = {
      type: 'SAFEGUARD_VISITOR',
      version: '1.0',
      visitorId: visitorData.visitorId,
      visitorName: visitorData.visitorName,
      hostId: visitorData.hostId,
      hostName: visitorData.hostName,
      visitDate: visitorData.visitDate,
      visitTime: visitorData.visitTime,
      sixDigitCode: visitorData.sixDigitCode,
      purpose: visitorData.purpose,
      timestamp: new Date().toISOString(),
    };

    return JSON.stringify(qrData);
  }

  /**
   * Capture QR code component as image
   */
  async captureQRCodeImage(qrRef: any): Promise<string> {
    try {
      if (!qrRef) {
        throw new Error('QR Code reference is null');
      }

      const uri = await captureRef(qrRef, {
        format: 'png',
        quality: 1.0,
        result: 'tmpfile',
      });

      return uri;
    } catch (error) {
      console.error('Failed to capture QR code image:', error);
      throw new Error('Failed to capture QR code image');
    }
  }

  /**
   * Share QR code using device's native sharing
   */
  async shareQRCode(imageUri: string, title: string = 'Visitor QR Code'): Promise<QRCodeResult> {
    try {
      if (!(await Sharing.isAvailableAsync())) {
        return {
          success: false,
          error: 'Sharing is not available on this device',
        };
      }

      await Sharing.shareAsync(imageUri, {
        mimeType: 'image/png',
        dialogTitle: title,
        UTI: 'public.png',
      });

      return { success: true };
    } catch (error) {
      console.error('Failed to share QR code:', error);
      return {
        success: false,
        error: error.message || 'Failed to share QR code',
      };
    }
  }

  /**
   * Save QR code to device's photo library
   */
  async saveQRCodeToDevice(imageUri: string, fileName: string): Promise<string> {
    try {
      // Request permissions
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        throw new Error('Permission to access media library denied');
      }

      // Create a permanent file path
      const documentsDir = FileSystem.documentDirectory;
      const fileUri = `${documentsDir}${fileName}.png`;

      // Copy the image to a permanent location
      await FileSystem.copyAsync({
        from: imageUri,
        to: fileUri,
      });

      // Save to media library
      const asset = await MediaLibrary.createAssetAsync(fileUri);
      
      // Create album if it doesn't exist
      let album = await MediaLibrary.getAlbumAsync('SafeGuard QR Codes');
      if (!album) {
        album = await MediaLibrary.createAlbumAsync('SafeGuard QR Codes', asset, false);
      } else {
        await MediaLibrary.addAssetsToAlbumAsync([asset], album, false);
      }

      return asset.uri;
    } catch (error) {
      console.error('Failed to save QR code to device:', error);
      throw new Error('Failed to save QR code to device');
    }
  }

  /**
   * Open WhatsApp with pre-filled message
   */
  async openWhatsAppWithMessage(phoneNumber: string, message: string): Promise<QRCodeResult> {
    try {
      // Clean phone number (remove non-digits except +)
      const cleanNumber = phoneNumber.replace(/[^\d+]/g, '');
      
      // Encode message for URL
      const encodedMessage = encodeURIComponent(message);
      
      // Create WhatsApp URL
      const whatsappUrl = `whatsapp://send?phone=${cleanNumber}&text=${encodedMessage}`;
      
      // Check if WhatsApp is installed
      const canOpen = await Linking.canOpenURL(whatsappUrl);
      if (!canOpen) {
        return {
          success: false,
          error: 'WhatsApp is not installed on this device',
        };
      }

      // Open WhatsApp
      await Linking.openURL(whatsappUrl);
      
      return { success: true };
    } catch (error) {
      console.error('Failed to open WhatsApp:', error);
      return {
        success: false,
        error: error.message || 'Failed to open WhatsApp',
      };
    }
  }

  /**
   * Generate a formatted message for sharing visitor QR code
   */
  generateQRMessage(visitorData: VisitorQRData): string {
    return `🎫 *SafeGuard Visitor Invitation*

👤 *Visitor:* ${visitorData.visitorName}
🏠 *Host:* ${visitorData.hostName}
📅 *Date:* ${visitorData.visitDate}${visitorData.visitTime ? ` at ${visitorData.visitTime}` : ''}
🔑 *6-Digit Code:* ${visitorData.sixDigitCode}
${visitorData.purpose ? `📝 *Purpose:* ${visitorData.purpose}` : ''}

Please show this QR code at the security gate along with a valid ID.

⏰ *Valid for 24 hours from generation*
🏢 *Powered by SafeGuard*`;
  }

  /**
   * Parse QR code data back to visitor information
   */
  parseQRData(qrDataString: string): VisitorQRData | null {
    try {
      const qrData = JSON.parse(qrDataString);
      
      // Validate QR code structure
      if (qrData.type !== 'SAFEGUARD_VISITOR' || !qrData.version) {
        return null;
      }

      return {
        visitorId: qrData.visitorId,
        visitorName: qrData.visitorName,
        hostId: qrData.hostId,
        hostName: qrData.hostName,
        visitDate: qrData.visitDate,
        visitTime: qrData.visitTime,
        sixDigitCode: qrData.sixDigitCode,
        purpose: qrData.purpose,
      };
    } catch (error) {
      console.error('Failed to parse QR code data:', error);
      return null;
    }
  }

  /**
   * Validate if QR code is still valid (within 24 hours)
   */
  isQRCodeValid(qrDataString: string): boolean {
    try {
      const qrData = JSON.parse(qrDataString);
      const timestamp = new Date(qrData.timestamp);
      const now = new Date();
      const hoursDiff = (now.getTime() - timestamp.getTime()) / (1000 * 60 * 60);
      
      return hoursDiff <= 24;
    } catch (error) {
      console.error('Failed to validate QR code:', error);
      return false;
    }
  }
}

export const qrCodeGenerator = new QRCodeGenerator();