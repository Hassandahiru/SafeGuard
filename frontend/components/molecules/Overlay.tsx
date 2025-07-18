import React from 'react';
import { View, TouchableWithoutFeedback } from 'react-native';
import { useTheme } from '../../context/ThemeContext';

export interface OverlayProps {
  visible: boolean;
  onPress?: () => void;
  opacity?: number;
  color?: string;
  children?: React.ReactNode;
}

export const Overlay: React.FC<OverlayProps> = ({
  visible,
  onPress,
  opacity = 0.5,
  color = 'black',
  children,
}) => {
  const { theme } = useTheme();
  
  if (!visible) return null;
  
  const overlayStyle = {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: `rgba(${color === 'black' ? '0, 0, 0' : '255, 255, 255'}, ${opacity})`,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    zIndex: 998,
  };

  return (
    <TouchableWithoutFeedback onPress={onPress}>
      <View style={overlayStyle}>
        {children}
      </View>
    </TouchableWithoutFeedback>
  );
};