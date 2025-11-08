import React, { createContext, useState, useContext, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ThemeContext = createContext();

const THEME_STORAGE_KEY = '@fairs_theme';

// Simplified Color Tokens
export const lightTheme = {
  // Primary
  primary: '#8c00ffff',
  onPrimary: '#FFFFFF',
  primaryContainer: '#c6a5fcff',
  
  // Success
  success: '#198754',
  onSuccess: '#FFFFFF',
  successContainer: '#E8F5E9',
  onSuccessContainer: '#198754',
  
  // Warning 
  warning: '#ff9900ff',
  onWarning: '#FFFFFF',
  warningContainer: '#e74634',
  onWarningContainer: '#000000ff',
  
  // Background
  background: '#e6d8e7ff',
  onBackground: '#1C1B1F',
  
  // Surface
  surface: '#c9bdc9',
  onSurface: '#000000ff',
  surfaceVariant: '#d6bcffff',
  onSurfaceVariant: '#0000007c',
  surfaceContainer: '#c9bdc9',
  surfaceContainerHigh: '#00000030',
  
  // Outline
  outline: '#79747E',
  outlineVariant: '#CAC4D0',

  // Text
  textPrimary: '#000000',
  textSecondary: '#0000007a',
  textDisabled: '#79747E',
  
  // Other
  shadow: '#000000',
};

export const darkTheme = {
  // Primary
  primary: '#ac47ffff',
  onPrimary: '#FFFFFF',
  primaryContainer: '#c6a5fcff',
  
  // Success
  success: '#198754',
  onSuccess: '#FFFFFF',
  successContainer: '#E8F5E9',
  onSuccessContainer: '#198754',
  
  // Warning 
  warning: '#ff9900ff',
  onWarning: '#FFFFFF',
  warningContainer: '#e74634',
  onWarningContainer: '#000000ff',
  
  // Background
  background: '#2D1B3D',
  onBackground: '#d9d9daff',
  
  // Surface
  surface: '#473755',
  onSurface: '#000000ff',
  surfaceVariant: '#653b86ff',
  onSurfaceVariant: '#0000007c',
  surfaceContainer: '#473755',
  surfaceContainerHigh: '#00000030',

  // Outline
  outline: '#3c3742ff',
  outlineVariant: '#553972ff',

  // Text
  textPrimary: '#ffffffff',
  textSecondary: '#ffffff7a',
  textDisabled: '#79747E',
  
  // Other
  shadow: '#000000',
};

export function ThemeProvider({ children }) {
  const systemColorScheme = useColorScheme();
  const [themeMode, setThemeMode] = useState('light'); // 'light' or 'dark'
  
  // Load theme preference on mount
  useEffect(() => {
    loadTheme();
  }, []);

  const loadTheme = async () => {
    try {
      const storedTheme = await AsyncStorage.getItem(THEME_STORAGE_KEY);
      if (storedTheme !== null) {
        setThemeMode(storedTheme);
      }
    } catch (error) {
      console.error('Error loading theme:', error);
    }
  };

  const saveTheme = async (mode) => {
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, mode);
      setThemeMode(mode);
    } catch (error) {
      console.error('Error saving theme:', error);
    }
  };
  
  const getActiveTheme = () => {
    return themeMode === 'dark' ? darkTheme : lightTheme;
  };
  
  const isDark = () => {
    return themeMode === 'dark';
  };

  const value = {
    theme: getActiveTheme(),
    isDark: isDark(),
    themeMode,
    setThemeMode: saveTheme,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
