import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = '@safa/device_id';
let cached: string | undefined;

/** Анонимный случайный идентификатор установки: нужен только для защиты от спама в отчётах. */
export async function getDeviceId(): Promise<string> {
  if (cached) return cached;
  try {
    const saved = await AsyncStorage.getItem(KEY);
    if (saved && /^[A-Za-z0-9_-]{16,64}$/.test(saved)) return (cached = saved);
  } catch {}
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let id = '';
  for (let i = 0; i < 32; i++) id += chars[Math.floor(Math.random() * chars.length)];
  cached = id;
  try {
    await AsyncStorage.setItem(KEY, id);
  } catch {}
  return id;
}
