/**
 * Конфигурация берётся из переменных EXPO_PUBLIC_* (файл .env).
 * ВНИМАНИЕ: такие переменные попадают в JS-бандл. Для продакшена держите ключ
 * на своём сервере и укажите EXPO_PUBLIC_AI_PROXY_URL.
 */
export const config = {
  geminiApiKey: process.env.EXPO_PUBLIC_GEMINI_API_KEY ?? '',
  geminiModel: process.env.EXPO_PUBLIC_GEMINI_MODEL || 'gemini-2.5-flash',
  /** Необязательный прокси: POST {model, body} → ответ generateContent. */
  aiProxyUrl: process.env.EXPO_PUBLIC_AI_PROXY_URL ?? '',
  offBaseUrl: 'https://world.openfoodfacts.org/api/v2/product',
  /** Open Food Facts просит указывать собственный User-Agent. */
  offUserAgent: 'FoodAuditApp/1.0 (React Native; contact: set-your-email@example.com)',
  requestTimeoutMs: 25000,
};

export const isAIConfigured = () => Boolean(config.geminiApiKey || config.aiProxyUrl);
