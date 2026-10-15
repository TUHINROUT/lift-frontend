// Remembers endpoints the backend refused (401/403) for the current login, so
// polling screens stop hammering them and the console stays clean.
const blocked = new Set();

export const isBlocked = (key) => blocked.has(key);
export const markBlocked = (key) => blocked.add(key);
export const resetApiAccess = () => blocked.clear();
export const isDenied = (err) => {
  const s = err?.response?.status;
  return s === 401 || s === 403;
};
