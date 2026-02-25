import React, { useState, useRef, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  TextInput,
  Modal,
  Animated,
  ScrollView,
  StatusBar,
  Pressable,
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Swipeable } from 'react-native-gesture-handler';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Image } from 'react-native';
import { useCurrency } from '../context/CurrencyContext';
import { useGroups } from '../context/GroupsContext';
import { useTheme } from '../context/ThemeContext';
import { MAIN, ACCENT, SEARCH_BAR } from '../context/ThemeContext';

// Icon mapping for group types
const ICON_OPTIONS = [
  { id: 'beer', name: 'beer', library: 'Ionicons' },
  { id: 'cookie', name: 'cookie', library: 'MaterialCommunityIcons' },
  { id: 'pizza', name: 'pizza', library: 'Ionicons' },
  { id: 'fast-food', name: 'fast-food', library: 'Ionicons' },
  { id: 'cafe', name: 'cafe', library: 'Ionicons' },
  { id: 'party-popper', name: 'party-popper', library: 'MaterialCommunityIcons' },
  { id: 'airplane', name: 'airplane', library: 'Ionicons' },
  { id: 'home', name: 'home', library: 'Ionicons' },
  { id: 'game-controller', name: 'game-controller', library: 'Ionicons' },
  { id: 'cash', name: 'cash', library: 'Ionicons' },
];

// Helper component to render the appropriate icon
const GroupIcon = ({ iconId, size = 32, color }) => {
  const icon = ICON_OPTIONS.find(i => i.id === iconId) || ICON_OPTIONS[0];
  const IconComponent = icon.library === 'MaterialCommunityIcons' ? MaterialCommunityIcons : Ionicons;
  return <IconComponent name={icon.name} size={size} color={color} />;
};

