import { io, Socket } from 'socket.io-client';
import Constants from 'expo-constants';

type TripLocationPayload = {
  tripId: string;
  driverUserId?: string;
  currentLat?: number;
  currentLng?: number;
  speed?: number;
  heading?: number;
  accuracyM?: number;
  createdAt?: string;
};

const extra = (Constants.expoConfig?.extra ?? {}) as { socketBaseUrl?: string; apiBaseUrl?: string };
const configuredSocketBaseUrl = process.env.EXPO_PUBLIC_SOCKET_BASE_URL || extra.socketBaseUrl || '';
const configuredApiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL || extra.apiBaseUrl || '';

function getSocketBaseUrl() {
  const baseUrl = (configuredSocketBaseUrl || configuredApiBaseUrl.replace(/\/api$/, '')).trim();
  if (!baseUrl || /api\.example\.com|your-domain\.com/i.test(baseUrl)) {
    throw new Error('Mobile socket base URL is not configured. Set EXPO_PUBLIC_SOCKET_BASE_URL before using live tracking in production.');
  }
  return baseUrl.replace(/\/$/, '');
}

let socket: Socket | null = null;

export function connectSocket(token: string) {
  if (socket?.connected) return socket;
  socket = io(getSocketBaseUrl(), { transports: ['websocket'], auth: { token } });
  return socket;
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
}

export function subscribeTripLocation(tripId: string, callback: (payload: TripLocationPayload) => void) {
  if (!socket) return () => undefined;
  socket.emit('location:subscribe', tripId);
  socket.on('location:update', callback);
  return () => {
    socket?.emit('location:unsubscribe', tripId);
    socket?.off('location:update', callback);
  };
}
