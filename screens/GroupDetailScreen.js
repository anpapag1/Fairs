import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Share,
  Alert,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { Ionicons } from '@expo/vector-icons';
import ItemsTab from './tabs/ItemsTab';
import PeopleTab from './tabs/PeopleTab';
import { useTheme, MAIN, ACCENT } from '../context/ThemeContext';
import { useGroups } from '../context/GroupsContext';
import { useCurrency } from '../context/CurrencyContext';

const Tab = createMaterialTopTabNavigator();

export default function GroupDetailScreen({ route, navigation }) {
  const { group } = route.params;
  const { theme } = useTheme();
  const { getGroup } = useGroups();
  const { currencySymbol } = useCurrency();
  const insets = useSafeAreaInsets();

  const exportGroupAsText = () => {
    const currentGroup = getGroup(group.id);
    if (!currentGroup) return '';
    let text = `${currentGroup.name}  -  (${currentGroup.date})\n\n`;
    text += `ITEMS:\n` + `-`.repeat(40) + '\n';
    if (currentGroup.items && currentGroup.items.length > 0) {
      currentGroup.items.forEach(item => {
        const multiplier = item.multiplier || 1;
        const price = parseFloat(item.price);
        const total = price * multiplier;
        text += multiplier > 1
          ? `${item.name} (\u00d7${multiplier})  ${currencySymbol}${total.toFixed(2)}\n`
          : `${item.name}  ${currencySymbol}${price.toFixed(2)}\n`;
      });
      const subtotal = currentGroup.items.reduce((sum, item) => {
        return sum + parseFloat(item.price || 0) * (item.multiplier || 1);
      }, 0);
      text += `-`.repeat(40) + '\n';
      text += `| Subtotal: ${currencySymbol}${subtotal.toFixed(2)}\n`;
      if (currentGroup.tipValue && parseFloat(currentGroup.tipValue) > 0) {
        let tipAmount = currentGroup.tipMode === 'percent'
          ? (subtotal * parseFloat(currentGroup.tipValue)) / 100
          : parseFloat(currentGroup.tipValue);
        text += currentGroup.tipMode === 'percent'
          ? `| Tip (${currentGroup.tipValue}%): ${currencySymbol}${tipAmount.toFixed(2)}\n`
          : `| Tip: ${currencySymbol}${tipAmount.toFixed(2)}\n`;
      }
      const tipAmount = currentGroup.tipValue && !isNaN(parseFloat(currentGroup.tipValue))
        ? (currentGroup.tipMode === 'percent'
          ? (subtotal * parseFloat(currentGroup.tipValue)) / 100
          : parseFloat(currentGroup.tipValue))
        : 0;
      text += `TOTAL: ${currencySymbol}${(subtotal + tipAmount).toFixed(2)}\n`;
    } else {
      text += `No items added yet\n`;
    }
    if (currentGroup.people && currentGroup.people.length > 0) {
      text += `\nPEOPLE:\n`;
      const items = currentGroup.items || [];
      currentGroup.people.forEach(person => {
        let amount = 0;
        person.selectedItems.forEach(itemId => {
          if (itemId === 'tip') {
            const sub = items.reduce((s, i) => s + parseFloat(i.price || 0) * (i.multiplier || 1), 0);
            const tip = currentGroup.tipValue && !isNaN(parseFloat(currentGroup.tipValue))
              ? (currentGroup.tipMode === 'percent' ? (sub * parseFloat(currentGroup.tipValue)) / 100 : parseFloat(currentGroup.tipValue))
              : 0;
            const count = currentGroup.people.filter(p => p.selectedItems.includes('tip')).length;
            if (count > 0) amount += tip / count;
          } else {
            const item = items.find(i => i.id === itemId);
            if (item) {
              const count = currentGroup.people.filter(p => p.selectedItems.includes(itemId)).length;
              if (count > 0) amount += parseFloat(item.price) * (item.multiplier || 1) / count;
            }
          }
        });
        const status = person.isPaid ? '\u2713 PAID' : 'UNPAID';
        text += `| ${person.name} - ${currencySymbol}${amount.toFixed(2)} [${status}]\n`;
        if (person.selectedItems.length > 0) {
          const names = person.selectedItems.map(id => {
            if (id === 'tip') return 'Tip';
            const it = items.find(i => i.id === id);
            return it ? it.name : '';
          }).filter(Boolean);
          if (names.length) text += `|    Items: ${names.join(', ')}\n`;
        }
      });
    }
    text += `\n# Exported from Fairs`;
    return text;
  };

  const shareGroup = async () => {
    try {
      await Share.share({ message: exportGroupAsText(), title: `${group.name} - Expense Split` });
    } catch {
      Alert.alert('Error', 'Failed to share the group');
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={[]}>
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

        <Text style={styles.headerTitle} numberOfLines={1}>{group.name}</Text>

        <TouchableOpacity style={styles.headerRight} onPress={shareGroup} activeOpacity={0.8}>
          <Ionicons name="share-outline" size={22} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <Tab.Navigator
        tabBarPosition="bottom"
        screenOptions={{
          tabBarActiveTintColor: ACCENT,
          tabBarInactiveTintColor: theme.textDisabled,
          tabBarStyle: {
            backgroundColor: theme.surface,
            borderTopWidth: 0,
            elevation: 0,
            shadowOpacity: 0,
            paddingBottom: insets.bottom,
          },
          tabBarIndicatorStyle: {
            backgroundColor: ACCENT,
            height: 3,
            top: 0,
            borderRadius: 2,
          },
          tabBarLabelStyle: {
            fontFamily: 'Ysabeau-Bold',
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
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
    backgroundColor: ACCENT,
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
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: ACCENT,
  },
});
