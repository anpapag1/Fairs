import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Picker } from '@react-native-picker/picker';
import { Ionicons } from '@expo/vector-icons';
import { useCurrency } from '../context/CurrencyContext';
import { useTheme } from '../context/ThemeContext';
import { MAIN, ACCENT } from '../context/ThemeContext';

export default function SettingsScreen({ navigation }) {
  const { currencyCode, setCurrencyCode, currencies } = useCurrency();
  const { theme, themeMode, setThemeMode } = useTheme();

  const themeOptions = [
    { id: 'light',  label: 'Light',  icon: 'sunny'               },
    { id: 'dark',   label: 'Dark',   icon: 'moon'                },
    { id: 'system', label: 'System', icon: 'phone-portrait-outline' },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['bottom']}>
      <StatusBar backgroundColor={MAIN} barStyle="light-content" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.8}
        >
          <Ionicons name="chevron-back" size={26} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>

        {/* Appearance */}
        <View style={[styles.section, { backgroundColor: theme.surfaceVariant, shadowColor: theme.shadow }]}>
          <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Appearance</Text>
          <Text style={[styles.sectionDescription, { color: theme.textSecondary }]}>
            Choose your preferred theme
          </Text>

          <View style={styles.themeOptions}>
            {themeOptions.map(opt => {
              const isActive = themeMode === opt.id;
              return (
                <TouchableOpacity
                  key={opt.id}
                  style={[
                    styles.themeOption,
                    { borderColor: theme.outline, backgroundColor: theme.surfaceContainerHigh },
                    isActive && { backgroundColor: theme.primaryContainer, borderColor: MAIN },
                  ]}
                  onPress={() => setThemeMode(opt.id)}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name={opt.icon}
                    size={26}
                    color={isActive ? MAIN : theme.textSecondary}
                  />
                  <Text style={[
                    styles.themeOptionText,
                    { color: isActive ? MAIN : theme.textSecondary },
                    isActive && { fontFamily: 'Ysabeau-Bold', fontWeight: '700' },
                  ]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Currency */}
        <View style={[styles.section, { backgroundColor: theme.surfaceVariant, shadowColor: theme.shadow }]}>
          <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Currency</Text>
          <Text style={[styles.sectionDescription, { color: theme.textSecondary }]}>
            Select your preferred currency for displaying amounts
          </Text>
          <View style={[styles.pickerContainer, { backgroundColor: theme.surfaceContainer, borderColor: theme.outline }]}>
            <Picker
              selectedValue={currencyCode}
              onValueChange={(itemValue) => setCurrencyCode(itemValue)}
              style={[styles.picker, { color: theme.textPrimary }]}
              dropdownIconColor={theme.textSecondary}
            >
              {currencies.map((currency) => (
                <Picker.Item
                  key={currency.code}
                  label={`${currency.symbol} ${currency.code} - ${currency.name}`}
                  value={currency.code}
                />
              ))}
            </Picker>
          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  // ── Header ──────────────────────────────────────────────
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: MAIN,
    paddingHorizontal: 12,
    paddingTop: 30,
    paddingBottom: 14,
    gap: 8,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  headerTitle: {
    flex: 1,
    fontFamily: 'Ysabeau-Bold',
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  headerRight: {
    width: 40,
  },

  // ── Content ──────────────────────────────────────────────
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingVertical: 16,
    paddingBottom: 32,
  },

  // ── Section card ─────────────────────────────────────────
  section: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 20,
    padding: 22,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.10,
    shadowRadius: 12,
    elevation: 3,
  },
  sectionTitle: {
    fontFamily: 'Ysabeau-Bold',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 6,
    letterSpacing: 0.1,
  },
  sectionDescription: {
    fontFamily: 'Ysabeau-Regular',
    fontSize: 14,
    marginBottom: 20,
    lineHeight: 20,
    letterSpacing: 0.2,
  },

  // ── Theme selector ───────────────────────────────────────
  themeOptions: {
    flexDirection: 'row',
    gap: 10,
  },
  themeOption: {
    flex: 1,
    paddingVertical: 18,
    borderWidth: 2,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  themeOptionText: {
    fontFamily: 'Ysabeau-Regular',
    fontSize: 13,
    fontWeight: '500',
    letterSpacing: 0.4,
  },

  // ── Currency picker ──────────────────────────────────────
  pickerContainer: {
    borderWidth: 1,
    borderRadius: 14,
    overflow: 'hidden',
  },
  picker: {
    height: 52,
  },
});

