import { ALLERGEN_IDS } from './aiPrompts.mjs';

export class ValidationError extends Error {
  constructor(message = 'Некорректный запрос.') {
    super(message);
    this.name = 'ValidationError';
  }
}

export const LIMITS = {
  text: 6000,
  imageChars: 1_500_000, // ~1.1 МБ base64
  reportImageChars: 900_000,
};

const BARCODE_RE = /^\d{8,14}$/;
const BASE64_RE = /^[A-Za-z0-9+/]+={0,2}$/;
const MIME = ['image/jpeg', 'image/png', 'image/webp'];

const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

export function str(v, max, { required = false, field = 'поле' } = {}) {
  if (v === undefined || v === null || v === '') {
    if (required) throw new ValidationError(`Не заполнено: ${field}.`);
    return undefined;
  }
  if (typeof v !== 'string') throw new ValidationError(`Неверный тип: ${field}.`);
  const s = v.trim();
  if (s.length > max) throw new ValidationError(`Слишком длинное значение: ${field}.`);
  return s;
}

export function barcode(v, { required = true } = {}) {
  const s = str(v, 14, { required, field: 'штрихкод' });
  if (s !== undefined && !BARCODE_RE.test(s)) throw new ValidationError('Неверный штрихкод.');
  return s;
}

export function image(v, mimeType, maxChars) {
  const data = str(v, maxChars, { required: true, field: 'изображение' });
  if (!BASE64_RE.test(data)) throw new ValidationError('Неверный формат изображения.');
  const mime = mimeType ?? 'image/jpeg';
  if (!MIME.includes(mime)) throw new ValidationError('Неподдерживаемый тип изображения.');
  return { data, mimeType: mime };
}

export function profile(p) {
  if (!isObj(p)) throw new ValidationError('Не передан профиль.');
  const bool = (k) => p[k] === true;
  const allergens = Array.isArray(p.allergens) ? p.allergens : [];
  if (allergens.length > ALLERGEN_IDS.length) throw new ValidationError('Слишком много аллергенов.');
  const stop = Array.isArray(p.customStopWords) ? p.customStopWords : [];
  if (stop.length > 30) throw new ValidationError('Слишком много стоп-слов.');
  return {
    halal: bool('halal'),
    vegan: bool('vegan'),
    vegetarian: bool('vegetarian'),
    considerTraces: bool('considerTraces'),
    allergens: allergens.map((a) => {
      if (!isObj(a) || !ALLERGEN_IDS.includes(a.id)) throw new ValidationError('Неизвестный аллерген.');
      return { id: a.id, label: str(a.label, 60, { field: 'аллерген' }) ?? a.id };
    }),
    customStopWords: stop.map((w) => str(w, 40, { required: true, field: 'стоп-слово' })),
  };
}

function strList(v, maxItems, maxLen, field) {
  if (v === undefined || v === null) return [];
  if (!Array.isArray(v) || v.length > maxItems) throw new ValidationError(`Неверный список: ${field}.`);
  return v.map((x) => str(x, maxLen, { required: true, field }));
}

function context(c) {
  const o = isObj(c) ? c : {};
  const certs = isObj(o.certifications) ? o.certifications : {};
  const tri = (v) => (v === true ? true : v === false ? false : undefined);
  return {
    barcode: o.barcode === undefined ? undefined : barcode(o.barcode, { required: false }),
    countries: strList(o.countries, 10, 60, 'страны'),
    extraContext: strList(o.extraContext, 10, 200, 'контекст'),
    certifications: { halal: tri(certs.halal), vegan: tri(certs.vegan) },
  };
}

export const ACTIONS = ['audit-text', 'audit-image', 'expiry', 'find-product'];

/** Проверка и нормализация тела запроса /api/ingredient-audit. */
export function validateAuditRequest(body) {
  if (!isObj(body)) throw new ValidationError();
  const action = body.action;
  if (!ACTIONS.includes(action)) throw new ValidationError('Неизвестное действие.');

  switch (action) {
    case 'audit-text':
      return {
        action,
        text: str(body.text, LIMITS.text, { required: true, field: 'текст состава' }),
        profile: profile(body.profile),
        ctx: context(body.context),
      };
    case 'audit-image':
      return {
        action,
        image: image(body.image, body.mimeType, LIMITS.imageChars),
        profile: profile(body.profile),
        ctx: context(body.context),
      };
    case 'expiry':
      return { action, image: image(body.image, body.mimeType, LIMITS.imageChars) };
    case 'find-product':
      return {
        action,
        barcode: barcode(body.barcode),
        brand: str(body.brand, 120, { field: 'бренд' }),
        name: str(body.name, 160, { field: 'название' }),
      };
    default:
      throw new ValidationError();
  }
}
