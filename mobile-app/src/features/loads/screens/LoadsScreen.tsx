import React, { useEffect, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import Screen from '../../../components/common/Screen';
import Card from '../../../components/common/Card';
import SectionHeader from '../../../components/common/SectionHeader';
import type { LoadItem } from '../../../constants/types';
import { Api } from '../../../services/api';
import { useAuthStore } from '../../../app/store/authStore';
import { Colors } from '../../../theme/colors';

export default function LoadsScreen() {
  const { user } = useAuthStore();
  const [items, setItems] = useState<LoadItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.token) return;
    Api.loads(user.token).then((res) => setItems(res.items)).catch((err) => setError(err.message));
  }, [user?.token]);

  return (
    <Screen scroll={false}>
      <SectionHeader title="Loads" subtitle="Real loads from PostgreSQL-backed API." />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ gap: 12, paddingBottom: 24 }}
        renderItem={({ item }: { item: LoadItem }) => (
          <Card>
            <View style={styles.row}>
              <Text style={styles.id}>{item.pickupCity} → {item.dropCity}</Text>
              <Text style={styles.status}>{item.status}</Text>
            </View>
            <Text style={styles.text}>{item.materialType} • {item.weightTons} tons</Text>
            <Text style={styles.text}>Pickup: {item.pickupAddress}</Text>
            <Text style={styles.text}>Drop: {item.dropAddress}</Text>
            <Text style={styles.price}>₹{item.quotedPrice}</Text>
          </Card>
        )}
        ListEmptyComponent={<Text style={styles.text}>No loads found.</Text>}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  id: { fontWeight: '700', color: Colors.text, flexShrink: 1 },
  status: { color: Colors.secondary, fontWeight: '700' },
  text: { color: Colors.text },
  price: { color: Colors.primary, fontWeight: '700' },
  error: { color: Colors.danger },
});
