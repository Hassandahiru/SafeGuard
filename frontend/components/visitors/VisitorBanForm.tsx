import React, { useState } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { Text, Input, Button, Select } from '../atoms';
import { Modal } from '../molecules';
import { visitorBanService } from '../../services';
import { useSocket } from '../../context/SocketContext';
import { BAN_SEVERITY } from '../../constants/ApiConstants';

interface VisitorBanFormProps {
  visible: boolean;
  onClose: () => void;
  onBanCreated?: (ban: any) => void;
  initialData?: {
    name?: string;
    phone?: string;
  };
}

const VisitorBanForm: React.FC<VisitorBanFormProps> = ({
  visible,
  onClose,
  onBanCreated,
  initialData
}) => {
  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    phone: initialData?.phone || '',
    reason: '',
    severity: BAN_SEVERITY.MEDIUM
  });
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { banVisitor } = useSocket();

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    } else if (!/^\+?[1-9]\d{1,14}$/.test(formData.phone)) {
      newErrors.phone = 'Invalid phone number format';
    }

    if (!formData.reason.trim()) {
      newErrors.reason = 'Reason is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      // Use Socket.io for real-time updates
      banVisitor(formData);
      
      // Also use REST API as fallback
      const response = await visitorBanService.banVisitor(formData);
      
      if (response.success) {
        onBanCreated?.(response.data);
        Alert.alert('Success', 'Visitor banned successfully');
        handleClose();
      } else {
        Alert.alert('Error', response.message || 'Failed to ban visitor');
      }
    } catch (error) {
      console.error('Error banning visitor:', error);
      Alert.alert('Error', 'Failed to ban visitor. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({
      name: '',
      phone: '',
      reason: '',
      severity: BAN_SEVERITY.MEDIUM
    });
    setErrors({});
    onClose();
  };

  const severityOptions = [
    { label: 'Low', value: BAN_SEVERITY.LOW },
    { label: 'Medium', value: BAN_SEVERITY.MEDIUM },
    { label: 'High', value: BAN_SEVERITY.HIGH }
  ];

  return (
    <Modal
      visible={visible}
      onClose={handleClose}
      title="Ban Visitor"
      footer={
        <View style={styles.footer}>
          <Button
            title="Cancel"
            variant="secondary"
            onPress={handleClose}
            style={styles.button}
          />
          <Button
            title="Ban Visitor"
            onPress={handleSubmit}
            loading={isLoading}
            style={styles.button}
          />
        </View>
      }
    >
      <View style={styles.form}>
        <Input
          label="Visitor Name"
          value={formData.name}
          onChangeText={(text) => setFormData({ ...formData, name: text })}
          error={errors.name}
          placeholder="Enter visitor's name"
        />

        <Input
          label="Phone Number"
          value={formData.phone}
          onChangeText={(text) => setFormData({ ...formData, phone: text })}
          error={errors.phone}
          placeholder="Enter visitor's phone number"
          keyboardType="phone-pad"
        />

        <Input
          label="Reason for Ban"
          value={formData.reason}
          onChangeText={(text) => setFormData({ ...formData, reason: text })}
          error={errors.reason}
          placeholder="Enter reason for banning this visitor"
          multiline
          numberOfLines={3}
        />

        <Select
          label="Severity Level"
          value={formData.severity}
          onValueChange={(value) => setFormData({ ...formData, severity: value })}
          options={severityOptions}
        />

        <Text style={styles.disclaimer}>
          This visitor will be prevented from being invited to your apartment. 
          Security personnel will be notified of this ban.
        </Text>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  form: {
    paddingVertical: 16,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  button: {
    flex: 1,
    marginHorizontal: 8,
  },
  disclaimer: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginTop: 16,
    fontStyle: 'italic',
  },
});

export default VisitorBanForm;