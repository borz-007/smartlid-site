import type { AdditiveAuditResult, Issue, Severity } from '../types';
import { normalizePlain } from './textNormalize';

const E_CODE = /\be[\s-]?(\d{3,4}[a-z]?)\b/gi;

/**
 * Насколько «опасен» отдельный ингредиент из списка состава: BANNED (красный), WARNING (оранжевый)
 * или null. Сопоставляем с найденными проблемами (цитаты с этикетки) и, для халяль-профиля,
 * с Е-добавками, у которых в справочнике статус «харам» / «сомнительно».
 */
export function classifyIngredient(ingredient: string, issues: Issue[], additives: AdditiveAuditResult[] = []): Severity | null {
  const n = normalizePlain(ingredient);
  let banned = false;
  let warning = false;
  const mark = (s: Severity) => {
    if (s === 'BANNED') banned = true;
    else if (s === 'WARNING') warning = true;
  };

  for (const issue of issues) {
    if (issue.severity === 'SAFE' || issue.source === 'community') continue;
    const o = normalizePlain(issue.original);
    if (o.length < 3) continue;
    if (n.includes(o) || (n.length >= 4 && o.includes(n))) mark(issue.severity);
  }

  if (additives.length) {
    const codes = new Set(Array.from(ingredient.matchAll(E_CODE), (m) => `E${m[1].toUpperCase()}`));
    for (const a of additives) {
      if (!codes.has(a.code.replace(/\s|-/g, '').toUpperCase())) continue;
      if (a.halalStatus === 'haram') mark('BANNED');
      else if (a.halalStatus === 'doubtful') mark('WARNING');
    }
  }
  return banned ? 'BANNED' : warning ? 'WARNING' : null;
}
