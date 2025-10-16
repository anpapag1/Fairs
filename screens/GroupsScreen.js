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
import { useCurrency } from '../context/CurrencyContext';
import { useGroups } from '../context/GroupsContext';
import { useTheme } from '../context/ThemeContext';

export default function GroupsScreen({ navigation }) {
  const { currencySymbol } = useCurrency();
  const { groups, addGroup, deleteGroup, updateGroupName } = useGroups();
  const { theme } = useTheme();
  const [modalVisible, setModalVisible] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [editingGroup, setEditingGroup] = useState(null);
  const [editGroupName, setEditGroupName] = useState('');

  const addNewGroup = () => {
    if (newGroupName.trim()) {
      const today = new Date();
      const formattedDate = `${today.getDate()}/${today.getMonth() + 1}/${today.getFullYear().toString().slice(-2)}`;
      
      addGroup(newGroupName.trim(), formattedDate);
      setNewGroupName('');
      setModalVisible(false);
    }
  };

  const openEditGroup = (group) => {
    setEditingGroup(group);
    setEditGroupName(group.name);
  };

  const saveEditGroup = () => {
    if (editGroupName.trim() && editingGroup) {
      updateGroupName(editingGroup.id, editGroupName.trim());
      setEditingGroup(null);
      setEditGroupName('');
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
          style={[styles.swipeAction, styles.deleteAction, { backgroundColor: theme.error }]}
          onPress={() => deleteGroup(item.id)}
          activeOpacity={0.9}
        >
          <Text style={[styles.swipeActionIcon, { color: theme.onError }]}>×</Text>
          <Text style={[styles.swipeActionText, { color: theme.onError }]}>Delete</Text>
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
        style={[styles.groupItem, { backgroundColor: theme.surfaceContainerHighest || theme.surfaceVariant, borderColor: theme.outlineVariant }]}
        onPress={() => navigation.navigate('GroupDetail', { group: item })}
      >
        <View style={styles.groupInfo}>
          <Text style={[styles.groupName, { color: theme.onSurface }]}>{item.name}</Text>
          <Text style={[styles.groupDate, { color: theme.onSurfaceVariant }]}>{item.date}</Text>
        </View>
        <Text style={[styles.groupTotal, { color: theme.primary }]}>{currencySymbol}{item.total.toFixed(2)}</Text>
      </TouchableOpacity>
    </Swipeable>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      <View style={[styles.header, { backgroundColor: theme.background }]}>
        <Text style={[styles.title, { color: theme.onBackground }]}>Groups</Text>
        <TouchableOpacity 
          style={[styles.settingsButton, { backgroundColor: theme.primaryContainer }]}
          onPress={() => navigation.navigate('Settings')}
        >
          <Text style={[styles.settingsIcon, { color: theme.primary }]}>⚙</Text>
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
        <Text style={[styles.addButtonText, { color: theme.onPrimary }]}>+</Text>
      </TouchableOpacity>

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={[styles.modalContent, { backgroundColor: theme.surface, shadowColor: theme.shadow }]}>
            <Text style={[styles.modalTitle, { color: theme.onSurface }]}>New Group</Text>
            <TextInput
              style={[styles.input, { borderColor: theme.outline, backgroundColor: theme.surface, color: theme.onSurface }]}
              placeholder="Group name"
              placeholderTextColor={theme.onSurfaceVariant}
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
        }}
      >
        <View style={styles.modalContainer}>
          <View style={[styles.modalContent, { backgroundColor: theme.surface, shadowColor: theme.shadow }]}>
            <Text style={[styles.modalTitle, { color: theme.onSurface }]}>Edit Group</Text>
            <TextInput
              style={[styles.input, { borderColor: theme.outline, backgroundColor: theme.surface, color: theme.onSurface }]}
              placeholder="Group name"
              placeholderTextColor={theme.onSurfaceVariant}
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
    padding: 24,
    paddingTop: 16,
    backgroundColor: '#FEF7FF',
  },
  title: {
    fontSize: 36,
    fontWeight: '700',
    color: '#1C1B1F',
    letterSpacing: 0.5,
  },
  settingsButton: {
    padding: 12,
    backgroundColor: '#E8DEF8',
    borderRadius: 20,
  },
  settingsIcon: {
    fontSize: 24,
    color: '#6750A4',
  },
  listContainer: {
    padding: 16,
  },
  groupItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  groupInfo: {
    flex: 1,
  },
  groupName: {
    fontSize: 22,
    fontWeight: '600',
    marginBottom: 6,
    color: '#1C1B1F',
    letterSpacing: 0.15,
  },
  groupDate: {
    fontSize: 14,
    color: '#49454F',
    letterSpacing: 0.25,
    fontWeight: '500',
  },
  groupTotal: {
    fontSize: 22,
    fontWeight: '700',
    color: '#6750A4',
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
    marginBottom: 24,
    backgroundColor: '#FFFFFF',
    color: '#1C1B1F',
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
  swipeableContainer: {
    marginBottom: 16,
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
    width: 80,
    height: '100%',
  },
  editAction: {
    backgroundColor: '#6750A4',
    marginRight: 6,
    borderRadius: 16,
  },
  deleteAction: {
    backgroundColor: '#BA1A1A',
    borderRadius: 16,
  },
  swipeActionIcon: {
    fontSize: 24,
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

});
