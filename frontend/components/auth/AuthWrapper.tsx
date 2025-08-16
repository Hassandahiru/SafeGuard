import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { LoginScreen } from './LoginScreen';
import { RegisterScreen } from './RegisterScreen';

type AuthScreen = 'login' | 'register';

interface AuthWrapperProps {
  children: React.ReactNode;
}

export const AuthWrapper: React.FC<AuthWrapperProps> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();
  const [currentScreen, setCurrentScreen] = useState<AuthScreen>('login');

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <LoadingSpinner message="Loading..." />
      </View>
    );
  }

  if (!isAuthenticated) {
    return currentScreen === 'login' ? (
      <LoginScreen onNavigateToRegister={() => setCurrentScreen('register')} />
    ) : (
      <RegisterScreen onNavigateToLogin={() => setCurrentScreen('login')} />
    );
  }

  return <>{children}</>;
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});