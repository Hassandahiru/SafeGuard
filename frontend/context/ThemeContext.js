import React, { createContext, useContext } from 'react';
import { theme } from '../constants/theme';

const ThemeContext = createContext();

export const ThemeProvider = ({ children, isDark = false }) => {
  return (
    <ThemeContext.Provider value={{ theme, isDark }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};