import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Modal,
  Pressable,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Picker } from '@react-native-picker/picker';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { Platform } from 'react-native';
import { useCurrency } from '../context/CurrencyContext';
import { useTheme } from '../context/ThemeContext';
import { MAIN, ACCENT } from '../context/ThemeContext';
import { useGroups } from '../context/GroupsContext';

export default function SettingsScreen({ navigation }) {
  const { currencyCode, setCurrencyCode, currencies } = useCurrency();
  const { theme, themeMode, setThemeMode } = useTheme();
  const { groups, importGroups } = useGroups();
  const insets = useSafeAreaInsets();

  // ── Import state ─────────────────────────────────────────
  const [importModalVisible, setImportModalVisible] = useState(false);
  const [importableGroups, setImportableGroups] = useState([]);
  const [selectedImportIds, setSelectedImportIds] = useState([]);
  const [importing, setImporting] = useState(false);

  // ── Export ───────────────────────────────────────────────
  const handleExport = async () => {
    try {
      const rawGroups = groups.map(({ total, ...g }) => g);
      const json = JSON.stringify({ version: 1, exported: new Date().toISOString(), groups: rawGroups }, null, 2);
      const filename = `fairs-backup-${new Date().toISOString().slice(0, 10)}.json`;

      if (Platform.OS === 'android') {
        // Let the user pick a folder (e.g. Downloads) and save directly there
        const permissions = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
        if (!permissions.granted) return;
        const uri = await FileSystem.StorageAccessFramework.createFileAsync(
          permissions.directoryUri,
          filename,
          'application/json'
        );
        await FileSystem.writeAsStringAsync(uri, json, { encoding: 'utf8' });
        Alert.alert('Exported', `Saved as ${filename}`);
      } else {
        // iOS: share sheet → Save to Files
        const path = FileSystem.cacheDirectory + filename;
        await FileSystem.writeAsStringAsync(path, json, { encoding: 'utf8' });
        await Sharing.shareAsync(path, { mimeType: 'application/json', dialogTitle: 'Export groups' });
      }
    } catch (e) {
      Alert.alert('Export failed', e.message);
    }
  };

  // ── Import ───────────────────────────────────────────────
  const handleImport = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: 'application/json', copyToCacheDirectory: true });
      if (result.canceled) return;
      const text = await FileSystem.readAsStringAsync(result.assets[0].uri);
      const parsed = JSON.parse(text);
      const incoming = Array.isArray(parsed) ? parsed : parsed.groups;
      if (!Array.isArray(incoming) || incoming.length === 0) {
        Alert.alert('Invalid file', 'No groups found in this file.');
        return;
      }
      setImportableGroups(incoming);
      setSelectedImportIds(incoming.map(g => g.id));
      setImportModalVisible(true);
    } catch (e) {
      Alert.alert('Import failed', 'Could not read the file. Make sure it is a valid Fairs backup.');
    }
  };

  const toggleImportGroup = (id) => {
    setSelectedImportIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const confirmImport = () => {
    setImporting(true);
    const toImport = importableGroups.filter(g => selectedImportIds.includes(g.id));
    importGroups(toImport);
    setImportModalVisible(false);
    setImportableGroups([]);
    setSelectedImportIds([]);
    setImporting(false);
  };

  const themeOptions = [
    { id: 'light',  label: 'Light',  icon: 'sunny'               },
    { id: 'dark',   label: 'Dark',   icon: 'moon'                },
    { id: 'system', label: 'System', icon: 'phone-portrait-outline' },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['bottom']}>
      <StatusBar backgroundColor={MAIN} barStyle="light-content" />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
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

        {/* Data */}
        <View style={[styles.section, { backgroundColor: theme.surfaceVariant, shadowColor: theme.shadow }]}>
          <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Data</Text>
          <Text style={[styles.sectionDescription, { color: theme.textSecondary }]}>
            Back up your groups or restore from a previous backup
          </Text>
          <TouchableOpacity
            style={[styles.dataButton, { backgroundColor: MAIN }]}
            onPress={handleExport}
            activeOpacity={0.85}
          >
            <Ionicons name="share-outline" size={20} color="#fff" />
            <Text style={styles.dataButtonText}>Export groups</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.dataButton, styles.dataButtonSecondary, { borderColor: MAIN }]}
            onPress={handleImport}
            activeOpacity={0.85}
          >
            <Ionicons name="download-outline" size={20} color={MAIN} />
            <Text style={[styles.dataButtonText, { color: MAIN }]}>Import groups</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>

      {/* Import selection modal */}
      <Modal
        transparent
        animationType="fade"
        visible={importModalVisible}
        onRequestClose={() => setImportModalVisible(false)}
      >
        <View style={styles.importModalOverlay}>
          <Pressable style={StyleSheet.absoluteFillObject} onPress={() => setImportModalVisible(false)} />
          <View style={[styles.importModalCard, { backgroundColor: theme.surface }]} onStartShouldSetResponder={() => true}>
            <Text style={[styles.importModalTitle, { color: theme.textPrimary }]}>Select groups to import</Text>
            <Text style={[styles.importModalSub, { color: theme.textSecondary }]}>
              {selectedImportIds.length} of {importableGroups.length} selected
            </Text>
            <ScrollView style={styles.importList} contentContainerStyle={{ paddingBottom: 8 }}>
              {importableGroups.map(g => {
                const checked = selectedImportIds.includes(g.id);
                return (
                  <TouchableOpacity
                    key={g.id}
                    style={[styles.importRow, { borderBottomColor: theme.outlineVariant }]}
                    onPress={() => toggleImportGroup(g.id)}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name={checked ? 'checkbox' : 'square-outline'}
                      size={24}
                      color={checked ? ACCENT : theme.textSecondary}
                    />
                    <View style={{ flex: 1, marginLeft: 14 }}>
                      <Text style={[styles.importRowName, { color: theme.textPrimary }]}>{g.name}</Text>
                      <Text style={[styles.importRowMeta, { color: theme.textSecondary }]}>
                        {g.items?.length ?? 0} items · {g.people?.length ?? 0} people · {g.date}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            <View style={styles.importActions}>
              <TouchableOpacity
                style={[styles.importBtn, { backgroundColor: theme.surfaceVariant }]}
                onPress={() => setImportModalVisible(false)}
              >
                <Text style={[styles.importBtnText, { color: ACCENT }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.importBtn, { backgroundColor: ACCENT }]}
                onPress={confirmImport}
                disabled={selectedImportIds.length === 0 || importing}
              >
                {importing
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={[styles.importBtnText, { color: '#fff' }]}>Import</Text>
                }
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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

  // ── Data section ─────────────────────────────────────────
  dataButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 14,
    borderRadius: 16,
    marginBottom: 10,
  },
  dataButtonSecondary: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    marginBottom: 0,
  },
  dataButtonText: {
    fontFamily: 'Ysabeau-SemiBold',
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    letterSpacing: 0.3,
  },

  // ── Import modal ─────────────────────────────────────────
  importModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  importModalCard: {
    width: '88%',
    maxHeight: '75%',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 12,
  },
  importModalTitle: {
    fontFamily: 'Ysabeau-Bold',
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 4,
  },
  importModalSub: {
    fontFamily: 'Ysabeau-Regular',
    fontSize: 14,
    marginBottom: 16,
  },
  importList: {
    maxHeight: 320,
  },
  importRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  importRowName: {
    fontFamily: 'Ysabeau-SemiBold',
    fontSize: 16,
    fontWeight: '600',
  },
  importRowMeta: {
    fontFamily: 'Ysabeau-Regular',
    fontSize: 13,
    marginTop: 2,
  },
  importActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 20,
  },
  importBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
  },
  importBtnText: {
    fontFamily: 'Ysabeau-SemiBold',
    fontSize: 16,
    fontWeight: '600',
  },
});

