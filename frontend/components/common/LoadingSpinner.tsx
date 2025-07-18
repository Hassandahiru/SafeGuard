import React from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { Text } from '../atoms/Text';
import { useTheme } from '../../context/ThemeContext';

export interface LoadingSpinnerProps {
  size?: 'small' | 'large';
  message?: string;
  overlay?: boolean;
  color?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'large',
  message,
  overlay = false,
  color,
}) => {
  const { theme } = useTheme();

  const containerStyle = overlay 
    ? [styles.overlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]
    : styles.container;

  return (
    <View style={containerStyle}>
      <View style={[styles.content, { backgroundColor: overlay ? theme.colors.background : 'transparent' }]}>
        <ActivityIndicator 
          size={size} 
          color={color || theme.colors.primary} 
        />
        {message && (
          <Text 
            style={[styles.message, { color: overlay ? theme.colors.text : theme.colors.secondary }]}
          >
            {message}
          </Text>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  content: {
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    minWidth: 120,
  },
  message: {
    marginTop: 12,
    textAlign: 'center',
    fontSize: 14,
  },
});