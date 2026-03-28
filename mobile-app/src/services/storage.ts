import * as SecureStore from 'expo-secure-store';
import type { AuthUser } from '../constants/types';

const AUTH_KEY = 'ap_trucking_auth_v2';

export async function getStoredAuth(): Promise<AuthUser | null> {
  const value = await SecureStore.getItemAsync(AUTH_KEY);
  return value ? (JSON.parse(value) as AuthUser) : null;
}

export async function setStoredAuth(value: AuthUser) {
  await SecureStore.setItemAsync(AUTH_KEY, JSON.stringify(value));
}

export async function clearStoredAuth() {
  await SecureStore.deleteItemAsync(AUTH_KEY);
}


export async function setItem(key: string, value: string) {
  await SecureStore.setItemAsync(key, value);
}

export async function getItem(key: string) {
  return SecureStore.getItemAsync(key);
}

export async function removeItem(key: string) {
  await SecureStore.deleteItemAsync(key);
}
