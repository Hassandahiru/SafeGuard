import React, { useRef, useState } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { Text } from '../atoms/Text';
import { Button } from '../atoms/Button';
import { Container } from '../atoms/Container';
import { useTheme } from '../../context/ThemeContext';
import { qrCodeGenerator } from '../../utils/qrCodeGenerator';
import { whatsappService } from '../../services/whatsappService';

export interface QRCodeDisplayProps {
  visitorData: {
    visit: {
      id: string;
      title: string;
      visitor_name: string;
      visitor_phone: string;
      visitor_email?: string;
      visitor_company?: string;
      expected_start: string;
      expected_end?: string;
      description?: string;
      notes?: string;
      six_digit_code: string;
      status: string;
      created_by: {
        id: string;
        first_name: string;
        last_name: string;
      };
    };
    qr_code: string;
    qr_image?: string;
    visitor_count: number;
    expires_at: string;
  };
  onClose?: () => void;
  showActions?: boolean;
}

export const QRCodeDisplay: React.FC<QRCodeDisplayProps> = ({
  visitorData,
  onClose,
  showActions = true,
}) => {
  const [loading, setLoading] = useState(false);
  const qrRef = useRef<any>(null);
  const { theme } = useTheme();

  // Transform backend data to QR data format
  const transformedData = {
    visitorId: visitorData.visit.id,
    visitorName: visitorData.visit.visitor_name,
    hostId: visitorData.visit.created_by.id,
    hostName: `${visitorData.visit.created_by.first_name} ${visitorData.visit.created_by.last_name}`,
    visitDate: new Date(visitorData.visit.expected_start).toLocaleDateString(),
    visitTime: new Date(visitorData.visit.expected_start).toLocaleTimeString(),
    sixDigitCode: visitorData.visit.six_digit_code,
    purpose: visitorData.visit.description,
    phoneNumber: visitorData.visit.visitor_phone,
  };

  // Generate QR code data using the existing QR code or generate new one
  const qrData = visitorData.qr_code || qrCodeGenerator.generateQRData(transformedData);

  const handleShareWhatsApp = async () => {
    if (!visitorData.visit.visitor_phone) {
      Alert.alert('Error', 'Phone number is required to send via WhatsApp');
      return;
    }

    setLoading(true);
    try {
      // Capture QR code as image
      const qrImageUri = await qrCodeGenerator.captureQRCodeImage(qrRef.current);
      
      // Send via WhatsApp
      const result = await whatsappService.sendQRCodeViaWhatsApp(
        visitorData.visit.visitor_phone,
        qrImageUri,
        transformedData
      );

      if (result.success) {
        Alert.alert('Success', 'QR code sent via WhatsApp!');
      } else {
        Alert.alert('Error', 'Failed to send QR code via WhatsApp');
      }
    } catch (error) {
      console.error('Failed to share QR code:', error);
      Alert.alert('Error', 'Failed to capture and share QR code');
    } finally {
      setLoading(false);
    }
  };

  const handleShareGeneral = async () => {
    setLoading(true);
    try {
      const qrImageUri = await qrCodeGenerator.captureQRCodeImage(qrRef.current);
      const result = await qrCodeGenerator.shareQRCode(qrImageUri, 'Visitor QR Code');
      
      if (!result.success) {
        Alert.alert('Error', result.error || 'Failed to share QR code');
      }
    } catch (error) {
      console.error('Failed to share QR code:', error);
      Alert.alert('Error', 'Failed to share QR code');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveToDevice = async () => {
    setLoading(true);
    try {
      const qrImageUri = await qrCodeGenerator.captureQRCodeImage(qrRef.current);
      await qrCodeGenerator.saveQRCodeToDevice(
        qrImageUri,
        `visitor_${visitorData.visit.visitor_name.replace(/\s+/g, '_')}_${visitorData.visit.six_digit_code}`
      );
      
      Alert.alert('Success', 'QR code saved to device!');
    } catch (error) {
      console.error('Failed to save QR code:', error);
      Alert.alert('Error', 'Failed to save QR code to device');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container style={styles.container}>
      <View style={styles.header}>
        <Text variant="h2" style={styles.title}>
          Visitor QR Code
        </Text>
        <Text color="secondary" style={styles.subtitle}>
          Show this code at the security gate
        </Text>
      </View>

      <View style={[styles.qrContainer, { backgroundColor: theme.colors.background }]}>
        <View ref={qrRef} style={styles.qrWrapper}>
          <QRCode
            value={qrData}
            size={200}
            color={theme.colors.text}
            backgroundColor={theme.colors.background}
            logo={undefined}
            logoSize={30}
            logoBackgroundColor="transparent"
          />
        </View>
      </View>

      <View style={styles.details}>
        <View style={styles.detailRow}>
          <Text variant="body" style={styles.detailLabel}>
            Visitor:
          </Text>
          <Text variant="body" style={styles.detailValue}>
            {visitorData.visit.visitor_name}
          </Text>
        </View>

        <View style={styles.detailRow}>
          <Text variant="body" style={styles.detailLabel}>
            Host:
          </Text>
          <Text variant="body" style={styles.detailValue}>
            {transformedData.hostName}
          </Text>
        </View>

        <View style={styles.detailRow}>
          <Text variant="body" style={styles.detailLabel}>
            Date:
          </Text>
          <Text variant="body" style={styles.detailValue}>
            {transformedData.visitDate} at {transformedData.visitTime}
          </Text>
        </View>

        <View style={styles.detailRow}>
          <Text variant="body" style={styles.detailLabel}>
            6-Digit Code:
          </Text>
          <Text 
            variant="h3" 
            style={[styles.digitCode, { color: theme.colors.primary }]}
          >
            {visitorData.visit.six_digit_code}
          </Text>
        </View>

        {visitorData.visit.description && (
          <View style={styles.detailRow}>
            <Text variant="body" style={styles.detailLabel}>
              Purpose:
            </Text>
            <Text variant="body" style={styles.detailValue}>
              {visitorData.visit.description}
            </Text>
          </View>
        )}
      </View>

      {showActions && (
        <View style={styles.actions}>
          {visitorData.visit.visitor_phone && (
            <Button
              title="Send via WhatsApp"
              icon="logo-whatsapp"
              onPress={handleShareWhatsApp}
              disabled={loading}
              loading={loading}
              style={[styles.actionButton, { backgroundColor: '#25D366' }]}
              fullWidth
            />
          )}
          
          <Button
            title="Share QR Code"
            variant="outline"
            icon="share"
            onPress={handleShareGeneral}
            disabled={loading}
            loading={loading}
            style={styles.actionButton}
            fullWidth
          />
          
          <Button
            title="Save to Device"
            variant="ghost"
            icon="download"
            onPress={handleSaveToDevice}
            disabled={loading}
            loading={loading}
            style={styles.actionButton}
            fullWidth
          />
        </View>
      )}

      <Text variant="caption" color="secondary" style={styles.footer}>
        This QR code is valid for 24 hours from generation
      </Text>
    </Container>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    alignItems: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
  },
  title: {
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    textAlign: 'center',
  },
  qrContainer: {
    padding: 20,
    borderRadius: 16,
    marginBottom: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  qrWrapper: {
    backgroundColor: 'white',
    padding: 10,
    borderRadius: 8,
  },
  details: {
    width: '100%',
    marginBottom: 30,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
    marginBottom: 8,
  },
  detailLabel: {
    flex: 1,
    fontWeight: '600',
  },
  detailValue: {
    flex: 2,
    textAlign: 'right',
  },
  digitCode: {
    fontWeight: 'bold',
    letterSpacing: 2,
  },
  actions: {
    width: '100%',
    marginBottom: 20,
  },
  actionButton: {
    marginBottom: 12,
  },
  footer: {
    textAlign: 'center',
    lineHeight: 18,
  },
});