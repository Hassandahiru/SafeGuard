import React from 'react';
import { View, StyleSheet, ViewProps } from 'react-native';
import { useTheme } from '../../context/ThemeContext';

export interface CardProps extends ViewProps {
  variant?: 'elevated' | 'outlined' | 'filled';
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export const Card: React.FC<CardProps> = ({
  variant = 'elevated',
  padding = 'md',
  style,
  children,
  ...props
}) => {
  const { theme } = useTheme();
  
  const getCardStyle = () => {
    const base = {
      borderRadius: theme.borderRadius.md,
      backgroundColor: theme.colors.background,
    };
    
    const variantStyles = {
      elevated: theme.shadows.md,
      outlined: {
        borderWidth: 1,
        borderColor: theme.colors.border.light,
      },
      filled: {
        backgroundColor: theme.colors.surface,
      },
    };
    
    const paddingStyles = {
      none: {},
      sm: { padding: theme.spacing.sm },
      md: { padding: theme.spacing.md },
      lg: { padding: theme.spacing.lg },
    };
    
    return [
      base,
      variantStyles[variant],
      paddingStyles[padding],
    ];
  };
  
  return (
    <View style={[getCardStyle(), style]} {...props}>
      {children}
    </View>
  );
};