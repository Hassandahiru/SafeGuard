import * as Contacts from 'expo-contacts';
import { Alert, Platform } from 'react-native';

export interface Contact {
  id: string;
  name: string;
  phoneNumbers: string[];
  emails: string[];
  primaryPhone: string;
  primaryEmail: string;
}

class ContactService {
  private cachedContacts: Contact[] = [];
  private permissionGranted: boolean = false;

  /**
   * Request permission to access device contacts
   */
  async requestPermission(): Promise<boolean> {
    try {
      const { status } = await Contacts.requestPermissionsAsync();
      this.permissionGranted = status === 'granted';
      return this.permissionGranted;
    } catch (error) {
      console.error('Failed to request contacts permission:', error);
      return false;
    }
  }

  /**
   * Check if contacts permission is granted
   */
  async hasPermission(): Promise<boolean> {
    try {
      const { status } = await Contacts.getPermissionsAsync();
      this.permissionGranted = status === 'granted';
      return this.permissionGranted;
    } catch (error) {
      console.error('Failed to check contacts permission:', error);
      return false;
    }
  }

  /**
   * Get all contacts from device
   */
  async getAllContacts(): Promise<Contact[]> {
    try {
      // Check permission first
      if (!(await this.hasPermission())) {
        const granted = await this.requestPermission();
        if (!granted) {
          Alert.alert(
            'Permission Required',
            'This app needs access to your contacts to help you select visitors.',
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Settings', onPress: () => this.openSettings() }
            ]
          );
          return [];
        }
      }

      // Get contacts from device
      const { data } = await Contacts.getContactsAsync({
        fields: [
          Contacts.Fields.Name,
          Contacts.Fields.PhoneNumbers,
          Contacts.Fields.Emails,
        ],
        sort: Contacts.SortTypes.FirstName,
      });

      // Transform contacts to our format
      const transformedContacts: Contact[] = data
        .filter(contact => contact.name && contact.phoneNumbers?.length > 0)
        .map(contact => {
          const phoneNumbers = contact.phoneNumbers?.map(phone => phone.number || '') || [];
          const emails = contact.emails?.map(email => email.email || '') || [];

          return {
            id: contact.id,
            name: contact.name || 'Unknown',
            phoneNumbers: phoneNumbers.filter(phone => phone.length > 0),
            emails: emails.filter(email => email.length > 0),
            primaryPhone: phoneNumbers[0] || '',
            primaryEmail: emails[0] || '',
          };
        })
        .filter(contact => contact.primaryPhone.length > 0);

      // Cache contacts
      this.cachedContacts = transformedContacts;
      return transformedContacts;

    } catch (error) {
      console.error('Failed to get contacts:', error);
      Alert.alert('Error', 'Failed to load contacts. Please try again.');
      return [];
    }
  }

  /**
   * Search contacts by name or phone number
   */
  searchContacts(query: string, contacts: Contact[] = this.cachedContacts): Contact[] {
    if (!query.trim()) {
      return contacts;
    }

    const searchTerm = query.toLowerCase().trim();
    
    return contacts.filter(contact => {
      const nameMatch = contact.name.toLowerCase().includes(searchTerm);
      const phoneMatch = contact.phoneNumbers.some(phone => 
        phone.replace(/[^\d]/g, '').includes(searchTerm.replace(/[^\d]/g, ''))
      );
      const emailMatch = contact.emails.some(email => 
        email.toLowerCase().includes(searchTerm)
      );

      return nameMatch || phoneMatch || emailMatch;
    });
  }

  /**
   * Get a specific contact by ID
   */
  async getContactById(contactId: string): Promise<Contact | null> {
    try {
      if (this.cachedContacts.length === 0) {
        await this.getAllContacts();
      }

      return this.cachedContacts.find(contact => contact.id === contactId) || null;
    } catch (error) {
      console.error('Failed to get contact by ID:', error);
      return null;
    }
  }

  /**
   * Get frequent contacts (most recently used or favorited)
   * This would typically come from your backend in a real app
   */
  async getFrequentContacts(): Promise<Contact[]> {
    try {
      // For now, return first 5 contacts as "frequent"
      // In a real app, this would come from backend analytics
      const allContacts = await this.getAllContacts();
      return allContacts.slice(0, 5);
    } catch (error) {
      console.error('Failed to get frequent contacts:', error);
      return [];
    }
  }

  /**
   * Format phone number for display
   */
  formatPhoneNumber(phoneNumber: string): string {
    // Remove all non-digit characters
    const cleaned = phoneNumber.replace(/\D/g, '');
    
    // Format as (XXX) XXX-XXXX for US numbers
    if (cleaned.length === 10) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    }
    
    // Format as +X (XXX) XXX-XXXX for international numbers
    if (cleaned.length === 11 && cleaned.startsWith('1')) {
      return `+1 (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
    }
    
    // Return original if doesn't match common patterns
    return phoneNumber;
  }

  /**
   * Validate phone number
   */
  isValidPhoneNumber(phoneNumber: string): boolean {
    const cleaned = phoneNumber.replace(/\D/g, '');
    return cleaned.length >= 10 && cleaned.length <= 15;
  }

  /**
   * Open device settings to manage permissions
   */
  private openSettings(): void {
    if (Platform.OS === 'ios') {
      Alert.alert(
        'Open Settings',
        'Go to Settings > SafeGuard > Contacts to enable access.',
        [{ text: 'OK' }]
      );
    } else {
      Alert.alert(
        'Open Settings',
        'Go to Settings > Apps > SafeGuard > Permissions > Contacts to enable access.',
        [{ text: 'OK' }]
      );
    }
  }

  /**
   * Clear cached contacts
   */
  clearCache(): void {
    this.cachedContacts = [];
  }

  /**
   * Get contact initials for avatar display
   */
  getContactInitials(contactName: string): string {
    const names = contactName.trim().split(' ');
    if (names.length >= 2) {
      return `${names[0].charAt(0)}${names[names.length - 1].charAt(0)}`.toUpperCase();
    } else if (names.length === 1) {
      return names[0].charAt(0).toUpperCase();
    }
    return '?';
  }

  /**
   * Generate a color for contact avatar based on name
   */
  getContactAvatarColor(contactName: string): string {
    const colors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
      '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9'
    ];
    
    let hash = 0;
    for (let i = 0; i < contactName.length; i++) {
      hash = contactName.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    return colors[Math.abs(hash) % colors.length];
  }
}

export const contactService = new ContactService();