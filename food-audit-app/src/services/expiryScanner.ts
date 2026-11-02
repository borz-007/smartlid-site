import { config } from '../constants/config';
import type { ExpiryResult } from '../types';
import { fetchWithTimeout, HttpError } from './http';

const SYSTEM_PROMPT = `You are an OCR expert specializing in reading expiry dates from food packaging.
Find the expiry/best-before date on the image. Look for labels like:
- EXP, BB, BBE, Best Before, Use By
- A consommer de préférence avant, A consommer avant
- Ten minste houdbaar tot, THT, TGT
- Mindestens haltbar bis, MHD
- Срок годности до, Годен до

Return ONLY JSON (no markdown):
{"found": boolean, "date": "YYYY-MM-DD", "raw_text": "original text from label", "confidence": "high"|"medium"|"low"}

If the date shows only month/year (e.g. 03/2025), use the last day of that month.
If the date is ambiguous (DD/MM vs MM/DD), prefer DD/MM/YYYY (European format).
If no date is found, return {"found": false, "date": "", "raw_text": "", "confidence": "low"}.`;

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

export async function scanExpiryDate(base64Image: string, apiKey?: string): Promise<ExpiryResult> {
  const key = apiKey || config.geminiApiKey;
  if (!key && !config.aiProxyUrl) {
    throw new HttpError('Ключ Gemini не задан');
  }

  const body = {
    systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
    contents: [{
      role: 'user',
      parts: [
        { inlineData: { mimeType: 'image/jpeg', data: base64Image } },
        { text: 'Find and read the expiry date on this food package. Return JSON only.' },
      ],
    }],
    generationConfig: { temperature: 0, responseMimeType: 'application/json' },
  };

  let res: Response;
  if (config.aiProxyUrl) {
    res = await fetchWithTimeout(
      config.aiProxyUrl,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ model: config.geminiModel, body }) },
      config.requestTimeoutMs,
    );
  } else {
    const url =
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(config.geminiModel)}` +
      `:generateContent?key=${encodeURIComponent(key)}`;
    res = await fetchWithTimeout(
      url,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) },
      config.requestTimeoutMs,
    );
  }

  const json: any = await res.json().catch(() => ({}));
  if (!res.ok) throw new HttpError(`Gemini: ${json?.error?.message ?? `HTTP ${res.status}`}`, res.status);

  const text = (json?.candidates?.[0]?.content?.parts ?? []).map((p: { text?: string }) => p.text ?? '').join('');
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
