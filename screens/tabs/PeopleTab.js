import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { useCurrency } from '../../context/CurrencyContext';
import { useGroups } from '../../context/GroupsContext';
import { useTheme } from '../../context/ThemeContext';

export default function PeopleTab({ route }) {
  const { group } = route.params;
  const { currencySymbol } = useCurrency();
  const { getGroup, calculateGroupTotal, updateGroupPeople, updateGroupSplitMode } = useGroups();
  const { theme } = useTheme();
  
  const currentGroup = getGroup(group.id);
  const [splitMode, setSplitMode] = useState(currentGroup?.splitMode || 'equal'); // 'equal' or 'separate'
  const [numberOfPeople, setNumberOfPeople] = useState('');
  const [people, setPeople] = useState(currentGroup?.people || []);
  const [modalVisible, setModalVisible] = useState(false);
  const [newPersonName, setNewPersonName] = useState('');
  const [selectedPerson, setSelectedPerson] = useState(null);
  const [itemSelectionModalVisible, setItemSelectionModalVisible] = useState(false);
  const [editingPerson, setEditingPerson] = useState(null);
  const [editPersonName, setEditPersonName] = useState('');
  
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
        const subtotal = items.reduce((sum, item) => sum + parseFloat(item.price || 0), 0);
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
            amount += parseFloat(item.price) / peopleWithItem;
          }
        }
      }
    });
    
    return amount;
  };

  const openItemSelection = (person) => {
    setSelectedPerson(person);
    setItemSelectionModalVisible(true);
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

    return (
      <Animated.View 
        style={[
          styles.swipeLeftActionsContainer,
          { transform: [{ translateX }] }
        ]}
      >
        <TouchableOpacity
          style={[styles.swipeAction, { backgroundColor: item.isPaid ? theme.warning : theme.success }]}
          onPress={() => {
            togglePersonPaid(item.id);
          }}
          activeOpacity={0.9}
        >
          <Text style={styles.swipeActionIcon}>{item.isPaid ? '↶' : '✓'}</Text>
          <Text style={styles.swipeActionText}>{item.isPaid ? 'Unpaid' : 'Paid'}</Text>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const renderRightActions = (item, progress, dragX) => {
    const translateX = progress.interpolate({
      inputRange: [0, 1],
      outputRange: [160, 0],
    });

    return (
      <Animated.View 
        style={[
          styles.swipeActionsContainer,
          { transform: [{ translateX }] }
        ]}
      >
        <TouchableOpacity
          style={[styles.swipeAction, { backgroundColor: theme.primary }]}
          onPress={() => {
            openEditPerson(item);
          }}
          activeOpacity={0.9}
        >
          <Text style={styles.swipeActionIcon}>✎</Text>
          <Text style={styles.swipeActionText}>Edit</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.swipeAction, { backgroundColor: theme.error }]}
          onPress={() => {
            deletePerson(item.id);
          }}
          activeOpacity={0.9}
        >
          <Text style={styles.swipeActionIcon}>×</Text>
          <Text style={styles.swipeActionText}>Delete</Text>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const renderPerson = ({ item }) => {
    const amount = calculatePersonAmount(item);
    const selectedItemNames = getSelectedItemNames(item);
    
    return (
      <Swipeable
        renderLeftActions={(progress, dragX) => renderLeftActions(item, progress, dragX)}
        renderRightActions={(progress, dragX) => renderRightActions(item, progress, dragX)}
        overshootLeft={false}
        overshootRight={false}
        friction={2}
        leftThreshold={40}
        rightThreshold={40}
        containerStyle={styles.swipeableContainer}
      >
        <TouchableOpacity
          style={[
            styles.personItem,
            { backgroundColor: theme.surfaceContainerHighest || theme.surfaceVariant, borderColor: theme.outlineVariant },
            item.isPaid && { opacity: 0.65 }
          ]}
          onPress={() => openItemSelection(item)}
          activeOpacity={0.7}
        >
          <View style={styles.personInfo}>
            <View style={styles.personNameRow}>
              <Text style={[
                styles.personName,
                { color: theme.onSurface },
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
                { color: theme.onSurfaceVariant },
                item.isPaid && { opacity: 0.6 }
              ]} numberOfLines={2}>
                {selectedItemNames.join(', ')}
              </Text>
            ) : (
              <Text style={[styles.personNoItems, { color: theme.onSurfaceVariant }]}>No items selected</Text>
            )}
          </View>
          <View style={[styles.personAmountContainer, { backgroundColor: theme.primaryContainer }]}>
            <Text style={[styles.personAmount, { color: theme.onPrimaryContainer }]}>{currencySymbol}{amount.toFixed(2)}</Text>
          </View>
        </TouchableOpacity>
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
      itemName = item.name;
      itemPrice = parseFloat(item.price);
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
          isSelected && { backgroundColor: theme.primary, borderColor: theme.primary }
        ]}>
          {isSelected && <Text style={styles.checkmark}>✓</Text>}
        </View>
        <Text style={[styles.itemCheckboxName, { color: theme.onSurface }]}>{itemName}</Text>
        <Text style={[styles.itemCheckboxPrice, { color: theme.onSurfaceVariant }]}>{currencySymbol}{itemPrice.toFixed(2)}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.splitModeContainer, { backgroundColor: theme.surface, borderBottomColor: theme.outlineVariant }]}>
        <Text style={[styles.sectionTitle, { color: theme.onSurface }]}>Split Mode</Text>
        <View style={styles.splitModeButtons}>
          <TouchableOpacity
            style={[
              styles.splitModeButton,
              { borderColor: theme.outline, backgroundColor: splitMode === 'equal' ? theme.primaryContainer : 'transparent' }
            ]}
            onPress={() => setSplitMode('equal')}
          >
            <Text style={[
              styles.splitModeButtonText,
              { color: splitMode === 'equal' ? theme.onPrimaryContainer : theme.onSurfaceVariant }
            ]}>
              Equal Split
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.splitModeButton,
              { borderColor: theme.outline, backgroundColor: splitMode === 'separate' ? theme.primaryContainer : 'transparent' }
            ]}
            onPress={() => setSplitMode('separate')}
          >
            <Text style={[
              styles.splitModeButtonText,
              { color: splitMode === 'separate' ? theme.onPrimaryContainer : theme.onSurfaceVariant }
            ]}>
              Separate Split
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {splitMode === 'equal' ? (
        <View style={styles.equalSplitContainer}>
          <View style={[styles.totalContainer, { backgroundColor: theme.surfaceVariant }]}>
            <Text style={[styles.totalLabel, { color: theme.onSurfaceVariant }]}>Total Amount:</Text>
            <Text style={[styles.totalAmount, { color: theme.onSurfaceVariant }]}>{currencySymbol}{total.toFixed(2)}</Text>
          </View>

          <View style={styles.peopleInputContainer}>
            <Text style={[styles.inputLabel, { color: theme.onSurface }]}>Number of People:</Text>
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
                style={[styles.peopleInput, { borderColor: theme.outline, color: theme.onSurface, backgroundColor: theme.surface }]}
                placeholder="0"
                placeholderTextColor={theme.onSurfaceVariant}
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
            <View style={[styles.resultContainer, { backgroundColor: theme.primaryContainer }]}>
              <Text style={[styles.resultLabel, { color: theme.onPrimaryContainer }]}>Each Person Pays:</Text>
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
              <Text style={[styles.emptyText, { color: theme.onSurfaceVariant }]}>No people added</Text>
              <Text style={[styles.emptySubtext, { color: theme.onSurfaceVariant }]}>Tap + to add people to split</Text>
            </View>
          ) : (
            <>
              {!isBillBalanced() && (
                <View style={[styles.errorContainer, { backgroundColor: theme.errorContainer }]}>
                  <Text style={styles.errorIcon}>⚠️</Text>
                  <View style={styles.errorTextContainer}>
                    <Text style={[styles.errorText, { color: theme.onErrorContainer }]}>
                      Totals don't match! Difference: {currencySymbol}{Math.abs(total - calculateTotalAssigned()).toFixed(2)}
                    </Text>
                    {!getTipAssignmentStatus().assigned && tipValue && parseFloat(tipValue) > 0 && (
                      <Text style={[styles.errorHint, { color: theme.onErrorContainer }]}>
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
            style={[styles.addPersonButton, { backgroundColor: theme.primary }]}
            onPress={() => setModalVisible(true)}
          >
            <Text style={[styles.addPersonButtonText, { color: theme.onPrimary }]}>+ Add Person</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Add Person Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={[styles.modalContent, { backgroundColor: theme.surface, shadowColor: theme.shadow }]}>
            <Text style={[styles.modalTitle, { color: theme.onSurface }]}>Add Person</Text>
            
            <Text style={[styles.inputLabel, { color: theme.onSurface }]}>Name</Text>
            <TextInput
              style={[styles.input, { borderColor: theme.outline, color: theme.onSurface, backgroundColor: theme.surface }]}
              placeholder="e.g., John"
              placeholderTextColor={theme.onSurfaceVariant}
              value={newPersonName}
              onChangeText={setNewPersonName}
              autoFocus
            />
            
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton, { borderColor: theme.outline }]}
                onPress={() => {
                  setModalVisible(false);
                  setNewPersonName('');
                }}
              >
                <Text style={[styles.cancelButtonText, { color: theme.primary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.createButton, { backgroundColor: theme.primary }]}
                onPress={addPerson}
              >
                <Text style={[styles.createButtonText, { color: theme.onPrimary }]}>Add</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Edit Person Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={editingPerson !== null}
        onRequestClose={() => {
          setEditingPerson(null);
          setEditPersonName('');
        }}
      >
        <View style={styles.modalContainer}>
          <View style={[styles.modalContent, { backgroundColor: theme.surface, shadowColor: theme.shadow }]}>
            <Text style={[styles.modalTitle, { color: theme.onSurface }]}>Edit Person</Text>
            
            <Text style={[styles.inputLabel, { color: theme.onSurface }]}>Name</Text>
            <TextInput
              style={[styles.input, { borderColor: theme.outline, color: theme.onSurface, backgroundColor: theme.surface }]}
              placeholder="e.g., John"
              placeholderTextColor={theme.onSurfaceVariant}
              value={editPersonName}
              onChangeText={setEditPersonName}
              autoFocus
            />
            
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton, { borderColor: theme.outline }]}
                onPress={() => {
                  setEditingPerson(null);
                  setEditPersonName('');
                }}
              >
                <Text style={[styles.cancelButtonText, { color: theme.primary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.createButton, { backgroundColor: theme.primary }]}
                onPress={saveEditPerson}
              >
                <Text style={[styles.createButtonText, { color: theme.onPrimary }]}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Item Selection Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={itemSelectionModalVisible}
        onRequestClose={() => setItemSelectionModalVisible(false)}
      >
        <View style={styles.itemModalContainer}>
          <View style={[styles.itemModalContent, { backgroundColor: theme.surface }]}>
            <View style={[styles.itemModalHeader, { borderBottomColor: theme.outlineVariant }]}>
              <Text style={[styles.itemModalTitle, { color: theme.onSurface }]}>
                {selectedPerson?.name}
              </Text>
              <Text style={[styles.itemModalSubtitle, { color: theme.onSurfaceVariant }]}>
                Select items this person consumed
              </Text>
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
                  <Text style={[styles.noItemsText, { color: theme.onSurfaceVariant }]}>No items in this bill</Text>
                  <Text style={[styles.noItemsSubtext, { color: theme.onSurfaceVariant }]}>Add items in the Items tab first</Text>
                </View>
              )}
            </ScrollView>
            
            <TouchableOpacity
              style={[styles.doneButton, { backgroundColor: theme.primary }]}
              onPress={() => setItemSelectionModalVisible(false)}
            >
              <Text style={[styles.doneButtonText, { color: theme.onPrimary }]}>Done</Text>
            </TouchableOpacity>
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
  splitModeContainer: {
    padding: 24,
    backgroundColor: '#FFFBFE',
    borderBottomWidth: 1,
    borderBottomColor: '#E8DEF8',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 16,
    color: '#1C1B1F',
    letterSpacing: 0.15,
  },
  splitModeButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  splitModeButton: {
    flex: 1,
    padding: 16,
    borderWidth: 1,
    borderColor: '#6750A4',
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
  },
  splitModeButtonActive: {
    backgroundColor: '#6750A4',
  },
  splitModeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6750A4',
    letterSpacing: 0.5,
  },
  splitModeButtonTextActive: {
    color: '#FFFFFF',
  },
  equalSplitContainer: {
    padding: 24,
  },
  totalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#FFFBFE',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E8DEF8',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0,
    shadowRadius: 8,
    elevation: 2,
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
    color: '#6750A4',
  },
  peopleInputContainer: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    color: '#1C1B1F',
    letterSpacing: 0.15,
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
    borderColor: '#6750A4',
    borderRadius: 16,
    backgroundColor: '#E8DEF8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  counterButtonText: {
    fontSize: 28,
    fontWeight: '600',
    color: '#6750A4',
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
    backgroundColor: '#6750A4',
    borderRadius: 24,
    alignItems: 'center',
    shadowColor: '#6750A4',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0,
    shadowRadius: 8,
    elevation: 4,
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
    borderWidth: 1,
    borderColor: '#FFB74D',
  },
  errorIcon: {
    fontSize: 20,
    marginRight: 8,
    color: '#E65100',
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
    backgroundColor: '#6750A4',
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
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#E8DEF8',
  },
  personItemPaid: {
    backgroundColor: '#E8F5E9',
    borderColor: '#81C784',
    opacity: 0.85,
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
    backgroundColor: '#6750A4',
    alignItems: 'center',
    shadowColor: '#6750A4',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0,
    shadowRadius: 8,
    elevation: 6,
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
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  modalContent: {
    width: '85%',
    maxHeight: '80%',
    backgroundColor: '#FFFBFE',
    borderRadius: 28,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0,
    shadowRadius: 16,
    elevation: 8,
  },
  modalTitle: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 24,
    color: '#1C1B1F',
    letterSpacing: 0.5,
  },
  input: {
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
    fontSize: 16,
    fontWeight: '600',
    color: '#6750A4',
    letterSpacing: 0.5,
  },
  createButton: {
    backgroundColor: '#6750A4',
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  itemModalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  itemModalContent: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '80%',
    paddingBottom: 24,
  },
  itemModalHeader: {
    padding: 24,
    borderBottomWidth: 1,
  },
  itemModalTitle: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 6,
    color: '#1C1B1F',
    letterSpacing: 0.5,
  },
  itemModalSubtitle: {
    fontSize: 14,
    color: '#49454F',
    fontWeight: '500',
    letterSpacing: 0.25,
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
    backgroundColor: '#E8DEF8',
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
    backgroundColor: '#6750A4',
    borderRadius: 24,
    alignItems: 'center',
    shadowColor: '#6750A4',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0,
    shadowRadius: 8,
    elevation: 4,
  },
  doneButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
});
