/** Итоговый вердикт. Порядок важен: SAFE < WARNING < BANNED. */
export type Severity = 'SAFE' | 'WARNING' | 'BANNED';

export const SEVERITY_RANK: Record<Severity, number> = { SAFE: 0, WARNING: 1, BANNED: 2 };

export function maxSeverity(a: Severity, b: Severity): Severity {
  return SEVERITY_RANK[a] >= SEVERITY_RANK[b] ? a : b;
}

export type DietKey = 'halal' | 'vegan' | 'vegetarian';

/** 14 аллергенов из Регламента ЕС 1169/2011, Приложение II. */
export type AllergenId =
  | 'gluten'
  | 'milk'
  | 'eggs'
  | 'peanuts'
  | 'nuts'
  | 'soy'
  | 'fish'
  | 'crustaceans'
  | 'molluscs'
  | 'celery'
  | 'mustard'
  | 'sesame'
  | 'lupin'
  | 'sulphites';

export interface UserProfile {
  halal: boolean;
  vegan: boolean;
  vegetarian: boolean;
  allergens: Record<AllergenId, boolean>;
  /** Если true — «может содержать следы…» считается критическим риском (BANNED). */
  considerTraces: boolean;
  /** Персональные стоп-слова пользователя (на любом языке). */
  customStopWords: string[];
  /** Разрешить обращение к Gemini для сложных составов. */
  aiEnabled: boolean;
}

export type IssueCategory = DietKey | 'allergen' | 'custom' | 'other';

export type IssueSource = 'local' | 'ai' | 'openfoodfacts';

export interface Issue {
  /** Стабильный ключ для дедупликации. */
  key: string;
  /** Фрагмент на исходном языке этикетки. */
  original: string;
  /** Русский перевод термина. */
  translationRu: string;
  /** Объяснение риска на русском. */
  reasonRu: string;
  severity: Severity;
  categories: IssueCategory[];
  allergen?: AllergenId;
  isTrace: boolean;
  source: IssueSource;
}

export interface ProductInfo {
  barcode?: string;
  name?: string;
  brand?: string;
  manufacturer?: string;
  imageUrl?: string;
  /** Страницы, откуда взят состав (при поиске в интернете). */
  sources?: { title: string; uri: string }[];
}

/** Откуда взят текст состава. */
export type IngredientsSource = 'openfoodfacts' | 'web' | 'photo';

export interface ScanResult {
  verdict: Severity;
  issues: Issue[];
  traces: Issue[];
  ingredientsText: string;
  ingredientsSource: IngredientsSource;
  product?: ProductInfo;
  /** Краткое резюме ИИ (если вызывался). */
  aiSummaryRu?: string;
  usedAI: boolean;
  /** Служебные заметки: «ИИ недоступен», «состав не найден» и т.п. */
  notes: string[];
}

/** Запись в истории сканирований. */
export interface HistoryEntry {
  id: string;
  barcode?: string;
  productName?: string;
  brand?: string;
  verdict: Severity;
  date: string;
  imageUrl?: string;
  ingredientsSource: IngredientsSource;
  result: ScanResult;
}

/** Запись в избранном / чёрном списке. */
export interface SavedProduct {
  barcode?: string;
  productName?: string;
  brand?: string;
  verdict: Severity;
  imageUrl?: string;
  date: string;
}

/** Именованный профиль (для мультипрофиля / семья). */
export interface NamedProfile {
  id: string;
  name: string;
  profile: UserProfile;
}

/** Сырые данные, полученные на шаге 1 (штрихкод или фото). */
export interface RawIngredients {
  text: string;
  product?: ProductInfo;
  /** Теги из Open Food Facts, например "en:milk". */
  allergenTags?: string[];
  traceTags?: string[];
  analysisTags?: string[];
  labelTags?: string[];
}
