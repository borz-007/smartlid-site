/**
 * Конфигурация берётся из переменных EXPO_PUBLIC_* (файл .env).
 * ВНИМАНИЕ: такие переменные попадают в JS-бандл. Для продакшена держите ключ
 * на своём сервере и укажите EXPO_PUBLIC_AI_PROXY_URL.
 */
export const config = {
  geminiApiKey: process.env.EXPO_PUBLIC_GEMINI_API_KEY ?? '',
  geminiModel: process.env.EXPO_PUBLIC_GEMINI_MODEL || 'gemini-3.8-flash',
  /** Запасная модель: используется, если основная отвечает 5xx или 404. Пусто = без запасной. */
  geminiFallbackModel: process.env.EXPO_PUBLIC_GEMINI_FALLBACK_MODEL ?? '',
  /** Временная отладка: показывать в тексте ошибки HTTP-код и сообщение Google (ключ вырезается). */
  debugErrors: process.env.EXPO_PUBLIC_DEBUG_AI_ERRORS === '1',
  /** Паузы перед повтором при ответах 5xx (мс). */
  retryDelaysMs: [800, 1600] as number[],
  /** Необязательный прокси: POST {model, body} → ответ generateContent. */
  aiProxyUrl: process.env.EXPO_PUBLIC_AI_PROXY_URL ?? '',
  offBaseUrl: 'https://world.openfoodfacts.org/api/v2/product',
  /** Open Food Facts просит указывать собственный User-Agent. */
  offUserAgent: 'SAFA/1.0 (React Native; contact: set-your-email@example.com)',
  requestTimeoutMs: 25000,
};

export const isAIConfigured = () => Boolean(config.geminiApiKey || config.aiProxyUrl);
