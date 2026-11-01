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
  constructor(public barcode: string, public detail?: string) {
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

export interface SearchResult {
  barcode: string;
  name: string;
  brand?: string;
  imageUrl?: string;
}

export async function searchProductsByName(query: string, page = 1): Promise<SearchResult[]> {
  const url = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}&search_simple=1&action=process&json=1&page_size=20&page=${page}&fields=code,product_name,brands,image_front_small_url`;
  const res = await fetchWithTimeout(
    url,
    { headers: { Accept: 'application/json', 'User-Agent': config.offUserAgent } },
    config.requestTimeoutMs,
  );
  if (!res.ok) return [];
  const json = await res.json() as { products?: Array<{ code?: string; product_name?: string; brands?: string; image_front_small_url?: string }> };
  return (json.products ?? [])
    .filter((p) => p.code && p.product_name)
    .map((p) => ({
      barcode: p.code!,
      name: p.product_name!,
      brand: p.brands?.split(',')[0]?.trim() || undefined,
      imageUrl: p.image_front_small_url || undefined,
    }));
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
