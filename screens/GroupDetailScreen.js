import React from 'react';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import ItemsTab from './tabs/ItemsTab';
import PeopleTab from './tabs/PeopleTab';
import { useTheme } from '../context/ThemeContext';

const Tab = createMaterialTopTabNavigator();

export default function GroupDetailScreen({ route }) {
  const { group } = route.params;
  const { theme } = useTheme();

  return (
    <Tab.Navigator
      tabBarPosition="bottom"
      screenOptions={{
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: theme.onSurfaceVariant,
        tabBarStyle: {
          backgroundColor: theme.surface,
          borderTopWidth: 1,
          borderTopColor: theme.outlineVariant,
          elevation: 8,
          shadowColor: theme.shadow,
          shadowOffset: {
            width: 0,
            height: -4,
          },
          shadowOpacity: 0.08,
          shadowRadius: 12,
        },
        tabBarIndicatorStyle: {
          backgroundColor: theme.primary,
          height: 4,
          top: 0,
          borderRadius: 2,
        },
        tabBarLabelStyle: {
          fontSize: 16,
          fontWeight: '700',
          textTransform: 'none',
          letterSpacing: 0.5,
        },
      }}
    >
      <Tab.Screen 
        name="Items" 
        component={ItemsTab}
        initialParams={{ group }}
      />
      <Tab.Screen 
        name="People" 
        component={PeopleTab}
        initialParams={{ group }}
      />
    </Tab.Navigator>
  );
}
