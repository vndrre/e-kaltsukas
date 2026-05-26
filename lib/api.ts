import axios from 'axios';

const PRODUCTION_API_URL = 'https://e-kaltsukas-eight.vercel.app';

function normalizeBaseUrl(url: string) {
  return url.replace(/\/+$/, '');
}

function resolveApiBaseUrl() {
  const configuredUrl = process.env.EXPO_PUBLIC_API_URL;
  if (configuredUrl) {
    return normalizeBaseUrl(configuredUrl);
  }

  return PRODUCTION_API_URL;
}

export const API_BASE_URL = resolveApiBaseUrl();

export const api = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  timeout: 12000,
});
