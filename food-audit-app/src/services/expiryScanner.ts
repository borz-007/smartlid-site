import type { ExpiryResult } from '../types';
import { postBackend } from './backend';
import { HttpError } from './http';

interface GeminiExpiryResponse {
  found: boolean;
  date: string;
  raw_text: string;
  confidence: 'high' | 'medium' | 'low';
}

function extractJson(raw: string): string {
  const cleaned = raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  return start >= 0 && end > start ? cleaned.slice(start, end + 1) : cleaned;
}

function computeDaysRemaining(dateStr: string): { days: number; status: ExpiryResult['status'] } {
  const expiry = new Date(dateStr + 'T23:59:59');
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const diff = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  let status: ExpiryResult['status'] = 'fresh';
  if (diff < 0) status = 'expired';
  else if (diff <= 3) status = 'expiring_soon';
  return { days: diff, status };
}

export async function scanExpiryDate(base64Image: string): Promise<ExpiryResult> {
  const r = await postBackend<{ text?: string }>('/api/ingredient-audit', { action: 'expiry', image: base64Image });
  const text = r.text ?? '';
  let data: GeminiExpiryResponse;
  try {
    data = JSON.parse(extractJson(text));
  } catch {
    throw new HttpError('Не удалось распознать дату');
  }

  if (!data.found || !data.date) {
    return {
      date: '',
      confidence: 'low',
      daysRemaining: 0,
      status: 'expired',
      rawText: data.raw_text || '',
    };
  }

  const { days, status } = computeDaysRemaining(data.date);
  return {
    date: data.date,
    confidence: data.confidence || 'medium',
    daysRemaining: days,
    status,
    rawText: data.raw_text || '',
  };
}
