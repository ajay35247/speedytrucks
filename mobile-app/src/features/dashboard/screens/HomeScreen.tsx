import React, { useEffect, useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import Screen from '../../../components/common/Screen';
import Card from '../../../components/common/Card';
import SectionHeader from '../../../components/common/SectionHeader';
import { Api } from '../../../services/api';
import { useAuthStore } from '../../../app/store/authStore';
import { Colors } from '../../../theme/colors';

export default function HomeScreen() {
  const { user } = useAuthStore();
  const [metrics, setMetrics] = useState<Record<string, number>>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.token) return;
    Api.dashboard(user.token).then((res) => setMetrics(res.metrics)).catch((err) => setError(err.message));
  }, [user?.token]);

  return (
    <Screen>
      <SectionHeader title={`Welcome, ${user?.name ?? 'User'}`} subtitle="Live metrics pulled from the backend API." />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Card>
        {Object.keys(metrics).length ? (
          Object.entries(metrics).map(([key, value]) => (
            <Text key={key} style={styles.metric}>
              {key}: {value}
            </Text>
          ))
        ) : (
          <Text style={styles.metric}>No metrics loaded yet.</Text>
        )}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  metric: { color: Colors.text, fontSize: 16, lineHeight: 24 },
  error: { color: Colors.danger },
});
