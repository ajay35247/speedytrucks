import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import HomeScreen from '../../../features/dashboard/screens/HomeScreen';
import TripsScreen from '../../../features/trips/screens/TripsScreen';
import AdminScreen from '../../../features/admin/screens/AdminScreen';
import PaymentsScreen from '../../../features/payments/screens/PaymentsScreen';
import ProfileScreen from '../../../features/profile/screens/ProfileScreen';
import { Colors } from '../../../theme/colors';

const Tab = createBottomTabNavigator();

export default function AdminNavigator() {
  return (
    <Tab.Navigator screenOptions={{ tabBarActiveTintColor: Colors.primary }}>
      <Tab.Screen name="Dashboard" component={HomeScreen} />
      <Tab.Screen name="Trips" component={TripsScreen} />
      <Tab.Screen name="Admin" component={AdminScreen} />
      <Tab.Screen name="Payments" component={PaymentsScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}
