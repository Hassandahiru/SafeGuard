import React from 'react';
import { Modal as RNModal, View, TouchableOpacity, TouchableWithoutFeedback } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { Text } from '../atoms/Text';
import { Button } from '../atoms/Button';

export interface ModalProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  showCloseButton?: boolean;
  closeOnBackdrop?: boolean;
  size?: 'small' | 'medium' | 'large' | 'fullscreen';
}

export const Modal: React.FC<ModalProps> = ({
  visible,
  onClose,
  title,
  children,
  showCloseButton = true,
  closeOnBackdrop = true,
  size = 'medium',
}) => {
  const { theme } = useTheme();
  
  const sizeMap = {
    small: { width: '80%', maxHeight: '40%' },
    medium: { width: '90%', maxHeight: '60%' },
    large: { width: '95%', maxHeight: '80%' },
    fullscreen: { width: '100%', height: '100%' },
  };
  
  const modalStyle = {
    backgroundColor: theme.colors.background,
    borderRadius: size === 'fullscreen' ? 0 : theme.borderRadius.lg,
    padding: theme.spacing.lg,
    ...sizeMap[size],
    ...theme.shadows.lg,
  };
  
  const overlayStyle = {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    padding: size === 'fullscreen' ? 0 : theme.spacing.md,
  };
  
  const headerStyle = {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    marginBottom: theme.spacing.md,
    paddingBottom: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border.light,
  };

  return (
    <RNModal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback 
        onPress={closeOnBackdrop ? onClose : undefined}
      >
        <View style={overlayStyle}>
          <TouchableWithoutFeedback>
            <View style={modalStyle}>
              {(title || showCloseButton) && (
                <View style={headerStyle}>
                  {title && (
                    <Text variant="h2" weight="semibold">
                      {title}
                    </Text>
                  )}
                  
                  {showCloseButton && (
                    <TouchableOpacity onPress={onClose}>
                      <Text variant="h3" color="secondary">×</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
              
              {children}
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </RNModal>
  );
};