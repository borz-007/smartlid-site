/**
 * Резервный поиск товара, которого нет в Open Food Facts:
 * 1) Gemini + Google Search находит страницы (приоритет — сайт производителя);
 * 2) сервер сам загружает найденные страницы и вынимает блок состава;
 * 3) состав со страницы имеет приоритет над пересказом модели.
 */
import { buildSearchBody } from './aiPrompts.mjs';
import { candidateText, generate } from './geminiClient.mjs';
import { corroboration, extractIngredientBlock, fetchPage } from './siteFetch.mjs';

function extractJson(raw) {
  const cleaned = String(raw).trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  return start >= 0 && end > start ? cleaned.slice(start, end + 1) : cleaned;
}

const clean = (v) => (typeof v === 'string' && v.trim() ? v.trim() : undefined);

function groundingSources(json) {
  const seen = new Set();
  const out = [];
  for (const c of json?.candidates?.[0]?.groundingMetadata?.groundingChunks ?? []) {
    const uri = typeof c?.web?.uri === 'string' ? c.web.uri : '';
    if (!uri.startsWith('https://') || seen.has(uri)) continue;
    seen.add(uri);
    out.push({ title: String(c?.web?.title ?? ''), uri });
    if (out.length >= 5) break;
  }
  return out;
}

/**
 * @returns {{found:boolean, name?:string, brand?:string, manufacturer?:string, ingredientsText:string,
 *   sources:{title:string,uri:string}[], via:'manufacturer'|'web'}}
 */
export async function findProduct({ barcode, brand, name }, { gemini, fetchPageImpl = fetchPage, maxPages = 3 }) {
  const json = await generate({ ...gemini, body: buildSearchBody({ barcode, brand, name }) });
  const sources = groundingSources(json);

  let data = {};
  try {
    data = JSON.parse(extractJson(candidateText(json)));
  } catch {
    /* модель могла ответить не JSON-ом — попробуем всё равно разобрать страницы */
  }
  let ingredientsText = clean(data.ingredients_text) ?? '';
  let parsedFromPage = false;

  const pageSources = [];
  for (const s of sources.slice(0, maxPages)) {
    try {
      const page = await fetchPageImpl(s.uri);
      const block = extractIngredientBlock(page.html);
      pageSources.push({ title: s.title || new URL(page.url).hostname, uri: page.url });
      if (block && !parsedFromPage) {
        const ok = !ingredientsText || corroboration(ingredientsText, page.html) >= 0.5 || corroboration(block, page.html) >= 0.9;
        if (ok) {
          ingredientsText = block;
          parsedFromPage = true;
        }
      }
    } catch {
      pageSources.push(s);
    }
  }

  const finalSources = pageSources.length ? [...pageSources, ...sources.slice(maxPages)] : sources;
  return {
    // Без реальных источников поиска состав считаем непроверенным
    found: Boolean(data.found !== false) && ingredientsText.length > 10 && finalSources.length > 0,
    name: clean(data.name),
    brand: clean(data.brand),
    manufacturer: clean(data.manufacturer),
    ingredientsText,
    sources: finalSources,
    via: parsedFromPage && data.official_site === true ? 'manufacturer' : 'web',
  };
}
