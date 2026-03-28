import type { ExpoConfig } from 'expo/config';

const isProduction = process.env.NODE_ENV === 'production';
const apiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL || (isProduction ? '' : 'http://10.0.2.2:4000/api');
const socketBaseUrl = process.env.EXPO_PUBLIC_SOCKET_BASE_URL || apiBaseUrl.replace(/\/api$/, '');
const googleMapsApiKey = (process.env.EXPO_PUBLIC_GOOGLE_MAPS_KEY || '').trim();

if (isProduction && (!apiBaseUrl || /your-domain\.com/i.test(apiBaseUrl))) {
  throw new Error('EXPO_PUBLIC_API_BASE_URL must be set to your live backend API before creating a production build.');
}

if (isProduction && (!socketBaseUrl || /your-domain\.com/i.test(socketBaseUrl))) {
  throw new Error('EXPO_PUBLIC_SOCKET_BASE_URL must be set to your live backend domain before creating a production build.');
}

if (isProduction && !googleMapsApiKey) {
  throw new Error('EXPO_PUBLIC_GOOGLE_MAPS_KEY must be set before creating a production Android build that uses Google Maps.');
}

const config: ExpoConfig = {
  name: 'AP Trucking',
  slug: 'ap-trucking-mobile',
  version: '1.1.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'light',
  scheme: 'aptrucking',
  owner: 'aptrucking',
  splash: {
    image: './assets/splash-icon.png',
    resizeMode: 'contain',
    backgroundColor: '#0B63CE',
  },
  assetBundlePatterns: ['**/*'],
  android: {
    package: 'com.aptrucking.mobile',
    versionCode: 2,
    softwareKeyboardLayoutMode: 'pan',
    permissions: [
      'ACCESS_FINE_LOCATION',
      'ACCESS_COARSE_LOCATION',
      'ACCESS_BACKGROUND_LOCATION',
      'CAMERA',
      'READ_MEDIA_IMAGES',
      'POST_NOTIFICATIONS',
      'FOREGROUND_SERVICE',
    ],
    adaptiveIcon: {
      foregroundImage: './assets/android-icon-foreground.png',
      backgroundColor: '#0B63CE',
      monochromeImage: './assets/android-icon-monochrome.png',
    },
    config: {
      googleMaps: {
        apiKey: googleMapsApiKey,
      },
    },
  },
  plugins: [
    'expo-secure-store',
    [
      'expo-location',
      {
        locationAlwaysAndWhenInUsePermission:
          'AP Trucking uses location to track trips in real time even when the app is in the background.',
        locationWhenInUsePermission:
          'AP Trucking needs your location to start and monitor active trips.',
        isAndroidBackgroundLocationEnabled: true,
        isIosBackgroundLocationEnabled: true,
      },
    ],
    [
      'expo-notifications',
      {
        icon: './assets/android-icon-monochrome.png',
        color: '#0B63CE',
      },
    ],
    [
      'react-native-maps',
      {
        androidGoogleMapsApiKey: googleMapsApiKey,
      },
    ],
  ],
  extra: {
    apiBaseUrl,
    socketBaseUrl,
    googleMapsApiKey,
  },
};

export default config;
