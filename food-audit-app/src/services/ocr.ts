/**
 * Офлайн-распознавание текста на фото: Google ML Kit Text Recognition (латиница), всё на устройстве.
 * Фото никуда не отправляется. Модель встроена в приложение, интернет не нужен.
 *
 * Нативный модуль подключается лениво (при первом распознавании): так юнит-тесты и экраны,
 * которым OCR не нужен, не загружают его.
 */
import { HttpError } from './http';

export async function recognizeText(photoUri: string): Promise<string> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mlkit = require('@react-native-ml-kit/text-recognition') as typeof import('@react-native-ml-kit/text-recognition');
    const result = await mlkit.default.recognize(photoUri, mlkit.TextRecognitionScript.LATIN);
    return typeof result?.text === 'string' ? result.text : '';
  } catch {
    throw new HttpError('Не удалось распознать текст на фото. Попробуйте сфотографировать ещё раз.');
  }
}
