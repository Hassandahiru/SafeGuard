import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { Text } from '../atoms/Text';

export interface FooterProps {
  showBorder?: boolean;
  backgroundColor?: string;
}

export const Footer: React.FC<FooterProps> = ({
  showBorder = true,
  backgroundColor,
}) => {
  const { theme } = useTheme();
  
  const footerStyle = {
    backgroundColor: backgroundColor || theme.colors.background,
    borderTopWidth: showBorder ? 1 : 0,
    borderTopColor: theme.colors.border.light,
    padding: theme.spacing.md,
    alignItems: 'center' as const,
  };
  
  return (
    <View style={footerStyle}>
      <Text variant="caption" color="secondary">
        © 2024 Your App Name
      </Text>
    </View>
  );
};