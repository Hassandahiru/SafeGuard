import React, { useState } from 'react';
import { View, StyleSheet, Alert, TouchableOpacity, TextInput } from 'react-native';
import { Text, Button } from '../atoms';
import { Modal } from '../molecules';
import { useSocket } from '../../context/SocketContext';
import { EMERGENCY_TYPE, PRIORITY_LEVELS } from '../../constants/ApiConstants';

interface EmergencyAlertButtonProps {
  style?: any;
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
}

const EmergencyAlertButton: React.FC<EmergencyAlertButtonProps> = ({
  style,
  size = 'medium',
  disabled = false
}) => {
  const [showModal, setShowModal] = useState(false);
  const [selectedType, setSelectedType] = useState<string>('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [isSending, setIsSending] = useState(false);
  const { sendEmergencyAlert } = useSocket();

  const emergencyTypes = [
    { type: EMERGENCY_TYPE.FIRE, label: 'Fire Emergency', color: '#FF3B30', icon: '🔥' },
    { type: EMERGENCY_TYPE.MEDICAL, label: 'Medical Emergency', color: '#FF9500', icon: '🏥' },
    { type: EMERGENCY_TYPE.SECURITY, label: 'Security Threat', color: '#FF2D92', icon: '🚨' },
    { type: EMERGENCY_TYPE.EVACUATION, label: 'Evacuation Required', color: '#AF52DE', icon: '🚪' },
    { type: EMERGENCY_TYPE.OTHER, label: 'Other Emergency', color: '#8E8E93', icon: '⚠️' }
  ];

  const buttonSizes = {
    small: { width: 60, height: 60, fontSize: 24 },
    medium: { width: 80, height: 80, fontSize: 32 },
    large: { width: 120, height: 120, fontSize: 48 }
  };

  const currentSize = buttonSizes[size];

  const handleEmergencyPress = () => {
    if (disabled) return;
    
    Alert.alert(
      'Emergency Alert',
      'Are you experiencing an emergency?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Yes, Continue',
          style: 'destructive',
          onPress: () => setShowModal(true)
        }
      ]
    );
  };

  const handleTypeSelection = (type: string) => {
    setSelectedType(type);
  };

  const handleSendAlert = async () => {
    if (!selectedType) {
      Alert.alert('Error', 'Please select an emergency type');
      return;
    }

    if (!description.trim()) {
      Alert.alert('Error', 'Please provide a description of the emergency');
      return;
    }

    setIsSending(true);
    try {
      const alertData = {
        type: selectedType,
        description: description.trim(),
        location: location.trim() || 'Not specified',
        priority: PRIORITY_LEVELS.CRITICAL,
        timestamp: new Date().toISOString()
      };

      // Send emergency alert via Socket.io
      sendEmergencyAlert(alertData);

      Alert.alert(
        'Emergency Alert Sent',
        'Your emergency alert has been sent to all building personnel and security.',
        [
          {
            text: 'OK',
            onPress: () => {
              setShowModal(false);
              resetForm();
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error sending emergency alert:', error);
      Alert.alert('Error', 'Failed to send emergency alert. Please try again.');
    } finally {
      setIsSending(false);
    }
  };

  const resetForm = () => {
    setSelectedType('');
    setDescription('');
    setLocation('');
  };

  const handleModalClose = () => {
    setShowModal(false);
    resetForm();
  };

  const selectedEmergencyType = emergencyTypes.find(e => e.type === selectedType);

  return (
    <>
      <TouchableOpacity
        style={[
          styles.emergencyButton,
          {
            width: currentSize.width,
            height: currentSize.height,
            opacity: disabled ? 0.5 : 1
          },
          style
        ]}
        onPress={handleEmergencyPress}
        disabled={disabled}
        activeOpacity={0.8}
      >
        <Text style={[styles.emergencyIcon, { fontSize: currentSize.fontSize }]}>
          🚨
        </Text>
        <Text style={styles.emergencyText}>SOS</Text>
      </TouchableOpacity>

      <Modal
        visible={showModal}
        onClose={handleModalClose}
        title="Emergency Alert"
        footer={
          <View style={styles.modalFooter}>
            <Button
              title="Cancel"
              variant="secondary"
              onPress={handleModalClose}
              style={styles.footerButton}
            />
            <Button
              title="Send Alert"
              onPress={handleSendAlert}
              loading={isSending}
              style={[styles.footerButton, styles.alertButton]}
              backgroundColor="#FF3B30"
            />
          </View>
        }
      >
        <View style={styles.modalContent}>
          <Text style={styles.warningText}>
            This will send an emergency alert to all building personnel and security.
          </Text>

          <Text style={styles.sectionTitle}>Emergency Type</Text>
          <View style={styles.typeGrid}>
            {emergencyTypes.map((emergency) => (
              <TouchableOpacity
                key={emergency.type}
                style={[
                  styles.typeButton,
                  selectedType === emergency.type && {
                    backgroundColor: emergency.color,
                    borderColor: emergency.color
                  }
                ]}
                onPress={() => handleTypeSelection(emergency.type)}
              >
                <Text style={styles.typeIcon}>{emergency.icon}</Text>
                <Text style={[
                  styles.typeLabel,
                  selectedType === emergency.type && styles.selectedTypeLabel
                ]}>
                  {emergency.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.sectionTitle}>Description *</Text>
          <TextInput
            style={styles.textInput}
            value={description}
            onChangeText={setDescription}
            placeholder="Describe the emergency situation..."
            multiline
            numberOfLines={3}
            maxLength={500}
          />

          <Text style={styles.sectionTitle}>Location (Optional)</Text>
          <TextInput
            style={styles.textInput}
            value={location}
            onChangeText={setLocation}
            placeholder="Specify location within building..."
            maxLength={100}
          />
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  emergencyButton: {
    backgroundColor: '#FF3B30',
    borderRadius: 999,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#FF3B30',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  emergencyIcon: {
    color: '#FFFFFF',
    marginBottom: 2,
  },
  emergencyText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  modalContent: {
    paddingVertical: 16,
  },
  warningText: {
    fontSize: 14,
    color: '#FF3B30',
    textAlign: 'center',
    marginBottom: 20,
    fontWeight: '500',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    marginTop: 16,
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  typeButton: {
    flex: 1,
    minWidth: '48%',
    margin: '1%',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
  },
  typeIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  typeLabel: {
    fontSize: 12,
    textAlign: 'center',
    color: '#333',
  },
  selectedTypeLabel: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
    textAlignVertical: 'top',
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  footerButton: {
    flex: 1,
    marginHorizontal: 8,
  },
  alertButton: {
    backgroundColor: '#FF3B30',
  },
});

export default EmergencyAlertButton;