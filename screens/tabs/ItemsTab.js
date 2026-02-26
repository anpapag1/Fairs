import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  TextInput,
  Modal,
  Animated,
  KeyboardAvoidingView,
  Pressable,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Swipeable } from 'react-native-gesture-handler';
import { useCurrency } from '../../context/CurrencyContext';
import { useGroups } from '../../context/GroupsContext';
import { useTheme } from '../../context/ThemeContext';
import { ACCENT } from '../../context/ThemeContext';
import AppModal, { fieldStyles } from '../../components/AppModal';

// Shorthand so every interactive accent references one constant
const A = ACCENT;

// --- Pure bill text parser (no internet, no state) ---
const SKIP_REGEX = /subtotal|sub.?total|grand.?total|total|tax|vat|gst|discount|service charge|gratuity|tip|balance due|change|cash|credit|debit|thank you|order|table|receipt|invoice|phone|tel\.|address|website|www\.|http|visa|mastercard|amex|card no/i;
const PRICE_REGEX = /(?:[$€£¥]?\s*)(\d{1,4}[.,]\d{2})\s*$/;
const PRICE_ONLY_REGEX = /^[$€£¥]?\s*\d{1,4}[.,]\d{2}\s*$/;
const LEADING_PRICE_REGEX = /^[$€£¥]?\s*(\d{1,4}[.,]\d{2})\b/;

function parseBillText(text) {
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length >= 2);

  // --- Strategy 1: inline (price at end of same line) ---
  const inlineResults = [];
  lines.forEach((line, index) => {
    if (SKIP_REGEX.test(line)) return;
    if (PRICE_ONLY_REGEX.test(line)) return;
    const priceMatch = line.match(PRICE_REGEX);
    if (!priceMatch) return;
    const price = parseFloat(priceMatch[1].replace(',', '.'));
    if (isNaN(price) || price <= 0 || price > 999) return;
    let name = line.slice(0, priceMatch.index)
      .replace(/^[\d]+\s*[x×.)\-]\s*/i, '')
      .replace(/[*•·]+/g, '')
      .trim();
    if (!name || name.length < 2) return;
    inlineResults.push({
      id: `scan_${Date.now()}_${index}`,
      name,
      price: price.toFixed(2),
      selected: true,
    });
  });
  if (inlineResults.length > 0) return inlineResults;

  // --- Strategy 2: split-column (names and prices on separate lines) ---
  // Also handles "price + tax-rate" lines like "0,70 13,00%"
  const nameLines = [];
  const priceLines = [];
  lines.forEach(line => {
    if (SKIP_REGEX.test(line)) return;
    if (/^\d{1,2}[:.\-]\d{2}([:.\-]\d{2,4})?$/.test(line)) return; // times
    if (/^date:/i.test(line)) return;

    const leadingPrice = line.match(LEADING_PRICE_REGEX);
    if (leadingPrice) {
      const price = parseFloat(leadingPrice[1].replace(',', '.'));
      if (!isNaN(price) && price > 0 && price <= 999) {
        priceLines.push(price);
        return;
      }
    }
    // Not a price line — treat as name if it has letters
    if (/[a-zA-Z\u0370-\u03ff\u1f00-\u1fff]/i.test(line)) {
      nameLines.push(line);
    }
  });

  // drop largest prices until counts match (likely totals)
  while (priceLines.length > nameLines.length && priceLines.length > 0) {
    priceLines.splice(priceLines.indexOf(Math.max(...priceLines)), 1);
  }
  const count = Math.min(nameLines.length, priceLines.length);
  const results = [];
  for (let i = 0; i < count; i++) {
    results.push({
      id: `scan_${Date.now()}_${i}`,
      name: nameLines[i],
      price: priceLines[i].toFixed(2),
      selected: true,
    });
  }
  return results;
}

