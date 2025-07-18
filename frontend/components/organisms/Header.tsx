import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { Text } from '../atoms/Text';

export interface HeaderProps {
  title: string;
  showBackButton?: boolean;
  onBackPress?: () => void;
  rightComponent?: React.ReactNode;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  showBackButton = false,
  onBackPress,
  rightComponent,
}) => {
  const { theme } = useTheme();
  
  const headerStyle = {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.background,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border.light,
    ...theme.shadows.sm,
  };
  
  const leftSection = {
    flex: 1,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
  };
  
  const centerSection = {
    flex: 2,
    alignItems: 'center' as const,
  };
  
  const rightSection = {
    flex: 1,
    alignItems: 'flex-end' as const,
  };
  
  return (
    <View style={headerStyle}>
      <View style={leftSection}>
        {showBackButton && (
          <TouchableOpacity onPress={onBackPress}>
            <Text variant="body" color="accent">← Back</Text>
          </TouchableOpacity>
        )}
      </View>
      
      <View style={centerSection}>
        <Text variant="h3" weight="semibold">{title}</Text>
      </View>
      
      <View style={rightSection}>
        {rightComponent}
      </View>
    </View>
  );
};