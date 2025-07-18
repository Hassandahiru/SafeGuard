import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { Text } from '../atoms/Text';

export interface ListItemProps {
  title: string;
  subtitle?: string;
  leftComponent?: React.ReactNode;
  rightComponent?: React.ReactNode;
  onPress?: () => void;
  disabled?: boolean;
  showBorder?: boolean;
}

export const ListItem: React.FC<ListItemProps> = ({
  title,
  subtitle,
  leftComponent,
  rightComponent,
  onPress,
  disabled = false,
  showBorder = true,
}) => {
  const { theme } = useTheme();
  
  const itemStyle = {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.background,
    borderBottomWidth: showBorder ? 1 : 0,
    borderBottomColor: theme.colors.border.light,
    opacity: disabled ? 0.6 : 1,
  };
  
  const contentStyle = {
    flex: 1,
    marginLeft: leftComponent ? theme.spacing.sm : 0,
    marginRight: rightComponent ? theme.spacing.sm : 0,
  };

  const Component = onPress ? TouchableOpacity : View;

  return (
    <Component 
      style={itemStyle} 
      onPress={onPress}
      disabled={disabled}
    >
      {leftComponent}
      
      <View style={contentStyle}>
        <Text variant="body" weight="medium">
          {title}
        </Text>
        {subtitle && (
          <Text variant="caption" color="secondary" style={{ marginTop: 2 }}>
            {subtitle}
          </Text>
        )}
      </View>
      
      {rightComponent}
    </Component>
  );
};