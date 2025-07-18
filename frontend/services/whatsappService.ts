import { Linking, Alert } from 'react-native';
import * as Sharing from 'expo-sharing';
import { qrCodeGenerator, VisitorQRData } from '../utils/qrCodeGenerator';

export interface WhatsAppResult {
  success: boolean;
  error?: string;
}

class WhatsAppService {
  /**
   * Send QR code via WhatsApp with image and message
   */
  async sendQRCodeViaWhatsApp(
    phoneNumber: string,
    qrImageUri: string,
    visitorData: VisitorQRData
  ): Promise<WhatsAppResult> {
    try {
      // Generate message
      const message = qrCodeGenerator.generateQRMessage(visitorData);
      
      // First, try to share the image
      const shareResult = await this.shareQRImageToWhatsApp(qrImageUri);
      
      if (shareResult.success) {
        // After sharing image, open WhatsApp with the message
        setTimeout(async () => {
          await qrCodeGenerator.openWhatsAppWithMessage(phoneNumber, message);
        }, 1000);
        
        return { success: true };
      } else {
        // Fallback: just send the message without image
        return await qrCodeGenerator.openWhatsAppWithMessage(phoneNumber, message);
      }
    } catch (error) {
      console.error('Failed to send QR code via WhatsApp:', error);
      return {
        success: false,
        error: error.message || 'Failed to send QR code via WhatsApp',
      };
    }
  }

  /**
   * Share QR code image to WhatsApp specifically
   */
  async shareQRImageToWhatsApp(imageUri: string): Promise<WhatsAppResult> {
    try {
      if (!(await Sharing.isAvailableAsync())) {
        return {
          success: false,
          error: 'Sharing is not available on this device',
        };
      }

      await Sharing.shareAsync(imageUri, {
        mimeType: 'image/png',
        dialogTitle: 'Share QR Code via WhatsApp',
        UTI: 'public.png',
      });

      return { success: true };
    } catch (error) {
      console.error('Failed to share QR image to WhatsApp:', error);
      return {
        success: false,
        error: error.message || 'Failed to share QR image',
      };
    }
  }

  /**
   * Send text message via WhatsApp
   */
  async sendTextMessage(phoneNumber: string, message: string): Promise<WhatsAppResult> {
    return await qrCodeGenerator.openWhatsAppWithMessage(phoneNumber, message);
  }

  /**
   * Send visitor invitation via WhatsApp (text only)
   */
  async sendVisitorInvitation(
    phoneNumber: string,
    visitorData: VisitorQRData
  ): Promise<WhatsAppResult> {
    const message = qrCodeGenerator.generateQRMessage(visitorData);
    return await this.sendTextMessage(phoneNumber, message);
  }

  /**
   * Check if WhatsApp is installed
   */
  async isWhatsAppInstalled(): Promise<boolean> {
    try {
      const whatsappUrl = 'whatsapp://';
      return await Linking.canOpenURL(whatsappUrl);
    } catch (error) {
      console.error('Failed to check WhatsApp installation:', error);
      return false;
    }
  }

  /**
   * Send emergency alert via WhatsApp
   */
  async sendEmergencyAlert(
    phoneNumbers: string[],
    emergencyData: {
      type: string;
      location: string;
      timestamp: string;
      description?: string;
    }
  ): Promise<WhatsAppResult> {
    try {
      const message = `🚨 *EMERGENCY ALERT - SafeGuard*

⚠️ *Type:* ${emergencyData.type}
📍 *Location:* ${emergencyData.location}
🕐 *Time:* ${emergencyData.timestamp}
${emergencyData.description ? `📝 *Details:* ${emergencyData.description}` : ''}

Please respond immediately.
This is an automated emergency notification from SafeGuard.`;

      // Send to all phone numbers
      const results = await Promise.allSettled(
        phoneNumbers.map(phone => this.sendTextMessage(phone, message))
      );

      // Check if at least one message was sent successfully
      const successCount = results.filter(
        result => result.status === 'fulfilled' && result.value.success
      ).length;

      if (successCount > 0) {
        return { success: true };
      } else {
        return {
          success: false,
          error: 'Failed to send emergency alert to any recipients',
        };
      }
    } catch (error) {
      console.error('Failed to send emergency alert:', error);
      return {
        success: false,
        error: error.message || 'Failed to send emergency alert',
      };
    }
  }

  /**
   * Clean and format phone number for WhatsApp
   */
  formatPhoneNumber(phoneNumber: string): string {
    // Remove all non-digit characters except +
    let cleaned = phoneNumber.replace(/[^\d+]/g, '');
    
    // If doesn't start with +, assume it's missing country code
    if (!cleaned.startsWith('+')) {
      // Add default country code if needed (you can customize this)
      cleaned = '+1' + cleaned;
    }
    
    return cleaned;
  }

  /**
   * Validate phone number format
   */
  isValidPhoneNumber(phoneNumber: string): boolean {
    // Basic validation for international phone numbers
    const phoneRegex = /^\+?[1-9]\d{1,14}$/;
    const cleaned = phoneNumber.replace(/[^\d+]/g, '');
    return phoneRegex.test(cleaned);
  }
}

export const whatsappService = new WhatsAppService();