/**
 * Конфигурация клиента. Секретов здесь нет: ключ Gemini хранится только на сервере (Vercel),
 * приложение знает лишь публичный адрес нашего API.
 */
export const config = {
  /** Базовый адрес нашего сервера на Vercel, например https://example.vercel.app (только https). */
  apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL ?? '',
  /** ИИ-запросы на сервере могут включать повторы и поиск в интернете. */
  aiTimeoutMs: 60000,
  apiTimeoutMs: 20000,
  offBaseUrl: 'https://world.openfoodfacts.org/api/v2/product',
  /** Open Food Facts просит указывать собственный User-Agent. */
  offUserAgent: 'SAFA/1.0 (React Native; contact: set-your-email@example.com)',
  requestTimeoutMs: 25000,
};

export const isAIConfigured = () => Boolean(config.apiBaseUrl);
