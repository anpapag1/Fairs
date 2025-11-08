import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Picker } from '@react-native-picker/picker';
import { useCurrency } from '../context/CurrencyContext';
import { useTheme } from '../context/ThemeContext';

export default function SettingsScreen({ navigation }) {
  const { currencyCode, setCurrencyCode, currencies } = useCurrency();
  const { theme, isDark, themeMode, setThemeMode } = useTheme();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      <View style={[styles.header, { backgroundColor: theme.background }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={[styles.backButton, { backgroundColor: theme.surfaceContainer }]}>
          <Text style={[styles.backArrow, { color: theme.primary }]}>←</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.onBackground }]}>Settings</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content}>
        {/* Theme Section */}
        <View style={[styles.section, { backgroundColor: theme.surfaceVariant, shadowColor: theme.shadow }]}>
          <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Appearance</Text>
          <Text style={[styles.sectionDescription, { color: theme.textSecondary }]}>
            Choose your preferred theme
          </Text>
          
          <View style={styles.themeOptions}>
            <TouchableOpacity
              style={[
                styles.themeOption,
                { borderColor: theme.outline },
                themeMode === 'light' && { backgroundColor: theme.primaryContainer, borderColor: theme.primary }
              ]}
              onPress={() => setThemeMode('light')}
            >
              <Text style={[
                styles.themeOptionIcon,
                themeMode === 'light' && { color: theme.primary }
              ]}>☀️</Text>
              <Text style={[
                styles.themeOptionText,
                { color: theme.textPrimary },
                themeMode === 'light' && { color: theme.primary, fontWeight: '700', fontFamily: 'Ysabeau-Bold' }
              ]}>Light</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.themeOption,
                { borderColor: theme.outline },
                themeMode === 'dark' && { backgroundColor: theme.primaryContainer, borderColor: theme.primary }
              ]}
              onPress={() => setThemeMode('dark')}
            >
              <Text style={[
                styles.themeOptionIcon,
                themeMode === 'dark' && { color: theme.primary }
              ]}>🌙</Text>
              <Text style={[
                styles.themeOptionText,
                { color: theme.textPrimary },
                themeMode === 'dark' && { color: theme.primary, fontWeight: '700', fontFamily: 'Ysabeau-Bold' }
              ]}>Dark</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Currency Section */}
        <View style={[styles.section, { backgroundColor: theme.surfaceVariant, shadowColor: theme.shadow }]}>
          <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Currency</Text>
          <Text style={[styles.sectionDescription, { color: theme.textSecondary }]}>
            Select your preferred currency for displaying amounts
          </Text>
          <View style={[styles.pickerContainer, { backgroundColor: theme.surfaceContainer }]}>
            <Picker
              selectedValue={currencyCode}
              onValueChange={(itemValue) => setCurrencyCode(itemValue)}
              style={[styles.picker, { color: theme.textPrimary }]}
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
    backgroundColor: '#FEF7FF',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
    paddingTop: 16,
    backgroundColor: '#FEF7FF',
  },
  backButton: {
    padding: 8,
    backgroundColor: '#E8DEF8',
    borderRadius: 20,
    width: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backArrow: {
    fontFamily: 'Ysabeau-SemiBold',
    fontSize: 24,
    fontWeight: '600',
    color: '#6750A4',
  },
  title: {
    fontFamily: 'Ysabeau-Bold',
    fontSize: 36,
    fontWeight: '700',
    color: '#1C1B1F',
    letterSpacing: 0.5,
  },
  placeholder: {
    width: 48,
  },
  content: {
    flex: 1,
  },
  section: {
    padding: 24,
    margin: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  sectionTitle: {
    fontFamily: 'Ysabeau-Bold',
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
    color: '#1C1B1F',
    letterSpacing: 0.15,
  },
  sectionDescription: {
    fontFamily: 'Ysabeau-Regular',
    fontSize: 14,
    color: '#49454F',
    marginBottom: 24,
    fontWeight: '400',
    letterSpacing: 0.25,
    lineHeight: 20,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#79747E',
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
  },
  picker: {
    height: 50,
  },
  themeOptions: {
    flexDirection: 'row',
    gap: 12,
  },
  themeOption: {
    flex: 1,
    padding: 16,
    borderWidth: 2,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  themeOptionIcon: {
    fontFamily: 'Ysabeau-Regular',
    fontSize: 32,
    marginBottom: 8,
  },
  themeOptionText: {
    fontFamily: 'Ysabeau-Regular',
    fontSize: 14,
    fontWeight: '500',
    letterSpacing: 0.5,
  },
});
