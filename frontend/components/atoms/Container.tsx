import React from 'react';
import { View, ScrollView, ViewProps } from 'react-native';
import { useTheme } from '../../context/ThemeContext';

export interface ContainerProps extends ViewProps {
  scrollable?: boolean;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  centered?: boolean;
}

export const Container: React.FC<ContainerProps> = ({
  scrollable = false,
  padding = 'md',
  centered = false,
  style,
  children,
  ...props
}) => {
  const { theme } = useTheme();
  
  const getContainerStyle = () => {
    const base = {
      flex: 1,
      backgroundColor: theme.colors.background,
    };
    
    const paddingStyles = {
      none: {},
      sm: { padding: theme.spacing.sm },
      md: { padding: theme.spacing.md },
      lg: { padding: theme.spacing.lg },
    };
    
    const centeredStyle = centered ? {
      justifyContent: 'center' as const,
      alignItems: 'center' as const,
    } : {};
    
    return [
      base,
      paddingStyles[padding],
      centeredStyle,
    ];
  };
  
  const WrapperComponent = scrollable ? ScrollView : View;
  
  return (
    <WrapperComponent style={[getContainerStyle(), style]} {...props}>
      {children}
    </WrapperComponent>
  );
};