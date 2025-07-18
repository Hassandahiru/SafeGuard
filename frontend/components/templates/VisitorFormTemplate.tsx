import React, { useState } from 'react';
import { View } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { ScreenTemplate } from './ScreenTemplate';
import { Card } from '../atoms/Card';
import { Text } from '../atoms/Text';
import { Input } from '../atoms/Input';
import { Select, SelectOption } from '../atoms/Select';
import { Checkbox } from '../atoms/Checkbox';
import { Button } from '../atoms/Button';

export interface VisitorFormData {
  name: string;
  phone: string;
  visitDate: string;
  visitTime: string;
  purpose: string;
  sendWhatsApp: boolean;
  eventMode: boolean;
}

export interface VisitorFormTemplateProps {
  title: string;
  initialData?: Partial<VisitorFormData>;
  onSubmit: (data: VisitorFormData) => void;
  loading?: boolean;
  showHeader?: boolean;
  showBackButton?: boolean;
  onBackPress?: () => void;
}

const purposeOptions: SelectOption[] = [
  { label: 'Business Meeting', value: 'business' },
  { label: 'Personal Visit', value: 'personal' },
  { label: 'Delivery', value: 'delivery' },
  { label: 'Maintenance', value: 'maintenance' },
  { label: 'Event', value: 'event' },
  { label: 'Other', value: 'other' },
];

export const VisitorFormTemplate: React.FC<VisitorFormTemplateProps> = ({
  title,
  initialData = {},
  onSubmit,
  loading = false,
  showHeader = true,
  showBackButton = false,
  onBackPress,
}) => {
  const { theme } = useTheme();
  
  const [formData, setFormData] = useState<VisitorFormData>({
    name: initialData.name || '',
    phone: initialData.phone || '',
    visitDate: initialData.visitDate || '',
    visitTime: initialData.visitTime || '',
    purpose: initialData.purpose || '',
    sendWhatsApp: initialData.sendWhatsApp ?? true,
    eventMode: initialData.eventMode ?? false,
  });

  const updateField = (field: keyof VisitorFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = () => {
    onSubmit(formData);
  };

  const isFormValid = formData.name.trim() && formData.phone.trim() && formData.visitDate.trim();

  return (
    <ScreenTemplate 
      title={title} 
      showHeader={showHeader}
      showBackButton={showBackButton}
      onBackPress={onBackPress}
    >
      <Card variant="elevated" padding="lg" style={{ marginBottom: 16 }}>
        <Text variant="h3" weight="semibold" style={{ marginBottom: 16 }}>
          Visitor Information
        </Text>
        
        <Input
          label="Visitor Name"
          placeholder="Enter visitor's full name"
          value={formData.name}
          onChangeText={(value) => updateField('name', value)}
          style={{ marginBottom: 16 }}
        />
        
        <Input
          label="Phone Number"
          placeholder="Enter phone number"
          value={formData.phone}
          onChangeText={(value) => updateField('phone', value)}
          keyboardType="phone-pad"
          style={{ marginBottom: 16 }}
        />
        
        <Input
          label="Visit Date"
          placeholder="Select date"
          value={formData.visitDate}
          onChangeText={(value) => updateField('visitDate', value)}
          style={{ marginBottom: 16 }}
        />
        
        <Input
          label="Visit Time (Optional)"
          placeholder="Enter time"
          value={formData.visitTime}
          onChangeText={(value) => updateField('visitTime', value)}
          style={{ marginBottom: 16 }}
        />
        
        <Select
          label="Purpose of Visit"
          placeholder="Select purpose"
          options={purposeOptions}
          value={formData.purpose}
          onSelect={(value) => updateField('purpose', value)}
        />
      </Card>

      <Card variant="outlined" padding="lg" style={{ marginBottom: 16 }}>
        <Text variant="h3" weight="semibold" style={{ marginBottom: 16 }}>
          Options
        </Text>
        
        <Checkbox
          label="Send access code via WhatsApp"
          checked={formData.sendWhatsApp}
          onToggle={() => updateField('sendWhatsApp', !formData.sendWhatsApp)}
          style={{ marginBottom: 12 }}
        />
        
        <Checkbox
          label="Event mode (multiple visitors)"
          checked={formData.eventMode}
          onToggle={() => updateField('eventMode', !formData.eventMode)}
        />
      </Card>

      <Button
        title={loading ? "Creating Access..." : "Generate Access Code"}
        variant="primary"
        size="large"
        onPress={handleSubmit}
        disabled={!isFormValid || loading}
      />
    </ScreenTemplate>
  );
};