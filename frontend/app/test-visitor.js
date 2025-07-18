import React, { useState } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { Text } from '../components/atoms/Text';
import { Button } from '../components/atoms/Button';
import { Container } from '../components/atoms/Container';
import { VisitorInviteForm } from '../components/visitors/VisitorInviteForm';
import { ContactPicker } from '../components/visitors/ContactPicker';
import { QRCodeDisplay } from '../components/visitors/QRCodeDisplay';

export default function TestVisitor() {
  const [currentView, setCurrentView] = useState('menu');

  const mockVisitorData = {
    visitorId: 'visitor_123',
    visitorName: 'John Smith',
    hostId: 'host_456',
    hostName: 'Jane Doe',
    visitDate: '2024-01-15',
    visitTime: '2:00 PM',
    sixDigitCode: '123456',
    purpose: 'Business meeting',
    phoneNumber: '+234 703 310 86608',
  };

  const handleContactSelect = (contact) => {
    Alert.alert('Contact Selected', `Name: ${contact.name}\nPhone: ${contact.primaryPhone}\nEmail: ${contact.primaryEmail}`);
  };

  const handleInviteSuccess = (visitorData) => {
    Alert.alert('Success', 'Visitor invitation created successfully!');
    setCurrentView('menu');
  };

  const renderMenu = () => (
    <Container style={styles.container}>
      <Text variant="h1" style={styles.title}>
        WhatsApp & Contact Integration Test
      </Text>
      
      <Text color="secondary" style={styles.subtitle}>
        Test the native WhatsApp API and contact access features
      </Text>

      <View style={styles.buttonContainer}>
        <Button
          title="Test Contact Picker"
          onPress={() => setCurrentView('contacts')}
          style={styles.button}
        />

        <Button
          title="Test QR Code Display"
          onPress={() => setCurrentView('qr')}
          style={styles.button}
        />

        <Button
          title="Test Visitor Invite Form"
          onPress={() => setCurrentView('invite')}
          style={styles.button}
        />

        <Button
          title="Test WhatsApp Direct"
          onPress={testWhatsAppDirect}
          variant="outline"
          style={styles.button}
        />
      </View>

      <Text variant="caption" color="secondary" style={styles.note}>
        Note: WhatsApp integration requires WhatsApp to be installed on the device.
        Contact access requires permission from the user.
      </Text>
    </Container>
  );

  const testWhatsAppDirect = async () => {
    try {
      const { whatsappService } = await import('../services/whatsappService');
      
      const result = await whatsappService.sendVisitorInvitation(
        '+234 703 310 86608',
        mockVisitorData
      );

      if (result.success) {
        Alert.alert('Success', 'WhatsApp opened successfully!');
      } else {
        Alert.alert('Error', result.error || 'Failed to open WhatsApp');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to test WhatsApp integration');
    }
  };

  switch (currentView) {
    case 'contacts':
      return (
        <ContactPicker
          onContactSelect={handleContactSelect}
          onClose={() => setCurrentView('menu')}
        />
      );

    case 'qr':
      return (
        <QRCodeDisplay
          visitorData={mockVisitorData}
          onClose={() => setCurrentView('menu')}
        />
      );

    case 'invite':
      return (
        <VisitorInviteForm
          onSuccess={handleInviteSuccess}
          onCancel={() => setCurrentView('menu')}
        />
      );

    default:
      return renderMenu();
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  title: {
    textAlign: 'center',
    marginBottom: 16,
  },
  subtitle: {
    textAlign: 'center',
    marginBottom: 40,
    lineHeight: 20,
  },
  buttonContainer: {
    marginBottom: 40,
  },
  button: {
    marginBottom: 16,
  },
  note: {
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 20,
  },
});