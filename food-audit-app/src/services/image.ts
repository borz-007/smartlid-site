import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { HttpError } from './http';

/** Длинная сторона фото для ИИ. Меньше 1600 px мелкий шрифт состава может перестать читаться. */
export const AI_IMAGE_MAX_SIDE = 1600;
export const AI_IMAGE_QUALITY = 0.7;

interface PhotoSize {
  uri: string;
  width: number;
  height: number;
}

/** Уменьшает фото и пережимает в JPEG, чтобы запрос к серверу был лёгким. Возвращает base64. */
export async function prepareImageForAi(
  photo: PhotoSize,
  { maxSide = AI_IMAGE_MAX_SIDE, quality = AI_IMAGE_QUALITY }: { maxSide?: number; quality?: number } = {},
): Promise<string> {
  const actions =
    Math.max(photo.width, photo.height) > maxSide
      ? [{ resize: photo.width >= photo.height ? { width: maxSide } : { height: maxSide } }]
      : [];
  const out = await manipulateAsync(photo.uri, actions, { compress: quality, format: SaveFormat.JPEG, base64: true });
  if (!out.base64) throw new HttpError('Не удалось подготовить фото');
  return out.base64;
}
