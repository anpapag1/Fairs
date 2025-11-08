import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  TextInput,
  Modal,
  Animated,
} from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { useCurrency } from '../../context/CurrencyContext';
import { useGroups } from '../../context/GroupsContext';
import { useTheme } from '../../context/ThemeContext';

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
  const [editingItem, setEditingItem] = useState(null);
  const [editItemName, setEditItemName] = useState('');
  const [editItemPrice, setEditItemPrice] = useState('');
  const [tipValue, setTipValue] = useState(currentGroup?.tipValue || '');
  const [tipMode, setTipMode] = useState(currentGroup?.tipMode || 'money');

  // Update items in context whenever local items change
  useEffect(() => {
    updateGroupItems(group.id, items);
  }, [items]);

  // Update tip in context whenever tip changes
  useEffect(() => {
    updateGroupTip(group.id, tipValue, tipMode);
  }, [tipValue, tipMode]);

  const calculateSubtotal = () => {
    return items.reduce((sum, item) => sum + parseFloat(item.price), 0);
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

  const addItem = () => {
    if (newItemName.trim() && newItemPrice.trim() && !isNaN(parseFloat(newItemPrice))) {
      const newItem = {
        id: Date.now().toString(),
        name: newItemName.trim(),
        price: parseFloat(newItemPrice).toFixed(2),
      };
      setItems([...items, newItem]);
      setNewItemName('');
      setNewItemPrice('');
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
        style={[styles.swipeAction, styles.editAction, { backgroundColor: theme.primary }]}
        onPress={() => openEditItem(item)}
        activeOpacity={0.9}
      >
        <Text style={[styles.swipeActionIcon, { color: theme.onPrimary }]}>✎</Text>
        <Text style={[styles.swipeActionText, { color: theme.onPrimary }]}>Edit</Text>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={[styles.swipeAction, styles.deleteAction, { backgroundColor: theme.warningContainer }]}
        onPress={() => deleteItem(item.id)}
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
      renderRightActions={(progress, dragX) => renderRightActions(item, progress, dragX)}
      overshootRight={false}
      friction={2}
      rightThreshold={40}
      containerStyle={styles.swipeableContainer}
    >
      <View style={[styles.itemRow, { backgroundColor: theme.surface }]}>
        <Text style={[styles.itemNumber, { color: theme.textSecondary }]}>{index + 1}</Text>
        <Text style={[styles.itemName, { color: theme.textPrimary }]}>{item.name}</Text>
        <Text style={[styles.itemPrice, { color: theme.textPrimary }]}>{currencySymbol}{parseFloat(item.price).toFixed(2)}</Text>
      </View>
    </Swipeable>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <>
        <View style={[styles.listHeader, { backgroundColor: theme.surfaceContainerHigh }]}>
          <Text style={[styles.headerNumber, { color: theme.primary }]}>#</Text>
          <Text style={[styles.headerItem, { color: theme.primary }]}>Item</Text>
          <Text style={[styles.headerPrice, { color: theme.primary }]}>Price</Text>
        </View>
        
        <FlatList
          data={items}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          ListFooterComponent={
            <TouchableOpacity
              style={[styles.addItemButton, { borderColor: theme.primary, backgroundColor: theme.surface }]}
              onPress={() => setModalVisible(true)}
            >
              <Text style={[styles.addItemButtonText, { color: theme.primary }]}>+ Add Item</Text>
            </TouchableOpacity>
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
              <Text style={[styles.tipModeText, { color: theme.primary }]}>
                {tipMode === 'percent' ? '%' : currencySymbol}
              </Text>
            </TouchableOpacity>
            <Text style={[styles.tipAmount, { color: theme.textPrimary }]}>{currencySymbol}{calculateTip().toFixed(2)}</Text>
          </View>
          
          <View style={styles.totalRow}>
            <Text style={[styles.totalLabel, { color: theme.textSecondary }]}>Total:</Text>
            <Text style={[styles.totalAmount, { color: theme.primary }]}>{currencySymbol}{calculateTotal().toFixed(2)}</Text>
          </View>
        </View>
      </>
      

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={[styles.modalContent, { backgroundColor: theme.surface, shadowColor: theme.shadow }]}>
            <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>Add Item</Text>

            <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Item Name</Text>
            <TextInput
              style={[styles.input, { borderColor: theme.outline, backgroundColor: theme.surface, color: theme.textPrimary }]}
              placeholder="e.g., Pizza"
              placeholderTextColor={theme.textSecondary}
              value={newItemName}
              onChangeText={setNewItemName}
              autoFocus
            />
            
            <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Price</Text>
            <TextInput
              style={[styles.input, { borderColor: theme.outline, backgroundColor: theme.surface, color: theme.textPrimary }]}
              placeholder="0.00"
              placeholderTextColor={theme.textSecondary}
              keyboardType="decimal-pad"
              value={newItemPrice}
              onChangeText={setNewItemPrice}
            />
            
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton, { backgroundColor: theme.surfaceVariant }]}
                onPress={() => {
                  setModalVisible(false);
                  setNewItemName('');
                  setNewItemPrice('');
                }}
              >
                <Text style={[styles.cancelButtonText, { color: theme.primary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.createButton, { backgroundColor: theme.primary }]}
                onPress={addItem}
              >
                <Text style={[styles.createButtonText, { color: theme.onPrimary }]}>Add</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Edit Item Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={editingItem !== null}
        onRequestClose={() => {
          setEditingItem(null);
          setEditItemName('');
          setEditItemPrice('');
        }}
      >
        <View style={styles.modalContainer}>
          <View style={[styles.modalContent, { backgroundColor: theme.surface, shadowColor: theme.shadow }]}>
            <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>Edit Item</Text>

            <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Item Name</Text>
            <TextInput
              style={[styles.input, { borderColor: theme.outline, backgroundColor: theme.surface, color: theme.textPrimary }]}
              placeholder="e.g., Pizza"
              placeholderTextColor={theme.textSecondary}
              value={editItemName}
              onChangeText={setEditItemName}
              autoFocus
            />

            <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Price</Text>
            <TextInput
              style={[styles.input, { borderColor: theme.outline, backgroundColor: theme.surface, color: theme.textPrimary }]}
              placeholder="0.00"
              placeholderTextColor={theme.textSecondary}
              keyboardType="decimal-pad"
              value={editItemPrice}
              onChangeText={setEditItemPrice}
            />
            
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton, { backgroundColor: theme.surfaceVariant }]}
                onPress={() => {
                  setEditingItem(null);
                  setEditItemName('');
                  setEditItemPrice('');
                }}
              >
                <Text style={[styles.cancelButtonText, { color: theme.primary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.createButton, { backgroundColor: theme.primary }]}
                onPress={saveEditItem}
              >
                <Text style={[styles.createButtonText, { color: theme.onPrimary }]}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FEF7FF',
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
    backgroundColor: '#E8DEF8',
    margin: 8,
    borderRadius: 16,
  },
  headerNumber: {
    fontFamily: 'Ysabeau-Bold',
    width: 30,
    fontSize: 14,
    fontWeight: '700',
    color: '#6750A4',
    letterSpacing: 0.5,
  },
  headerItem: {
    fontFamily: 'Ysabeau-Bold',
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: '#6750A4',
    letterSpacing: 0.5,
  },
  headerPrice: {
    fontFamily: 'Ysabeau-Bold',
    width: 80,
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'right',
    color: '#6750A4',
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
    borderRadius: 16,
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
    flex: 1,
    fontSize: 16,
    color: '#1C1B1F',
    fontWeight: '400',
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
    backgroundColor: '#FFFBFE',
    borderTopWidth: 1,
    borderTopColor: '#E8DEF8',
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
    borderColor: '#79747E',
    borderRadius: 12,
    padding: 10,
    minWidth: 48,
    marginLeft: 8,
    marginRight: 12,
    backgroundColor: '#E8DEF8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tipModeText: {
    fontFamily: 'Ysabeau-Bold',
    fontSize: 16,
    fontWeight: '700',
    color: '#6750A4',
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
    color: '#6750A4',
  },
  addItemButton: {
    padding: 18,
    marginTop: 12,
    marginHorizontal: 20,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#6750A4',
    borderRadius: 16,
    borderStyle: 'dashed',
    backgroundColor: '#FEF7FF',
    alignItems: 'center',
  },
  addItemButtonText: {
    fontFamily: 'Ysabeau-SemiBold',
    fontSize: 16,
    fontWeight: '600',
    color: '#6750A4',
    letterSpacing: 0.5,
  },
  addButton: {
    position: 'absolute',
    bottom: 30,
    alignSelf: 'center',
    width: 80,
    height: 80,
    borderRadius: 28,
    backgroundColor: '#6750A4',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowColor: '#6750A4',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  addButtonText: {
    fontFamily: 'Ysabeau-SemiBold',
    fontSize: 40,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  modalContent: {
    width: '85%',
    backgroundColor: '#FFFBFE',
    borderRadius: 28,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  modalTitle: {
    fontFamily: 'Ysabeau-Bold',
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 24,
    color: '#1C1B1F',
    letterSpacing: 0.5,
  },
  inputLabel: {
    fontFamily: 'Ysabeau-SemiBold',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    color: '#49454F',
    letterSpacing: 0.25,
  },
  input: {
    fontFamily: 'Ysabeau-Regular',
    borderWidth: 1,
    borderColor: '#79747E',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    marginBottom: 20,
    backgroundColor: '#FFFFFF',
    color: '#1C1B1F',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  modalButton: {
    flex: 1,
    padding: 16,
    borderRadius: 20,
    alignItems: 'center',
    marginHorizontal: 6,
  },
  cancelButton: {
    backgroundColor: '#E8DEF8',
  },
  cancelButtonText: {
    fontFamily: 'Ysabeau-SemiBold',
    fontSize: 16,
    fontWeight: '600',
    color: '#6750A4',
    letterSpacing: 0.5,
  },
  createButton: {
    backgroundColor: '#6750A4',
  },
  createButtonText: {
    fontFamily: 'Ysabeau-SemiBold',
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  swipeableContainer: {
    marginBottom: 0,
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
  },
  editAction: {
    backgroundColor: '#6750A4',
  },
  deleteAction: {
    backgroundColor: '#BA1A1A',
  },
  swipeActionIcon: {
    fontFamily: 'Ysabeau-Regular',
    fontSize: 24,
    fontWeight: '400',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  swipeActionText: {
    fontFamily: 'Ysabeau-SemiBold',
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 11,
    textTransform: 'lowercase',
    letterSpacing: 0.5,
  },
});
