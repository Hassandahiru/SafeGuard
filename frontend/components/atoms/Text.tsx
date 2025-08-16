import React from 'react';
import { Text as RNText, TextProps as RNTextProps } from 'react-native';
import { useTheme } from '../../context/ThemeContext';

export interface TextProps extends RNTextProps {
  variant?: 'h1' | 'h2' | 'h3' | 'body' | 'caption';
  color?: 'primary' | 'secondary' | 'accent' | 'error' | 'success' | 'warning';
  weight?: 'normal' | 'medium' | 'semibold' | 'bold';
}

export const Text: React.FC<TextProps> = ({
  variant = 'body',
  color = 'primary',
  weight = 'normal',
  style,
  children,
  ...props
}) => {
  const { theme } = useTheme();
  
  const getTextStyle = () => {
    const variantStyles = {
      h1: { fontSize: theme.typography.fontSizes.xxxl, lineHeight: theme.typography.lineHeights.xxxl },
      h2: { fontSize: theme.typography.fontSizes.xxl, lineHeight: theme.typography.lineHeights.xxl },
      h3: { fontSize: theme.typography.fontSizes.xl, lineHeight: theme.typography.lineHeights.xl },
      body: { fontSize: theme.typography.fontSizes.md, lineHeight: theme.typography.lineHeights.md },
      caption: { fontSize: theme.typography.fontSizes.sm, lineHeight: theme.typography.lineHeights.sm },
    };
    
    const colorStyles = {
      primary: { color: theme.colors.text },
      secondary: { color: theme.colors.textSecondary },
      accent: { color: theme.colors.accent },
      error: { color: theme.colors.error },
      success: { color: theme.colors.success },
      warning: { color: theme.colors.warning },
    };
    
    const weightStyles = {
      normal: { fontWeight: theme.typography.fontWeights.normal },
      medium: { fontWeight: theme.typography.fontWeights.medium },
      semibold: { fontWeight: theme.typography.fontWeights.semibold },
      bold: { fontWeight: theme.typography.fontWeights.bold },
    };
    
    return [
      variantStyles[variant],
      colorStyles[color],
      weightStyles[weight],
    ];
  };
  
  // Filter out any non-string children to prevent text node errors
  const filteredChildren = React.Children.toArray(children).filter(child => {
    if (typeof child === 'string') {
      return child.trim() !== '';
    }
    return child !== null && child !== undefined;
  });
  
  return (
    <RNText
      style={[getTextStyle(), style]}
      {...props}
    >
      {filteredChildren}
    </RNText>
  );
};

