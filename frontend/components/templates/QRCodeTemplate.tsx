import React from 'react';
import { View, Share } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { ScreenTemplate } from './ScreenTemplate';
import { Card } from '../atoms/Card';
import { Text } from '../atoms/Text';
import { Button } from '../atoms/Button';

export interface QRCodeData {
  visitorName: string;
  code: string;
  visitDate: string;
  visitTime?: string;
  validUntil: string;
  qrCodeUrl?: string;
}

export interface QRCodeTemplateProps {
  data: QRCodeData;
  onSendWhatsApp?: () => void;
  onShare?: () => void;
  onSave?: () => void;
  onClose?: () => void;
  loading?: boolean;
  showHeader?: boolean;
}

export const QRCodeTemplate: React.FC<QRCodeTemplateProps> = ({
  data,
  onSendWhatsApp,
  onShare,
  onSave,
  onClose,
  loading = false,
  showHeader = true,
}) => {
  const { theme } = useTheme();

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Visitor Access Code for ${data.visitorName}\n\nCode: ${data.code}\nDate: ${data.visitDate}\nTime: ${data.visitTime || 'Any time'}\nValid until: ${data.validUntil}`,
        title: 'Visitor Access Code',
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  return (
    <ScreenTemplate 
      title="Visitor Access Code" 
      showHeader={showHeader}
      showBackButton={!!onClose}
      onBackPress={onClose}
    >
      <Card variant="elevated" padding="lg" style={{ marginBottom: 16 }}>
        <Text variant="h2" weight="semibold" style={{ 
          textAlign: 'center', 
          marginBottom: 16 
        }}>
          {data.visitorName}
        </Text>
        
        {/* QR Code Placeholder */}
        <View style={{
          width: 200,
          height: 200,
          backgroundColor: theme.colors.border.light,
          borderRadius: theme.borderRadius.md,
          justifyContent: 'center',
          alignItems: 'center',
          alignSelf: 'center',
          marginBottom: 16
        }}>
          <Text variant="h3" color="secondary">QR CODE</Text>
          <Text variant="caption" color="secondary" style={{ textAlign: 'center' }}>
            Scan to access
          </Text>
        </View>
        
        <View style={{
          backgroundColor: theme.colors.surface,
          padding: theme.spacing.md,
          borderRadius: theme.borderRadius.md,
          marginBottom: 16
        }}>
          <Text variant="h1" weight="bold" style={{ 
            textAlign: 'center',
            letterSpacing: 2,
            fontFamily: 'monospace'
          }}>
            {data.code}
          </Text>
        </View>
      </Card>

      <Card variant="outlined" padding="lg" style={{ marginBottom: 16 }}>
        <Text variant="h3" weight="semibold" style={{ marginBottom: 12 }}>
          Visit Details
        </Text>
        
        <View style={{ marginBottom: 8 }}>
          <Text variant="caption" color="secondary">Date</Text>
          <Text variant="body">{data.visitDate}</Text>
        </View>
        
        {data.visitTime && (
          <View style={{ marginBottom: 8 }}>
            <Text variant="caption" color="secondary">Time</Text>
            <Text variant="body">{data.visitTime}</Text>
          </View>
        )}
        
        <View style={{ marginBottom: 8 }}>
          <Text variant="caption" color="secondary">Valid Until</Text>
          <Text variant="body" color="warning">{data.validUntil}</Text>
        </View>
      </Card>

      <View style={{ gap: 12 }}>
        {onSendWhatsApp && (
          <Button
            title="Send via WhatsApp"
            variant="primary"
            size="large"
            onPress={onSendWhatsApp}
            disabled={loading}
          />
        )}
        
        <View style={{ 
          flexDirection: 'row', 
          gap: 12 
        }}>
          <Button
            title="Share"
            variant="outline"
            size="medium"
            onPress={onShare || handleShare}
            disabled={loading}
            style={{ flex: 1 }}
          />
          
          {onSave && (
            <Button
              title="Save"
              variant="secondary"
              size="medium"
              onPress={onSave}
              disabled={loading}
              style={{ flex: 1 }}
            />
          )}
        </View>
      </View>
    </ScreenTemplate>
  );
};