/**
 * Access tokens live in memory ONLY — never localStorage/sessionStorage.
 * This protects against XSS token theft (a malicious script can't read a
 * JS variable it doesn't have a reference to the same way it can read
 * localStorage). The refresh token is a separate httpOnly cookie the
 * browser manages automatically; we never touch it directly from JS.
 *
 * Because it's memory-only, a hard page refresh loses it — App.jsx calls
 * refreshAccessToken() once on mount to silently re-establish a session
 * from the refresh cookie, same as any modern web app.
 */
let accessToken = null;
const listeners = new Set();

export const getAccessToken = () => accessToken;

export const setAccessToken = (token) => {
  accessToken = token;
  listeners.forEach((cb) => cb(token));
};

export const clearAccessToken = () => setAccessToken(null);

export const subscribeToToken = (cb) => {
  listeners.add(cb);
  return () => listeners.delete(cb);
};
