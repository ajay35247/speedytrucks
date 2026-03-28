import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { getItem, getStoredAuth, removeItem, setItem } from './storage';
import { Api } from './api';

const TRACKING_TASK = 'ap-trucking-background-tracking';
const ACTIVE_TRIP_KEY = 'active_trip_id';
let activeTripId: string | null = null;

export type TripLocation = {
  lat: number;
  lng: number;
  speed: number;
  heading: number;
  accuracyM: number;
};

TaskManager.defineTask(TRACKING_TASK, async ({ data, error }) => {
  if (error) {
    console.error('Background tracking error', error);
    return;
  }

  if (!activeTripId) {
    activeTripId = await getStoredActiveTripId();
  }

  const locations = (data as { locations?: Location.LocationObject[] } | undefined)?.locations ?? [];
  if (!locations.length || !activeTripId) return;

  const latest = locations[locations.length - 1];
  const auth = await getStoredAuth();
  if (!auth?.token) return;

  try {
    await Api.updateTripLocation(auth.token, activeTripId, {
      currentLat: latest.coords.latitude,
      currentLng: latest.coords.longitude,
      speed: latest.coords.speed ?? 0,
      heading: latest.coords.heading ?? 0,
      accuracyM: latest.coords.accuracy ?? 0,
    });
  } catch (taskError) {
    console.error('Unable to sync background location', taskError);
  }
});

async function getStoredActiveTripId() {
  return getItem(ACTIVE_TRIP_KEY);
}

export async function requestTripLocationPermission() {
  const foreground = await Location.requestForegroundPermissionsAsync();
  if (foreground.status !== 'granted') throw new Error('Foreground location permission denied');

  const background = await Location.requestBackgroundPermissionsAsync();
  if (background.status !== 'granted') throw new Error('Background location permission denied');

  return { foreground, background };
}

export async function getCurrentTripLocation(): Promise<TripLocation> {
  await requestTripLocationPermission();
  const current = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Highest });
  return { lat: current.coords.latitude, lng: current.coords.longitude, speed: current.coords.speed ?? 0, heading: current.coords.heading ?? 0, accuracyM: current.coords.accuracy ?? 0 };
}

export async function startBackgroundTripTracking(tripId: string) {
  activeTripId = tripId;
  await setItem(ACTIVE_TRIP_KEY, tripId);
  await requestTripLocationPermission();

  const alreadyStarted = await Location.hasStartedLocationUpdatesAsync(TRACKING_TASK);
  if (alreadyStarted) return;

  await Location.startLocationUpdatesAsync(TRACKING_TASK, {
    accuracy: Location.Accuracy.High,
    timeInterval: 15000,
    distanceInterval: 50,
    showsBackgroundLocationIndicator: true,
    foregroundService: {
      notificationTitle: 'AP Trucking live tracking',
      notificationBody: 'Tracking active trip location in background',
    },
  });
}

export async function stopBackgroundTripTracking() {
  activeTripId = null;
  await removeItem(ACTIVE_TRIP_KEY);
  const alreadyStarted = await Location.hasStartedLocationUpdatesAsync(TRACKING_TASK);
  if (alreadyStarted) await Location.stopLocationUpdatesAsync(TRACKING_TASK);
}
