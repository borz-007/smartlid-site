import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { HttpError } from './http';

/** Длинная сторона фото для ИИ. Меньше 1600 px мелкий шрифт состава может перестать читаться. */
export const AI_IMAGE_MAX_SIDE = 1600;
export const AI_IMAGE_QUALITY = 0.7;

/** Уменьшает фото и пережимает в JPEG, чтобы запрос к Gemini был лёгким. Возвращает base64. */
export async function prepareImageForAi(photo: { uri: string; width: number; height: number }): Promise<string> {
  const actions =
    Math.max(photo.width, photo.height) > AI_IMAGE_MAX_SIDE
      ? [{ resize: photo.width >= photo.height ? { width: AI_IMAGE_MAX_SIDE } : { height: AI_IMAGE_MAX_SIDE } }]
      : [];
  const out = await manipulateAsync(photo.uri, actions, { compress: AI_IMAGE_QUALITY, format: SaveFormat.JPEG, base64: true });
  if (!out.base64) throw new HttpError('Не удалось подготовить фото');
  return out.base64;
}