// Defined outside component for perf — no closures over component state
function ReviewItemRow({ item, accent, theme, onToggle, onNameChange, onPriceChange, onDelete }) {
  return (
    <View style={[styles.reviewRow, { backgroundColor: theme.surface }]}>
      <TouchableOpacity
        style={[
          styles.reviewCheckbox,
          {
            borderColor: accent,
            backgroundColor: item.selected ? accent : 'transparent',
          },
        ]}
        onPress={() => onToggle(item.id)}
        activeOpacity={0.7}
      >
        {item.selected && (
          <Ionicons name="checkmark" size={13} color={theme.onPrimary} />
        )}
      </TouchableOpacity>

      <TextInput
        style={[
          styles.reviewNameInput,
          { borderColor: theme.outline, color: theme.textPrimary },
        ]}
        value={item.name}
        onChangeText={(v) => onNameChange(item.id, v)}
        placeholderTextColor={theme.textSecondary}
        placeholder="Item name"
      />

      <TextInput
        style={[
          styles.reviewPriceInput,
          { borderColor: theme.outline, color: theme.textPrimary },
        ]}
        value={item.price}
        onChangeText={(v) => onPriceChange(item.id, v)}
        keyboardType="decimal-pad"
        placeholderTextColor={theme.textSecondary}
        placeholder="0.00"
      />

      <TouchableOpacity
        style={styles.reviewDeleteBtn}
        onPress={() => onDelete(item.id)}
        activeOpacity={0.7}
      >
        <Ionicons name="trash-outline" size={18} color="#BA1A1A" />
      </TouchableOpacity>
    </View>
  );
}

