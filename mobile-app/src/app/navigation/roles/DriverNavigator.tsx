import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import HomeScreen from '../../../features/dashboard/screens/HomeScreen';
import LoadsScreen from '../../../features/loads/screens/LoadsScreen';
import TripsScreen from '../../../features/trips/screens/TripsScreen';
import TrackingScreen from '../../../features/tracking/screens/TrackingScreen';
import PaymentsScreen from '../../../features/payments/screens/PaymentsScreen';
import ProfileScreen from '../../../features/profile/screens/ProfileScreen';
import { Colors } from '../../../theme/colors';

const Tab = createBottomTabNavigator();

export default function DriverNavigator() {
  return (
    <Tab.Navigator screenOptions={{ tabBarActiveTintColor: Colors.primary }}>
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Loads" component={LoadsScreen} />
      <Tab.Screen name="Trips" component={TripsScreen} />
      <Tab.Screen name="Tracking" component={TrackingScreen} />
      <Tab.Screen name="Payments" component={PaymentsScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}
