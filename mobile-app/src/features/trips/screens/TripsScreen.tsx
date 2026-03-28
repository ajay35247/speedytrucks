import React, { useEffect, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import Screen from '../../../components/common/Screen';
import Card from '../../../components/common/Card';
import SectionHeader from '../../../components/common/SectionHeader';
import type { TripItem } from '../../../constants/types';
import { Api } from '../../../services/api';
import { useAuthStore } from '../../../app/store/authStore';
import { Colors } from '../../../theme/colors';

export default function TripsScreen() {
  const { user } = useAuthStore();
  const [items, setItems] = useState<TripItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.token) return;
    Api.trips(user.token).then((res) => setItems(res.items)).catch((err) => setError(err.message));
  }, [user?.token]);

  return (
    <Screen scroll={false}>
      <SectionHeader title="Trips" subtitle="Trip lifecycle data from the backend API." />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ gap: 12, paddingBottom: 24 }}
        renderItem={({ item }: { item: TripItem }) => (
          <Card>
            <View style={styles.row}>
              <Text style={styles.id}>{item.id}</Text>
              <Text style={styles.status}>{item.currentStatus}</Text>
            </View>
            <Text style={styles.text}>Truck: {item.vehicleNumber}</Text>
            <Text style={styles.text}>Route: {item.load?.pickupCity ?? '-'} → {item.load?.dropCity ?? '-'}</Text>
            <Text style={styles.eta}>ETA: {item.etaHours ?? 0} hours</Text>
          </Card>
        )}
        ListEmptyComponent={<Text style={styles.text}>No trips found.</Text>}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  id: { fontWeight: '700', color: Colors.text },
  status: { color: Colors.secondary, fontWeight: '700' },
  text: { color: Colors.text },
  eta: { color: Colors.primary, fontWeight: '700' },
  error: { color: Colors.danger },
});
