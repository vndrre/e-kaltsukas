import Constants from 'expo-constants';
import { Platform } from 'react-native';
import axios from 'axios';

function normalizeBaseUrl(url: string) {
  return url.replace(/\/+$/, '');
}

function resolveApiBaseUrl() {
  const configuredUrl = process.env.EXPO_PUBLIC_API_URL;
  if (configuredUrl) {
    return normalizeBaseUrl(configuredUrl);
  }

  // Android emulator cannot resolve localhost on host machine.
  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:5000';
  }

  const hostFromExpo = Constants.expoConfig?.hostUri?.split(':')[0];
  if (hostFromExpo) {
    return `http://${hostFromExpo}:5000`;
  }

  return 'http://localhost:5000';
}

export const API_BASE_URL = resolveApiBaseUrl();

export const api = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  timeout: 12000,
});
