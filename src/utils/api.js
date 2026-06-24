const isLocalHost =
  typeof window !== 'undefined' &&
  /^(localhost|127\.0\.0\.1|::1)$/.test(window.location.hostname);

const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL ||
  (isLocalHost ? 'http://localhost:4000' : '')
).replace(/\/$/, '');

export function apiUrl(path) {
  if (import.meta.env.PROD && !API_BASE_URL) {
    console.warn('VITE_API_BASE_URL is not set. Set it to your backend origin for production deployments.');
  }

  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE_URL}${normalizedPath}`;
}
