import React, { useState, useEffect } from 'react';
import { LogBox, ActivityIndicator, View, Text } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './firebaseConfig';

import LoginScreen from './screens/LoginScreen';
import HomeScreen from './screens/HomeScreen';
import CheckInScreen from './screens/CheckInScreen';
import HistoryScreen from './screens/HistoryScreen';
import ProfileScreen from './screens/ProfileScreen';
import RegisterCardScreen from './screens/RegisterCardScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function MainTabs({ navigation }) {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ color, size }) => {
          let iconName;
          if (route.name === 'Home') iconName = 'home';
          else if (route.name === 'Check-In') iconName = 'checkmark-circle';
          else if (route.name === 'History') iconName = 'time';
          else if (route.name === 'Profile') iconName = 'person';
          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#06b6d4',
        tabBarInactiveTintColor: '#94a3b8',
        tabBarStyle: {
          backgroundColor: '#fff',
          borderTopColor: '#eef6fb',
          height: 60,
          paddingBottom: 8,
          paddingTop: 8
        },
        headerShown: false,
      })}
    >
      <Tab.Screen name="Home">
        {(props) => <HomeScreen {...props} rootNavigation={navigation} />}
      </Tab.Screen>
      <Tab.Screen name="Check-In">
        {(props) => <CheckInScreen {...props} rootNavigation={navigation} />}
      </Tab.Screen>
      <Tab.Screen name="History">
        {(props) => <HistoryScreen {...props} rootNavigation={navigation} />}
      </Tab.Screen>
      <Tab.Screen name="Profile">
        {(props) => <ProfileScreen {...props} rootNavigation={navigation} />}
      </Tab.Screen>
    </Tab.Navigator>
  );
}

function MainStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MainTabs" component={MainTabs} />
      <Stack.Screen name="RegisterCard" component={RegisterCardScreen} />
    </Stack.Navigator>
  );
}

function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
    </Stack.Navigator>
  );
}

export default function App() {
  LogBox.ignoreLogs(['SafeAreaView has been deprecated']);
  
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      console.log('Auth state changed:', user ? 'Logged in' : 'Logged out');
      setUser(user);
      setLoading(false);
    });
    
    return unsubscribe;
  }, []);

  if (loading) {
    return (
      <View style={{ 
        flex: 1, 
        justifyContent: 'center', 
        alignItems: 'center', 
        backgroundColor: '#f8fafc' 
      }}>
        <ActivityIndicator size="large" color="#06b6d4" />
        <Text style={{ marginTop: 12, color: '#64748b' }}>Loading app...</Text>
      </View>
    );
  }

  console.log('Rendering app, user:', user ? 'yes' : 'no');

  return (
    <NavigationContainer>
      {user ? <MainStack /> : <AuthStack />}
    </NavigationContainer>
  );
}