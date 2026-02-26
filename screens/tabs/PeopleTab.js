import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  TextInput,
  FlatList,
  Modal,
  ScrollView,
  Animated,
  Pressable,
  PanResponder,
  Dimensions,
  KeyboardAvoidingView,
} from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { useCurrency } from '../../context/CurrencyContext';
import { useGroups } from '../../context/GroupsContext';
import { useTheme, MAIN, ACCENT } from '../../context/ThemeContext';

export default function PeopleTab({ route }) {
  const { group } = route.params;
  const { currencySymbol } = useCurrency();
  const { getGroup, calculateGroupTotal, updateGroupPeople, updateGroupSplitMode } = useGroups();
  const { theme } = useTheme();
  
  const currentGroup = getGroup(group.id);
  const [splitMode, setSplitMode] = useState(currentGroup?.splitMode || 'separate'); // 'equal' or 'separate'
  const [numberOfPeople, setNumberOfPeople] = useState('');
  const [people, setPeople] = useState(currentGroup?.people || []);
  const [modalVisible, setModalVisible] = useState(false);
  const [newPersonName, setNewPersonName] = useState('');
  const [selectedPerson, setSelectedPerson] = useState(null);
  const [itemSelectionModalVisible, setItemSelectionModalVisible] = useState(false);
  const [editingPerson, setEditingPerson] = useState(null);
  const [editPersonName, setEditPersonName] = useState('');
  
  // Store refs for all swipeable items
  const swipeableRefs = useRef({});

  // Drag-to-dismiss for item selection modal
  const SCREEN_HEIGHT = Dimensions.get('window').height;
  const modalSlideY = useRef(new Animated.Value(0)).current;
  const isClosingModal = useRef(false);

  const closeModal = () => {
    if (isClosingModal.current) return;
    isClosingModal.current = true;
    Animated.timing(modalSlideY, {
      toValue: SCREEN_HEIGHT,
      duration: 260,
      useNativeDriver: true,
    }).start(() => {
      setItemSelectionModalVisible(false);
      isClosingModal.current = false;
    });
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gs) => gs.dy > 5,
      onPanResponderMove: (_, gs) => {
        if (gs.dy > 0) modalSlideY.setValue(gs.dy);
      },
      onPanResponderRelease: (_, gs) => {
        if (gs.dy > 100 || gs.vy > 0.5) {
          closeModal();
        } else {
          Animated.spring(modalSlideY, {
            toValue: 0,
            useNativeDriver: true,
            bounciness: 6,
          }).start();
        }
      },
    })
  ).current;
  
  const total = calculateGroupTotal(group.id);
  const items = currentGroup?.items || [];
  const tipValue = currentGroup?.tipValue || '';
  const tipMode = currentGroup?.tipMode || 'money';

  // Migrate existing people to have isPaid property
  useEffect(() => {
    const needsMigration = people.some(person => person.isPaid === undefined);
    if (needsMigration) {
      setPeople(people.map(person => ({
        ...person,
        isPaid: person.isPaid ?? false
      })));
    }
  }, []);

  // Update people in context whenever they change
  useEffect(() => {
    updateGroupPeople(group.id, people);
  }, [people]);

  // Update split mode in context whenever it changes
  useEffect(() => {
    updateGroupSplitMode(group.id, splitMode);
  }, [splitMode]);

  // Keep selectedPerson in sync when people change
  useEffect(() => {
    if (selectedPerson) {
      const updatedPerson = people.find(p => p.id === selectedPerson.id);
      if (updatedPerson) {
        setSelectedPerson(updatedPerson);
      }
    }
  }, [people]);
  
  const calculatePerPerson = () => {
    if (!numberOfPeople || isNaN(parseInt(numberOfPeople)) || parseInt(numberOfPeople) <= 0) {
      return 0;
    }
    return total / parseInt(numberOfPeople);
  };

  const addPerson = () => {
    if (newPersonName.trim()) {
      const newPerson = {
        id: Date.now().toString(),
        name: newPersonName.trim(),
        selectedItems: [], // Array of item IDs this person is assigned to
        isPaid: false, // Track if person has paid
      };
      setPeople([...people, newPerson]);
      setNewPersonName('');
      setModalVisible(false);
    }
  };

  const togglePersonPaid = (personId) => {
    setPeople(people.map(person => 
      person.id === personId 
        ? { ...person, isPaid: !person.isPaid }
        : person
    ));
  };

  const deletePerson = (personId) => {
    setPeople(people.filter(person => person.id !== personId));
  };

  const openEditPerson = (person) => {
    setEditingPerson(person);
    setEditPersonName(person.name);
  };

  const saveEditPerson = () => {
    if (editPersonName.trim() && editingPerson) {
      setPeople(people.map(person => 
        person.id === editingPerson.id 
          ? { ...person, name: editPersonName.trim() }
          : person
      ));
      setEditingPerson(null);
      setEditPersonName('');
    }
  };

  const allItemIds = [
    ...items.map(i => i.id),
    ...(tipValue && parseFloat(tipValue) > 0 ? ['tip'] : [])
  ];
  const isAllSelected = allItemIds.length > 0 && allItemIds.every(id => selectedPerson?.selectedItems?.includes(id));

  const selectAllItems = () => {
    if (!selectedPerson) return;
    setPeople(prevPeople => prevPeople.map(person => {
      if (person.id !== selectedPerson.id) return person;
      const updatedPerson = { ...person, selectedItems: isAllSelected ? [] : allItemIds };
      setSelectedPerson(updatedPerson);
      return updatedPerson;
    }));
  };

  const toggleItemForPerson = (personId, itemId) => {
    setPeople(prevPeople => {
      const updatedPeople = prevPeople.map(person => {
        if (person.id === personId) {
          const hasItem = person.selectedItems.includes(itemId);
          const updatedPerson = {
            ...person,
            selectedItems: hasItem
              ? person.selectedItems.filter(id => id !== itemId)
              : [...person.selectedItems, itemId]
          };
          // Update selectedPerson state as well if this is the person we're viewing
          if (selectedPerson && selectedPerson.id === personId) {
            setSelectedPerson(updatedPerson);
          }
          return updatedPerson;
        }
        return person;
      });
      return updatedPeople;
    });
  };

  const calculatePersonAmount = (person) => {
    let amount = 0;
    
    // Calculate from regular items
    person.selectedItems.forEach(itemId => {
      if (itemId === 'tip') {
        // Handle tip
        const subtotal = items.reduce((sum, item) => {
          const price = parseFloat(item.price || 0);
          const multiplier = item.multiplier || 1;
          return sum + (price * multiplier);
        }, 0);
        let tipAmount = 0;
        if (tipValue && !isNaN(parseFloat(tipValue))) {
          if (tipMode === 'percent') {
            tipAmount = (subtotal * parseFloat(tipValue)) / 100;
          } else {
            tipAmount = parseFloat(tipValue);
          }
        }
        // Count how many people are assigned to tip
        const peopleWithTip = people.filter(p => p.selectedItems.includes('tip')).length;
        if (peopleWithTip > 0) {
          amount += tipAmount / peopleWithTip;
        }
      } else {
        // Regular item
        const item = items.find(i => i.id === itemId);
        if (item) {
          // Count how many people share this item
          const peopleWithItem = people.filter(p => p.selectedItems.includes(itemId)).length;
          if (peopleWithItem > 0) {
            const itemPrice = parseFloat(item.price) * (item.multiplier || 1);
            amount += itemPrice / peopleWithItem;
          }
        }
      }
    });
    
    return amount;
  };

  const openItemSelection = (person) => {
    isClosingModal.current = false;
    modalSlideY.setValue(SCREEN_HEIGHT);
    setSelectedPerson(person);
    setItemSelectionModalVisible(true);
    Animated.spring(modalSlideY, {
      toValue: 0,
      useNativeDriver: true,
      bounciness: 6,
      speed: 14,
    }).start();
  };

  const getSelectedItemNames = (person) => {
    const selectedNames = [];
    
    person.selectedItems.forEach(itemId => {
      if (itemId === 'tip') {
        selectedNames.push('Tip');
      } else {
        const item = items.find(i => i.id === itemId);
        if (item) {
          selectedNames.push(item.name);
        }
      }
    });
    
    return selectedNames;
  };

  const calculateTotalAssigned = () => {
    return people.reduce((sum, person) => sum + calculatePersonAmount(person), 0);
  };

  const isBillBalanced = () => {
    if (people.length === 0) return true;
    const totalAssigned = calculateTotalAssigned();
    return Math.abs(total - totalAssigned) < 0.01; // Allow for rounding differences
  };

  const getTipAssignmentStatus = () => {
    if (!tipValue || parseFloat(tipValue) <= 0) return { assigned: true, count: 0 };
    const count = people.filter(person => person.selectedItems.includes('tip')).length;
    return { assigned: count > 0, count };
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
          style={[styles.swipeAction, { backgroundColor: item.isPaid ? theme.warning : theme.success }]}
          onPress={() => {
            togglePersonPaid(item.id);
            swipeableRefs.current[item.id]?.close();
          }}
          activeOpacity={0.9}
        >
          <Text style={[styles.swipeActionIcon, { color: theme.onSuccess }]}>
            {item.isPaid ? '↶' : '✓'}
          </Text>
          <Text style={[styles.swipeActionText, { color: theme.onSuccess }]}>
            {item.isPaid ? 'Unpaid' : 'Paid'}
          </Text>
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
          style={[styles.swipeAction, { backgroundColor: MAIN }]}
          onPress={() => {
            openEditPerson(item);
            swipeableRefs.current[item.id]?.close();
          }}
          activeOpacity={0.9}
        >
          <Text style={[styles.swipeActionIcon, { color: theme.onPrimary }]}>✎</Text>
          <Text style={[styles.swipeActionText, { color: theme.onPrimary }]}>Edit</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.swipeAction, { backgroundColor: theme.warningContainer }]}
          onPress={() => {
            deletePerson(item.id);
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

  const renderPerson = ({ item }) => {
    const amount = calculatePersonAmount(item);
    const selectedItemNames = getSelectedItemNames(item);
    
    return (
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
      <TouchableOpacity
        style={[
        styles.personItem,
        { backgroundColor: theme.surface || theme.surfaceVariant, borderColor: theme.outlineVariant },
        item.isPaid && { opacity: 0.65 }
        ]}
        onPress={() => openItemSelection(item)}
        activeOpacity={0.7}
      >
        <View style={styles.personInfo}>
        <View style={styles.personNameRow}>
          <Text style={[
          styles.personName,
          { color: item.isPaid ? theme.textSecondary : theme.textPrimary },
          item.isPaid && { opacity: 0.6 }
          ]}>
          {item.name}
          </Text>
          {item.isPaid && (
          <View style={[styles.paidBadge, { backgroundColor: theme.successContainer }]}>
            <Text style={[styles.paidBadgeText, { color: theme.onSuccessContainer }]}>✓ Paid</Text>
          </View>
          )}
        </View>
        {selectedItemNames.length > 0 ? (
          <Text style={[
          styles.personItems,
          { color: item.isPaid ? theme.textSecondary : theme.textSecondary },
          item.isPaid && { opacity: 0.6 }
          ]} numberOfLines={2}>
          {selectedItemNames.join(', ')}
          </Text>
        ) : (
          <Text style={[styles.personNoItems, { color: item.isPaid ? theme.textSecondary : theme.textSecondary }]}>
          No items selected
          </Text>
        )}
        </View>
        <View style={[styles.personAmountContainer, { backgroundColor: item.isPaid ? theme.success : ACCENT }]}>
        <Text style={[styles.personAmount, { color: theme.onPrimary }]}>
          {currencySymbol}{amount.toFixed(2)}
        </Text>
        </View>
      </TouchableOpacity>
      <View style={[styles.swipeHintLeft, { backgroundColor: theme.outlineVariant }]} />
      <View style={[styles.swipeHintRight, { backgroundColor: theme.outlineVariant }]} />
      </View>
      </Swipeable>
    );
  };

  const renderItemCheckbox = (item, isTip = false) => {
    const itemId = isTip ? 'tip' : item.id;
    const isSelected = selectedPerson?.selectedItems.includes(itemId);
    
    let itemName = '';
    let itemPrice = 0;
    
    if (isTip) {
      itemName = 'Tip';
      const subtotal = items.reduce((sum, i) => sum + parseFloat(i.price || 0), 0);
      if (tipValue && !isNaN(parseFloat(tipValue))) {
        if (tipMode === 'percent') {
          itemPrice = (subtotal * parseFloat(tipValue)) / 100;
        } else {
          itemPrice = parseFloat(tipValue);
        }
      }
    } else {
      const multiplier = item.multiplier || 1;
      itemName = multiplier > 1 ? `${item.name} (×${multiplier})` : item.name;
      itemPrice = parseFloat(item.price) * multiplier;
    }
    
    return (
      <TouchableOpacity
        key={itemId}
        style={[styles.itemCheckboxRow, { borderBottomColor: theme.outlineVariant }]}
        onPress={() => toggleItemForPerson(selectedPerson.id, itemId)}
      >
        <View style={[
          styles.checkbox, 
          { borderColor: theme.outline },
          isSelected && { backgroundColor: ACCENT, borderColor: ACCENT }
        ]}>
          {isSelected && <Text style={styles.checkmark}>✓</Text>}
        </View>
        <Text style={[styles.itemCheckboxName, { color: theme.textPrimary }]}>{itemName}</Text>
        <Text style={[styles.itemCheckboxPrice, { color: theme.textSecondary }]}>{currencySymbol}{itemPrice.toFixed(2)}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.splitModeContainer}>
        <Text style={styles.sectionTitle}>Split Mode:</Text>
        <View style={styles.splitModeButtons}>
          <TouchableOpacity
            style={[
              styles.splitModeButton,
              splitMode === 'separate' ? styles.splitModeButtonActive : styles.splitModeButtonInactive,
            ]}
            onPress={() => setSplitMode('separate')}
            activeOpacity={0.7}
          >
            <Text style={styles.splitModeButtonText}>Separate</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.splitModeButton,
              splitMode === 'equal' ? styles.splitModeButtonActive : styles.splitModeButtonInactive,
            ]}
            onPress={() => setSplitMode('equal')}
            activeOpacity={0.7}
          >
            <Text style={styles.splitModeButtonText}>Equal</Text>
          </TouchableOpacity>
        </View>
      </View>

      {splitMode === 'equal' ? (
        <View style={styles.equalSplitContainer}>
          <View style={[styles.totalContainer, { backgroundColor: theme.surfaceVariant }]}>
            <Text style={[styles.totalLabel, { color: theme.textSecondary }]}>Total Amount:</Text>
            <Text style={[styles.totalAmount, { color: theme.textSecondary }]}>{currencySymbol}{total.toFixed(2)}</Text>
          </View>

          <View style={styles.peopleInputContainer}>
            <Text style={[styles.inputLabel, { color: theme.textPrimary }]}>Number of People:</Text>
            <View style={styles.inputRow}>
              <TouchableOpacity
                style={[styles.counterButton, { backgroundColor: theme.primary }]}
                onPress={() => {
                  const current = parseInt(numberOfPeople) || 0;
                  if (current > 1) setNumberOfPeople((current - 1).toString());
                }}
              >
                <Text style={[styles.counterButtonText, { color: theme.onPrimary }]}>-</Text>
              </TouchableOpacity>
              
              <TextInput
                style={[styles.peopleInput, { borderColor: theme.outline, color: theme.textPrimary, backgroundColor: theme.surface }]}
                placeholder="0"
                placeholderTextColor={theme.textSecondary}
                keyboardType="number-pad"
                value={numberOfPeople}
                onChangeText={setNumberOfPeople}
              />
              
              <TouchableOpacity
                style={[styles.counterButton, { backgroundColor: theme.primary }]}
                onPress={() => {
                  const current = parseInt(numberOfPeople) || 0;
                  setNumberOfPeople((current + 1).toString());
                }}
              >
                <Text style={[styles.counterButtonText, { color: theme.onPrimary }]}>+</Text>
              </TouchableOpacity>
            </View>
          </View>

          {numberOfPeople && parseInt(numberOfPeople) > 0 && (
            <View style={[styles.resultContainer, { backgroundColor: theme.surfaceVariant }]}>
              <Text style={[styles.resultLabel, { color: theme.textPrimary }]}>Each Person Pays:</Text>
              <Text style={[styles.resultAmount, { color: theme.primary }]}>
                {currencySymbol}{calculatePerPerson().toFixed(2)}
              </Text>
            </View>
          )}
        </View>
      ) : (
        <View style={styles.separateSplitContainer}>
          {people.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={[styles.emptyText, { color: theme.textSecondary }]}>No people added</Text>
              <Text style={[styles.emptySubtext, { color: theme.textSecondary }]}>Tap + to add people to split</Text>
            </View>
          ) : (
            <>
              {!isBillBalanced() && (
                <View style={[styles.errorContainer, { backgroundColor: theme.warningContainer }]}>
                  <Text style={styles.errorIcon}>⚠️</Text>
                  <View style={styles.errorTextContainer}>
                    <Text style={[styles.errorText, { color: theme.onWarningContainer }]}>
                      Totals don't match! Difference: {currencySymbol}{Math.abs(total - calculateTotalAssigned()).toFixed(2)}
                    </Text>
                    {!getTipAssignmentStatus().assigned && tipValue && parseFloat(tipValue) > 0 && (
                      <Text style={[styles.errorHint, { color: theme.onWarningContainer }]}>
                        Tip hasn't been assigned to anyone
                      </Text>
                    )}
                  </View>
                </View>
              )}
              
              <FlatList
                data={people}
                renderItem={renderPerson}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.peopleList}
              />
            </>
          )}

          <TouchableOpacity
            style={[styles.addPersonButton, { backgroundColor: ACCENT }]}
            onPress={() => setModalVisible(true)}
          >
            <Text style={[styles.addPersonButtonText, { color: theme.onPrimary }]}>+ Add Person</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Add Person Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => { setModalVisible(false); setNewPersonName(''); }}
      >
        <KeyboardAvoidingView style={styles.modalContainer} behavior="padding" keyboardVerticalOffset={0}>
          <Pressable style={StyleSheet.absoluteFillObject} onPress={() => { setModalVisible(false); setNewPersonName(''); }} />
          <View style={[styles.modalContent, { backgroundColor: theme.surface, shadowColor: theme.shadow }]} onStartShouldSetResponder={() => true}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>Add Person</Text>
              <TouchableOpacity style={[styles.modalCloseBtn, { backgroundColor: theme.surfaceVariant }]} onPress={() => { setModalVisible(false); setNewPersonName(''); }}>
                <Ionicons name="close" size={20} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>
            <View style={[styles.modalDivider, { backgroundColor: theme.outlineVariant }]} />

            <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Name</Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.surfaceVariant, color: theme.textPrimary }]}
              placeholder="e.g., John"
              placeholderTextColor={theme.textSecondary}
              value={newPersonName}
              onChangeText={setNewPersonName}
              autoFocus
            />

            <TouchableOpacity
              style={[styles.modalConfirmBtn, { backgroundColor: ACCENT }]}
              onPress={addPerson}
            >
              <Text style={[styles.modalConfirmText, { color: theme.onPrimary }]}>Add</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Edit Person Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={editingPerson !== null}
        onRequestClose={() => {
          setEditingPerson(null);
          setEditPersonName('');
        }}
      >
        <KeyboardAvoidingView style={styles.modalContainer} behavior="padding" keyboardVerticalOffset={0}>
          <Pressable style={StyleSheet.absoluteFillObject} onPress={() => { setEditingPerson(null); setEditPersonName(''); }} />
          <View style={[styles.modalContent, { backgroundColor: theme.surface, shadowColor: theme.shadow }]} onStartShouldSetResponder={() => true}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>Edit Person</Text>
              <TouchableOpacity style={[styles.modalCloseBtn, { backgroundColor: theme.surfaceVariant }]} onPress={() => { setEditingPerson(null); setEditPersonName(''); }}>
                <Ionicons name="close" size={20} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>
            <View style={[styles.modalDivider, { backgroundColor: theme.outlineVariant }]} />

            <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Name</Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.surfaceVariant, color: theme.textPrimary }]}
              placeholder="e.g., John"
              placeholderTextColor={theme.textSecondary}
              value={editPersonName}
              onChangeText={setEditPersonName}
              autoFocus
            />

            <TouchableOpacity
              style={[styles.modalConfirmBtn, { backgroundColor: ACCENT }]}
              onPress={saveEditPerson}
            >
              <Text style={[styles.modalConfirmText, { color: theme.onPrimary }]}>Save</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Item Selection Modal */}
      <Modal
        animationType="none"
        transparent={true}
        visible={itemSelectionModalVisible}
        onRequestClose={closeModal}
      >
        <Pressable style={styles.itemModalContainer} onPress={closeModal}>
          <Animated.View
            style={[styles.itemModalContent, { backgroundColor: theme.surface, transform: [{ translateY: modalSlideY }] }]}
            onStartShouldSetResponder={() => true}
          >
            <View {...panResponder.panHandlers}>
              <View style={[styles.itemModalHandle]} />
              <View style={[styles.itemModalHeader, { borderBottomColor: theme.outlineVariant }]}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.itemModalTitle, { color: ACCENT }]}>
                    {selectedPerson?.name}
                  </Text>
                  <Text style={[styles.itemModalSubtitle, { color: theme.textSecondary }]}>
                    Select items this person consumed
                  </Text>
                </View>
                <TouchableOpacity
                  style={[styles.selectAllButton, { borderColor: isAllSelected ? theme.outline : ACCENT }]}
                  onPress={selectAllItems}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.selectAllText, { color: isAllSelected ? theme.textSecondary : ACCENT }]}>
                    {isAllSelected ? 'Clear all' : 'Select all'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
            
            <ScrollView style={styles.itemsList}>
              {items.length > 0 ? (
                <>
                  {items.map(item => renderItemCheckbox(item))}
                  {tipValue && parseFloat(tipValue) > 0 && (
                    <>
                      <View style={[styles.divider, { backgroundColor: theme.outlineVariant }]} />
                      {renderItemCheckbox(null, true)}
                    </>
                  )}
                </>
              ) : (
                <View style={styles.noItemsContainer}>
                  <Text style={[styles.noItemsText, { color: theme.textSecondary }]}>No items in this bill</Text>
                  <Text style={[styles.noItemsSubtext, { color: theme.textSecondary }]}>Add items in the Items tab first</Text>
                </View>
              )}
            </ScrollView>
          </Animated.View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  splitModeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#B953D3',
  },
  sectionTitle: {
    fontFamily: 'Ysabeau-SemiBold',
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginRight: 12,
    letterSpacing: 0.2,
  },
  splitModeButtons: {
    flex: 1,
    flexDirection: 'row',
    gap: 8,
  },
  splitModeButton: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: 20,
    alignItems: 'center',
  },
  splitModeButtonActive: {
    backgroundColor: ACCENT,
  },
  splitModeButtonInactive: {
    backgroundColor: 'rgba(255,255,255,0.20)',
  },
  splitModeButtonText: {
    fontFamily: 'Ysabeau-SemiBold',
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  equalSplitContainer: {
    padding: 24,
  },
  totalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderRadius: 20,
    marginBottom: 24,
  },
  totalLabel: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1C1B1F',
    letterSpacing: 0.15,
  },
  totalAmount: {
    fontSize: 24,
    fontWeight: '700',
    color: '#B953D3',
  },
  peopleInputContainer: {
    marginBottom: 24,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  counterButton: {
    width: 56,
    height: 56,
    borderWidth: 1,
    borderColor: '#B953D3',
    borderRadius: 16,
    backgroundColor: '#B953D3',
    justifyContent: 'center',
    alignItems: 'center',
  },
  counterButtonText: {
    fontSize: 28,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  peopleInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#79747E',
    borderRadius: 16,
    padding: 16,
    fontSize: 20,
    textAlign: 'center',
    backgroundColor: '#FFFFFF',
    color: '#1C1B1F',
    fontWeight: '600',
    fontWeight: '600',
  },
  resultContainer: {
    padding: 24,
    borderRadius: 24,
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  resultLabel: {
    fontSize: 16,
    color: '#FFFFFF',
    marginBottom: 8,
    fontWeight: '500',
    letterSpacing: 0.5,
  },
  resultAmount: {
    fontSize: 36,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 20,
    color: '#79747E',
    marginBottom: 8,
    fontWeight: '500',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#CAC4D0',
    fontWeight: '400',
  },
  separateSplitContainer: {
    flex: 1,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    margin: 20,
    marginBottom: 0,
    padding: 16,
    backgroundColor: '#FFF4E5',
    borderRadius: 16,
    borderWidth: 0,
  },
  errorIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  errorTextContainer: {
    flex: 1,
  },
  errorText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#E65100',
    marginBottom: 4,
    letterSpacing: 0.25,
  },
  errorHint: {
    fontSize: 12,
    color: '#E65100',
    fontStyle: 'italic',
  },
  peopleList: {
    padding: 20,
    paddingBottom: 80,
  },
  swipeableContainer: {
    marginBottom: 16,
  },
  swipeHintLeft: {
    position: 'absolute',
    left: 4,
    top: '50%',
    transform: [{ translateY: -16 }],
    width: 5,
    height: 32,
    borderRadius: 4,
  },
  swipeHintRight: {
    position: 'absolute',
    right: 4,
    top: '50%',
    transform: [{ translateY: -16 }],
    width: 5,
    height: 32,
    borderRadius: 4,
  },
  swipeLeftActionsContainer: {
    flexDirection: 'row',
    alignItems: 'stretch',
    justifyContent: 'flex-start',
    paddingRight: 10,
  },
  swipeActionsContainer: {
    flexDirection: 'row',
    alignItems: 'stretch',
    justifyContent: 'flex-end',
    paddingLeft: 10,
  },
  swipeAction: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 75,
    borderRadius: 16,
    marginLeft: 6,
  },
  paidAction: {
    backgroundColor: '#198754',
    marginLeft: 0,
    marginRight: 6,
  },
  unpaidAction: {
    backgroundColor: '#FD7E14',
    marginLeft: 0,
    marginRight: 6,
  },
  editAction: {
    backgroundColor: MAIN,
  },
  deleteAction: {
    backgroundColor: '#BA1A1A',
  },
  swipeActionIcon: {
    fontSize: 28,
    fontWeight: '400',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  swipeActionText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 11,
    textTransform: 'lowercase',
    letterSpacing: 0.5,
  },
  personItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'transparent',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  personItemPaid: {
    opacity: 0.65,
  },
  personInfo: {
    flex: 1,
    paddingRight: 12,
  },
  personNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: 8,
  },
  personName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1B1F',
    letterSpacing: 0.15,
  },
  personNamePaid: {
    textDecorationLine: 'line-through',
    color: '#198754',
  },
  paidBadge: {
    backgroundColor: '#198754',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  paidBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  personItems: {
    fontSize: 14,
    color: '#49454F',
    lineHeight: 20,
    fontWeight: '400',
    letterSpacing: 0.25,
  },
  personItemsPaid: {
    color: '#198754',
    opacity: 0.7,
  },
  personNoItems: {
    fontSize: 14,
    color: '#79747E',
    fontStyle: 'italic',
    fontWeight: '400',
  },
  personItemCount: {
    fontSize: 14,
    color: '#79747E',
  },
  personAmountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 24,
  },
  personAmount: {
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.15,
  },
  deletePersonButton: {
    padding: 4,
  },
  deletePersonButtonText: {
    fontSize: 20,
    color: '#BA1A1A',
  },
  addPersonButton: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    padding: 20,
    borderRadius: 28,
    backgroundColor: '#B953D3',
    alignItems: 'center',
  },
  addPersonButtonText: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.5,
    color: '#FFFFFF',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
  },
  modalContent: {
    width: '88%',
    borderRadius: 32,
    padding: 28,
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.18,
    shadowRadius: 28,
    elevation: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  modalTitle: {
    fontFamily: 'Ysabeau-Bold',
    fontSize: 26,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  modalDivider: {
    height: 1,
    marginBottom: 24,
  },
  modalCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputLabel: {
    fontFamily: 'Ysabeau-Bold',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    fontFamily: 'Ysabeau-Regular',
    borderRadius: 14,
    padding: 16,
    fontSize: 16,
    marginBottom: 4,
  },
  modalConfirmBtn: {
    borderRadius: 30,
    paddingVertical: 18,
    alignItems: 'center',
    marginTop: 8,
  },
  modalConfirmText: {
    fontFamily: 'Ysabeau-SemiBold',
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  itemModalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  itemModalContent: {
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    maxHeight: '80%',
    paddingBottom: 24,
    overflow: 'hidden',
  },
  itemModalHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(0,0,0,0.15)',
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 4,
  },
  itemModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 16,
    borderBottomWidth: 1,
    gap: 12,
  },
  itemModalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  itemModalTitle: {
    fontSize: 26,
    fontWeight: '700',
    marginBottom: 3,
    letterSpacing: 0.2,
  },
  itemModalSubtitle: {
    fontSize: 13,
    fontWeight: '400',
    letterSpacing: 0.1,
  },
  selectAllButton: {
    borderWidth: 1.5,
    borderRadius: 20,
    paddingVertical: 7,
    paddingHorizontal: 14,
  },
  selectAllIcon: {
    fontSize: 22,
    lineHeight: 24,
  },
  selectAllText: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  itemsList: {
    maxHeight: 400,
  },
  itemCheckboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 18,
    borderBottomWidth: 1,
  },
  checkbox: {
    width: 32,
    height: 32,
    borderWidth: 2,
    borderRadius: 8,
    marginRight: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmark: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
  },
  itemCheckboxName: {
    flex: 1,
    fontSize: 17,
    color: '#1C1B1F',
    fontWeight: '500',
  },
  itemCheckboxPrice: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1C1B1F',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(0,0,0,0.1)',
    marginVertical: 8,
  },
  noItemsContainer: {
    padding: 40,
    alignItems: 'center',
  },
  noItemsText: {
    fontSize: 16,
    color: '#79747E',
    marginBottom: 4,
    fontWeight: '500',
  },
  noItemsSubtext: {
    fontSize: 14,
    color: '#CAC4D0',
    fontWeight: '400',
  },
  doneButton: {
    margin: 20,
    marginTop: 12,
    padding: 20,
    backgroundColor: '#B953D3',
    borderRadius: 24,
    alignItems: 'center',
  },
  doneButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
});
