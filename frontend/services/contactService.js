import * as Contacts from 'expo-contacts';
import { Alert } from 'react-native';

export const contactService = {
  // Request contact permissions
  requestPermissions: async () => {
    try {
      const { status } = await Contacts.requestPermissionsAsync();
      return status === 'granted';
    } catch (error) {
      console.error('Failed to request contact permissions:', error);
      return false;
    }
  },

  // Check if we have contact permissions
  hasPermissions: async () => {
    try {
      const { status } = await Contacts.getPermissionsAsync();
      return status === 'granted';
    } catch (error) {
      console.error('Failed to check contact permissions:', error);
      return false;
    }
  },

  // Get all contacts
  getAllContacts: async () => {
    try {
      const hasPermission = await contactService.hasPermissions();
      if (!hasPermission) {
        const granted = await contactService.requestPermissions();
        if (!granted) {
          Alert.alert(
            'Permission Required',
            'Contact access is required to select visitors from your contacts.',
            [{ text: 'OK' }]
          );
          return [];
        }
      }

      const { data } = await Contacts.getContactsAsync({
        fields: [
          Contacts.Fields.Name,
          Contacts.Fields.PhoneNumbers,
          Contacts.Fields.Emails,
        ],
        sort: Contacts.SortTypes.FirstName,
      });

      // Format contacts for our app
      return data.map(contact => ({
        id: contact.id,
        name: contact.name || 'Unknown',
        phoneNumbers: contact.phoneNumbers?.map(phone => phone.number) || [],
        emails: contact.emails?.map(email => email.email) || [],
        // Take first phone and email for primary contact
        primaryPhone: contact.phoneNumbers?.[0]?.number || '',
        primaryEmail: contact.emails?.[0]?.email || '',
      }));
    } catch (error) {
      console.error('Failed to get contacts:', error);
      Alert.alert('Error', 'Failed to load contacts. Please try again.');
      return [];
    }
  },

  // Search contacts by name
  searchContacts: async (searchQuery) => {
    try {
      const allContacts = await contactService.getAllContacts();
      
      if (!searchQuery.trim()) {
        return allContacts;
      }

      const query = searchQuery.toLowerCase();
      return allContacts.filter(contact =>
        contact.name.toLowerCase().includes(query) ||
        contact.phoneNumbers.some(phone => phone.includes(query)) ||
        contact.emails.some(email => email.toLowerCase().includes(query))
      );
    } catch (error) {
      console.error('Failed to search contacts:', error);
      return [];
    }
  },

  // Format phone number for WhatsApp
  formatPhoneForWhatsApp: (phoneNumber) => {
    if (!phoneNumber) return '';
    
    // Remove all non-numeric characters
    const cleaned = phoneNumber.replace(/\D/g, '');
    
    // Add country code if missing (assuming US +1 for now)
    // You may want to add country detection logic here
    if (cleaned.length === 10) {
      return '1' + cleaned;
    }
    
    // Remove leading + if present
    return cleaned.startsWith('1') ? cleaned : '1' + cleaned;
  },
};