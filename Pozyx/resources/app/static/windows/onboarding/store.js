const store = {};

export function get(key) {
  return store[key];
}

export function set(key, value) {
  store[key] = value;
}
