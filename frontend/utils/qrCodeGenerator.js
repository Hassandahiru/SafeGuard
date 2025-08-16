import { captureRef } from 'react-native-view-shot';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

export const qrCodeGenerator = {
  // Generate QR code data string
  generateQRData: (visitorData) => {
    const {
      visitorId,
      visitorName,
      hostId,
      hostName,
      visitDate,
      visitTime,
      sixDigitCode,
      purpose,
    } = visitorData;

    // Create structured QR data
    const qrData = {
      type: 'visitor_invitation',
      version: '1.0',
      visitorId,
      visitorName,
      hostId,
      hostName,
      visitDate,
      visitTime,
      code: sixDigitCode,
      purpose,
      timestamp: new Date().toISOString(),
    };

    return JSON.stringify(qrData);
  },

  // Generate event QR code data
  generateEventQRData: (eventData) => {
    const {
      eventId,
      eventName,
      hostId,
      hostName,
      eventDate,
      eventTime,
      eventCode,
      maxGuests,
    } = eventData;

    const qrData = {
      type: 'event_invitation',
      version: '1.0',
      eventId,
      eventName,
      hostId,
      hostName,
      eventDate,
      eventTime,
      eventCode,
      maxGuests,
      timestamp: new Date().toISOString(),
    };

    return JSON.stringify(qrData);
  },

  // Generate short URL for QR code (if you have a URL shortener service)
  generateShortURL: async (qrData) => {
    try {
      // This would connect to your backend URL shortener
      // For now, return a mock short URL
      const baseURL = 'https://visit.app/v/';
      const shortCode = Math.random().toString(36).substring(2, 8);
      return `${baseURL}${shortCode}`;
    } catch (error) {
      console.error('Failed to generate short URL:', error);
      return null;
    }
  },

  // Capture QR code as image
  captureQRCodeImage: async (qrCodeRef) => {
    try {
      const uri = await captureRef(qrCodeRef, {
        format: 'png',
        quality: 1.0,
        result: 'tmpfile',
      });
      return uri;
    } catch (error) {
      console.error('Failed to capture QR code image:', error);
      throw error;
    }
  },

  // Save QR code to device
  saveQRCodeToDevice: async (imageUri, filename = 'visitor_qr_code') => {
    try {
      const documentDirectory = FileSystem.documentDirectory;
      const fileUri = `${documentDirectory}${filename}.png`;
      
      await FileSystem.copyAsync({
        from: imageUri,
        to: fileUri,
      });
      
      return fileUri;
    } catch (error) {
      console.error('Failed to save QR code:', error);
      throw error;
    }
  },

  // Share QR code image
  shareQRCode: async (imageUri, message) => {
    try {
      const isAvailable = await Sharing.isAvailableAsync();
      
      if (!isAvailable) {
        throw new Error('Sharing is not available on this device');
      }

      await Sharing.shareAsync(imageUri, {
        mimeType: 'image/png',
        dialogTitle: 'Share Visitor QR Code',
        UTI: 'public.png',
      });

      return { success: true };
    } catch (error) {
      console.error('Failed to share QR code:', error);
      return { success: false, error: error.message };
    }
  },

  // Generate 6-digit code
  generate6DigitCode: () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
  },

  // Generate alphanumeric code for events
  generateEventCode: (eventName) => {
    const prefix = eventName
      .toUpperCase()
      .replace(/[^A-Z]/g, '')
      .substring(0, 3);
    
    const suffix = Math.floor(1000 + Math.random() * 9000).toString();
    
    return `${prefix}${suffix}`;
  },

  // Validate QR code data
  validateQRData: (qrDataString) => {
    try {
      const qrData = JSON.parse(qrDataString);
      
      // Check required fields
      const requiredFields = ['type', 'version'];
      const hasRequiredFields = requiredFields.every(field => qrData[field]);
      
      if (!hasRequiredFields) {
        return { valid: false, error: 'Missing required fields' };
      }

      // Check if QR code is expired (24 hours for visitor, custom for events)
      const timestamp = new Date(qrData.timestamp);
      const now = new Date();
      const hoursOld = (now - timestamp) / (1000 * 60 * 60);
      
      if (qrData.type === 'visitor_invitation' && hoursOld > 24) {
        return { valid: false, error: 'QR code has expired' };
      }

      return { valid: true, data: qrData };
    } catch (error) {
      return { valid: false, error: 'Invalid QR code format' };
    }
  },

  // Create downloadable QR flyer
  createQRFlyer: async (qrCodeUri, visitorData) => {
    try {
      // This would create a styled flyer with QR code and visitor details
      // For now, return the QR code URI
      // In a full implementation, you'd use libraries like react-native-svg
      // or send data to a backend service that generates styled images
      
      return {
        success: true,
        flyerUri: qrCodeUri,
        message: 'QR flyer created successfully',
      };
    } catch (error) {
      console.error('Failed to create QR flyer:', error);
      return { success: false, error: error.message };
    }
  },
};