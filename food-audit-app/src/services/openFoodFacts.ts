/**
 * Шаг 1, путь А: поиск состава по штрихкоду в Open Food Facts.
 * Документация API: https://openfoodfacts.github.io/openfoodfacts-server/api/
 */
import { config } from '../constants/config';
import type { NutrimentData, RawIngredients } from '../types';
import { fetchWithTimeout, HttpError } from './http';

function parseNutriments(raw?: Record<string, number>): NutrimentData | undefined {
  if (!raw) return undefined;
  const n: NutrimentData = {};
  if (raw['energy-kcal_100g'] !== undefined) n.energy_kcal = raw['energy-kcal_100g'];
  else if (raw['energy-kcal'] !== undefined) n.energy_kcal = raw['energy-kcal'];
  if (raw['energy-kj_100g'] !== undefined) n.energy_kj = raw['energy-kj_100g'];
  if (raw['sugars_100g'] !== undefined) n.sugars = raw['sugars_100g'];
  else if (raw['sugars'] !== undefined) n.sugars = raw['sugars'];
  if (raw['saturated-fat_100g'] !== undefined) n.saturated_fat = raw['saturated-fat_100g'];
  else if (raw['saturated-fat'] !== undefined) n.saturated_fat = raw['saturated-fat'];
  if (raw['sodium_100g'] !== undefined) n.sodium = raw['sodium_100g'];
  else if (raw['sodium'] !== undefined) n.sodium = raw['sodium'];
  if (raw['salt_100g'] !== undefined) n.salt = raw['salt_100g'];
  else if (raw['salt'] !== undefined) n.salt = raw['salt'];
  if (raw['fiber_100g'] !== undefined) n.fiber = raw['fiber_100g'];
  else if (raw['fiber'] !== undefined) n.fiber = raw['fiber'];
  if (raw['proteins_100g'] !== undefined) n.proteins = raw['proteins_100g'];
  else if (raw['proteins'] !== undefined) n.proteins = raw['proteins'];
  if (raw['fruits-vegetables-nuts-estimate-from-ingredients_100g'] !== undefined) {
    n.fruits_vegetables_nuts_estimate = raw['fruits-vegetables-nuts-estimate-from-ingredients_100g'];
  }
  if (n.energy_kcal === undefined && n.sugars === undefined && n.proteins === undefined) return undefined;
  return n;
}

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
  'nutriscore_grade',
  'nutriscore_score',
  'ecoscore_grade',
  'ecoscore_score',
  'nutriments',
  'additives_tags',
  'categories_tags',
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
  nutriscore_grade?: string;
  nutriscore_score?: number;
  ecoscore_grade?: string;
  ecoscore_score?: number;
  nutriments?: Record<string, number>;
  additives_tags?: string[];
  categories_tags?: string[];
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
    nutriscoreGrade: p.nutriscore_grade,
    nutriscoreScore: p.nutriscore_score,
    ecoscoreGrade: p.ecoscore_grade,
    ecoscoreScore: p.ecoscore_score,
    nutriments: parseNutriments(p.nutriments),
    additivesTags: p.additives_tags ?? [],
    categoriesTags: p.categories_tags ?? [],
  };
}
