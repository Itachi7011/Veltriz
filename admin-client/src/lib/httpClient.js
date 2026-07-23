import axios from 'axios';
import { getAccessToken, setAccessToken, clearAccessToken } from '../utils/tokenStore';

/**
 * No `baseURL`, and never set one from an env var. Every call site uses a
 * relative path like `http.get('/api/economy/overview')`.
 *
 *   - In dev, that hits the Vite dev server, proxied per vite.config.js
 *     (all /api/* -> admin-service on :5003).
 *   - In production, Netlify rewrites it per netlify.toml to the real
 *     admin-service URL.
 *
 * See veltriz-game-client's src/lib/httpClient.js for the full story on
 * why this matters — the short version: an env-var-driven baseURL here
 * bypasses the proxy entirely and causes CORS errors in dev.
 */
const http = axios.create({
  withCredentials: true,
});

http.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let refreshPromise = null;

export const refreshAccessToken = async () => {
  if (refreshPromise) return refreshPromise;

  refreshPromise = http
    .post('/api/admin-auth/refresh', {}, { _skipAuthRefresh: true })
    .then(({ data }) => {
      setAccessToken(data.accessToken);
      return data;
    })
    .catch((err) => {
      clearAccessToken();
      throw err;
    })
    .finally(() => {
      refreshPromise = null;
    });

  return refreshPromise;
};

http.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    const isExpired = error.response?.status === 401 && error.response?.data?.code === 'TOKEN_EXPIRED';

    if (isExpired && !original._retried && !original._skipAuthRefresh) {
      original._retried = true;
      try {
        await refreshAccessToken();
        return http(original);
      } catch (refreshErr) {
        window.dispatchEvent(new CustomEvent('veltriz-admin:session-expired'));
        return Promise.reject(refreshErr);
      }
    }

    return Promise.reject(error);
  }
);

export default http;
