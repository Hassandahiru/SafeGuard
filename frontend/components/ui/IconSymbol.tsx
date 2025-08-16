import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { SymbolWeight, SymbolView } from 'expo-symbols';
import React from 'react';
import { Platform, StyleProp, ViewStyle } from 'react-native';

const MAPPING = {
  'house.fill': 'home',
  'paperplane.fill': 'send',
  'person.fill': 'person',
} as const;

export type IconSymbolName = keyof typeof MAPPING;

interface IconSymbolProps {
  name: IconSymbolName;
  size?: number;
  color?: string;
  style?: StyleProp<ViewStyle>;
  weight?: SymbolWeight;
}

export function IconSymbol({ name, size = 24, color, style, weight = 'regular' }: IconSymbolProps) {
  if (Platform.OS === 'ios') {
    return (
      <SymbolView
        weight={weight}
        tintColor={color}
        resizeMode="scaleAspectFit"
        name={name}
        style={[
          {
            width: size,
            height: size,
          },
          style,
        ]}
      />
    );
  } else {
    return (
      <MaterialIcons
        color={color}
        size={size}
        name={MAPPING[name]}
        style={style}
      />
    );
  }
}