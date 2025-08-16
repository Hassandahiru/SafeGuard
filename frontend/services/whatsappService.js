import * as Linking from 'expo-linking';
import * as Sharing from 'expo-sharing';
import { Alert, Platform } from 'react-native';

export const whatsappService = {
  // Check if WhatsApp is installed
  isWhatsAppInstalled: async () => {
    try {
      const whatsappURL = Platform.OS === 'ios' ? 'whatsapp://' : 'whatsapp://send';
      const canOpen = await Linking.canOpenURL(whatsappURL);
      return canOpen;
    } catch (error) {
      console.error('Error checking WhatsApp installation:', error);
      return false;
    }
  },

  // Send visitor invitation via WhatsApp
  sendVisitorInvitation: async (phoneNumber, visitorData) => {
    try {
      const isInstalled = await whatsappService.isWhatsAppInstalled();
      
      if (!isInstalled) {
        Alert.alert(
          'WhatsApp Not Found',
          'WhatsApp is not installed on this device. Would you like to use SMS instead?',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Use SMS', onPress: () => whatsappService.sendViaSMS(phoneNumber, visitorData) },
          ]
        );
        return { success: false, error: 'WhatsApp not installed' };
      }

      // Format phone number for WhatsApp
      const formattedPhone = whatsappService.formatPhoneNumber(phoneNumber);
      
      // Create invitation message
      const message = whatsappService.createInvitationMessage(visitorData);
      
      // Create WhatsApp URL
      const whatsappURL = `whatsapp://send?phone=${formattedPhone}&text=${encodeURIComponent(message)}`;
      
      // Open WhatsApp
      const canOpen = await Linking.canOpenURL(whatsappURL);
      if (canOpen) {
        await Linking.openURL(whatsappURL);
        return { success: true, method: 'whatsapp' };
      } else {
        throw new Error('Cannot open WhatsApp');
      }
    } catch (error) {
      console.error('Failed to send WhatsApp invitation:', error);
      Alert.alert('Error', 'Failed to send WhatsApp message. Please try again.');
      return { success: false, error: error.message };
    }
  },

  // Send QR code image via WhatsApp
  sendQRCodeViaWhatsApp: async (phoneNumber, qrImageUri, visitorData) => {
    try {
      const isInstalled = await whatsappService.isWhatsAppInstalled();
      
      if (!isInstalled) {
        Alert.alert('WhatsApp Not Found', 'WhatsApp is not installed on this device.');
        return { success: false, error: 'WhatsApp not installed' };
      }

      // First, share the QR code image
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(qrImageUri, {
          mimeType: 'image/png',
          dialogTitle: 'Share QR Code via WhatsApp',
        });
        
        // Then send the invitation message
        setTimeout(() => {
          whatsappService.sendVisitorInvitation(phoneNumber, visitorData);
        }, 1000);
        
        return { success: true, method: 'whatsapp_with_qr' };
      } else {
        // Fallback to text-only message
        return await whatsappService.sendVisitorInvitation(phoneNumber, visitorData);
      }
    } catch (error) {
      console.error('Failed to send QR via WhatsApp:', error);
      return { success: false, error: error.message };
    }
  },

  // Send bulk invitations for events
  sendBulkInvitations: async (contacts, eventData) => {
    try {
      const results = [];
      
      for (const contact of contacts) {
        if (contact.primaryPhone) {
          const result = await whatsappService.sendEventInvitation(
            contact.primaryPhone,
            contact.name,
            eventData
          );
          results.push({ contact: contact.name, ...result });
          
          // Add delay between messages to avoid spam detection
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
      
      return {
        success: true,
        results,
        totalSent: results.filter(r => r.success).length,
        totalFailed: results.filter(r => !r.success).length,
      };
    } catch (error) {
      console.error('Failed to send bulk invitations:', error);
      return { success: false, error: error.message };
    }
  },

  // Send event invitation
  sendEventInvitation: async (phoneNumber, guestName, eventData) => {
    try {
      const formattedPhone = whatsappService.formatPhoneNumber(phoneNumber);
      const message = whatsappService.createEventInvitationMessage(guestName, eventData);
      
      const whatsappURL = `whatsapp://send?phone=${formattedPhone}&text=${encodeURIComponent(message)}`;
      
      const canOpen = await Linking.canOpenURL(whatsappURL);
      if (canOpen) {
        await Linking.openURL(whatsappURL);
        return { success: true, method: 'whatsapp' };
      } else {
        throw new Error('Cannot open WhatsApp');
      }
    } catch (error) {
      console.error('Failed to send event invitation:', error);
      return { success: false, error: error.message };
    }
  },

  // Fallback to SMS
  sendViaSMS: async (phoneNumber, visitorData) => {
    try {
      const message = whatsappService.createInvitationMessage(visitorData);
      const smsURL = `sms:${phoneNumber}?body=${encodeURIComponent(message)}`;
      
      const canOpen = await Linking.canOpenURL(smsURL);
      if (canOpen) {
        await Linking.openURL(smsURL);
        return { success: true, method: 'sms' };
      } else {
        throw new Error('Cannot open SMS');
      }
    } catch (error) {
      console.error('Failed to send SMS:', error);
      return { success: false, error: error.message };
    }
  },

  // Format phone number for WhatsApp
  formatPhoneNumber: (phoneNumber) => {
    if (!phoneNumber) return '';
    
    // Remove all non-numeric characters
    const cleaned = phoneNumber.replace(/\D/g, '');
    
    // Add country code if missing (assuming US +1 for now)
    if (cleaned.length === 10) {
      return '1' + cleaned;
    }
    
    // Remove leading + if present, WhatsApp expects just numbers
    return cleaned.startsWith('1') ? cleaned : '1' + cleaned;
  },

  // Create invitation message
  createInvitationMessage: (visitorData) => {
    const {
      hostName,
      visitorName,
      visitDate,
      visitTime,
      address,
      qrCode,
      sixDigitCode,
      purpose,
    } = visitorData;

    return `🏠 VISITOR INVITATION

Hi ${visitorName}!

You're invited to visit ${hostName}

📅 Date: ${visitDate}
⏰ Time: ${visitTime || 'TBD'}
📍 Address: ${address || 'Address will be shared separately'}
🎯 Purpose: ${purpose || 'Visit'}

🔐 Your access codes:
${qrCode ? `🔲 QR Code: ${qrCode}` : ''}
${sixDigitCode ? `🔢 6-Digit Code: ${sixDigitCode}` : ''}

Please show this message and your QR code to security at the gate.

Have a great visit! 👋`;
  },

  // Create event invitation message
  createEventInvitationMessage: (guestName, eventData) => {
    const {
      eventName,
      hostName,
      eventDate,
      eventTime,
      address,
      description,
      eventCode,
    } = eventData;

    return `🎉 EVENT INVITATION

Hi ${guestName}!

You're invited to: ${eventName}
Hosted by: ${hostName}

📅 Date: ${eventDate}
⏰ Time: ${eventTime}
📍 Venue: ${address || 'Address will be shared separately'}

${description ? `📝 Details: ${description}` : ''}

🔐 Event Access Code: ${eventCode}

Please mention this code at the gate: #${eventCode}

Looking forward to seeing you there! 🎊`;
  },
};