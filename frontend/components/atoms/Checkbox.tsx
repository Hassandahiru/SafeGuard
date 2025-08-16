import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { Text } from './Text';

export interface CheckboxProps {
  label?: string;
  checked: boolean;
  onToggle: () => void;
  disabled?: boolean;
  size?: 'small' | 'medium' | 'large';
}

export const Checkbox: React.FC<CheckboxProps> = ({
  label,
  checked,
  onToggle,
  disabled = false,
  size = 'medium',
}) => {
  const { theme } = useTheme();
  
  const sizeMap = {
    small: 16,
    medium: 20,
    large: 24,
  };
  
  const checkboxSize = sizeMap[size];
  
  const checkboxStyle = {
    width: checkboxSize,
    height: checkboxSize,
    borderWidth: 2,
    borderColor: checked ? theme.colors.accent : theme.colors.border.light,
    backgroundColor: checked ? theme.colors.accent : 'transparent',
    borderRadius: theme.borderRadius.sm,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    opacity: disabled ? 0.6 : 1,
  };
  
  const containerStyle = {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    opacity: disabled ? 0.6 : 1,
  };

  return (
    <TouchableOpacity 
      style={containerStyle} 
      onPress={onToggle}
      disabled={disabled}
    >
      <View style={checkboxStyle}>
        {checked && (
          <Text 
            variant="caption" 
            style={{ 
              color: theme.colors.background, 
              fontSize: checkboxSize * 0.6,
              fontWeight: 'bold'
            }}
          >
            ✓
          </Text>
        )}
      </View>
      
      {label && (
        <Text 
          variant="body" 
          style={{ 
            marginLeft: theme.spacing.sm,
            flex: 1 
          }}
        >
          {label}
        </Text>
      )}
    </TouchableOpacity>
  );
};