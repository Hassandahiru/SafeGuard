import React from 'react';
import { TouchableOpacity, Text, StyleSheet, TouchableOpacityProps, View } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';

export interface ButtonProps extends TouchableOpacityProps {
  title: string;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'small' | 'medium' | 'large';
  fullWidth?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  iconPosition?: 'left' | 'right';
  loading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  variant = 'primary',
  size = 'medium',
  fullWidth = false,
  icon,
  iconPosition = 'left',
  loading = false,
  disabled,
  style,
  ...props
}) => {
  const { theme } = useTheme();
  
  const getButtonStyle = () => {
    const baseStyle = {
      borderRadius: theme.borderRadius.lg,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      flexDirection: 'row' as const,
      minHeight: size === 'small' ? 36 : size === 'large' ? 56 : 48,
      paddingHorizontal: size === 'small' ? theme.spacing.md : 
                        size === 'large' ? theme.spacing.xl : theme.spacing.lg,
      paddingVertical: size === 'small' ? theme.spacing.xs : 
                      size === 'large' ? theme.spacing.md : theme.spacing.sm,
      shadowOffset: { width: 0, height: 2 },
      shadowRadius: 4,
    };
    
    let variantStyle = {};
    switch (variant) {
      case 'primary':
        variantStyle = { 
          backgroundColor: theme.colors.primary,
          shadowColor: theme.colors.primary,
          shadowOpacity: 0.15,
          elevation: 3,
        };
        break;
      case 'secondary':
        variantStyle = { 
          backgroundColor: theme.colors.secondary,
          shadowColor: theme.colors.secondary,
          shadowOpacity: 0.15,
          elevation: 3,
        };
        break;
      case 'outline':
        variantStyle = { 
          backgroundColor: 'transparent',
          borderWidth: 2,
          borderColor: theme.colors.primary,
          shadowOpacity: 0,
          elevation: 0,
        };
        break;
      case 'ghost':
        variantStyle = {
          backgroundColor: 'transparent',
          shadowOpacity: 0,
          elevation: 0,
        };
        break;
      case 'danger':
        variantStyle = {
          backgroundColor: theme.colors.error,
          shadowColor: theme.colors.error,
          shadowOpacity: 0.15,
          elevation: 3,
        };
        break;
    }
    
    const disabledStyle = (disabled || loading) ? {
      opacity: 0.5,
      shadowOpacity: 0,
      elevation: 0,
    } : {};
    
    const widthStyle = fullWidth ? { width: '100%' as const } : {};
    
    return StyleSheet.flatten([
      baseStyle,
      variantStyle,
      disabledStyle,
      widthStyle,
    ]);
  };
  
  const getTextStyle = () => {
    const base = {
      fontSize: size === 'small' ? theme.typography.fontSizes.sm : 
                size === 'large' ? theme.typography.fontSizes.lg : 
                theme.typography.fontSizes.md,
      fontWeight: theme.typography.fontWeights.semibold as any,
      textAlign: 'center' as const,
    };
    
    const textColors = {
      primary: '#FFFFFF',
      secondary: '#FFFFFF',
      outline: theme.colors.primary,
      ghost: theme.colors.primary,
      danger: '#FFFFFF',
    };
    
    return [base, { color: textColors[variant] }];
  };
  
  const getIconSize = () => {
    return size === 'small' ? 16 : size === 'large' ? 24 : 20;
  };
  
  const getIconColor = () => {
    const iconColors = {
      primary: '#FFFFFF',
      secondary: '#FFFFFF', 
      outline: theme.colors.primary,
      ghost: theme.colors.primary,
      danger: '#FFFFFF',
    };
    return iconColors[variant];
  };
  
  const renderContent = () => {
    if (loading) {
      return (
        <>
          <Ionicons 
            name="refresh" 
            size={getIconSize()} 
            color={getIconColor()}
            style={{ 
              marginRight: title ? 8 : 0,
              transform: [{ rotate: '360deg' }] // Simple loading indicator
            }} 
          />
          {title && <Text style={getTextStyle()}>{title}</Text>}
        </>
      );
    }
    
    if (icon && iconPosition === 'left') {
      return (
        <>
          <Ionicons 
            name={icon} 
            size={getIconSize()} 
            color={getIconColor()}
            style={{ marginRight: title ? 8 : 0 }} 
          />
          {title && <Text style={getTextStyle()}>{title}</Text>}
        </>
      );
    }
    
    if (icon && iconPosition === 'right') {
      return (
        <>
          {title && <Text style={getTextStyle()}>{title}</Text>}
          <Ionicons 
            name={icon} 
            size={getIconSize()} 
            color={getIconColor()}
            style={{ marginLeft: title ? 8 : 0 }} 
          />
        </>
      );
    }
    
    return <Text style={getTextStyle()}>{title}</Text>;
  };
  
  return (
    <TouchableOpacity
      style={[getButtonStyle(), style]}
      disabled={disabled || loading}
      activeOpacity={0.7}
      {...props}
    >
      {renderContent()}
    </TouchableOpacity>
  );
};

