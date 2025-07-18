import React, { useState } from 'react';
import { View, TouchableOpacity, Modal, FlatList } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { Text } from './Text';

export interface SelectOption {
  label: string;
  value: string;
}

export interface SelectProps {
  label?: string;
  placeholder?: string;
  options: SelectOption[];
  value?: string;
  onSelect: (value: string) => void;
  error?: string;
  disabled?: boolean;
}

export const Select: React.FC<SelectProps> = ({
  label,
  placeholder = 'Select an option',
  options,
  value,
  onSelect,
  error,
  disabled = false,
}) => {
  const { theme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  
  const selectedOption = options.find(option => option.value === value);
  
  const selectStyle = {
    borderWidth: 1,
    borderColor: error ? theme.colors.error : theme.colors.border.light,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    backgroundColor: disabled ? theme.colors.disabled : theme.colors.background,
    opacity: disabled ? 0.6 : 1,
  };
  
  const modalStyle = {
    backgroundColor: theme.colors.background,
    margin: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    ...theme.shadows.lg,
  };
  
  const optionStyle = {
    padding: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border.light,
  };

  return (
    <View>
      {label && (
        <Text variant="body" weight="medium" style={{ marginBottom: theme.spacing.xs }}>
          {label}
        </Text>
      )}
      
      <TouchableOpacity 
        style={selectStyle} 
        onPress={() => !disabled && setIsOpen(true)}
        disabled={disabled}
      >
        <Text variant="body" color={selectedOption ? 'primary' : 'secondary'}>
          {selectedOption?.label || placeholder}
        </Text>
      </TouchableOpacity>
      
      {error && (
        <Text variant="caption" color="error" style={{ marginTop: theme.spacing.xs }}>
          {error}
        </Text>
      )}
      
      <Modal
        visible={isOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsOpen(false)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center' }}>
          <View style={modalStyle}>
            <Text variant="h3" weight="semibold" style={{ marginBottom: theme.spacing.md }}>
              Select Option
            </Text>
            
            <FlatList
              data={options}
              keyExtractor={(item) => item.value}
              renderItem={({ item, index }) => (
                <TouchableOpacity
                  style={[
                    optionStyle,
                    index === options.length - 1 && { borderBottomWidth: 0 }
                  ]}
                  onPress={() => {
                    onSelect(item.value);
                    setIsOpen(false);
                  }}
                >
                  <Text variant="body">{item.label}</Text>
                </TouchableOpacity>
              )}
            />
            
            <TouchableOpacity
              style={{ marginTop: theme.spacing.md, padding: theme.spacing.sm }}
              onPress={() => setIsOpen(false)}
            >
              <Text variant="body" color="secondary" style={{ textAlign: 'center' }}>
                Cancel
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};