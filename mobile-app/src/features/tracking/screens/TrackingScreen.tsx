import React, { useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import Screen from '../../../components/common/Screen';
import Card from '../../../components/common/Card';
import SectionHeader from '../../../components/common/SectionHeader';
import InfoRow from '../../../components/common/InfoRow';
import { getCurrentTripLocation, startBackgroundTripTracking, stopBackgroundTripTracking } from '../../../services/location';
import { Colors } from '../../../theme/colors';
import { useAuthStore } from '../../../app/store/authStore';
import { Api } from '../../../services/api';

export default function TrackingScreen() {
  const { user } = useAuthStore();
  const [location, setLocation] = useState<{ lat: number; lng: number; speed: number; accuracyM?: number } | null>(null);
  const [tracking, setTracking] = useState(false);
  const [tripId, setTripId] = useState<string | null>(null);

  const helper = useMemo(() => (tripId ? `Tracking trip ${tripId}` : 'First fetch your active trip, then start live tracking.'), [tripId]);

  const fetchLocation = async () => {
    try {
      const current = await getCurrentTripLocation();
      setLocation(current);
    } catch (error) {
      Alert.alert('Location error', error instanceof Error ? error.message : 'Unable to fetch location');
    }
  };

  const fetchTrip = async () => {
    try {
      if (!user?.token) return;
      const { items } = await Api.trips(user.token);
      const active = items.find((item) => ['ASSIGNED', 'AT_PICKUP', 'IN_TRANSIT'].includes(item.currentStatus));
      if (!active) {
        Alert.alert('No active trip', 'There is no active trip assigned to this account.');
        return;
      }
      setTripId(active.id);
      Alert.alert('Trip ready', `Live tracking linked to vehicle ${active.vehicleNumber}`);
    } catch (error) {
      Alert.alert('Trip error', error instanceof Error ? error.message : 'Unable to fetch trips');
    }
  };

  const syncCurrentLocation = async () => {
    try {
      if (!user?.token || !tripId) return;
      const current = await getCurrentTripLocation();
      await Api.updateTripLocation(user.token, tripId, {
        currentLat: current.lat,
        currentLng: current.lng,
        speed: current.speed,
        heading: current.heading,
        accuracyM: current.accuracyM,
      });
      setLocation(current);
      Alert.alert('Synced', 'Current trip location sent to backend.');
    } catch (error) {
      Alert.alert('Sync error', error instanceof Error ? error.message : 'Unable to sync location');
    }
  };

  const toggleTracking = async () => {
    try {
      if (!tripId) {
        Alert.alert('Select trip first', 'Fetch your active trip before starting tracking.');
        return;
      }
      if (tracking) {
        await stopBackgroundTripTracking();
        setTracking(false);
      } else {
        await startBackgroundTripTracking(tripId);
        setTracking(true);
      }
    } catch (error) {
      Alert.alert('Tracking error', error instanceof Error ? error.message : 'Unable to change tracking state');
    }
  };

  return (
    <Screen>
      <SectionHeader title="Tracking" subtitle={helper} />
      <Card>
        <Text style={styles.title}>Active trip location</Text>
        <MapView
          provider={PROVIDER_GOOGLE}
          style={styles.map}
          showsUserLocation
          initialRegion={{
            latitude: location?.lat || 20.5937,
            longitude: location?.lng || 78.9629,
            latitudeDelta: 0.05,
            longitudeDelta: 0.05,
          }}
          region={location ? {
            latitude: location.lat,
            longitude: location.lng,
            latitudeDelta: 0.02,
            longitudeDelta: 0.02,
          } : undefined}
        >
          {location ? (
            <Marker
              coordinate={{ latitude: location.lat, longitude: location.lng }}
              title="Current trip position"
              description={tripId || 'Active trip location'}
            />
          ) : null}
        </MapView>
        <InfoRow label="Trip ID" value={tripId || 'Not selected'} />
        <InfoRow label="Latitude" value={location ? String(location.lat.toFixed(6)) : 'Not captured'} />
        <InfoRow label="Longitude" value={location ? String(location.lng.toFixed(6)) : 'Not captured'} />
        <InfoRow label="Speed" value={location ? `${location.speed} m/s` : 'Not captured'} />
        <InfoRow label="Accuracy" value={location?.accuracyM ? `${location.accuracyM} m` : 'Not captured'} />
        <Pressable style={styles.button} onPress={fetchTrip}>
          <Text style={styles.buttonText}>Fetch active trip</Text>
        </Pressable>
        <Pressable style={styles.button} onPress={fetchLocation}>
          <Text style={styles.buttonText}>Capture current location</Text>
        </Pressable>
        <Pressable style={styles.button} onPress={syncCurrentLocation}>
          <Text style={styles.buttonText}>Sync current location</Text>
        </Pressable>
        <Pressable style={[styles.button, tracking && styles.stop]} onPress={toggleTracking}>
          <Text style={styles.buttonText}>{tracking ? 'Stop background tracking' : 'Start background tracking'}</Text>
        </Pressable>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 16, fontWeight: '700', color: Colors.text },
  map: { width: '100%', height: 220, borderRadius: 12, marginTop: 10, marginBottom: 10 },
  button: { backgroundColor: Colors.primary, borderRadius: 12, padding: 14, alignItems: 'center', marginTop: 8 },
  stop: { backgroundColor: Colors.danger },
  buttonText: { color: '#fff', fontWeight: '700' },
});
