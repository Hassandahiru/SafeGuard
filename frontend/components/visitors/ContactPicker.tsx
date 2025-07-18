import React, { useState, useEffect } from 'react';
import { View, FlatList, StyleSheet, TouchableOpacity } from 'react-native';
import { Text } from '../atoms/Text';
import { Input } from '../atoms/Input';
import { Container } from '../atoms/Container';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { useTheme } from '../../context/ThemeContext';
import { contactService } from '../../services/contactService';

export interface Contact {
  id: string;
  name: string;
  phoneNumbers: string[];
  emails: string[];
  primaryPhone: string;
  primaryEmail: string;
}

export interface ContactPickerProps {
  onContactSelect: (contact: Contact) => void;
  onClose?: () => void;
  selectedContactId?: string;
}

export const ContactPicker: React.FC<ContactPickerProps> = ({
  onContactSelect,
  onClose,
  selectedContactId,
}) => {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [filteredContacts, setFilteredContacts] = useState<Contact[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const { theme } = useTheme();

  useEffect(() => {
    loadContacts();
  }, []);

  useEffect(() => {
    filterContacts();
  }, [searchQuery, contacts]);

  const loadContacts = async () => {
    setLoading(true);
    try {
      const contactList = await contactService.getAllContacts();
      setContacts(contactList);
    } catch (error) {
      console.error('Failed to load contacts:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterContacts = () => {
    if (!searchQuery.trim()) {
      setFilteredContacts(contacts);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = contacts.filter(contact =>
        contact.name.toLowerCase().includes(query) ||
        contact.primaryPhone.includes(query) ||
        contact.primaryEmail.toLowerCase().includes(query)
      );
      setFilteredContacts(filtered);
    }
  };

  const handleContactPress = (contact: Contact) => {
    onContactSelect(contact);
  };

  const renderContact = ({ item }: { item: Contact }) => {
    const isSelected = selectedContactId === item.id;
    
    return (
      <TouchableOpacity
        style={[
          styles.contactItem,
          {
            backgroundColor: isSelected ? theme.colors.primary + '20' : theme.colors.background,
            borderColor: isSelected ? theme.colors.primary : theme.colors.border,
          },
        ]}
        onPress={() => handleContactPress(item)}
      >
        <View style={styles.contactInfo}>
          <Text variant="subtitle" style={styles.contactName}>
            {item.name}
          </Text>
          
          {item.primaryPhone && (
            <Text variant="caption" color="secondary" style={styles.contactDetail}>
              📱 {item.primaryPhone}
            </Text>
          )}
          
          {item.primaryEmail && (
            <Text variant="caption" color="secondary" style={styles.contactDetail}>
              ✉️ {item.primaryEmail}
            </Text>
          )}
        </View>

        {isSelected && (
          <View style={[styles.checkmark, { backgroundColor: theme.colors.primary }]}>
            <Text style={styles.checkmarkText}>✓</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Text variant="h3" color="secondary" style={styles.emptyTitle}>
        {searchQuery ? 'No contacts found' : 'No contacts available'}
      </Text>
      <Text color="secondary" style={styles.emptyMessage}>
        {searchQuery 
          ? 'Try adjusting your search terms'
          : 'Make sure you have contacts saved on your device'
        }
      </Text>
    </View>
  );

  if (loading) {
    return (
      <Container style={styles.container}>
        <LoadingSpinner message="Loading contacts..." />
      </Container>
    );
  }

  return (
    <Container style={styles.container}>
      <View style={styles.header}>
        <Text variant="h2" style={styles.title}>
          Select Contact
        </Text>
        
        <Input
          placeholder="Search contacts..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          style={styles.searchInput}
        />
      </View>

      <FlatList
        data={filteredContacts}
        renderItem={renderContact}
        keyExtractor={(item) => item.id}
        style={styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={renderEmptyState}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />

      <Text variant="caption" color="secondary" style={styles.footerText}>
        {filteredContacts.length} contact{filteredContacts.length !== 1 ? 's' : ''} found
      </Text>
    </Container>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  header: {
    marginBottom: 20,
  },
  title: {
    marginBottom: 16,
    textAlign: 'center',
  },
  searchInput: {
    marginBottom: 0,
  },
  list: {
    flex: 1,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  contactInfo: {
    flex: 1,
  },
  contactName: {
    marginBottom: 4,
    fontWeight: '600',
  },
  contactDetail: {
    marginBottom: 2,
  },
  checkmark: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  checkmarkText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  separator: {
    height: 1,
    backgroundColor: 'rgba(0,0,0,0.1)',
    marginVertical: 4,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyTitle: {
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyMessage: {
    textAlign: 'center',
    lineHeight: 20,
  },
  footerText: {
    textAlign: 'center',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
});