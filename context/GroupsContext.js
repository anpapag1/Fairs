import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const GroupsContext = createContext();

const STORAGE_KEY = '@fairs_groups';

export const useGroups = () => {
  const context = useContext(GroupsContext);
  if (!context) {
    throw new Error('useGroups must be used within a GroupsProvider');
  }
  return context;
};

export const GroupsProvider = ({ children }) => {
  const [groups, setGroups] = useState([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load groups from storage on mount
  useEffect(() => {
    loadGroups();
  }, []);

  // Save groups to storage whenever they change
  useEffect(() => {
    if (isLoaded) {
      saveGroups();
    }
  }, [groups, isLoaded]);

  const loadGroups = async () => {
    try {
      const storedGroups = await AsyncStorage.getItem(STORAGE_KEY);
      if (storedGroups !== null) {
        setGroups(JSON.parse(storedGroups));
      }
    } catch (error) {
      console.error('Error loading groups:', error);
    } finally {
      setIsLoaded(true);
    }
  };

  const saveGroups = async () => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(groups));
    } catch (error) {
      console.error('Error saving groups:', error);
    }
  };

  const addGroup = (name, date, emoji = 'beer') => {
    const newGroup = {
      id: Date.now().toString(),
      name: name,
      emoji: emoji,
      date: date,
      items: [],
      people: [],
      tipValue: '',
      tipMode: 'money',
      splitMode: 'equal',
    };
    setGroups([...groups, newGroup]);
    return newGroup;
  };

  const updateGroupItems = (groupId, items) => {
    setGroups(groups.map(group => 
      group.id === groupId 
        ? { ...group, items }
        : group
    ));
  };

  const updateGroupTip = (groupId, tipValue, tipMode) => {
    setGroups(groups.map(group => 
      group.id === groupId 
        ? { ...group, tipValue, tipMode }
        : group
    ));
  };

  const updateGroupPeople = (groupId, people) => {
    setGroups(groups.map(group => 
      group.id === groupId 
        ? { ...group, people }
        : group
    ));
  };

  const updateGroupSplitMode = (groupId, splitMode) => {
    setGroups(groups.map(group => 
      group.id === groupId 
        ? { ...group, splitMode }
        : group
    ));
  };

  const updateGroupName = (groupId, name, emoji) => {
    setGroups(groups.map(group => 
      group.id === groupId 
        ? { ...group, name, emoji: emoji || group.emoji || 'beer' }
        : group
    ));
  };

  const deleteGroup = (groupId) => {
    setGroups(groups.filter(group => group.id !== groupId));
  };

  const getGroup = (groupId) => {
    return groups.find(group => group.id === groupId);
  };

  const calculateGroupTotal = (groupId) => {
    const group = getGroup(groupId);
    if (!group) return 0;

    const subtotal = group.items.reduce((sum, item) => {
      const price = parseFloat(item.price || 0);
      const multiplier = item.multiplier || 1;
      return sum + (price * multiplier);
    }, 0);
    let tip = 0;
    
    if (group.tipValue && !isNaN(parseFloat(group.tipValue))) {
      if (group.tipMode === 'percent') {
        tip = (subtotal * parseFloat(group.tipValue)) / 100;
      } else {
        tip = parseFloat(group.tipValue);
      }
    }

    return subtotal + tip;
  };

  const getGroupsWithTotals = () => {
    return groups.map(group => ({
      ...group,
      total: calculateGroupTotal(group.id)
    }));
  };

  const value = {
    groups: getGroupsWithTotals(),
    addGroup,
    updateGroupItems,
    updateGroupTip,
    updateGroupPeople,
    updateGroupSplitMode,
    updateGroupName,
    deleteGroup,
    getGroup,
    calculateGroupTotal,
  };

  return (
    <GroupsContext.Provider value={value}>
      {children}
    </GroupsContext.Provider>
  );
};
