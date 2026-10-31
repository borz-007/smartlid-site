/**
 * Шаг 1, путь А: поиск состава по штрихкоду в Open Food Facts.
 * Документация API: https://openfoodfacts.github.io/openfoodfacts-server/api/
 */
import { config } from '../constants/config';
import type { RawIngredients } from '../types';
import { fetchWithTimeout, HttpError } from './http';

const FIELDS = [
  'product_name',
  'brands',
  'image_front_small_url',
  'ingredients_text',
  'ingredients_text_nl',
  'ingredients_text_fr',
  'ingredients_text_de',
  'ingredients_text_en',
  'allergens_tags',
  'traces_tags',
  'ingredients_analysis_tags',
  'labels_tags',
].join(',');

export class ProductNotFoundError extends Error {
  constructor(public barcode: string) {
    super('Товар не найден в Open Food Facts');
    this.name = 'ProductNotFoundError';
  }
}

interface OffProduct {
  product_name?: string;
  brands?: string;
  image_front_small_url?: string;
  ingredients_text?: string;
  ingredients_text_nl?: string;
  ingredients_text_fr?: string;
  ingredients_text_de?: string;
  ingredients_text_en?: string;
  allergens_tags?: string[];
  traces_tags?: string[];
  ingredients_analysis_tags?: string[];
  labels_tags?: string[];
}

export function isValidBarcode(code: string): boolean {
  return /^\d{8,14}$/.test(code);
}

export function pickIngredientsText(p: OffProduct): string {
  const candidates = [
    p.ingredients_text,
    p.ingredients_text_nl,
    p.ingredients_text_fr,
    p.ingredients_text_de,
    p.ingredients_text_en,
  ];
  return (candidates.find((t) => t && t.trim().length > 0) ?? '').trim();
}

export async function fetchProductByBarcode(barcode: string): Promise<RawIngredients> {
  if (!isValidBarcode(barcode)) throw new ProductNotFoundError(barcode);

  const url = `${config.offBaseUrl}/${encodeURIComponent(barcode)}.json?fields=${FIELDS}`;
  const res = await fetchWithTimeout(
    url,
    { headers: { Accept: 'application/json', 'User-Agent': config.offUserAgent } },
    config.requestTimeoutMs,
  );

  if (res.status === 404) throw new ProductNotFoundError(barcode);
  if (!res.ok) throw new HttpError(`Open Food Facts вернул ошибку ${res.status}`, res.status);

  const json = (await res.json()) as { status?: number; product?: OffProduct };
  if (json.status !== 1 || !json.product) throw new ProductNotFoundError(barcode);

  const p = json.product;
  return {
    text: pickIngredientsText(p),
    product: {
      barcode,
      name: p.product_name?.trim() || undefined,
      brand: p.brands?.split(',')[0]?.trim() || undefined,
      imageUrl: p.image_front_small_url,
    },
    allergenTags: p.allergens_tags ?? [],
    traceTags: p.traces_tags ?? [],
    analysisTags: p.ingredients_analysis_tags ?? [],
    labelTags: p.labels_tags ?? [],
  };
}
