import type { CommunityStatus } from '../types';
import { getBackend, postBackend } from './backend';
import { isAIConfigured } from '../constants/config';
import { getDeviceId } from './deviceId';

export type ReportKind = 'haram' | 'halal';

/** Статус товара по подтверждённым модератором отчётам. При любой ошибке — null (проверка не должна из-за этого ломаться). */
export async function fetchCommunityStatus(barcode: string): Promise<CommunityStatus | null> {
  if (!isAIConfigured()) return null;
  try {
    const r = await getBackend<Partial<CommunityStatus>>(`/api/community-status?barcode=${encodeURIComponent(barcode)}`, 8000);
    if (r.status !== 'haram' && r.status !== 'halal' && r.status !== 'disputed') return null;
    return { status: r.status, haram: Number(r.haram) || 0, halal: Number(r.halal) || 0 };
  } catch {
    return null;
  }
}

/** Отправка отчёта с фото на модерацию. Бросает HttpError с понятным сообщением. */
export async function submitCommunityReport(input: { kind: ReportKind; barcode: string; productName?: string; imageBase64: string }): Promise<void> {
  await postBackend('/api/community-report', {
    kind: input.kind,
    barcode: input.barcode,
    productName: input.productName,
    image: input.imageBase64,
    mimeType: 'image/jpeg',
    deviceId: await getDeviceId(),
  }, 30000);
}
