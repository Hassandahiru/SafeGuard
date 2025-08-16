import React from 'react';
import { View } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { Text } from './Text';
import { Button } from './Button';

export interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  retryText?: string;
  fullScreen?: boolean;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Something went wrong',
  message,
  onRetry,
  retryText = 'Try Again',
  fullScreen = false,
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
        backgroundColor: theme.colors.background,
        padding: theme.spacing.lg,
        zIndex: 999,
      }
    : {
        justifyContent: 'center' as const,
        alignItems: 'center' as const,
        padding: theme.spacing.lg,
      };

  return (
    <View style={containerStyle}>
      <Text 
        variant="h2" 
        weight="semibold" 
        style={{ 
          marginBottom: theme.spacing.sm,
          textAlign: 'center'
        }}
      >
        {title}
      </Text>
      
      <Text 
        variant="body" 
        color="secondary" 
        style={{ 
          marginBottom: theme.spacing.lg,
          textAlign: 'center',
          maxWidth: 280
        }}
      >
        {message}
      </Text>
      
      {onRetry && (
        <Button 
          title={retryText}
          variant="primary"
          onPress={onRetry}
        />
      )}
    </View>
  );
};