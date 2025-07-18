import { BlurView } from 'expo-blur';
import React from 'react';
import { Platform, StyleSheet } from 'react-native';

export default function TabBarBackground() {
  return Platform.OS === 'ios' ? (
    <BlurView 
      tint="default" 
      intensity={95} 
      style={StyleSheet.absoluteFillObject} 
    />
  ) : null;
}