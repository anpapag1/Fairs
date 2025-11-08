import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { View, Text, StyleSheet, StatusBar } from 'react-native';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { CurrencyProvider } from './context/CurrencyContext';
import { GroupsProvider } from './context/GroupsContext';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import GroupsScreen from './screens/GroupsScreen';
import GroupDetailScreen from './screens/GroupDetailScreen';
import SettingsScreen from './screens/SettingsScreen';

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

const Stack = createNativeStackNavigator();

function AppNavigator() {
  const { theme, isDark } = useTheme();
  
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
    if (fontsLoaded || fontError) {
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
});
