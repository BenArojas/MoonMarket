const CACHE_TTL = 120000; // 2 minutes in milliseconds

export const cacheService = {
  set(key, data) {
    const item = {
      data,
      timestamp: Date.now(),
    };
    sessionStorage.setItem(key, JSON.stringify(item));
  },

  get(key) {
    const item = sessionStorage.getItem(key);
    if (!item) return null;

    const { data, timestamp } = JSON.parse(item);
    const now = Date.now();

    // Check if cache is expired
    if (now - timestamp > CACHE_TTL) {
      sessionStorage.removeItem(key);
      return null;
    }

    return data;
  },

  clear(key) {
    sessionStorage.removeItem(key);
  }
};