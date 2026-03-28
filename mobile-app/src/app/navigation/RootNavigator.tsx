import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuthStore } from '../store/authStore';
import LoginScreen from '../../features/auth/screens/LoginScreen';
import DriverNavigator from './roles/DriverNavigator';
import ShipperNavigator from './roles/ShipperNavigator';
import AdminNavigator from './roles/AdminNavigator';
import { Colors } from '../../theme/colors';

export type RootStackParamList = {
  Login: undefined;
  DriverApp: undefined;
  ShipperApp: undefined;
  AdminApp: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  const { user, isBootstrapping } = useAuthStore();

  if (isBootstrapping) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background }}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  const appScreen =
    user?.role === 'ADMIN' ? (
      <Stack.Screen name="AdminApp" component={AdminNavigator} />
    ) : user?.role === 'SHIPPER' ? (
      <Stack.Screen name="ShipperApp" component={ShipperNavigator} />
    ) : user ? (
      <Stack.Screen name="DriverApp" component={DriverNavigator} />
    ) : (
      <Stack.Screen name="Login" component={LoginScreen} />
    );

  return <Stack.Navigator screenOptions={{ headerShown: false }}>{appScreen}</Stack.Navigator>;
}
