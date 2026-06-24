const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL ||
  'http://localhost:4000'
).replace(/\/$/, '');

export function apiUrl(path) {
  if (import.meta.env.PROD && !import.meta.env.VITE_API_BASE_URL) {
    console.warn('VITE_API_BASE_URL is not set. Set it to your backend origin for production deployments.');
  }

  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE_URL}${normalizedPath}`;
}
