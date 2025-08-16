import React from 'react';
import { AuthProvider } from './AuthContext';
import { VisitorProvider } from './VisitorContext';
import { ThemeProvider } from './ThemeContext';

// Combined app context provider
export const AppProvider = ({ children }) => {
  return (
    <ThemeProvider>
      <AuthProvider>
        <VisitorProvider>
          {children}
        </VisitorProvider>
      </AuthProvider>
    </ThemeProvider>
  );
};

// Export all context hooks for convenience
export { useAuth } from './AuthContext';
export { useVisitor } from './VisitorContext';
export { useTheme } from './ThemeContext';