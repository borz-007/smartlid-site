/**
 * Разбить текст состава на отдельные ингредиенты для показа списком.
 * Делит по запятым и точкам с запятой только вне скобок:
 * «chocolade (suiker, cacao), melk» → ["chocolade (suiker, cacao)", "melk"].
 */
export function splitIngredients(text: string): string[] {
  const body = text.replace(/^\s*(ingredi[eë]nten|ingr[ée]dients|zutaten|ingredients)\s*:\s*/i, '');
  const out: string[] = [];
  let depth = 0;
  let cur = '';
  for (let i = 0; i < body.length; i++) {
    const ch = body[i];
    if (ch === '(' || ch === '[') depth++;
    if (ch === ')' || ch === ']') depth = Math.max(0, depth - 1);
    // «3,5%» — десятичная запятая, а не разделитель (но «E330, E471» — разделитель)
    const isDecimal = ch === ',' && /\d/.test(body[i - 1] ?? '') && /\d/.test(body[i + 1] ?? '');
    if (depth === 0 && (ch === ';' || (ch === ',' && !isDecimal) || ch === '\n')) {
      if (cur.trim()) out.push(cur.trim());
      cur = '';
    } else {
      cur += ch;
    }
  }
  if (cur.trim()) out.push(cur.trim().replace(/\.$/, ''));
  return out;
}
