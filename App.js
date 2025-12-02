import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { View, Text, StyleSheet, StatusBar, TouchableOpacity, Share, Alert } from 'react-native';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { CurrencyProvider, useCurrency } from './context/CurrencyContext';
import { GroupsProvider, useGroups } from './context/GroupsContext';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import GroupsScreen from './screens/GroupsScreen';
import GroupDetailScreen from './screens/GroupDetailScreen';
import SettingsScreen from './screens/SettingsScreen';

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

const Stack = createNativeStackNavigator();

function AppNavigator() {
  const { theme, isDark } = useTheme();
  const { currencySymbol } = useCurrency();
  const { getGroup } = useGroups();

  const exportGroupAsText = (group) => {
    const currentGroup = getGroup(group.id);
    if (!currentGroup) return '';

    let text = `${currentGroup.name}  -  (${currentGroup.date})\n\n`;
    
    // Items section
    text += `ITEMS:\n`;
    text += `-`.repeat(40) + '\n';
    
    if (currentGroup.items && currentGroup.items.length > 0) {
      currentGroup.items.forEach(item => {
        const multiplier = item.multiplier || 1;
        const price = parseFloat(item.price);
        const total = price * multiplier;
        
        if (multiplier > 1) {
          text += `${item.name} (\u00d7${multiplier})  ${currencySymbol}${total.toFixed(2)}\n`;
        } else {
          text += `${item.name}  ${currencySymbol}${price.toFixed(2)}\n`;
        }
      });
      
      // Calculate subtotal
      const subtotal = currentGroup.items.reduce((sum, item) => {
        const price = parseFloat(item.price || 0);
        const multiplier = item.multiplier || 1;
        return sum + (price * multiplier);
      }, 0);
      
      text += `-`.repeat(40) + '\n';
      text += `| Subtotal: ${currencySymbol}${subtotal.toFixed(2)}\n`;
      
      // Tip
      if (currentGroup.tipValue && parseFloat(currentGroup.tipValue) > 0) {
        let tipAmount = 0;
        if (currentGroup.tipMode === 'percent') {
          tipAmount = (subtotal * parseFloat(currentGroup.tipValue)) / 100;
          text += `| Tip (${currentGroup.tipValue}%): ${currencySymbol}${tipAmount.toFixed(2)}\n`;
        } else {
          tipAmount = parseFloat(currentGroup.tipValue);
          text += `| Tip: ${currencySymbol}${tipAmount.toFixed(2)}\n`;
        }
      }
            
      // Calculate total
      const total = subtotal + (currentGroup.tipValue && !isNaN(parseFloat(currentGroup.tipValue)) 
        ? (currentGroup.tipMode === 'percent' 
          ? (subtotal * parseFloat(currentGroup.tipValue)) / 100 
          : parseFloat(currentGroup.tipValue))
        : 0);
      
      text += `TOTAL: ${currencySymbol}${total.toFixed(2)}\n`;
    } else {
      text += `No items added yet\n`;
    }

    // People section
    if (currentGroup.people && currentGroup.people.length > 0) {
      text += `\nPEOPLE:\n`;
      
      currentGroup.people.forEach(person => {
        const items = currentGroup.items || [];
        let amount = 0;
        
        person.selectedItems.forEach(itemId => {
          if (itemId === 'tip') {
            const subtotal = items.reduce((sum, item) => {
              const price = parseFloat(item.price || 0);
              const multiplier = item.multiplier || 1;
              return sum + (price * multiplier);
            }, 0);
            let tipAmount = 0;
            if (currentGroup.tipValue && !isNaN(parseFloat(currentGroup.tipValue))) {
              if (currentGroup.tipMode === 'percent') {
                tipAmount = (subtotal * parseFloat(currentGroup.tipValue)) / 100;
              } else {
                tipAmount = parseFloat(currentGroup.tipValue);
              }
            }
            const peopleWithTip = currentGroup.people.filter(p => p.selectedItems.includes('tip')).length;
            if (peopleWithTip > 0) {
              amount += tipAmount / peopleWithTip;
            }
          } else {
            const item = items.find(i => i.id === itemId);
            if (item) {
              const peopleWithItem = currentGroup.people.filter(p => p.selectedItems.includes(itemId)).length;
              if (peopleWithItem > 0) {
                const itemPrice = parseFloat(item.price) * (item.multiplier || 1);
                amount += itemPrice / peopleWithItem;
              }
            }
          }
        });
        
        const status = person.isPaid ? '\u2713 PAID' : 'UNPAID';
        text += `| ${person.name} - ${currencySymbol}${amount.toFixed(2)} [${status}]\n`;
        
        if (person.selectedItems.length > 0) {
          text += `|    Items: `;
          const itemNames = person.selectedItems.map(itemId => {
            if (itemId === 'tip') return 'Tip';
            const item = items.find(i => i.id === itemId);
            return item ? item.name : '';
          }).filter(name => name);
          text += itemNames.join(', ') + '\n';
        }
      });
    }

    text += `\n# Exported from Fairs`;
    
    return text;
  };

  const shareGroup = async (group) => {
    try {
      const text = exportGroupAsText(group);
      await Share.share({
        message: text,
        title: `${group.name} - Expense Split`,
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to share the group');
    }
  };
  
  return (
    <>
      <StatusBar 
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={theme.background}
      />
      <NavigationContainer>
        <Stack.Navigator
          screenOptions={{
            headerStyle: {
              backgroundColor: theme.background,
            },
            headerTintColor: theme.primary,
            headerTitleStyle: {
              fontFamily: 'Ysabeau-Bold',
              fontWeight: '700',
              fontSize: 22,
              color: theme.onBackground,
              letterSpacing: 0.15,
            },
            headerShadowVisible: false,
            contentStyle: { backgroundColor: theme.background },
            headerStatusBarHeight: undefined,
          }}
        >
          <Stack.Screen 
            name="Groups" 
            component={GroupsScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen 
            name="GroupDetail" 
            component={GroupDetailScreen}
            options={({ route }) => ({ 
              headerTitle: () => (
                <View style={styles.headerTitleContainer}>
                  <Text style={[styles.headerTitle, { color: theme.onBackground }]}>{route.params.group.name}</Text>
                  <Text style={[styles.headerDate, { color: theme.textSecondary }]}>{route.params.group.date}</Text>
                </View>
              ),
              headerBackTitle: 'Groups',
              headerRight: () => (
                <TouchableOpacity
                  style={styles.shareButton}
                  onPress={() => shareGroup(route.params.group)}
                >
                  <Ionicons name="share-outline" size={24} color={theme.primary} />
                </TouchableOpacity>
              ),
            })}
          />
          <Stack.Screen 
            name="Settings" 
            component={SettingsScreen}
            options={{ headerShown: false }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </>
  );
}

function ThemedApp() {
  const { theme } = useTheme();
  
  const [fontsLoaded, fontError] = useFonts({
    'Ysabeau-Regular': require('./assets/fonts/Ysabeau-Regular.ttf'),
    'Ysabeau-SemiBold': require('./assets/fonts/Ysabeau-SemiBold.ttf'),
    'Ysabeau-Bold': require('./assets/fonts/Ysabeau-Bold.ttf'),
  });

  useEffect(() => {
    if (fontsLoaded) {
      console.log('✅ Fonts loaded successfully!');
      SplashScreen.hideAsync();
    }
    if (fontError) {
      console.error('❌ Font loading error:', fontError);
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return null;
  }
  
  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: theme.background }}>
      <SafeAreaProvider style={{ backgroundColor: theme.background }}>
        <AppNavigator />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <CurrencyProvider>
        <GroupsProvider>
          <ThemedApp />
        </GroupsProvider>
      </CurrencyProvider>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 10,
  },
  headerDate: {
    fontFamily: 'Ysabeau-Regular',
    fontSize: 14,
    color: '#49454F',
    fontWeight: '500',
    letterSpacing: 0.25,
  },
  headerTitle: {
    fontFamily: 'Ysabeau-Bold',
    fontSize: 22,
    fontWeight: '700',
    color: '#1C1B1F',
    letterSpacing: 0.15,
  },
  shareButton: {
    padding: 8,
    marginRight: 8,
  },
});
