import type { AllergenId } from '../types';

export interface AllergenMeta {
  id: AllergenId;
  labelRu: string;
  hintRu: string;
  /** Теги Open Food Facts, соответствующие аллергену. */
  offTags: string[];
}

export const ALLERGENS: AllergenMeta[] = [
  { id: 'gluten', labelRu: 'Глютен / злаки', hintRu: 'пшеница, рожь, ячмень, овёс, спельта', offTags: ['en:gluten'] },
  { id: 'milk', labelRu: 'Молоко / лактоза', hintRu: 'молоко, сыворотка, казеин, масло', offTags: ['en:milk'] },
  { id: 'eggs', labelRu: 'Яйца', hintRu: 'яйцо, яичный белок, желток', offTags: ['en:eggs'] },
  { id: 'peanuts', labelRu: 'Арахис', hintRu: 'арахис, арахисовое масло', offTags: ['en:peanuts'] },
  { id: 'nuts', labelRu: 'Орехи', hintRu: 'фундук, миндаль, грецкий, кешью…', offTags: ['en:nuts'] },
  { id: 'soy', labelRu: 'Соя', hintRu: 'соя, соевый лецитин', offTags: ['en:soybeans'] },
  { id: 'fish', labelRu: 'Рыба', hintRu: 'рыба, рыбий жир, анчоусы', offTags: ['en:fish'] },
  { id: 'crustaceans', labelRu: 'Ракообразные', hintRu: 'креветки, крабы, омары', offTags: ['en:crustaceans'] },
  { id: 'molluscs', labelRu: 'Моллюски', hintRu: 'мидии, устрицы, кальмары', offTags: ['en:molluscs'] },
  { id: 'celery', labelRu: 'Сельдерей', hintRu: 'сельдерей, корень сельдерея', offTags: ['en:celery'] },
  { id: 'mustard', labelRu: 'Горчица', hintRu: 'горчица, горчичное семя', offTags: ['en:mustard'] },
  { id: 'sesame', labelRu: 'Кунжут', hintRu: 'кунжут, тахини', offTags: ['en:sesame-seeds'] },
  { id: 'lupin', labelRu: 'Люпин', hintRu: 'люпиновая мука', offTags: ['en:lupin'] },
  { id: 'sulphites', labelRu: 'Сульфиты (E220–E228)', hintRu: 'диоксид серы, сульфиты', offTags: ['en:sulphur-dioxide-and-sulphites'] },
];

export const ALLERGEN_BY_ID: Record<AllergenId, AllergenMeta> = ALLERGENS.reduce(
  (acc, a) => ({ ...acc, [a.id]: a }),
  {} as Record<AllergenId, AllergenMeta>,
);

export function allergenFromOffTag(tag: string): AllergenId | undefined {
  return ALLERGENS.find((a) => a.offTags.includes(tag))?.id;
}
