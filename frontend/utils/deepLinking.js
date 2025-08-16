import * as Linking from 'expo-linking';
import { Alert } from 'react-native';

export const deepLinking = {
  // Configure deep linking URL scheme
  urlScheme: 'visitorapp',
  
  // Create deep link for visitor validation
  createVisitorLink: (visitorData) => {
    const params = {
      type: 'visitor',
      id: visitorData.visitorId,
      code: visitorData.sixDigitCode,
      host: visitorData.hostName,
      date: visitorData.visitDate,
    };
    
    const queryString = Object.keys(params)
      .map(key => `${key}=${encodeURIComponent(params[key])}`)
      .join('&');
    
    return `${deepLinking.urlScheme}://validate?${queryString}`;
  },

  // Create deep link for event access
  createEventLink: (eventData) => {
    const params = {
      type: 'event',
      id: eventData.eventId,
      code: eventData.eventCode,
      host: eventData.hostName,
      date: eventData.eventDate,
    };
    
    const queryString = Object.keys(params)
      .map(key => `${key}=${encodeURIComponent(params[key])}`)
      .join('&');
    
    return `${deepLinking.urlScheme}://event?${queryString}`;
  },

  // Handle incoming deep links
  handleDeepLink: (url) => {
    try {
      const parsed = Linking.parse(url);
      const { hostname, queryParams } = parsed;
      
      switch (hostname) {
        case 'validate':
          return deepLinking.handleVisitorValidation(queryParams);
        case 'event':
          return deepLinking.handleEventAccess(queryParams);
        default:
          console.warn('Unknown deep link type:', hostname);
          return null;
      }
    } catch (error) {
      console.error('Failed to parse deep link:', error);
      return null;
    }
  },

  // Handle visitor validation deep link
  handleVisitorValidation: (params) => {
    const { type, id, code, host, date } = params;
    
    if (type === 'visitor' && id && code) {
      return {
        action: 'validate_visitor',
        data: {
          visitorId: id,
          code,
          hostName: host,
          visitDate: date,
        },
      };
    }
    
    return null;
  },

  // Handle event access deep link
  handleEventAccess: (params) => {
    const { type, id, code, host, date } = params;
    
    if (type === 'event' && id && code) {
      return {
        action: 'access_event',
        data: {
          eventId: id,
          eventCode: code,
          hostName: host,
          eventDate: date,
        },
      };
    }
    
    return null;
  },

  // Initialize deep link listener
  initialize: (handleDeepLinkCallback) => {
    // Handle app launch from deep link
    Linking.getInitialURL().then(url => {
      if (url) {
        const result = deepLinking.handleDeepLink(url);
        if (result) {
          handleDeepLinkCallback(result);
        }
      }
    });

    // Handle deep links when app is already running
    const subscription = Linking.addEventListener('url', ({ url }) => {
      const result = deepLinking.handleDeepLink(url);
      if (result) {
        handleDeepLinkCallback(result);
      }
    });

    return subscription;
  },

  // Open external WhatsApp with pre-filled message
  openWhatsAppWithMessage: async (phoneNumber, message) => {
    try {
      const formattedPhone = phoneNumber.replace(/\D/g, '');
      const whatsappURL = `whatsapp://send?phone=${formattedPhone}&text=${encodeURIComponent(message)}`;
      
      const canOpen = await Linking.canOpenURL(whatsappURL);
      if (canOpen) {
        await Linking.openURL(whatsappURL);
        return true;
      } else {
        Alert.alert('Error', 'WhatsApp is not installed on this device');
        return false;
      }
    } catch (error) {
      console.error('Failed to open WhatsApp:', error);
      Alert.alert('Error', 'Failed to open WhatsApp');
      return false;
    }
  },

  // Open phone dialer
  openPhoneDialer: async (phoneNumber) => {
    try {
      const phoneURL = `tel:${phoneNumber}`;
      const canOpen = await Linking.canOpenURL(phoneURL);
      
      if (canOpen) {
        await Linking.openURL(phoneURL);
        return true;
      } else {
        Alert.alert('Error', 'Cannot open phone dialer');
        return false;
      }
    } catch (error) {
      console.error('Failed to open phone dialer:', error);
      return false;
    }
  },

  // Open email client
  openEmailClient: async (email, subject = '', body = '') => {
    try {
      const emailURL = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      const canOpen = await Linking.canOpenURL(emailURL);
      
      if (canOpen) {
        await Linking.openURL(emailURL);
        return true;
      } else {
        Alert.alert('Error', 'Cannot open email client');
        return false;
      }
    } catch (error) {
      console.error('Failed to open email client:', error);
      return false;
    }
  },

  // Open maps with address
  openMaps: async (address) => {
    try {
      const encodedAddress = encodeURIComponent(address);
      const mapsURL = `maps://app?q=${encodedAddress}`;
      const googleMapsURL = `https://maps.google.com/?q=${encodedAddress}`;
      
      const canOpenMaps = await Linking.canOpenURL(mapsURL);
      
      if (canOpenMaps) {
        await Linking.openURL(mapsURL);
      } else {
        await Linking.openURL(googleMapsURL);
      }
      return true;
    } catch (error) {
      console.error('Failed to open maps:', error);
      Alert.alert('Error', 'Failed to open maps');
      return false;
    }
  },
};