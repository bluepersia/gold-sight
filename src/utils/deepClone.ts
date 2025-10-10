function deepClone<T>(value: T, hash = new WeakMap()): T {
  // Handle null or primitive types
  if (value === null || typeof value !== "object") return value;

  // Handle circular references
  if (hash.has(value)) return hash.get(value);

  // Handle Date
  if (value instanceof Date) return new Date(value.getTime()) as any;

  // Handle Array
  if (Array.isArray(value)) {
    const arr: any[] = [];
    hash.set(value, arr);
    value.forEach((item, index) => {
      arr[index] = deepClone(item, hash);
    });
    return arr as any;
  }

  // Handle Map
  if (value instanceof Map) {
    const map = new Map();
    hash.set(value, map);
    value.forEach((v, k) => {
      map.set(k, deepClone(v, hash));
    });
    return map as any;
  }

  // Handle Set
  if (value instanceof Set) {
    const set = new Set();
    hash.set(value, set);
    value.forEach((v) => {
      set.add(deepClone(v, hash));
    });
    return set as any;
  }

  // Handle Objects
  const obj = Object.create(Object.getPrototypeOf(value));
  hash.set(value, obj);
  for (const key of Object.keys(value)) {
    obj[key] = deepClone((value as any)[key], hash);
  }

  return obj;
}

export { deepClone };
