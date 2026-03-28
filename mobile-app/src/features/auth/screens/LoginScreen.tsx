import React, { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import Screen from '../../../components/common/Screen';
import Card from '../../../components/common/Card';
import SectionHeader from '../../../components/common/SectionHeader';
import { Api } from '../../../services/api';
import { useAuthStore } from '../../../app/store/authStore';
import type { UserRole } from '../../../constants/types';
import { Colors } from '../../../theme/colors';

const roles: UserRole[] = ['DRIVER', 'SHIPPER', 'ADMIN'];

export default function LoginScreen() {
  const { signIn } = useAuthStore();
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('+919876543210');
  const [otp, setOtp] = useState('');
  const [role, setRole] = useState<UserRole>('DRIVER');
  const [otpSent, setOtpSent] = useState(false);
  const [busy, setBusy] = useState(false);

  const handleSendOtp = async () => {
    try {
      setBusy(true);
      await Api.sendOtp(mobile);
      setOtpSent(true);
      Alert.alert('OTP sent', 'Check your SMS inbox for the verification code.');
    } catch (error) {
      Alert.alert('Unable to send OTP', error instanceof Error ? error.message : 'Unexpected error');
    } finally {
      setBusy(false);
    }
  };

  const handleVerify = async () => {
    try {
      setBusy(true);
      const response = await Api.verifyOtp(mobile, otp, role, name || undefined);
      await signIn(response.user);
    } catch (error) {
      Alert.alert('Login failed', error instanceof Error ? error.message : 'Unexpected error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <SectionHeader title="AP Trucking secure sign in" subtitle="Use a real E.164 mobile number like +919876543210." />
      <Card>
        <Text style={styles.label}>Full name</Text>
        <TextInput value={name} onChangeText={setName} style={styles.input} placeholder="Ajay Sharma" />
        <Text style={styles.label}>Mobile</Text>
        <TextInput value={mobile} onChangeText={setMobile} style={styles.input} autoCapitalize="none" keyboardType="phone-pad" />
        <Text style={styles.label}>Role</Text>
        <View style={styles.roleWrap}>
          {roles.map((item) => (
            <Pressable key={item} style={[styles.role, role === item && styles.roleActive]} onPress={() => setRole(item)}>
              <Text style={[styles.roleText, role === item && styles.roleTextActive]}>{item}</Text>
            </Pressable>
          ))}
        </View>
        {otpSent ? (
          <>
            <Text style={styles.label}>OTP</Text>
            <TextInput value={otp} onChangeText={setOtp} style={styles.input} keyboardType="number-pad" maxLength={6} />
            <Pressable style={styles.button} onPress={handleVerify} disabled={busy}>
              <Text style={styles.buttonText}>{busy ? 'Verifying...' : 'Verify and sign in'}</Text>
            </Pressable>
          </>
        ) : (
          <Pressable style={styles.button} onPress={handleSendOtp} disabled={busy}>
            <Text style={styles.buttonText}>{busy ? 'Sending...' : 'Send OTP'}</Text>
          </Pressable>
        )}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  label: { color: Colors.text, fontWeight: '600' },
  input: { borderWidth: 1, borderColor: Colors.border, borderRadius: 12, padding: 12, backgroundColor: '#fff' },
  roleWrap: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  role: { paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: Colors.border },
  roleActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  roleText: { color: Colors.text, fontWeight: '600' },
  roleTextActive: { color: '#fff' },
  button: { marginTop: 12, backgroundColor: Colors.primary, borderRadius: 12, padding: 14, alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: '700' },
});
