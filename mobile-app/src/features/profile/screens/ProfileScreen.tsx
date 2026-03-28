import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import Screen from '../../../components/common/Screen';
import Card from '../../../components/common/Card';
import SectionHeader from '../../../components/common/SectionHeader';
import InfoRow from '../../../components/common/InfoRow';
import { useAuthStore } from '../../../app/store/authStore';
import { Colors } from '../../../theme/colors';

export default function ProfileScreen() {
  const { user, signOut } = useAuthStore();

  return (
    <Screen>
      <SectionHeader title="Profile" subtitle="Account, KYC, and security status." />
      <Card>
        <InfoRow label="Name" value={user?.name ?? '-'} />
        <InfoRow label="Mobile" value={user?.mobile ?? '-'} />
        <InfoRow label="Role" value={user?.role ?? '-'} />
        <InfoRow label="KYC" value="Pending production integration" />
      </Card>
      <Pressable style={styles.button} onPress={() => void signOut()}>
        <Text style={styles.buttonText}>Logout</Text>
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  button: { backgroundColor: Colors.danger, borderRadius: 12, padding: 14, alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: '700' },
});
