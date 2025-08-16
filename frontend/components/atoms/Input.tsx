import React, { useState } from 'react';
import { TextInput, View, StyleSheet, TextInputProps, Animated } from 'react-native';
import { Text } from './Text';

export interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  variant?: 'default' | 'outlined' | 'filled';
  size?: 'small' | 'medium' | 'large';
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  variant = 'default',
  size = 'medium',
  style,
  ...props
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const borderColorAnim = new Animated.Value(0);

  const handleFocus = () => {
    setIsFocused(true);
    Animated.timing(borderColorAnim, {
      toValue: 1,
      duration: 200,
      useNativeDriver: false,
    }).start();
  };

  const handleBlur = () => {
    setIsFocused(false);
    Animated.timing(borderColorAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  };

  const borderColor = borderColorAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['#E1E8ED', '#2563EB'],
  });

  return (
    <View style={styles.container}>
      {label && (
        <Text variant="caption" weight="medium" style={styles.label}>
          {label}
        </Text>
      )}
      <Animated.View style={[
        styles.inputWrapper,
        { borderColor: error ? '#EF4444' : borderColor }
      ]}>
        <TextInput
          style={[
            styles.base,
            styles[variant],
            styles[size],
            style,
          ]}
          placeholderTextColor="#AAB8C2"
          onFocus={handleFocus}
          onBlur={handleBlur}
          {...props}
        />
      </Animated.View>
      {error && (
        <Text variant="caption" color="error" style={styles.errorText}>
          {error}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 0,
  },
  label: {
    marginBottom: 6,
    fontSize: 14,
    fontWeight: '500',
    color: '#657786',
    letterSpacing: 0.25,
  },
  inputWrapper: {
    borderRadius: 12,
    borderWidth: 1.5,
    backgroundColor: '#FAFBFC',
    shadowColor: 'rgba(0,0,0,0.04)',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 1,
    shadowRadius: 3,
    elevation: 1,
  },
  base: {
    fontSize: 16,
    color: '#14171A',
    fontWeight: '400',
    paddingHorizontal: 16,
    paddingVertical: 0,
  },
  default: {
    backgroundColor: 'transparent',
  },
  outlined: {
    backgroundColor: 'transparent',
  },
  filled: {
    backgroundColor: 'transparent',
  },
  small: {
    height: 36,
  },
  medium: {
    height: 56,
  },
  large: {
    height: 52,
  },
  errorText: {
    marginTop: 6,
    marginLeft: 4,
    fontSize: 13,
    color: '#EF4444',
    fontWeight: '500',
  },
});