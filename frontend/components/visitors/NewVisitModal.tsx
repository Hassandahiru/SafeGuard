import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Animated, TouchableOpacity, Dimensions } from 'react-native';
import { Text } from '../atoms/Text';
import { VisitorInviteForm } from './VisitorInviteForm';
import { Ionicons } from '@expo/vector-icons';

interface NewVisitModalProps {
  visible: boolean;
  onClose: () => void;
  onVisitCreated?: (visitData: any) => void;
}

export const NewVisitModal: React.FC<NewVisitModalProps> = ({
  visible,
  onClose,
  onVisitCreated,
}) => {
  const [translateY] = useState(new Animated.Value(Dimensions.get('window').height));
  const [opacity] = useState(new Animated.Value(0));

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: Dimensions.get('window').height,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  if (!visible) return null;

  const handleVisitSuccess = (visitData: any) => {
    onVisitCreated?.(visitData);
    onClose();
  };

  return (
    <View style={styles.overlay}>
      <Animated.View style={[styles.backdrop, { opacity }]}>
        <TouchableOpacity style={styles.backdropTouch} onPress={onClose} />
      </Animated.View>
      
      <Animated.View style={[styles.modal, { transform: [{ translateY }] }]}>
        <View style={styles.header}>
          <Text variant="h2" style={styles.title}>
            New Visit
          </Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#666" />
          </TouchableOpacity>
        </View>
        
        <View style={styles.content}>
          <VisitorInviteForm
            onSuccess={handleVisitSuccess}
            onCancel={onClose}
          />
        </View>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  backdropTouch: {
    flex: 1,
  },
  modal: {
    position: 'absolute',
    top: 60,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -8,
    },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E1E8ED',
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1F2937',
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
});