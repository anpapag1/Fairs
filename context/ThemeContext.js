import React, { createContext, useState, useContext, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ThemeContext = createContext();

const THEME_STORAGE_KEY = '@fairs_theme';

// ─────────────────────────────────────────────────────────────
// Brand constants — fixed regardless of light/dark mode
// ─────────────────────────────────────────────────────────────
export const MAIN       = '#B953D3';
export const ACCENT     = '#56026B';
export const SEARCH_BAR = '#CA95D7';
export const DONE       = '#7FB57F';

// ─────────────────────────────────────────────────────────────
// All tokens derived from the Figma design palette (Mode 1)
// MAIN = #B953D3  |  ACCENT = #56026B  |  DONE = #7FB57F
// ─────────────────────────────────────────────────────────────

export const darkTheme = {
  // Brand (same in both modes)
  main:                 '#B953D3',
  accent:               '#56026B',
  searchBar:            '#CA95D7',
  done:                 '#7FB57F',
  primary:              '#B953D3',   // MAIN — used for accent text, active states
  onPrimary:            '#FFFFFF',
  primaryContainer:     '#B594BD',   // DARK.MAIN_VAR — icon container backgrounds

  // Backgrounds
  background:           '#2C1631',   // DARK.BG — screen background
  onBackground:         '#FFFFFF',
  surface:              '#875f8d',   // DARK.MAIN_VAR_SEC — cards, list rows
  onSurface:            '#FFFFFF',

  // Containers / variants
  surfaceVariant:       '#3D2048',   // Slightly lighter than BG — sections, modal bg
  onSurfaceVariant:     'rgba(255,255,255,0.70)',
  surfaceContainer:     '#3A1D45',   // List headers, segmented areas
  surfaceContainerHigh: 'rgba(255,255,255,0.10)', // Filter chip bg, subtle fills

  // Borders
  outline:              'rgba(255,255,255,0.22)',
  outlineVariant:       'rgba(255,255,255,0.10)',

  // Text
  textPrimary:          '#FFFFFF',
  textSecondary:        'rgba(255,255,255,0.55)',
  textDisabled:         'rgba(255,255,255,0.30)',

  // Semantic colours
  success:              '#249b24',   // DONE
  onSuccess:            '#FFFFFF',
  successContainer:     '#35ec3538',
  onSuccessContainer:   '#7FB57F',

  warning:              '#FF9900',
  onWarning:            '#FFFFFF',
  warningContainer:     '#BA1A1A',   // Delete red
  onWarningContainer:   '#FFFFFF',

  shadow:               '#000000',
};

export const lightTheme = {
  // Brand (same in both modes)
  main:                 '#B953D3',
  accent:               '#56026B',
  searchBar:            '#CA95D7',
  done:                 '#7FB57F',
  primary:              '#B953D3',
  onPrimary:            '#FFFFFF',
  primaryContainer:     '#D9A8E8',   // Light lavender — icon container bg

  // Backgrounds
  background:           '#FAF5FC',   // Soft lavender-white — screen background
  onBackground:         '#1C0A24',
  surface:              '#F0E5F6',   // Light purple tint — cards, list rows
  onSurface:            '#1C0A24',

  // Containers / variants
  surfaceVariant:       '#E8D8F0',   // Slightly deeper — sections, modal bg
  onSurfaceVariant:     'rgba(28,10,36,0.70)',
  surfaceContainer:     '#E1CEEA',   // List headers, segmented areas
  surfaceContainerHigh: 'rgba(185,83,211,0.10)', // Filter chip bg, subtle fills

  // Borders
  outline:              'rgba(28,10,36,0.20)',
  outlineVariant:       'rgba(28,10,36,0.10)',

  // Text
  textPrimary:          '#1C0A24',
  textSecondary:        'rgba(28,10,36,0.55)',
  textDisabled:         'rgba(28,10,36,0.30)',

  // Semantic colours
  success:              '#249b24',
  onSuccess:            '#FFFFFF',
  successContainer:     '#1a791a63',
  onSuccessContainer:   '#1A5C1A',

  warning:              '#FF9900',
  onWarning:            '#FFFFFF',
  warningContainer:     '#BA1A1A',
  onWarningContainer:   '#FFFFFF',

  shadow:               '#000000',
};

export function ThemeProvider({ children }) {
  const systemColorScheme = useColorScheme();
  const [themeMode, setThemeMode] = useState('system'); // 'light', 'dark', or 'system'
  
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
    // If system mode, use the system's color scheme
    const effectiveMode = themeMode === 'system' ? systemColorScheme : themeMode;
    return effectiveMode === 'dark' ? darkTheme : lightTheme;
  };
  
  const isDark = () => {
    const effectiveMode = themeMode === 'system' ? systemColorScheme : themeMode;
    return effectiveMode === 'dark';
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
