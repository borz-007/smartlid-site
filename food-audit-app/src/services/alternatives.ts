import { config } from '../constants/config';
import type { ProductSummary, NutriScoreGrade, UserProfile } from '../types';
import { analyzeLocal } from '../engine/localFilter';
import { fetchWithTimeout } from './http';

interface OffSearchProduct {
  code?: string;
  product_name?: string;
  brands?: string;
  image_front_small_url?: string;
  nutriscore_grade?: string;
  nutriscore_score?: number;
  ingredients_text?: string;
  ingredients_text_fr?: string;
  ingredients_text_nl?: string;
  ingredients_text_de?: string;
  ingredients_text_en?: string;
  allergens_tags?: string[];
  traces_tags?: string[];
  ingredients_analysis_tags?: string[];
  labels_tags?: string[];
}

function pickText(p: OffSearchProduct): string {
  return [p.ingredients_text, p.ingredients_text_fr, p.ingredients_text_nl, p.ingredients_text_de, p.ingredients_text_en]
    .find((t) => t && t.trim().length > 0) ?? '';
}

function isSafeForProfile(p: OffSearchProduct, profile: UserProfile): boolean {
  const text = pickText(p);
  if (!text.trim()) return false;
  const result = analyzeLocal(
    {
      text,
      allergenTags: p.allergens_tags,
      traceTags: p.traces_tags,
      analysisTags: p.ingredients_analysis_tags,
      labelTags: p.labels_tags,
    },
    profile,
  );
  return result.verdict === 'SAFE';
}

export async function fetchHealthyAlternatives(
  categoryTag: string,
  profile: UserProfile,
  excludeBarcode?: string,
): Promise<ProductSummary[]> {
  if (!categoryTag) return [];

  const fields = [
    'code', 'product_name', 'brands', 'image_front_small_url',
    'nutriscore_grade', 'nutriscore_score',
    'ingredients_text', 'ingredients_text_fr', 'ingredients_text_nl',
    'ingredients_text_de', 'ingredients_text_en',
    'allergens_tags', 'traces_tags', 'ingredients_analysis_tags', 'labels_tags',
  ].join(',');

  const url =
    `https://world.openfoodfacts.org/cgi/search.pl?` +
    `tagtype_0=categories&tag_contains_0=contains&tag_0=${encodeURIComponent(categoryTag)}` +
    `&tagtype_1=nutrition_grades&tag_contains_1=contains&tag_1=a` +
    `&sort_by=nutriscore_score&page_size=20&page=1&action=process&json=1` +
    `&fields=${fields}`;

  let products: OffSearchProduct[] = [];
  try {
    const res = await fetchWithTimeout(
      url,
      { headers: { Accept: 'application/json', 'User-Agent': config.offUserAgent } },
      config.requestTimeoutMs,
    );
    if (!res.ok) return [];
    const json = await res.json() as { products?: OffSearchProduct[] };
    products = json.products ?? [];
  } catch {
    return [];
  }

  if (products.length < 3) {
    const urlB =
      `https://world.openfoodfacts.org/cgi/search.pl?` +
      `tagtype_0=categories&tag_contains_0=contains&tag_0=${encodeURIComponent(categoryTag)}` +
      `&tagtype_1=nutrition_grades&tag_contains_1=contains&tag_1=b` +
      `&sort_by=nutriscore_score&page_size=15&page=1&action=process&json=1` +
      `&fields=${fields}`;
    try {
      const res = await fetchWithTimeout(
        urlB,
        { headers: { Accept: 'application/json', 'User-Agent': config.offUserAgent } },
        config.requestTimeoutMs,
      );
      if (res.ok) {
        const json = await res.json() as { products?: OffSearchProduct[] };
        products = products.concat(json.products ?? []);
      }
    } catch {}
  }

  const safe: ProductSummary[] = [];
  for (const p of products) {
    if (!p.code || !p.product_name) continue;
    if (p.code === excludeBarcode) continue;
    if (!isSafeForProfile(p, profile)) continue;
    safe.push({
      barcode: p.code,
      name: p.product_name,
      brand: p.brands?.split(',')[0]?.trim() || undefined,
      imageUrl: p.image_front_small_url || undefined,
      nutriScoreGrade: /^[a-e]$/.test(p.nutriscore_grade ?? '') ? p.nutriscore_grade as NutriScoreGrade : undefined,
      score100: p.nutriscore_score !== undefined ? Math.round(((40 - p.nutriscore_score) / 55) * 100) : undefined,
    });
    if (safe.length >= 3) break;
  }
  return safe;
}
