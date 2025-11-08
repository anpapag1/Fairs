import React, { useState } from 'react';
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
import { SafeAreaView } from 'react-native-safe-area-context';
import { Swipeable } from 'react-native-gesture-handler';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useCurrency } from '../context/CurrencyContext';
import { useGroups } from '../context/GroupsContext';
import { useTheme } from '../context/ThemeContext';

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
  const { theme } = useTheme();
  const [modalVisible, setModalVisible] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupEmoji, setNewGroupEmoji] = useState('beer');
  const [editingGroup, setEditingGroup] = useState(null);
  const [editGroupName, setEditGroupName] = useState('');
  const [editGroupEmoji, setEditGroupEmoji] = useState('beer');

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
          style={[styles.swipeAction, styles.editAction, { backgroundColor: theme.primary }]}
          onPress={() => openEditGroup(item)}
          activeOpacity={0.9}
        >
          <Text style={[styles.swipeActionIcon, { color: theme.onPrimary }]}>✎</Text>
          <Text style={[styles.swipeActionText, { color: theme.onPrimary }]}>Edit</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.swipeAction, styles.deleteAction, { backgroundColor: theme.warningContainer }]}
          onPress={() => deleteGroup(item.id)}
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
      renderRightActions={(progress, dragX) => renderRightActions(item, progress, dragX)}
      overshootRight={false}
      friction={2}
      rightThreshold={40}
      containerStyle={styles.swipeableContainer}
    >
      <TouchableOpacity
        style={[styles.groupItem, { backgroundColor: theme.surfaceContainer || theme.surfaceVariant }]}
        onPress={() => navigation.navigate('GroupDetail', { group: item })}
        activeOpacity={0.7}
      >
        <View style={styles.groupMainRow}>
          <View style={[styles.groupIconContainer, { backgroundColor: theme.primaryContainer }]}>
            <GroupIcon iconId={item.emoji || 'beer'} size={40} color={theme.primary} />
          </View>
          <View style={styles.groupInfo}>
            <Text style={[styles.groupName, { color: theme.textPrimary }]}>{item.name}</Text>
            <Text style={[styles.groupDate, { color: theme.textSecondary }]}>{item.date}</Text>
            {item.people && item.people.length > 0 && (
              <View style={styles.peoplePills}>
                {item.people.map((person) => (
                  <View key={person.id} style={[styles.personPill, { backgroundColor: theme.surfaceContainerHigh }]}>
                    <Text style={[styles.personPillText, { color: theme.textSecondary }]}>{person.name}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
          <View style={styles.groupTotalContainer}>
            <Text style={[styles.groupTotal, { color: theme.primary }]}>{item.total.toFixed(0)}{currencySymbol}</Text>
          </View>
        </View>
      </TouchableOpacity>
    </Swipeable>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      <View style={[styles.header, { backgroundColor: theme.background }]}>
        <Text style={[styles.title, { color: theme.textPrimary }]}>Groups</Text>
        <TouchableOpacity 
          style={[styles.settingsButton, { backgroundColor: theme.surfaceContainer }]}
          onPress={() => navigation.navigate('Settings')}
        >
          <Ionicons name="settings-sharp" size={24} color={theme.primary} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={groups}
        renderItem={renderGroup}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
      />

      <TouchableOpacity
        style={[styles.addButton, { backgroundColor: theme.primary, shadowColor: theme.primary }]}
        onPress={() => setModalVisible(true)}
      >
        <Text style={[styles.addButtonText, { color: theme.onPrimary }]}>+ Add Group</Text>
      </TouchableOpacity>

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={[styles.modalContent, { backgroundColor: theme.surface, shadowColor: theme.shadow }]}>
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
              style={[styles.input, { borderColor: theme.outline, backgroundColor: theme.surface, color: theme.textPrimary }]}
              placeholder="Group name"
              placeholderTextColor={theme.textSecondary}
              value={newGroupName}
              onChangeText={setNewGroupName}
              autoFocus
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton, { backgroundColor: theme.primaryContainer }]}
                onPress={() => {
                  setModalVisible(false);
                  setNewGroupName('');
                  setNewGroupEmoji('beer');
                }}
              >
                <Text style={[styles.cancelButtonText, { color: theme.primary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.createButton, { backgroundColor: theme.primary }]}
                onPress={addNewGroup}
              >
                <Text style={[styles.createButtonText, { color: theme.onPrimary }]}>Create</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
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
        <View style={styles.modalContainer}>
          <View style={[styles.modalContent, { backgroundColor: theme.surface, shadowColor: theme.shadow }]}>
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
              style={[styles.input, { borderColor: theme.outline, backgroundColor: theme.surface, color: theme.textPrimary }]}
              placeholder="Group name"
              placeholderTextColor={theme.textSecondary}
              value={editGroupName}
              onChangeText={setEditGroupName}
              autoFocus
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton, { backgroundColor: theme.primaryContainer }]}
                onPress={() => {
                  setEditingGroup(null);
                  setEditGroupName('');
                  setEditGroupEmoji('beer');
                }}
              >
                <Text style={[styles.cancelButtonText, { color: theme.primary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.createButton, { backgroundColor: theme.primary }]}
                onPress={saveEditGroup}
              >
                <Text style={[styles.createButtonText, { color: theme.onPrimary }]}>Save</Text>
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
    backgroundColor: '#FEF7FF',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
    backgroundColor: '#FEF7FF',
  },
  title: {
    fontFamily: 'Ysabeau-Bold',
    fontSize: 32,
    fontWeight: '800',
    color: '#1C1B1F',
    letterSpacing: -0.5,
  },
  settingsButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#00000010',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  listContainer: {
    padding: 16,
    paddingBottom: 100,
  },
  groupItem: {
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 0,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    minHeight: 88,
  },
  groupMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  groupIconContainer: {
    width: 64,
    height: 64,
    marginRight: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 16,
    // backgroundColor applied inline from theme
  },
  groupInfo: {
    flex: 1,
  },
  groupName: {
    fontFamily: 'Ysabeau-Bold',
    fontSize: 19,
    fontWeight: '700',
    marginBottom: 5,
    color: '#1C1B1F',
    letterSpacing: 0.15,
  },
  groupDate: {
    fontFamily: 'Ysabeau-Regular',
    fontSize: 13,
    color: '#49454F',
    letterSpacing: 0.25,
    fontWeight: '500',
    marginBottom: 11,
  },
  groupTotalContainer: {
    marginLeft: 8,
    alignItems: 'flex-end',
  },
  groupTotal: {
    fontFamily: 'Ysabeau-Bold',
    fontSize: 22,
    fontWeight: '800',
    color: '#6750A4',
  },
  peoplePills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 2,
  },
  personPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#E8DEF8',
  },
  personPillText: {
    fontFamily: 'Ysabeau-SemiBold',
    fontSize: 11,
    fontWeight: '600',
    color: '#49454F',
    letterSpacing: 0.4,
  },
  addButton: {
    position: 'absolute',
    bottom: 24,
    left: 20,
    right: 20,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#6750A4',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#6750A4',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  addButtonText: {
    fontFamily: 'Ysabeau-Bold',
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  modalContent: {
    width: '88%',
    backgroundColor: '#FFFBFE',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 12,
    },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 12,
  },
  modalTitle: {
    fontFamily: 'Ysabeau-Bold',
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 20,
    color: '#1C1B1F',
    letterSpacing: -0.3,
  },
  inputLabel: {
    fontFamily: 'Ysabeau-Bold',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 10,
    marginTop: 4,
    color: '#49454F',
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
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    marginBottom: 24,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalButton: {
    flex: 1,
    padding: 16,
    borderRadius: 20,
    alignItems: 'center',
    marginHorizontal: 6,
  },
  cancelButton: {
    // backgroundColor applied inline from theme
  },
  cancelButtonText: {
    fontFamily: 'Ysabeau-SemiBold',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  createButton: {
    // backgroundColor applied inline from theme
  },
  createButtonText: {
    fontFamily: 'Ysabeau-SemiBold',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  swipeableContainer: {
    marginBottom: 14,
  },
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
    borderRadius: 16,
    marginLeft: 4,
  },
  editAction: {
    backgroundColor: '#6750A4',
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

});
