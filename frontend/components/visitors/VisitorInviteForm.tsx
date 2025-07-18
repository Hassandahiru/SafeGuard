import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { Text } from '../atoms/Text';
import { Input } from '../atoms/Input';
import { Button } from '../atoms/Button';
import { Container } from '../atoms/Container';
import { ContactPicker, Contact } from './ContactPicker';
import { QRCodeDisplay } from './QRCodeDisplay';
import { useAuth } from '../../context/AuthContext';
import { visitorService } from '../../services/visitorService';
import { VISIT_TYPE } from '../../constants/ApiConstants';

export interface VisitorInviteFormProps {
  onSuccess?: (visitorData: any) => void;
  onCancel?: () => void;
}

type FormStep = 'form' | 'contacts' | 'qr_display';

export const VisitorInviteForm: React.FC<VisitorInviteFormProps> = ({
  onSuccess,
  onCancel,
}) => {
  const [currentStep, setCurrentStep] = useState<FormStep>('form');
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [generatedQR, setGeneratedQR] = useState<any>(null);
  
  const [formData, setFormData] = useState({
    title: '',
    visitorName: '',
    visitorPhone: '',
    visitorEmail: '',
    visitorCompany: '',
    expectedStart: '',
    expectedEnd: '',
    description: '',
    notes: '',
    visitType: VISIT_TYPE.SINGLE,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const { user } = useAuth();

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Visit title is required';
    }

    if (!formData.visitorName.trim()) {
      newErrors.visitorName = 'Visitor name is required';
    }

    if (!formData.visitorPhone.trim()) {
      newErrors.visitorPhone = 'Visitor phone number is required';
    }

    if (!formData.expectedStart) {
      newErrors.expectedStart = 'Expected start time is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleContactSelect = (contact: Contact) => {
    setSelectedContact(contact);
    setFormData(prev => ({
      ...prev,
      visitorName: contact.name,
      visitorPhone: contact.primaryPhone,
      visitorEmail: contact.primaryEmail,
    }));
    setCurrentStep('form');
  };

  const handleCreateInvitation = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      // Create visitor invitation using backend service
      const result = await visitorService.createInvitation(formData);

      if (result.success) {
        // Set the QR data for display
        setGeneratedQR({
          visit: result.data.visit,
          qr_code: result.data.qr_code,
          qr_image: result.data.qr_image,
          visitor_count: result.data.visitor_count,
          expires_at: result.data.expires_at,
        });
        setCurrentStep('qr_display');

        onSuccess?.(result.data);
        Alert.alert('Success', 'Visitor invitation created successfully!');
      } else {
        Alert.alert('Error', result.error?.message || 'Failed to create visitor invitation');
      }
    } catch (error) {
      console.error('Failed to create invitation:', error);
      Alert.alert('Error', error.message || 'Failed to create visitor invitation');
    } finally {
      setLoading(false);
    }
  };

  const updateFormData = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  if (currentStep === 'contacts') {
    return (
      <ContactPicker
        onContactSelect={handleContactSelect}
        onClose={() => setCurrentStep('form')}
        selectedContactId={selectedContact?.id}
      />
    );
  }

  if (currentStep === 'qr_display' && generatedQR) {
    return (
      <QRCodeDisplay
        visitorData={generatedQR}
        onClose={() => setCurrentStep('form')}
      />
    );
  }

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView style={styles.scrollView}>
        <Container style={styles.content}>
          <View style={styles.header}>
            <Text variant="h2" style={styles.title}>
              Invite Visitor
            </Text>
            <Text color="secondary" style={styles.subtitle}>
              Create a visitor invitation with QR code
            </Text>
          </View>

        <View style={styles.form}>
          <View style={styles.contactSection}>
            <Button
              title="Select from Contacts"
              variant="outline"
              icon="people"
              onPress={() => setCurrentStep('contacts')}
              style={styles.contactButton}
              fullWidth
            />
            
            {selectedContact && (
              <Text color="primary" style={styles.selectedContact}>
                Selected: {selectedContact.name}
              </Text>
            )}
          </View>

          <Input
            label="Visit Title *"
            placeholder="Enter visit title"
            value={formData.title}
            onChangeText={(value) => updateFormData('title', value)}
            error={errors.title}
            style={styles.input}
          />

          <Input
            label="Visitor Name *"
            placeholder="Enter visitor's full name"
            value={formData.visitorName}
            onChangeText={(value) => updateFormData('visitorName', value)}
            error={errors.visitorName}
            style={styles.input}
          />

          <Input
            label="Phone Number *"
            placeholder="Enter phone number"
            value={formData.visitorPhone}
            onChangeText={(value) => updateFormData('visitorPhone', value)}
            keyboardType="phone-pad"
            error={errors.visitorPhone}
            style={styles.input}
          />

          <Input
            label="Email"
            placeholder="Enter email address (optional)"
            value={formData.visitorEmail}
            onChangeText={(value) => updateFormData('visitorEmail', value)}
            keyboardType="email-address"
            autoCapitalize="none"
            style={styles.input}
          />

          <Input
            label="Company"
            placeholder="Enter company name (optional)"
            value={formData.visitorCompany}
            onChangeText={(value) => updateFormData('visitorCompany', value)}
            style={styles.input}
          />

          <Input
            label="Expected Start Time *"
            placeholder="YYYY-MM-DD HH:MM"
            value={formData.expectedStart}
            onChangeText={(value) => updateFormData('expectedStart', value)}
            error={errors.expectedStart}
            style={styles.input}
          />

          <Input
            label="Expected End Time"
            placeholder="YYYY-MM-DD HH:MM (optional)"
            value={formData.expectedEnd}
            onChangeText={(value) => updateFormData('expectedEnd', value)}
            style={styles.input}
          />

          <Input
            label="Description"
            placeholder="Visit description (optional)"
            value={formData.description}
            onChangeText={(value) => updateFormData('description', value)}
            multiline
            style={styles.input}
          />

          <Input
            label="Notes"
            placeholder="Additional notes (optional)"
            value={formData.notes}
            onChangeText={(value) => updateFormData('notes', value)}
            multiline
            style={styles.input}
          />

          <Button
            title="Create Invitation"
            onPress={handleCreateInvitation}
            disabled={loading}
            loading={loading}
            icon="checkmark-circle"
            size="large"
            fullWidth
            style={styles.createButton}
          />

          {onCancel && (
            <Button
              title="Cancel"
              variant="ghost"
              onPress={onCancel}
              icon="close"
              style={styles.cancelButton}
            />
          )}
        </View>
        </Container>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
  },
  title: {
    marginBottom: 8,
  },
  subtitle: {
    textAlign: 'center',
  },
  form: {
    flex: 1,
  },
  contactSection: {
    marginBottom: 20,
  },
  contactButton: {
    marginBottom: 8,
  },
  selectedContact: {
    textAlign: 'center',
    fontStyle: 'italic',
  },
  input: {
    marginBottom: 16,
  },
  deliverySection: {
    marginBottom: 24,
  },
  deliveryLabel: {
    marginBottom: 12,
    fontWeight: '600',
  },
  deliveryOptions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  deliveryButton: {
    flex: 1,
    marginHorizontal: 4,
  },
  createButton: {
    marginBottom: 12,
  },
  cancelButton: {
    alignSelf: 'center',
  },
});