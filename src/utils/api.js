const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');

export function apiUrl(path) {
  if (import.meta.env.PROD && !import.meta.env.VITE_API_BASE_URL) {
    console.warn('VITE_API_BASE_URL is not set. API requests will use the current origin.');
  }

  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return API_BASE_URL ? `${API_BASE_URL}${normalizedPath}` : normalizedPath;
}
