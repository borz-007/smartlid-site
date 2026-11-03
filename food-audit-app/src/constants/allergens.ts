import type { AllergenId } from '../types';

export interface AllergenMeta {
  id: AllergenId;
  /** i18n key for label, e.g. 'allergen_gluten' */
  labelKey: string;
  /** i18n key for hint, e.g. 'allergen_gluten_hint' */
  hintKey: string;
  /** Fallback label (Russian) for non-i18n code paths like tests. */
  labelRu: string;
  /** Fallback hint (Russian). */
  hintRu: string;
  /** Open Food Facts tags. */
  offTags: string[];
}

export const ALLERGENS: AllergenMeta[] = [
  { id: 'gluten', labelKey: 'allergen_gluten', hintKey: 'allergen_gluten_hint', labelRu: 'Глютен / злаки', hintRu: 'пшеница, рожь, ячмень, овёс, спельта', offTags: ['en:gluten'] },
  { id: 'milk', labelKey: 'allergen_milk', hintKey: 'allergen_milk_hint', labelRu: 'Молоко / лактоза', hintRu: 'молоко, сыворотка, казеин, масло', offTags: ['en:milk'] },
  { id: 'eggs', labelKey: 'allergen_eggs', hintKey: 'allergen_eggs_hint', labelRu: 'Яйца', hintRu: 'яйцо, яичный белок, желток', offTags: ['en:eggs'] },
  { id: 'peanuts', labelKey: 'allergen_peanuts', hintKey: 'allergen_peanuts_hint', labelRu: 'Арахис', hintRu: 'арахис, арахисовое масло', offTags: ['en:peanuts'] },
  { id: 'nuts', labelKey: 'allergen_nuts', hintKey: 'allergen_nuts_hint', labelRu: 'Орехи', hintRu: 'фундук, миндаль, грецкий, кешью…', offTags: ['en:nuts'] },
  { id: 'soy', labelKey: 'allergen_soy', hintKey: 'allergen_soy_hint', labelRu: 'Соя', hintRu: 'соя, соевый лецитин', offTags: ['en:soybeans'] },
  { id: 'fish', labelKey: 'allergen_fish', hintKey: 'allergen_fish_hint', labelRu: 'Рыба', hintRu: 'рыба, рыбий жир, анчоусы', offTags: ['en:fish'] },
  { id: 'crustaceans', labelKey: 'allergen_crustaceans', hintKey: 'allergen_crustaceans_hint', labelRu: 'Ракообразные', hintRu: 'креветки, крабы, омары', offTags: ['en:crustaceans'] },
  { id: 'molluscs', labelKey: 'allergen_molluscs', hintKey: 'allergen_molluscs_hint', labelRu: 'Моллюски', hintRu: 'мидии, устрицы, кальмары', offTags: ['en:molluscs'] },
  { id: 'celery', labelKey: 'allergen_celery', hintKey: 'allergen_celery_hint', labelRu: 'Сельдерей', hintRu: 'сельдерей, корень сельдерея', offTags: ['en:celery'] },
  { id: 'mustard', labelKey: 'allergen_mustard', hintKey: 'allergen_mustard_hint', labelRu: 'Горчица', hintRu: 'горчица, горчичное семя', offTags: ['en:mustard'] },
  { id: 'sesame', labelKey: 'allergen_sesame', hintKey: 'allergen_sesame_hint', labelRu: 'Кунжут', hintRu: 'кунжут, тахини', offTags: ['en:sesame-seeds'] },
  { id: 'lupin', labelKey: 'allergen_lupin', hintKey: 'allergen_lupin_hint', labelRu: 'Люпин', hintRu: 'люпиновая мука', offTags: ['en:lupin'] },
  { id: 'sulphites', labelKey: 'allergen_sulphites', hintKey: 'allergen_sulphites_hint', labelRu: 'Сульфиты (E220–E228)', hintRu: 'диоксид серы, сульфиты', offTags: ['en:sulphur-dioxide-and-sulphites'] },
];

export const ALLERGEN_BY_ID: Record<AllergenId, AllergenMeta> = ALLERGENS.reduce(
  (acc, a) => ({ ...acc, [a.id]: a }),
  {} as Record<AllergenId, AllergenMeta>,
);

export function allergenFromOffTag(tag: string): AllergenId | undefined {
  return ALLERGENS.find((a) => a.offTags.includes(tag))?.id;
}