export default function GroupsScreen({ navigation }) {
  const { currencySymbol } = useCurrency();
  const { groups, addGroup, deleteGroup, updateGroupName } = useGroups();
  const { theme, isDark } = useTheme();
  const [modalVisible, setModalVisible] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupEmoji, setNewGroupEmoji] = useState('beer');
  const [editingGroup, setEditingGroup] = useState(null);
  const [editGroupName, setEditGroupName] = useState('');
  const [editGroupEmoji, setEditGroupEmoji] = useState('beer');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [sortOrder, setSortOrder] = useState('date-desc');
  const [sortMenuVisible, setSortMenuVisible] = useState(false);

  const SORT_OPTIONS = [
    { id: 'date-desc', label: 'Newest first',  icon: 'arrow-down',  iconLib: 'Ionicons' },
    { id: 'date-asc',  label: 'Oldest first',  icon: 'arrow-up',    iconLib: 'Ionicons' },
    { id: 'name-asc',  label: 'Name A → Z',    icon: 'text',        iconLib: 'Ionicons' },
    { id: 'name-desc', label: 'Name Z → A',    icon: 'text',        iconLib: 'Ionicons' },
  ];

  // Dynamic filter options derived from existing groups
  const dynamicFilterOptions = useMemo(() => {
    const uniqueIcons = [...new Set(groups.map(g => g.emoji || 'beer'))];
    const filters = [{ id: 'all', icon: 'menu', library: 'Ionicons', label: 'All' }];
    uniqueIcons.forEach(iconId => {
      const icon = ICON_OPTIONS.find(i => i.id === iconId);
      if (icon) filters.push({ id: iconId, icon: icon.name, library: icon.library });
    });
    return filters;
  }, [groups]);

  // Reset active filter if the icon it targets no longer exists in any group
  useEffect(() => {
    if (activeFilter !== 'all') {
      const stillExists = groups.some(g => (g.emoji || 'beer') === activeFilter);
      if (!stillExists) setActiveFilter('all');
    }
  }, [groups]);

  // Store refs for all swipeable items
  const swipeableRefs = useRef({});

  const addNewGroup = () => {
    if (newGroupName.trim()) {
      const today = new Date();
      const day = today.getDate();
      const month = today.getMonth() + 1;
      const year = today.getFullYear();
      const formattedDate = `${day}/${month}/${year}`;
      
      addGroup(newGroupName.trim(), formattedDate, newGroupEmoji);
      setNewGroupName('');
      setNewGroupEmoji('beer');
      setModalVisible(false);
    }
  };

  const openEditGroup = (group) => {
    setEditingGroup(group);
    setEditGroupName(group.name);
    setEditGroupEmoji(group.emoji || 'beer');
  };

  const saveEditGroup = () => {
    if (editGroupName.trim() && editingGroup) {
      updateGroupName(editingGroup.id, editGroupName.trim(), editGroupEmoji);
      setEditingGroup(null);
      setEditGroupName('');
      setEditGroupEmoji('beer');
    }
  };

  const parseDate = (str) => {
    if (!str) return 0;
    const [d, m, y] = str.split('/').map(Number);
    return new Date(y, m - 1, d).getTime();
  };

  const filteredGroups = groups
    .filter(group => {
      const matchesSearch = group.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesFilter = activeFilter === 'all' || group.emoji === activeFilter;
      return matchesSearch && matchesFilter;
    })
    .sort((a, b) => {
      if (sortOrder === 'date-desc') return parseDate(b.date) - parseDate(a.date);
      if (sortOrder === 'date-asc')  return parseDate(a.date) - parseDate(b.date);
      if (sortOrder === 'name-asc')  return a.name.localeCompare(b.name);
      if (sortOrder === 'name-desc') return b.name.localeCompare(a.name);
      return 0;
    });

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
      <Animated.View style={[styles.swipeActionsContainer, { transform: [{ translateX }], opacity }]}>
        <TouchableOpacity
          style={[styles.swipeAction, styles.editAction, { backgroundColor: ACCENT }]}
          onPress={() => {
            openEditGroup(item);
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
            deleteGroup(item.id);
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

  const renderGroup = ({ item }) => (
    <Swipeable
      ref={(ref) => { swipeableRefs.current[item.id] = ref; }}
      renderRightActions={(progress, dragX) => renderRightActions(item, progress, dragX)}
      overshootRight={false}
      friction={2}
      rightThreshold={40}
      containerStyle={styles.swipeableContainer}
    >
      <View style={{ position: 'relative' }}>
        <TouchableOpacity
          style={[styles.groupItem, { backgroundColor: theme.surface }]}
          onPress={() => navigation.navigate('GroupDetail', { group: item })}
          activeOpacity={0.85}
        >
          <View style={styles.groupMainRow}>
            <View style={[styles.groupIconContainer, { backgroundColor: theme.primaryContainer }]}>
              <GroupIcon iconId={item.emoji || 'beer'} size={36} color={ACCENT} />
            </View>
            <View style={styles.groupInfo}>
              <Text style={[styles.groupName, { color: theme.textPrimary }]}>{item.name}</Text>
              <Text style={[styles.groupDate, { color: theme.textSecondary }]}>{item.date}</Text>
            </View>
            <View style={styles.groupTotalContainer}>
              <Text style={[styles.groupTotal, { color: theme.textPrimary }]}>{item.total.toFixed(0)}{currencySymbol}</Text>
            </View>
          </View>
          {item.people && item.people.length > 0 && (
            <View style={styles.peoplePills}>
              {item.people.map((person) => (
                <View
                  key={person.id}
                  style={[
                    styles.personPill,
                    { backgroundColor: person.isPaid ? theme.successContainer : theme.surfaceContainerHigh },
                  ]}
                >
                  <Text style={[styles.personPillText, { color: theme.textPrimary }]}>{person.name}</Text>
                </View>
              ))}
            </View>
          )}
        </TouchableOpacity>
        {/* Swipe hint pill peeking from right edge */}
        <View style={[styles.swipeHint, { backgroundColor: theme.outlineVariant }]} />
      </View>
    </Swipeable>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['bottom']}>
      <StatusBar backgroundColor={MAIN} barStyle="light-content" />
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.logoContainer}>
          <Image source={require('../assets/Logo.png')} style={styles.logoImage} resizeMode="contain" />
        </View>
        <View style={[styles.searchBar, { backgroundColor: theme.primaryContainer }]}>
          <Ionicons name="search" size={18} style={[styles.searchIcon, { color: theme.textSecondary }]} />
          <TextInput
            style={[styles.searchInput, { color: theme.textSecondary }]}
            placeholder="Search"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
        <TouchableOpacity
          style={styles.settingsButton}
          onPress={() => navigation.navigate('Settings')}
        >
          <Ionicons name="settings-sharp" size={22} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Filter Bar */}
      <View style={styles.filterBar}>
        <Text style={[styles.filterLabel, { color: theme.textSecondary }]}>GROUPS:</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterScroll}
          contentContainerStyle={styles.filterScrollContent}
        >
          {dynamicFilterOptions.map((filter) => {
            const isActive = activeFilter === filter.id;
            const IconComp = filter.library === 'MaterialCommunityIcons' ? MaterialCommunityIcons : Ionicons;
            return (
              <TouchableOpacity
                key={filter.id}
                style={[styles.filterChip, { backgroundColor: theme.surfaceContainerHigh }, filter.label && styles.filterChipWide, isActive && styles.filterChipActive]}
                onPress={() => setActiveFilter(filter.id)}
                activeOpacity={0.8}
              >
                {filter.label ? (
                  <View style={styles.filterChipAll}>
                    <IconComp name={filter.icon} size={18} color={isActive ? '#FFFFFF' : theme.textSecondary} />
                    <Text style={[styles.filterChipText, { color: isActive ? '#FFFFFF' : theme.textSecondary }]}>
                      {filter.label}
                    </Text>
                  </View>
                ) : (
                  <IconComp name={filter.icon} size={18} color={isActive ? '#FFFFFF' : theme.textSecondary} />
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
          <TouchableOpacity
            style={[styles.sortButton, { backgroundColor: ACCENT }, sortOrder !== 'date-desc' && { backgroundColor: ACCENT }]}
            onPress={() => setSortMenuVisible(true)}
            activeOpacity={0.8}
          >
            <Ionicons name="funnel-outline" size={17} color='#fff'/>
          </TouchableOpacity>
      </View>

      <FlatList
        data={filteredGroups}
        renderItem={renderGroup}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
      />

      <TouchableOpacity
        style={styles.addButton}
        onPress={() => setModalVisible(true)}
        activeOpacity={0.85}
      >
        <Text style={styles.addButtonText}>+ Add Group</Text>
      </TouchableOpacity>

      {/* Sort menu */}
      <Modal transparent animationType="fade" visible={sortMenuVisible} onRequestClose={() => setSortMenuVisible(false)}>
        <Pressable style={StyleSheet.absoluteFillObject} onPress={() => setSortMenuVisible(false)} />
        <View style={[styles.sortMenu, { backgroundColor: theme.surface }]} onStartShouldSetResponder={() => true}>
          <Text style={[styles.sortMenuTitle, { color: theme.textSecondary }]}>Sort by</Text>
          {SORT_OPTIONS.map(opt => {
            const active = sortOrder === opt.id;
            return (
              <TouchableOpacity
                key={opt.id}
                style={[styles.sortMenuRow, active && { backgroundColor: theme.primaryContainer }]}
                onPress={() => { setSortOrder(opt.id); setSortMenuVisible(false); }}
                activeOpacity={0.8}
              >
                <Ionicons name={opt.icon} size={18} color={active ? ACCENT : theme.textSecondary} />
                <Text style={[styles.sortMenuLabel, { color: active ? ACCENT : theme.textPrimary }, active && { fontFamily: 'Ysabeau-Bold' }]}>
                  {opt.label}
                </Text>
                {active && <Ionicons name="checkmark" size={18} color={ACCENT} style={{ marginLeft: 'auto' }} />}
              </TouchableOpacity>
            );
          })}
        </View>
      </Modal>

      {/* New Group Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView style={styles.modalContainer} behavior="padding" keyboardVerticalOffset={0}>
          <Pressable style={StyleSheet.absoluteFillObject} onPress={() => { setModalVisible(false); setNewGroupName(''); setNewGroupEmoji('beer'); }} />
          <View style={[styles.modalContent, { backgroundColor: theme.surface, shadowColor: theme.shadow }]} onStartShouldSetResponder={() => true}>
            <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>New Group</Text>
            
            <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Icon</Text>
            <View style={styles.emojiSelector}>
              {ICON_OPTIONS.map((icon) => (
                <TouchableOpacity
                  key={icon.id}
                  style={[
                    styles.emojiOption,
                    { 
                      borderColor: theme.outline,
                      backgroundColor: newGroupEmoji === icon.id ? theme.primaryContainer : theme.surfaceContainerHigh 
                    },
                    newGroupEmoji === icon.id && { borderColor: theme.primary }
                  ]}
                  onPress={() => setNewGroupEmoji(icon.id)}
                >
                  <GroupIcon iconId={icon.id} size={28} color={newGroupEmoji === icon.id ? theme.primary : theme.textSecondary} />
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Group Name</Text>
            <TextInput
              style={[styles.input, { borderColor: theme.outline, backgroundColor: theme.surfaceVariant, color: theme.textPrimary }]}
              placeholder="Group name"
              placeholderTextColor={theme.textSecondary}
              value={newGroupName}
              onChangeText={setNewGroupName}
              autoFocus
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton, { backgroundColor: theme.surfaceVariant }]}
                onPress={() => {
                  setModalVisible(false);
                  setNewGroupName('');
                  setNewGroupEmoji('beer');
                }}
              >
                <Text style={[styles.cancelButtonText, { color: ACCENT }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.createButton, { backgroundColor: ACCENT }]}
                onPress={addNewGroup}
              >
                <Text style={[styles.createButtonText, { color: theme.onPrimary }]}>Create</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Edit Group Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={editingGroup !== null}
        onRequestClose={() => {
          setEditingGroup(null);
          setEditGroupName('');
          setEditGroupEmoji('beer');
        }}
      >
        <KeyboardAvoidingView style={styles.modalContainer} behavior="padding" keyboardVerticalOffset={0}>
          <Pressable style={StyleSheet.absoluteFillObject} onPress={() => { setEditingGroup(null); setEditGroupName(''); setEditGroupEmoji('beer'); }} />
          <View style={[styles.modalContent, { backgroundColor: theme.surface, shadowColor: theme.shadow }]} onStartShouldSetResponder={() => true}>
            <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>Edit Group</Text>
            
            <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Icon</Text>
            <View style={styles.emojiSelector}>
              {ICON_OPTIONS.map((icon) => (
                <TouchableOpacity
                  key={icon.id}
                  style={[
                    styles.emojiOption,
                    { 
                      borderColor: theme.outline,
                      backgroundColor: editGroupEmoji === icon.id ? theme.primaryContainer : theme.surfaceContainerHigh 
                    },
                    editGroupEmoji === icon.id && { borderColor: theme.primary }
                  ]}
                  onPress={() => setEditGroupEmoji(icon.id)}
                >
                  <GroupIcon iconId={icon.id} size={28} color={editGroupEmoji === icon.id ? theme.primary : theme.textSecondary} />
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Group Name</Text>
            <TextInput
              style={[styles.input, { borderColor: theme.outline, backgroundColor: theme.surfaceVariant, color: theme.textPrimary }]}
              placeholder="Group name"
              placeholderTextColor={theme.textSecondary}
              value={editGroupName}
              onChangeText={setEditGroupName}
              autoFocus
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton, { backgroundColor: theme.surfaceVariant }]}
                onPress={() => {
                  setEditingGroup(null);
                  setEditGroupName('');
                  setEditGroupEmoji('beer');
                }}
              >
                <Text style={[styles.cancelButtonText, { color: ACCENT }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.createButton, { backgroundColor: ACCENT }]}
                onPress={saveEditGroup}
              >
                <Text style={[styles.createButtonText, { color: theme.onPrimary }]}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
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
    paddingHorizontal: 16,
    paddingTop: 30,
    paddingBottom: 14,
    gap: 10,
    backgroundColor: MAIN,
    marginBottom: 4,
  },
  logoContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  logoImage: {
    width: 36,
    height: 36,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 24,
    paddingHorizontal: 14,
    height: 44,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontFamily: 'Ysabeau-Regular',
    fontSize: 16,
    color: '#FFFFFF',
    paddingVertical: 0,
  },
  settingsButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: ACCENT,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // ── Filter Bar ───────────────────────────────────────────
  filterBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 8,
  },
  filterScroll: {
    flex: 1,
  },
  filterScrollContent: {
    flexDirection: 'row',
    gap: 8,
    paddingRight: 4,
  },
  filterLabel: {
    fontFamily: 'Ysabeau-Bold',
    fontSize: 13,
    letterSpacing: 1,
    marginRight: 2,
  },
  filterChip: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterChipActive: {
    backgroundColor: ACCENT,
  },
  filterChipWide: {
    width: 'auto',
    paddingHorizontal: 12,
  },
  filterChipAll: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  filterChipText: {
    fontFamily: 'Ysabeau-Bold',
    fontSize: 12,
    letterSpacing: 0.3,
  },
  filterChipTextActive: {},

  sortButton: {
    width: 40,
    height: 40,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 4,
  },
  sortMenu: {
    position: 'absolute',
    right: 16,
    top: 130,
    width: 210,
    borderRadius: 15,
    paddingVertical: 10,
    paddingHorizontal: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 10,
  },
  sortMenuTitle: {
    fontFamily: 'Ysabeau-Bold',
    fontSize: 12,
    letterSpacing: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  sortMenuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 11,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  sortMenuLabel: {
    fontFamily: 'Ysabeau-Regular',
    fontSize: 15,
  },

  // ── List ────────────────────────────────────────────────
  listContainer: {
    paddingHorizontal: 16,
    paddingBottom: 140,
    gap: 12,
  },
  swipeableContainer: {},

  // ── Group Card ──────────────────────────────────────────
  groupItem: {
    borderRadius: 20,
    padding: 18,
    overflow: 'hidden',
  },
  groupMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  groupIconContainer: {
    width: 56,
    height: 56,
    marginRight: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 14,
  },
  groupInfo: {
    flex: 1,
  },
  groupName: {
    fontFamily: 'Ysabeau-Bold',
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: 0.1,
    marginBottom: 2,
  },
  groupDate: {
    fontFamily: 'Ysabeau-Regular',
    fontSize: 13,
    letterSpacing: 0.2,
  },
  groupTotalContainer: {
    alignItems: 'flex-end',
    marginLeft: 8,
  },
  swipeHint: {
    position: 'absolute',
    right: 3,
    top: '50%',
    transform: [{ translateY: -20 }],
    width: 5,
    height: 40,
    borderRadius: 4,
  },
  swipeHintCurrency: {
    fontFamily: 'Ysabeau-Bold',
    fontSize: 12,
    color: 'rgba(255,255,255,0.85)',
    lineHeight: 13,
  },
  groupTotal: {
    fontFamily: 'Ysabeau-Bold',
    fontSize: 22,
    fontWeight: '700',
  },
  peoplePills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 12,
  },
  personPill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 14,
  },
  personPillText: {
    fontFamily: 'Ysabeau-SemiBold',
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.2,
  },

  // ── Add Button ──────────────────────────────────────────
  addButton: {
    position: 'absolute',
    bottom: 24,
    left: 20,
    right: 20,
    height: 58,
    borderRadius: 29,
    backgroundColor: ACCENT,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: ACCENT,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 14,
    elevation: 10,
  },
  addButtonText: {
    fontFamily: 'Ysabeau-Bold',
    fontSize: 17,
    color: '#FFFFFF',
    fontWeight: '700',
    letterSpacing: 0.5,
  },

  // ── Swipe Actions ───────────────────────────────────────
  swipeActionsContainer: {
    flexDirection: 'row',
    alignItems: 'stretch',
    justifyContent: 'flex-end',
    paddingLeft: 8,
  },
  swipeAction: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 75,
    height: '100%',
    borderRadius: 18,
    marginLeft: 6,
  },
  editAction: {
    backgroundColor: ACCENT,
  },
  deleteAction: {
    backgroundColor: '#BA1A1A',
  },
  swipeActionIcon: {
    fontFamily: 'Ysabeau-Bold',
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  swipeActionText: {
    fontFamily: 'Ysabeau-Bold',
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },

  // ── Modal ───────────────────────────────────────────────
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    width: '88%',
    borderRadius: 24,
    padding: 24,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 12,
  },
  modalTitle: {
    fontFamily: 'Ysabeau-Bold',
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 20,
    letterSpacing: -0.3,
  },
  inputLabel: {
    fontFamily: 'Ysabeau-Bold',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 10,
    marginTop: 4,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  emojiSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  emojiOption: {
    width: 52,
    height: 52,
    borderRadius: 14,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  input: {
    fontFamily: 'Ysabeau-Regular',
    borderWidth: 2,
    borderRadius: 14,
    padding: 16,
    fontSize: 16,
    marginBottom: 24,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 16,
  },
  modalButton: {
    flex: 1,
    padding: 16,
    borderRadius: 20,
    alignItems: 'center',
    marginHorizontal: 0,
  },
  cancelButton: {},
  cancelButtonText: {
    fontFamily: 'Ysabeau-SemiBold',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  createButton: {},
  createButtonText: {
    fontFamily: 'Ysabeau-SemiBold',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
});
