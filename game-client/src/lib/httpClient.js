import axios from 'axios';
import { getAccessToken, setAccessToken, clearAccessToken } from '../utils/tokenStore';

/**
 * IMPORTANT: no `baseURL` here, and it must NEVER be set from an env var.
 * Every call site uses a relative path like `http.get('/api/auth/me')`.
 *
 *   - In dev, that relative request hits the Vite dev server, which
 *     proxies it per vite.config.js (e.g. /api/auth/* -> localhost:5000).
 *   - In production, the exact same relative request hits Netlify, which
 *     rewrites it per netlify.toml (e.g. /api/auth/* -> the real
 *     auth-service URL).
 *
 * The frontend code itself never needs to know which backend port/domain
 * is handling which path — that routing decision belongs entirely to
 * vite.config.js and netlify.toml, nowhere else. Do not add a baseURL or
 * an env-var override here; that was the exact bug that broke local dev.
 */
const http = axios.create({
  withCredentials: true, // sends the httpOnly refresh cookie automatically
});

http.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let refreshPromise = null;

/**
 * Calls /api/auth/refresh. If several requests 401 at the same instant,
 * they all await this SAME in-flight promise instead of each firing their
 * own refresh (which would rotate the refresh token multiple times and
 * invalidate the others).
 */
export const refreshAccessToken = async () => {
  if (refreshPromise) return refreshPromise;

  refreshPromise = http
    .post('/api/auth/refresh', {}, { _skipAuthRefresh: true })
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
        window.dispatchEvent(new CustomEvent('veltriz:session-expired'));
        return Promise.reject(refreshErr);
      }
    }

    return Promise.reject(error);
  }
);

export default http;
