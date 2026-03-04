import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import HomeScreen from '../screens/HomeScreen';
import MyThoughtsScreen from '../screens/MyThoughtsScreen';
import FeedScreen from '../screens/FeedScreen';
import WriteThoughtScreen from '../screens/WriteThoughtScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
   tabBarStyle: {
  backgroundColor: '#080808',
  borderTopColor: '#1a1a1a',
  borderTopWidth: 1,
},
tabBarActiveTintColor: '#FF6B00',
tabBarInactiveTintColor: '#444',
tabBarLabelStyle: {
  fontFamily: 'PressStart2P_400Regular',
  fontSize: 6,
  marginBottom: 4,
},
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="My Thoughts"
        component={MyThoughtsScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="bulb" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Feed"
        component={FeedScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="globe" size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Tabs" component={TabNavigator} />
        <Stack.Screen name="WriteThought" component={WriteThoughtScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}