export default function ItemsTab({ route }) {
  const { group } = route.params;
  const { currencySymbol } = useCurrency();
  const { getGroup, updateGroupItems, updateGroupTip } = useGroups();
  const { theme } = useTheme();
  
  const currentGroup = getGroup(group.id);
  const [items, setItems] = useState(currentGroup?.items || []);
  const [modalVisible, setModalVisible] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [newItemPrice, setNewItemPrice] = useState('');
  const [newItemMultiplier, setNewItemMultiplier] = useState('1');
  const [editingItem, setEditingItem] = useState(null);
  const [editItemName, setEditItemName] = useState('');
  const [editItemPrice, setEditItemPrice] = useState('');
  const [multiplierModalVisible, setMultiplierModalVisible] = useState(false);
  const [multiplierItem, setMultiplierItem] = useState(null);
  const [multiplierValue, setMultiplierValue] = useState('');
  const [tipValue, setTipValue] = useState(currentGroup?.tipValue || '');
  const [tipMode, setTipMode] = useState(currentGroup?.tipMode || 'money');
  const [scanSheetVisible, setScanSheetVisible] = useState(false);
  const [scannedItems, setScannedItems] = useState([]);
  const [reviewModalVisible, setReviewModalVisible] = useState(false);
  const [scanLoading, setScanLoading] = useState(false);
  
  // Store refs for all swipeable items
  const swipeableRefs = useRef({});

  // Update items in context whenever local items change
  useEffect(() => {
    updateGroupItems(group.id, items);
  }, [items]);

  // Update tip in context whenever tip changes
  useEffect(() => {
    updateGroupTip(group.id, tipValue, tipMode);
  }, [tipValue, tipMode]);

  const calculateSubtotal = () => {
    return items.reduce((sum, item) => {
      const multiplier = item.multiplier || 1;
      return sum + (parseFloat(item.price) * multiplier);
    }, 0);
  };

  const calculateTip = () => {
    if (!tipValue || isNaN(parseFloat(tipValue))) return 0;
    if (tipMode === 'percent') {
      return (calculateSubtotal() * parseFloat(tipValue)) / 100;
    } else {
      return parseFloat(tipValue);
    }
  };

  const calculateTotal = () => {
    return calculateSubtotal() + calculateTip();
  };

  const handlePickImage = async (source) => {
    try {
      if (source === 'camera') {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission needed', 'Camera permission is required to take a photo.');
          return;
        }
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission needed', 'Photo library permission is required to choose an image.');
          return;
        }
      }

      const result = source === 'camera'
        ? await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.9, allowsEditing: true })
        : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.9, allowsEditing: true });

      if (result.canceled) return;

      setScanLoading(true);
      try {
        const TextRecognition = require('@react-native-ml-kit/text-recognition').default;
        const recognized = await TextRecognition.recognize(result.assets[0].uri);
        const lines = (recognized.blocks || [])
          .flatMap(block => block.lines || [])
          .map(line => line.text || '')
          .filter(Boolean);
        console.log('[BillScan] Raw lines:', JSON.stringify(lines, null, 2));
        const parsed = parseBillText(lines.join('\n'));
        console.log('[BillScan] Parsed items:', JSON.stringify(parsed, null, 2));
        setScanLoading(false);
        if (parsed.length === 0) {
          Alert.alert('No items found', 'Could not detect any items in this bill. Try a clearer photo.');
        } else {
          setScannedItems(parsed);
          setTimeout(() => setReviewModalVisible(true), 350);
        }
      } catch (inner) {
        throw inner;
      }
    } catch (e) {
      setScanLoading(false);
      console.error('[BillScan] Error:', e);
      Alert.alert('Error', e?.message || String(e));
    }
  };

  const addItem = () => {
    if (newItemName.trim() && newItemPrice.trim() && !isNaN(parseFloat(newItemPrice))) {
      const multiplier = parseInt(newItemMultiplier) > 0 ? parseInt(newItemMultiplier) : 1;
      const newItem = {
        id: Date.now().toString(),
        name: newItemName.trim(),
        price: parseFloat(newItemPrice).toFixed(2),
        ...(multiplier > 1 ? { multiplier } : {}),
      };
      setItems([...items, newItem]);
      setNewItemName('');
      setNewItemPrice('');
      setNewItemMultiplier('1');
      setModalVisible(false);
    }
  };

  const deleteItem = (id) => {
    setItems(items.filter(item => item.id !== id));
  };

  const openEditItem = (item) => {
    setEditingItem(item);
    setEditItemName(item.name);
    setEditItemPrice(item.price);
  };

  const saveEditItem = () => {
    if (editItemName.trim() && editItemPrice.trim() && !isNaN(parseFloat(editItemPrice))) {
      setItems(items.map(item => 
        item.id === editingItem.id 
          ? { ...item, name: editItemName.trim(), price: parseFloat(editItemPrice).toFixed(2) }
          : item
      ));
      setEditingItem(null);
      setEditItemName('');
      setEditItemPrice('');
    }
  };

  const openMultiplierModal = (item) => {
    setMultiplierItem(item);
    setMultiplierValue(String(item.multiplier || 1));
    setMultiplierModalVisible(true);
  };

  const saveMultiplier = () => {
    if (multiplierValue.trim() && !isNaN(parseInt(multiplierValue)) && parseInt(multiplierValue) > 0) {
      setItems(items.map(item => 
        item.id === multiplierItem.id 
          ? { ...item, multiplier: parseInt(multiplierValue) }
          : item
      ));
      setMultiplierItem(null);
      setMultiplierValue('');
      setMultiplierModalVisible(false);
    }
  };

  const addScannedItems = () => {
    const valid = scannedItems.filter(
      i => i.selected && i.name.trim() !== '' && !isNaN(parseFloat(i.price))
    );
    if (valid.length === 0) {
      Alert.alert('No items selected', 'Select at least one item to add.');
      return;
    }
    const newItems = valid.map((i, index) => ({
      id: `${Date.now()}_${index}`,
      name: i.name.trim(),
      price: parseFloat(i.price).toFixed(2),
    }));
    setItems(prev => [...prev, ...newItems]);
    setReviewModalVisible(false);
    setScannedItems([]);
  };

  const renderLeftActions = (item, progress, dragX) => {
    const translateX = progress.interpolate({
      inputRange: [0, 1],
      outputRange: [-85, 0],
    });

    const opacity = progress.interpolate({
      inputRange: [0, 1],
      outputRange: [0, 1],
    });

    return (
      <Animated.View 
        style={[
          styles.swipeLeftActionsContainer,
          { 
            transform: [{ translateX }],
            opacity 
          }
        ]}
      >
        <TouchableOpacity
          style={[styles.swipeAction, { backgroundColor: theme.success }]}
          onPress={() => {
            openMultiplierModal(item);
            swipeableRefs.current[item.id]?.close();
          }}
          activeOpacity={0.9}
        >
          <Text style={[styles.swipeActionIcon, { color: theme.onSuccess }]}>×{item.multiplier || 1}</Text>
          {/* <Text style={[styles.swipeActionText, { color: theme.onSuccess }]}>Multiply</Text> */}
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const renderRightActions = (item, progress, dragX) => {
    const translateX = progress.interpolate({
      inputRange: [0, 1],
      outputRange: [160, 0],
    });

    const opacity = progress.interpolate({
      inputRange: [0, 1],
      outputRange: [0, 1],
    });

    return (
      <Animated.View 
      style={[
        styles.swipeActionsContainer,
        { 
        transform: [{ translateX }],
        opacity 
        }
      ]}
      >
      <TouchableOpacity
        style={[styles.swipeAction, styles.editAction, { backgroundColor: ACCENT }]}
        onPress={() => {
          openEditItem(item);
          swipeableRefs.current[item.id]?.close();
        }}
        activeOpacity={0.9}
      >
        <Text style={[styles.swipeActionIcon, { color: theme.onPrimary }]}>✎</Text>
        <Text style={[styles.swipeActionText, { color: theme.onPrimary }]}>Edit</Text>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={[styles.swipeAction, styles.deleteAction, { backgroundColor: theme.warningContainer }]}
        onPress={() => {
          deleteItem(item.id);
          swipeableRefs.current[item.id]?.close();
        }}
        activeOpacity={0.9}
      >
        <Text style={[styles.swipeActionIcon, { color: theme.onWarning }]}>×</Text>
        <Text style={[styles.swipeActionText, { color: theme.onWarning }]}>Delete</Text>
      </TouchableOpacity>
      </Animated.View>
    );
  };

  const renderItem = ({ item, index }) => (
    <Swipeable
      ref={(ref) => { swipeableRefs.current[item.id] = ref; }}
      renderLeftActions={(progress, dragX) => renderLeftActions(item, progress, dragX)}
      renderRightActions={(progress, dragX) => renderRightActions(item, progress, dragX)}
      overshootLeft={false}
      overshootRight={false}
      friction={2}
      leftThreshold={40}
      rightThreshold={40}
      containerStyle={styles.swipeableContainer}
    >
      <View style={{ position: 'relative' }}>
        <View style={[styles.itemRow, { backgroundColor: theme.surface }]}>
          <Text style={[styles.itemNumber, { color: theme.textSecondary }]}>{index + 1}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
            {item.multiplier > 1 && (
              <Text style={[styles.itemMultiplier, { color: A }]}>{item.multiplier}×</Text>
            )}
            <Text style={[styles.itemName, { color: theme.textPrimary }]}>{item.name}</Text>
          </View>
          <Text style={[styles.itemPrice, { color: theme.textPrimary }]}>
            {currencySymbol}{(parseFloat(item.price) * (item.multiplier || 1)).toFixed(2)}
          </Text>
        </View>
        <View style={[styles.swipeHintLeft, { backgroundColor: theme.outlineVariant }]} />
        <View style={[styles.swipeHintRight, { backgroundColor: theme.outlineVariant }]} />
      </View>
    </Swipeable>
  );

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 80}
    >
      <>
        <View style={[styles.listHeader, { backgroundColor: theme.primaryContainer }]}>
          <Text style={[styles.headerNumber, { color: A }]}>#</Text>
          <Text style={[styles.headerItem, { color: A }]}>Item</Text>
          <Text style={[styles.headerPrice, { color: A }]}>Price</Text>
        </View>
        
        <FlatList
          data={items}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          ListFooterComponent={
            <View style={styles.footerRow}>
              <TouchableOpacity
                style={[styles.addItemButton, { borderColor: A, backgroundColor: theme.surface }]}
                onPress={() => setModalVisible(true)}
              >
                <Text style={[styles.addItemButtonText, { color: A }]}>+ Add Item</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.scanButton, { borderColor: A, backgroundColor: theme.surface }]}
                onPress={() => setScanSheetVisible(true)}
              >
                <Ionicons name="receipt-outline" size={22} color={A} />
              </TouchableOpacity>
            </View>
          }
        />

        <View style={[styles.totalsContainer, { backgroundColor: theme.surface, borderTopColor: theme.outlineVariant, shadowColor: theme.shadow }]}>
          <View style={styles.tipContainer}>
            <Text style={[styles.tipLabel, { color: theme.textPrimary }]}>Tip:</Text>
            <TextInput
              style={[styles.tipInput, { borderColor: theme.outline, backgroundColor: theme.surface, color: theme.textPrimary }]}
              placeholder="0"
              placeholderTextColor={theme.textSecondary}
              keyboardType="decimal-pad"
              value={tipValue}
              onChangeText={setTipValue}
            />
            <TouchableOpacity 
              style={[styles.tipModeButton, { borderColor: theme.outline, backgroundColor: theme.surface }]}
              onPress={() => setTipMode(tipMode === 'percent' ? 'money' : 'percent')}
            >
              <Text style={[styles.tipModeText, { color: A }]}>
                {tipMode === 'percent' ? '%' : currencySymbol}
              </Text>
            </TouchableOpacity>
            <Text style={[styles.tipAmount, { color: theme.textPrimary }]}>{currencySymbol}{calculateTip().toFixed(2)}</Text>
          </View>
          
          <View style={styles.totalRow}>
            <Text style={[styles.totalLabel, { color: theme.textPrimary }]}>Total:</Text>
            <Text style={[styles.totalAmount, { color: A }]}>{currencySymbol}{calculateTotal().toFixed(2)}</Text>
          </View>
        </View>
      </>
      

      <AppModal
        visible={modalVisible}
        onClose={() => { setModalVisible(false); setNewItemName(''); setNewItemPrice(''); setNewItemMultiplier('1'); }}
        title="Add Item"
        confirmLabel="Add"
        onConfirm={addItem}
      >
        <Text style={[fieldStyles.inputLabel, { color: theme.textSecondary }]}>Item Name</Text>
        <TextInput
          style={[fieldStyles.input, { backgroundColor: theme.surfaceVariant, color: theme.textPrimary }]}
          placeholder="e.g., Pizza"
          placeholderTextColor={theme.textSecondary}
          value={newItemName}
          onChangeText={setNewItemName}
          autoFocus
        />

        <View style={styles.priceRowLabels}>
          <Text style={[fieldStyles.inputLabel, { color: theme.textSecondary, flex: 1 }]}>Price</Text>
          <Text style={[fieldStyles.inputLabel, { color: theme.textSecondary, width: 80 }]}>Qty</Text>
        </View>
        <View style={styles.priceRow}>
          <TextInput
            style={[fieldStyles.input, { backgroundColor: theme.surfaceVariant, color: theme.textPrimary, flex: 1 }]}
            placeholder="0.00"
            placeholderTextColor={theme.textSecondary}
            keyboardType="decimal-pad"
            value={newItemPrice}
            onChangeText={setNewItemPrice}
          />
          <TextInput
            style={[fieldStyles.input, { backgroundColor: theme.surfaceVariant, color: theme.textPrimary, width: 80, textAlign: 'center' }]}
            placeholder="1"
            placeholderTextColor={theme.textSecondary}
            keyboardType="number-pad"
            value={newItemMultiplier}
            onChangeText={(v) => setNewItemMultiplier(v.replace(/[^0-9]/g, ''))}
          />
        </View>
      </AppModal>

      {/* Edit Item Modal */}
      <AppModal
        visible={editingItem !== null}
        onClose={() => { setEditingItem(null); setEditItemName(''); setEditItemPrice(''); }}
        title="Edit Item"
        confirmLabel="Save"
        onConfirm={saveEditItem}
      >
        <Text style={[fieldStyles.inputLabel, { color: theme.textSecondary }]}>Item Name</Text>
        <TextInput
          style={[fieldStyles.input, { backgroundColor: theme.surfaceVariant, color: theme.textPrimary }]}
          placeholder="e.g., Pizza"
          placeholderTextColor={theme.textSecondary}
          value={editItemName}
          onChangeText={setEditItemName}
          autoFocus
        />

        <Text style={[fieldStyles.inputLabel, { color: theme.textSecondary }]}>Price</Text>
        <TextInput
          style={[fieldStyles.input, { backgroundColor: theme.surfaceVariant, color: theme.textPrimary }]}
          placeholder="0.00"
          placeholderTextColor={theme.textSecondary}
          keyboardType="decimal-pad"
          value={editItemPrice}
          onChangeText={setEditItemPrice}
        />
      </AppModal>

      {/* Multiplier Modal */}
      <AppModal
        visible={multiplierModalVisible}
        onClose={() => { setMultiplierModalVisible(false); setMultiplierItem(null); setMultiplierValue(''); }}
        title="Set Quantity"
        confirmLabel="Set"
        onConfirm={saveMultiplier}
      >
        <View style={styles.counterContainer}>
          <TouchableOpacity
            style={[styles.counterButton, { backgroundColor: theme.primaryContainer, borderColor: theme.outline }]}
            onPress={() => {
              const currentValue = parseInt(multiplierValue) || 1;
              if (currentValue > 1) {
                setMultiplierValue(String(currentValue - 1));
              }
            }}
          >
            <Text style={[styles.counterButtonText, { color: theme.textPrimary }]}>−</Text>
          </TouchableOpacity>

          <View style={[styles.counterDisplay, { backgroundColor: ACCENT }]}>
            <Text style={[styles.counterDisplayText, { color: theme.onPrimary }]}>
              {multiplierValue || '1'}
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.counterButton, { backgroundColor: theme.primaryContainer, borderColor: theme.outline }]}
            onPress={() => {
              const currentValue = parseInt(multiplierValue) || 1;
              setMultiplierValue(String(currentValue + 1));
            }}
          >
            <Text style={[styles.counterButtonText, { color: theme.textPrimary }]}>+</Text>
          </TouchableOpacity>
        </View>
      </AppModal>

      {/* Scan Loading Overlay */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={scanLoading}
        onRequestClose={() => {}}
      >
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={A} />
          <Text style={[styles.loadingText, { color: '#fff' }]}>Reading bill…</Text>
        </View>
      </Modal>

      {/* Scan Bill Action Sheet */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={scanSheetVisible}
        onRequestClose={() => setScanSheetVisible(false)}
      >
        <Pressable
          style={styles.sheetOverlay}
          onPress={() => setScanSheetVisible(false)}
        />
        <View style={[styles.sheetContainer, { backgroundColor: theme.surface }]}>
          <View style={[styles.sheetHandle, { backgroundColor: theme.outline }]} />
          <Text style={[styles.sheetTitle, { color: theme.textPrimary }]}>Scan Bill</Text>

          <TouchableOpacity
            style={[styles.sheetOption, { borderBottomColor: theme.outlineVariant }]}
            onPress={() => { setScanSheetVisible(false); handlePickImage('camera'); }}
            activeOpacity={0.7}
          >
            <Ionicons name="camera-outline" size={24} color={A} />
            <Text style={[styles.sheetOptionText, { color: theme.textPrimary }]}>Take Photo</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.sheetOption}
            onPress={() => { setScanSheetVisible(false); handlePickImage('library'); }}
            activeOpacity={0.7}
          >
            <Ionicons name="images-outline" size={24} color={A} />
            <Text style={[styles.sheetOptionText, { color: theme.textPrimary }]}>Choose from Library</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      {/* Review Scanned Items Modal */}
      <Modal
        animationType="slide"
        transparent={false}
        visible={reviewModalVisible}
        onRequestClose={() => { setReviewModalVisible(false); setScannedItems([]); }}
      >
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior="padding"
          keyboardVerticalOffset={0}
        >
        <View style={[styles.reviewContainer, { backgroundColor: theme.background }]}>
          {/* Header */}
          <View style={[styles.reviewHeader, { borderBottomColor: theme.outlineVariant }]}>
            <Text style={[styles.reviewTitle, { color: theme.textPrimary }]}>Review Scanned Items</Text>
            <Text style={[styles.reviewSubtitle, { color: theme.textSecondary }]}>
              Deselect or edit items before adding them
            </Text>
          </View>

          {/* Body */}
          <FlatList
            data={scannedItems}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <ReviewItemRow
                item={item}
                accent={A}
                theme={theme}
                onToggle={(id) =>
                  setScannedItems(prev =>
                    prev.map(i => i.id === id ? { ...i, selected: !i.selected } : i)
                  )
                }
                onNameChange={(id, v) =>
                  setScannedItems(prev =>
                    prev.map(i => i.id === id ? { ...i, name: v } : i)
                  )
                }
                onPriceChange={(id, v) =>
                  setScannedItems(prev =>
                    prev.map(i => i.id === id ? { ...i, price: v } : i)
                  )
                }
                onDelete={(id) =>
                  setScannedItems(prev => prev.filter(i => i.id !== id))
                }
              />
            )}
            contentContainerStyle={{ paddingVertical: 8 }}
          />

          {/* Footer */}
          <View style={[styles.reviewFooter, { borderTopColor: theme.outlineVariant, backgroundColor: theme.surface }]}>
            <TouchableOpacity
              style={[styles.reviewFooterBtn, { backgroundColor: theme.surfaceVariant }]}
              onPress={() => { setReviewModalVisible(false); setScannedItems([]); }}
            >
              <Text style={[styles.reviewFooterBtnText, { color: A }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.reviewFooterBtn, { backgroundColor: A }]}
              onPress={addScannedItems}
            >
              <Text style={[styles.reviewFooterBtnText, { color: theme.onPrimary }]}>
                Add Selected ({scannedItems.filter(i => i.selected).length})
              </Text>
            </TouchableOpacity>
          </View>
        </View>
        </KeyboardAvoidingView>
      </Modal>
    </KeyboardAvoidingView>
  );
}
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontFamily: 'Ysabeau-Regular',
    fontSize: 20,
    color: '#79747E',
    marginBottom: 8,
    fontWeight: '500',
  },
  emptySubtext: {
    fontFamily: 'Ysabeau-Regular',
    fontSize: 14,
    color: '#CAC4D0',
    fontWeight: '400',
  },
  listHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'transparent',
    margin: 8,
    borderRadius: 16,
  },
  headerNumber: {
    fontFamily: 'Ysabeau-Bold',
    width: 30,
    fontSize: 14,
    fontWeight: '700',
    color: '#56026B',
    letterSpacing: 0.5,
  },
  headerItem: {
    fontFamily: 'Ysabeau-Bold',
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: '#56026B',
    letterSpacing: 0.5,
  },
  headerPrice: {
    fontFamily: 'Ysabeau-Bold',
    width: 80,
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'right',
    color: '#56026B',
    letterSpacing: 0.5,
  },
  headerSpacer: {
    width: 40,
  },
  listContainer: {
    paddingBottom: 20,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 18,
    margin: 4,
    marginLeft: 8,
    marginRight: 8,
    borderRadius: 16,
    position: 'relative',
  },
  itemNumber: {
    fontFamily: 'Ysabeau-Regular',
    width: 30,
    fontSize: 16,
    color: '#79747E',
    fontWeight: '500',
  },
  itemName: {
    fontFamily: 'Ysabeau-Regular',
    fontSize: 16,
    color: '#1C1B1F',
    fontWeight: '400',
  },
  itemMultiplier: {
    fontFamily: 'Ysabeau-Bold',
    fontSize: 16,
    fontWeight: '700',
    marginRight: 4,
  },
  itemPrice: {
    fontFamily: 'Ysabeau-SemiBold',
    width: 80,
    fontSize: 17,
    fontWeight: '600',
    textAlign: 'right',
    color: '#1C1B1F',
  },
  deleteButton: {
    width: 40,
    alignItems: 'center',
  },
  deleteButtonText: {
    fontFamily: 'Ysabeau-Regular',
    fontSize: 20,
    color: '#BA1A1A',
  },
  totalsContainer: {
    padding: 24,
    backgroundColor: 'transparent',
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -4,
    },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 4,
  },
  tipContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  tipLabel: {
    fontFamily: 'Ysabeau-SemiBold',
    fontSize: 16,
    fontWeight: '600',
    marginRight: 12,
    color: '#1C1B1F',
    letterSpacing: 0.15,
  },
  tipInput: {
    fontFamily: 'Ysabeau-Regular',
    borderWidth: 1,
    borderColor: '#79747E',
    borderRadius: 12,
    padding: 12,
    width: 70,
    fontSize: 16,
    textAlign: 'center',
    backgroundColor: '#FFFFFF',
    color: '#1C1B1F',
  },
  tipModeButton: {
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.2)',
    borderRadius: 12,
    padding: 10,
    minWidth: 48,
    marginLeft: 8,
    marginRight: 12,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tipModeText: {
    fontFamily: 'Ysabeau-Bold',
    fontSize: 16,
    fontWeight: '700',
    color: '#56026B',
  },
  tipAmount: {
    fontFamily: 'Ysabeau-SemiBold',
    fontSize: 17,
    fontWeight: '600',
    marginLeft: 'auto',
    color: '#1C1B1F',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    fontFamily: 'Ysabeau-Bold',
    fontSize: 22,
    fontWeight: '700',
    color: '#1C1B1F',
    letterSpacing: 0.15,
  },
  totalAmount: {
    fontFamily: 'Ysabeau-Bold',
    fontSize: 28,
    fontWeight: '700',
    color: '#56026B',
  },
  footerRow: {
    flexDirection: 'row',
    marginTop: 12,
    marginHorizontal: 20,
    marginBottom: 20,
    gap: 10,
    alignItems: 'stretch',
  },
  addItemButton: {
    flex: 1,
    padding: 18,
    borderWidth: 2,
    borderColor: '#56026B',
    borderRadius: 16,
    borderStyle: 'dashed',
    backgroundColor: 'transparent',
    alignItems: 'center',
  },
  scanButton: {
    width: 60,
    borderWidth: 2,
    borderRadius: 16,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addItemButtonText: {
    fontFamily: 'Ysabeau-SemiBold',
    fontSize: 16,
    fontWeight: '600',
    color: '#56026B',
    letterSpacing: 0.5,
  },
  counterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginTop: 8,
    marginBottom: 24,
  },
  counterButton: {
    width: '33%',
    height: 54,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  counterButtonText: {
    fontFamily: 'Ysabeau-Bold',
    fontSize: 24,
    fontWeight: '700',
  },
  counterDisplay: {
    minWidth: 60,
    height: 54,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  counterDisplayText: {
    fontFamily: 'Ysabeau-Bold',
    fontSize: 24,
    fontWeight: '700',
  },
  swipeableContainer: {
    marginBottom: 0,
  },
  swipeHintLeft: {
    position: 'absolute',
    left: 11,
    top: '50%',
    transform: [{ translateY: -16 }],
    width: 5,
    height: 32,
    borderRadius: 4,
  },
  swipeHintRight: {
    position: 'absolute',
    right: 11,
    top: '50%',
    transform: [{ translateY: -16 }],
    width: 5,
    height: 32,
    borderRadius: 4,
  },
  swipeLeftActionsContainer: {
    flexDirection: 'row',
    alignItems: 'stretch',
    height: '100%',
    padding: 4,
  },
  swipeActionsContainer: {
    flexDirection: 'row',
    alignItems: 'stretch',
    height: '100%',
    padding: 4,
  },
  swipeAction: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
    height: '100%',
    marginRight: 4,
    borderRadius: 16,
    padding: 14,
  },
  editAction: {
    backgroundColor: '#56026B',
  },
  deleteAction: {
    backgroundColor: '#BA1A1A',
  },
  swipeActionIcon: {
    fontFamily: 'Ysabeau-Regular',
    fontSize: 24,
    fontWeight: '400',
    color: '#FFFFFF',
  },
  swipeActionText: {
    fontFamily: 'Ysabeau-SemiBold',
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 11,
    textTransform: 'lowercase',
    letterSpacing: 0.5,
  },
  // --- Scan loading overlay ---
  loadingOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontFamily: 'Ysabeau-Regular',
    fontSize: 17,
  },
  // --- Scan action sheet ---
  sheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheetContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 34,
    paddingHorizontal: 20,
    paddingTop: 12,
    elevation: 10,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  sheetTitle: {
    fontFamily: 'Ysabeau-Bold',
    fontSize: 17,
    textAlign: 'center',
    marginBottom: 20,
  },
  sheetOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    gap: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'transparent',
  },
  sheetOptionText: {
    fontFamily: 'Ysabeau-Regular',
    fontSize: 16,
  },
  // --- Review Modal ---
  reviewContainer: {
    flex: 1,
  },
  reviewHeader: {
    paddingHorizontal: 20,
    paddingTop: 52,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  reviewTitle: {
    fontFamily: 'Ysabeau-Bold',
    fontSize: 24,
    marginBottom: 4,
  },
  reviewSubtitle: {
    fontFamily: 'Ysabeau-Regular',
    fontSize: 14,
  },
  reviewFooter: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    borderTopWidth: 1,
  },
  reviewFooterBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  reviewFooterBtnText: {
    fontFamily: 'Ysabeau-SemiBold',
    fontSize: 15,
  },
  // --- ReviewItemRow ---
  reviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    marginHorizontal: 8,
    marginVertical: 4,
    borderRadius: 14,
    gap: 8,
  },
  reviewCheckbox: {
    width: 26,
    height: 26,
    borderRadius: 7,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reviewNameInput: {
    flex: 1,
    fontFamily: 'Ysabeau-Regular',
    fontSize: 15,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  reviewPriceInput: {
    width: 72,
    fontFamily: 'Ysabeau-Regular',
    fontSize: 15,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    textAlign: 'right',
  },
  reviewDeleteBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  priceRowLabels: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
});
