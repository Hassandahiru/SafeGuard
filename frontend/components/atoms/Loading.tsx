import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { Text } from './Text';

export interface LoadingProps {
  size?: 'small' | 'large';
  message?: string;
  fullScreen?: boolean;
  color?: string;
}

export const Loading: React.FC<LoadingProps> = ({
  size = 'large',
  message,
  fullScreen = false,
  color,
}) => {
  const { theme } = useTheme();
  
  const containerStyle = fullScreen 
    ? {
        position: 'absolute' as const,
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'center' as const,
        alignItems: 'center' as const,
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        zIndex: 999,
      }
    : {
        justifyContent: 'center' as const,
        alignItems: 'center' as const,
        padding: theme.spacing.lg,
      };

  return (
    <View style={containerStyle}>
      <ActivityIndicator 
        size={size} 
        color={color || theme.colors.accent} 
      />
      {message && (
        <Text 
          variant="body" 
          color="secondary" 
          style={{ 
            marginTop: theme.spacing.sm,
            textAlign: 'center'
          }}
        >
          {message}
        </Text>
      )}
    </View>
  );
};