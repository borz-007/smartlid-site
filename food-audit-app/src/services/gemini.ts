/**
 * Клиент ИИ-аудитора. Вся работа с Gemini (ключ, промпты, поиск в интернете) выполняется на нашем
 * сервере; здесь — только запросы к нему и проверка структуры ответа.
 * Ответ модели валидируется и фильтруется по профилю в auditor.ts: ИИ не может «снять» запрет,
 * найденный локальным фильтром.
 */
import { ALLERGENS } from '../constants/allergens';
import type { AllergenId, Severity, UserProfile } from '../types';
import { postBackend } from './backend';
import { HttpError } from './http';

export interface AiIssue {
  original: string;
  translation_ru: string;
  reason_ru: string;
  severity: Severity;
  category: 'halal' | 'vegan' | 'vegetarian' | 'allergen' | 'custom' | 'other';
  allergen?: AllergenId | 'none';
  is_trace: boolean;
}

export interface AiAudit {
  ingredients_text: string;
  verdict: Severity;
  issues: AiIssue[];
  summary_ru: string;
}

const SEVERITIES = ['SAFE', 'WARNING', 'BANNED'];
const CATEGORIES = ['halal', 'vegan', 'vegetarian', 'allergen', 'custom', 'other'];
const ALLERGEN_IDS = ALLERGENS.map((a) => a.id);

const AUDIT_PATH = '/api/ingredient-audit';

/** Контекст товара для ИИ: страна, сертификаты на упаковке, подсказки локального фильтра. */
export interface AuditContext {
  extraContext?: string[];
  barcode?: string;
  countries?: string[];
  certifications?: { halal?: boolean; vegan?: boolean };
}

function profilePayload(p: UserProfile) {
  return {
    halal: p.halal,
    vegan: p.vegan,
    vegetarian: p.vegetarian,
    considerTraces: p.considerTraces,
    allergens: ALLERGENS.filter((a) => p.allergens[a.id]).map((a) => ({ id: a.id, label: a.labelRu })),
    customStopWords: p.customStopWords,
  };
}

/** Достать первый JSON-объект из текста (модель с поиском может добавить пояснения). */
export function extractJsonObject(raw: string): string {
  const cleaned = raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  return start >= 0 && end > start ? cleaned.slice(start, end + 1) : cleaned;
}

/** Разбор и валидация ответа модели. Экспортируется для тестов. */
export function parseAiAudit(raw: string): AiAudit {
  let data: any;
  try {
    data = JSON.parse(extractJsonObject(raw));
  } catch {
    throw new HttpError('ИИ вернул ответ не в формате JSON');
  }
  const sev = (v: unknown): Severity => (SEVERITIES.includes(v as string) ? (v as Severity) : 'WARNING');
  const issues: AiIssue[] = Array.isArray(data?.issues)
    ? data.issues
        .filter((i: any) => i && typeof i.original === 'string' && i.original.trim())
        .map((i: any) => ({
          original: String(i.original).trim(),
          translation_ru: String(i.translation_ru ?? ''),
          reason_ru: String(i.reason_ru ?? ''),
          severity: sev(i.severity),
          category: CATEGORIES.includes(i.category) ? i.category : 'other',
          allergen: ALLERGEN_IDS.includes(i.allergen) ? i.allergen : 'none',
          is_trace: Boolean(i.is_trace),
        }))
    : [];
  return {
    ingredients_text: typeof data?.ingredients_text === 'string' ? data.ingredients_text : '',
    verdict: sev(data?.verdict),
    issues,
    summary_ru: typeof data?.summary_ru === 'string' ? data.summary_ru : '',
  };
}

/** Аудит уже известного текста состава (путь А или после локального фильтра). */
export async function auditTextWithAI(text: string, profile: UserProfile, ctx: AuditContext = {}, timeoutMs?: number): Promise<AiAudit> {
  const r = await postBackend<{ text?: string }>(AUDIT_PATH, {
    action: 'audit-text',
    text: text.slice(0, 6000),
    profile: profilePayload(profile),
    context: ctx,
  }, timeoutMs);
  return parseAiAudit(r.text ?? '');
}

/** Путь Б: фото этикетки → распознавание + аудит одним мультимодальным запросом на сервере. */
export async function auditImageWithAI(imageBase64: string, profile: UserProfile, ctx: AuditContext = {}, mimeType = 'image/jpeg'): Promise<AiAudit> {
  const r = await postBackend<{ text?: string }>(AUDIT_PATH, {
    action: 'audit-image',
    image: imageBase64,
    mimeType,
    profile: profilePayload(profile),
    context: ctx,
  });
  return parseAiAudit(r.text ?? '');
}

// ───────────────────────── Поиск товара в интернете ─────────────────────────

export interface WebProduct {
  found: boolean;
  name?: string;
  brand?: string;
  manufacturer?: string;
  ingredientsText: string;
  /** Страницы, на которые опирался ответ. */
  sources: { title: string; uri: string }[];
  /** 'manufacturer' — состав разобран со страницы официального сайта; 'web' — из других источников. */
  via: 'manufacturer' | 'web';
}

/** Поиск в интернете дольше этого времени не ждём. */
export const WEB_SEARCH_TIMEOUT_MS = 25000;

let searchBlock: { until: number; error: HttpError } | null = null;

export function resetWebSearchCooldown(): void {
  searchBlock = null;
}

/**
 * Путь А, запасной вариант: товара нет в Open Food Facts → сервер ищет страницу товара
 * (приоритет — официальный сайт производителя), разбирает состав и возвращает его.
 */
export async function findProductOnWeb(barcode: string, hints: { brand?: string; name?: string } = {}): Promise<WebProduct> {
  if (searchBlock && Date.now() < searchBlock.until) throw searchBlock.error;
  let r: Partial<WebProduct>;
  try {
    r = await postBackend<Partial<WebProduct>>(AUDIT_PATH, { action: 'find-product', barcode, brand: hints.brand, name: hints.name }, WEB_SEARCH_TIMEOUT_MS);
  } catch (e) {
    // После лимита (429) не тратим запросы повторно, пока он не отпустит
    if (e instanceof HttpError && e.status === 429) {
      searchBlock = { until: Date.now() + Math.min(e.retryAfterSec ?? 60, 600) * 1000, error: e };
    }
    throw e;
  }
  const str = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : undefined);
  const ingredientsText = typeof r.ingredientsText === 'string' ? r.ingredientsText.trim() : '';
  const sources = (Array.isArray(r.sources) ? r.sources : [])
    .map((s) => ({ title: String(s?.title ?? ''), uri: String(s?.uri ?? '') }))
    .filter((s) => s.uri.startsWith('https://'));
  return {
    // Без источников состав считаем непроверенным
    found: Boolean(r.found) && ingredientsText.length > 10 && sources.length > 0,
    name: str(r.name),
    brand: str(r.brand),
    manufacturer: str(r.manufacturer),
    ingredientsText,
    sources,
    via: r.via === 'manufacturer' ? 'manufacturer' : 'web',
  };
}
