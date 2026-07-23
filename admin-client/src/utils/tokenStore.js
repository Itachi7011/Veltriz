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
