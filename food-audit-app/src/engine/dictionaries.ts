/**
 * Детерминированные словари стоп-компонентов на NL / FR / DE / EN.
 *
 * Все регулярные выражения применяются к НОРМАЛИЗОВАННОМУ тексту
 * (нижний регистр, без диакритики, ß → ss, œ → oe) — поэтому здесь
 * пишем «gelatine», а не «gélatine», и «kase», а не «käse».
 *
 * Регулярки НЕ должны иметь флага g — движок создаёт глобальные копии сам.
 * Lookbehind сознательно не используется (совместимость со старыми Hermes);
 * ложные срабатывания внутри составных слов отсекаются через ignoreIn.
 */
import type { AllergenId, DietKey, Severity } from '../types';

export interface RuleOverride {
  /** Проверяется на «сегменте ингредиента» вокруг совпадения. */
  near: RegExp;
  diet?: Partial<Record<DietKey, Severity>>;
  /** Источник уточнён и аллергена нет (например, лецитин подсолнечный). */
  allergenSafe?: boolean;
  noteRu?: string;
}

export interface Rule {
  id: string;
  /** Русский перевод термина. */
  ru: string;
  /** Объяснение риска. */
  reasonRu: string;
  patterns: RegExp[];
  /** Фразы, внутри которых совпадение игнорируется (кокосовое молоко, масло какао…). */
  ignoreIn?: RegExp[];
  diet?: Partial<Record<DietKey, Severity>>;
  allergen?: AllergenId;
  /** По умолчанию BANNED. */
  allergenSeverity?: Severity;
  /** Халяль-сертификация продукта снимает халяль-претензию к этому компоненту. */
  halalCertifiable?: boolean;
  /** Компонент неоднозначен — желательно уточнение у ИИ. */
  needsAI?: boolean;
  /** Проверяются по порядку, срабатывает первый подходящий. */
  overrides?: RuleOverride[];
}

/** E-номер: «e471», «e 471», «e-471», «e472b». */
const E = (n: string): RegExp => new RegExp(`\\be ?-?(${n})\\b`);

const NEAR_HALAL = /\bhalal\b/;
const NEAR_PLANT =
  /(plantaardig|vegetal|pflanzlich|vegetable|\bplant|\bvegan|colza|raapzaad|koolzaad|\braps|rapeseed|tournesol|zonnebloem|sonnenblume|sunflower|\bpalm|\bsoja|\bsoy|\bmais\b|\bcorn\b|olijf|olive)/;
const NEAR_BOVINE = /(\brund|boeuf|bovin|\bbeef|\brind|kalf|\bveau|\bkalb)/;
const NEAR_FISH = /(\bvis\b|visgelatine|poisson|fisch|\bfish)/;
const NEAR_MICROBIAL =
  /(microb|mikrob|vegetal|plantaardig|pflanzlich|vegetarian|vegetarisch|vegetarien|non[- ]animal|niet[- ]dierlijk|fermentation|fermentatie)/;

/** Заявления «без …», внутри которых совпадения не считаются. Применяются ко всем правилам. */
export const GLOBAL_IGNORE: RegExp[] = [
  /\b(gluten|lactose|laktose|alcohol|alcool|alkohol|melk|milch|milk|ei|egg|gelatine)[- ]?(vrij|frei|free)\b/,
  /\bsans (gluten|lactose|alcool|lait|oeufs?|gelatine|porc)\b/,
  /\b(zonder|ohne|without|geen|kein|keine|no) (toegevoegde? |added |zugesetzte[sn]? )?(gluten|lactose|laktose|alcohol|alkohol|alcool|melk|milch|milk|eieren|eier|eggs?|gelatine|gelatin|varkensvlees|schweinefleisch|pork)\b/,
];

export const RULES: Rule[] = [
  // ───────────────────────────── СВИНИНА ─────────────────────────────
  {
    id: 'pork',
    ru: 'свинина / свиной жир',
    reasonRu: 'Свинина и её производные — харам; животный продукт.',
    patterns: [
      /varken/, /\bspek(jes|blokjes|reepjes)?\b/, /\bporc(in|ine)?\b/, /\bpork/, /\bbacon\b/, /\bham\b/,
      /\bjambon/, /\blard(ons?)?\b/, /saindoux/, /reuzel/, /schwein/, /\bspeck\b/, /schinken/,
      /\bgammon\b/, /pancetta/, /prosciutto/, /\bguanciale\b/,
    ],
    ignoreIn: [
      /(puten|truthahn|geflugel|huhner|rinder)schinken/,
      /jambon (de |d')(dinde|poulet|volaille)/,
      /(turkey|chicken) ham/,
    ],
    diet: { halal: 'BANNED', vegan: 'BANNED', vegetarian: 'BANNED' },
  },
  {
    id: 'cured_meat',
    ru: 'колбасные изделия (салями, чоризо…)',
    reasonRu: 'В ЕС обычно делаются из свинины, если не указано иное.',
    patterns: [/\bsalami/, /chorizo/, /mortadell/, /saucisson/, /\bpepperoni/],
    diet: { halal: 'BANNED', vegan: 'BANNED', vegetarian: 'BANNED' },
    halalCertifiable: true,
    overrides: [{ near: NEAR_HALAL, diet: { halal: 'SAFE' } }],
  },

  // ───────────────────────────── АЛКОГОЛЬ ─────────────────────────────
  {
    id: 'alcohol',
    ru: 'алкоголь / спиртные напитки',
    reasonRu: 'Алкоголь (в т.ч. как носитель ароматизатора, E1510) запрещён строгим халяль-фильтром.',
    patterns: [
      /\balco(ho|o)l/, /\balkohol/, /\bethanol\b/, E('1510'), /\bwijn\b/, /\bvins?\b/, /\bwein\b/, /weinbrand/,
      /\bwines?\b/, /\bbier\b/, /\bbiere\b/, /\bbeer\b/, /\brh?um\b/, /rumaroma/, /\bbrandy\b/, /\bcognac\b/,
      /\bliqueur/, /\blikeur/, /\blikor/, /\bwhiske?y\b/, /\b(vodka|wodka)\b/, /\bsherry\b/, /\bkirsch\b/,
      /\bcalvados\b/, /\bmarsala\b/, /\bmirin\b/, /\bsake\b/, /\bcidre?\b/, /\bporto\b/, /\bamaretto\b/,
    ],
    ignoreIn: [
      /vinaigre (de |d')?vin/, /wine vinegar/,
      /(sugar|suiker|zucker)[- ]?(alcohol|alkohol)/, /alcools? de sucre/, /polyalco/,
    ],
    diet: { halal: 'BANNED' },
  },
  {
    id: 'wine_vinegar',
    ru: 'винный уксус',
    reasonRu: 'Большинство учёных допускают, но строгий фильтр отмечает как сомнительное.',
    patterns: [/vinaigre (de |d')?vin/, /wijnazijn/, /weinessig/, /wine vinegar/],
    diet: { halal: 'WARNING' },
  },

  // ───────────────────────────── ЖЕЛАТИН ─────────────────────────────
  {
    id: 'gelatine',
    ru: 'желатин / коллаген',
    reasonRu: 'В ЕС желатин без указания источника по умолчанию свиной.',
    patterns: [/gelatin/, E('441'), /collag/, /kollagen/],
    diet: { halal: 'BANNED', vegan: 'BANNED', vegetarian: 'BANNED' },
    halalCertifiable: true,
    overrides: [
      { near: /(vegetal|plantaardig|pflanzlich|\bvegan|agar|pectin|pektin)/, diet: { halal: 'SAFE', vegan: 'SAFE', vegetarian: 'SAFE' }, noteRu: 'Указан растительный аналог.' },
      { near: /(varken|porc|pork|schwein)/, diet: { halal: 'BANNED' }, noteRu: 'Явно указан свиной желатин.' },
      { near: NEAR_HALAL, diet: { halal: 'SAFE' }, noteRu: 'Желатин отмечен как халяль.' },
      { near: NEAR_FISH, diet: { halal: 'SAFE' }, noteRu: 'Рыбный желатин допустим для халяль.' },
      { near: NEAR_BOVINE, diet: { halal: 'WARNING' }, noteRu: 'Говяжий, но халяль-убой не подтверждён.' },
    ],
  },

  // ───────────────────────────── НАСЕКОМЫЕ / ПЧЁЛЫ ─────────────────────────────
  {
    id: 'carmine',
    ru: 'кармин (E120)',
    reasonRu: 'Краситель из насекомых (кошениль).',
    patterns: [/karmijn/, /carmin/, /karmin/, E('120'), /cochenill/, /cochineal/, /koschenill/],
    diet: { halal: 'BANNED', vegan: 'BANNED', vegetarian: 'WARNING' },
  },
  {
    id: 'shellac',
    ru: 'шеллак (E904)',
    reasonRu: 'Выделения насекомых-лаковых червецов.',
    patterns: [E('904'), /schellac?k/, /shellac/, /gomme[- ]laque/, /laque de gomme/],
    diet: { vegan: 'BANNED' },
  },
  {
    id: 'beeswax',
    ru: 'пчелиный воск (E901)',
    reasonRu: 'Продукт пчеловодства.',
    patterns: [E('901'), /bijenwas/, /cire d.?abeille/, /bienenwachs/, /bees ?wax/],
    diet: { vegan: 'BANNED' },
  },
  {
    id: 'honey',
    ru: 'мёд / продукты пчёл',
    reasonRu: 'Продукт пчеловодства.',
    patterns: [/honing\b/, /\bmiel\b/, /honig\b/, /\bhoney\b/, /gelee royale/, /royal jelly/, /propolis/],
    diet: { vegan: 'BANNED' },
  },
  {
    id: 'lanolin',
    ru: 'ланолин (E913)',
    reasonRu: 'Жир с овечьей шерсти.',
    patterns: [/lanolin/, E('913')],
    diet: { vegan: 'BANNED' },
  },
  {
    id: 'vitamin_d3',
    ru: 'витамин D3',
    reasonRu: 'Обычно получают из ланолина или рыбьего жира.',
    patterns: [/vitamine? d3\b/, /cholecalciferol/],
    diet: { vegan: 'WARNING' },
    overrides: [{ near: /(lichen|korstmos|flechte|vegan|vegetal|plantaardig)/, diet: { vegan: 'SAFE' } }],
  },

  // ───────────────────────────── МЯСО / ЖИВОТНЫЕ ЖИРЫ ─────────────────────────────
  {
    id: 'meat',
    ru: 'мясо / птица',
    reasonRu: 'Убойный продукт; для халяль — убой не подтверждён.',
    patterns: [
      /vlees/, /\bviandes?\b/, /fleisch/, /\bmeat/,
      /\brund/, /\bboeuf/, /\brind(fleisch|erbruhe|erfett|ertalg|er|s)?\b/, /\bbeef/,
      /\bveau\b/, /\bkalfs?/, /\bkalb(fleisch|s)?\b/, /\bveal\b/,
      /\blams?(vlees)?\b/, /\bagneau/, /\blamm(fleisch)?\b/, /\blamb\b/, /\bmouton\b/, /\bmutton\b/, /\bschaap/,
      /\bkip/, /kalkoen/, /\beend(en)?\b/, /\bpoulet/, /\bvolaille/, /\bdinde\b/, /\bcanard/,
      /\bhuhn/, /\bhuhner/, /hahnchen/, /geflugel/, /\bpute(n|nfleisch)?\b/, /truthahn/, /\bente\b/, /\benten(fleisch|fett)/,
      /chicken/, /turkey/, /\bduck\b/, /poultry/,
      /\bpaard/, /\bcheval\b/, /\bpferd/, /\bhorse/,
    ],
    ignoreIn: [
      /(vrucht|vruchten)vlees/, /vleesvervang/, /fruchtfleisch/, /fleischersatz/,
      /meat[- ]?free/, /meatless/, /\bvegetarische? /,
    ],
    diet: { halal: 'WARNING', vegan: 'BANNED', vegetarian: 'BANNED' },
    halalCertifiable: true,
    overrides: [{ near: NEAR_HALAL, diet: { halal: 'SAFE' }, noteRu: 'Отмечено как халяль.' }],
  },
  {
    id: 'animal_fat',
    ru: 'животный жир / сало / жир говяжий',
    reasonRu: 'Источник и способ убоя не указаны.',
    patterns: [
      /dierlijke? vet/, /graisses? animales?/, /tierische[sn]? fett/, /animal fat/, /\btalg\b/, /rundertalg/,
      /\bsuif\b/, /\btallow\b/, /\bsuet\b/,
    ],
    diet: { halal: 'WARNING', vegan: 'BANNED', vegetarian: 'BANNED' },
    halalCertifiable: true,
  },
  {
    id: 'rennet',
    ru: 'сычужный фермент',
    reasonRu: 'Обычно из желудка телят; если не указан микробный/растительный — сомнительно.',
    patterns: [/stremsel/, /\bpresure\b/, /\blab\b/, /labferment/, /kalbslab/, /\brennet\b/, /chymosin/],
    diet: { halal: 'WARNING', vegan: 'BANNED', vegetarian: 'BANNED' },
    halalCertifiable: true,
    overrides: [
      { near: NEAR_MICROBIAL, diet: { halal: 'SAFE', vegan: 'SAFE', vegetarian: 'SAFE' }, noteRu: 'Указан микробный/растительный фермент.' },
    ],
  },
  {
    id: 'pepsin',
    ru: 'пепсин',
    reasonRu: 'Фермент, часто из желудка свиней.',
    patterns: [/pepsin/],
    diet: { halal: 'WARNING', vegan: 'BANNED', vegetarian: 'BANNED' },
    halalCertifiable: true,
  },

  // ───────────────────────────── СОМНИТЕЛЬНЫЕ ДОБАВКИ ─────────────────────────────
  {
    id: 'emulsifier_fatty',
    ru: 'эмульгаторы на основе жирных кислот (E470–E495, E570)',
    reasonRu: 'Могут быть из свиного/говяжьего жира, если источник не указан.',
    patterns: [
      E('47[0-7][a-f]?'), E('48[12]'), E('49[1-5]'), E('43[0-6]'), E('570'),
      /mono-? ?(et|en|und|and|&) ?di-? ?glycerid/,
      /stearinezuur/, /acide stearique/, /stearinsaure/, /stearic acid/,
    ],
    diet: { halal: 'WARNING', vegan: 'WARNING', vegetarian: 'WARNING' },
    halalCertifiable: true,
    needsAI: true,
    overrides: [
      { near: NEAR_PLANT, diet: { halal: 'SAFE', vegan: 'SAFE', vegetarian: 'SAFE' }, noteRu: 'Указано растительное происхождение.' },
      { near: NEAR_HALAL, diet: { halal: 'SAFE' } },
    ],
  },
  {
    id: 'glycerol',
    ru: 'глицерин (E422)',
    reasonRu: 'Может быть животного происхождения.',
    patterns: [E('422'), /\bglycerol\b/, /\bglycerine?\b/, /\bglyzerin\b/],
    diet: { halal: 'WARNING', vegan: 'WARNING', vegetarian: 'WARNING' },
    halalCertifiable: true,
    needsAI: true,
    overrides: [{ near: NEAR_PLANT, diet: { halal: 'SAFE', vegan: 'SAFE', vegetarian: 'SAFE' } }],
  },
  {
    id: 'bone_phosphate',
    ru: 'костный фосфат (E542)',
    reasonRu: 'Получают из костей животных.',
    patterns: [E('542'), /beenderfosfaat/, /phosphate d.?os\b/, /knochenphosphat/, /bone phosphate/],
    diet: { halal: 'WARNING', vegan: 'BANNED', vegetarian: 'BANNED' },
  },
  {
    id: 'cysteine',
    ru: 'L-цистеин (E920)',
    reasonRu: 'Часто получают из перьев птиц или волос.',
    patterns: [E('920'), /cystein/],
    diet: { halal: 'WARNING', vegan: 'WARNING', vegetarian: 'WARNING' },
    needsAI: true,
  },
  {
    id: 'nucleotides',
    ru: 'инозинат / гуанилат (E627, E631, E635)',
    reasonRu: 'Усилители вкуса, нередко из рыбы или мяса.',
    patterns: [E('627|631|635'), /inosinat/, /guanylat/],
    diet: { vegan: 'WARNING', vegetarian: 'WARNING' },
    needsAI: true,
  },

  // ───────────────────────────── 14 АЛЛЕРГЕНОВ ЕС ─────────────────────────────
  {
    id: 'gluten',
    ru: 'злаки с глютеном (пшеница, рожь, ячмень, овёс, спельта)',
    reasonRu: 'Аллерген из вашего профиля.',
    patterns: [
      /tarwe/, /weizen/, /\bble\b/, /froment/, /wheat/, /\bgerst/, /\borge\b/, /barley/, /\brogge/, /roggen/,
      /seigle/, /\brye\b/, /\bhaver/, /hafer/, /avoine/, /\boats?\b/, /oatmeal/, /spelt/, /dinkel/, /epeautre/,
      /kamut/, /triticale/, /gluten/, /\bmalt\b/, /malt ?extra/, /extrait de malt/, /\bmout(extract)?\b/,
      /gerstemout/, /\bmalz/, /semoule/, /griesmeel/, /\bgriess/, /semolina/, /couscous/, /bulgur/, /seitan/,
    ],
    ignoreIn: [/buchweizen/, /buckwheat/, /\bble noir/],
    allergen: 'gluten',
  },
  {
    id: 'milk',
    ru: 'молоко и молочные продукты',
    reasonRu: 'Животный продукт / аллерген из вашего профиля.',
    patterns: [
      /melk/, /\blait(ier|iere)?s?\b/, /milch/, /\bmilk/, /lactos/, /laktos/, /lactoserum/, /\bwhey\b/,
      /\bwei(poeder|eiwit|permeaat)?\b/, /molke/, /petit[- ]lait/, /\bboter/, /boter\b/, /\bbeurre/, /babeurre/,
      /butter/, /\broom\b/, /(slag|zure|kook)room/, /\bcreme\b/, /\bcream\b/, /sahne/, /\bkaas/, /kaas\b/,
      /fromage/, /kase\b/, /\bcheese/, /yogh?o?urt/, /yaourt/, /joghurt/, /casein/, /kasein/, /kwark/, /\bquark/,
      /\bghee\b/, /mascarpone/, /mozzarella/, /\bricotta/, /parmesan/, /parmigiano/, /emmental/, /\bgouda/,
      /camembert/, /lactalbumin/, /lactoglobulin/,
    ],
    ignoreIn: [
      /(kokos|amandel|haver|soja|rijst|cashew|hazelnoot)melk/, /melkzuur/,
      /(kokos|mandel|hafer|soja|reis)milch/, /milchsaure/,
      /(coconut|almond|oat|soy|soya|rice|cashew) milk/, /lait (de |d')(coco|amande|avoine|soja|riz)/,
      /(cacao|cocoa|kakao|shea|karite|peanut|pinda|noten|amandel|mandel|cashew|nuss|nut)[ -]?(boter|butter)/,
      /beurre de (cacao|karite|cacahuete|arachide)/, /butternut/,
      /creme (de |d')(marron|cassis|coco|soja|riz|avoine)/, /(coconut|soy|oat) cream/, /cream of tartar/,
    ],
    diet: { vegan: 'BANNED' },
    allergen: 'milk',
  },
  {
    id: 'eggs',
    ru: 'яйца',
    reasonRu: 'Животный продукт / аллерген из вашего профиля.',
    patterns: [
      /\bei(wit|geel|dooier|poeder|eren)?\b/, /(kippen|vol|scharrel)ei\b/, /\boeufs?\b/, /\beggs?\b/,
      /\beier\b/, /\bei(gelb|klar|pulver|weiss)\b/, /(huhner|voll)ei\b/, /\balbumin/, /lysozym/, E('1105'),
      /mayon(n)?aise/,
    ],
    diet: { vegan: 'BANNED' },
    allergen: 'eggs',
  },
  {
    id: 'peanuts',
    ru: 'арахис',
    reasonRu: 'Аллерген из вашего профиля.',
    patterns: [/pinda/, /\barachide/, /cacahuete/, /peanut/, /erdnuss/, /\baardno+t/],
    allergen: 'peanuts',
  },
  {
    id: 'nuts',
    ru: 'орехи (фундук, миндаль, грецкий, кешью…)',
    reasonRu: 'Аллерген из вашего профиля.',
    patterns: [
      /noten\b/, /noot\b/, /\bnoix\b/, /noisette/, /amand/, /mandel/, /\bnuss/, /nuss\b/, /nusse\b/,
      /\bnuts?\b/, /hazelnut/, /walnut/, /cashew/, /pecan/, /pistach/, /pistazie/, /macadamia/, /brazil nut/,
      /fruits a coque/, /schalenfruchte/, /marzipan/, /massepain/, /gianduja/,
    ],
    ignoreIn: [
      /(kokos|muskaat|aard)noo?t/, /noix de (coco|muscade)/, /(erd|muskat|kokos)nuss/,
    ],
    allergen: 'nuts',
  },
  {
    id: 'soy',
    ru: 'соя',
    reasonRu: 'Аллерген из вашего профиля.',
    patterns: [/\bsoja/, /\bsoy/, /edamame/, /\btofu\b/, /\btempeh/, /\bmiso\b/, /shoyu/, /tamari/],
    allergen: 'soy',
  },
  {
    id: 'lecithin',
    ru: 'лецитин (E322)',
    reasonRu: 'Часто соевый; источник не указан.',
    patterns: [E('322'), /lecit(h)?in/],
    allergen: 'soy',
    allergenSeverity: 'WARNING',
    overrides: [
      { near: /(zonnebloem|tournesol|sonnenblume|sunflower|colza|\braps|rapeseed|koolzaad|raapzaad|\bei\b|oeuf|\begg)/, allergenSafe: true },
    ],
  },
  {
    id: 'fish',
    ru: 'рыба',
    reasonRu: 'Животный продукт / аллерген из вашего профиля.',
    patterns: [
      /\bvis\b/, /\bvis(olie|saus|bouillon|gelatine|eiwit|vlees|filet|sticks)/, /kabeljauw/, /tonijn/, /\bzalm/,
      /haring/, /makreel/, /sardien/, /ansjovis/, /koolvis/, /\bheek\b/, /pangasius/, /tilapia/, /\bforel/,
      /\bpoissons?\b/, /cabillaud/, /\bthon\b/, /saumon/, /hareng/, /maquereau/, /sardine/, /anchois/, /\bcolin\b/,
      /merlu/, /truite/, /morue/, /fisch/, /kabeljau/, /lachs/, /hering/, /makrele/, /sardelle/, /forelle/,
      /scholle/, /\bfish/, /\bcod\b/, /\btuna\b/, /salmon/, /herring/, /mackerel/, /anchov/, /pollock/,
      /haddock/, /\bhake\b/, /trout/, /surimi/, /worcester/, /bonito/,
    ],
    ignoreIn: [/tintenfisch/, /lachsschinken/],
    diet: { vegan: 'BANNED', vegetarian: 'BANNED' },
    allergen: 'fish',
  },
  {
    id: 'crustaceans',
    ru: 'ракообразные (креветки, крабы, омары)',
    reasonRu: 'Животный продукт / аллерген из вашего профиля.',
    patterns: [
      /garna(a)?l/, /\bcrevette/, /garnele/, /shrimp/, /prawn/, /\bkrab/, /\bcrabe/, /\bcrabs?\b/, /kreeft/,
      /homard/, /hummer/, /lobster/, /langoust/, /crustac/, /schaaldier/, /krebs/, /ecrevisse/, /krill/, /scampi/,
    ],
    diet: { vegan: 'BANNED', vegetarian: 'BANNED' },
    allergen: 'crustaceans',
  },
  {
    id: 'molluscs',
    ru: 'моллюски (мидии, устрицы, кальмары)',
    reasonRu: 'Животный продукт / аллерген из вашего профиля.',
    patterns: [
      /mossel/, /\bmoules?\b/, /muschel/, /mussel/, /oester/, /huitre/, /\bauster/, /oyster/, /inktvis/,
      /\bcalamar/, /tintenfisch/, /squid/, /octopus/, /poulpe/, /\bslak(ken)?\b/, /escargot/, /schnecke/,
      /\bsnails?\b/, /sint[- ]jakob/, /saint[- ]jacques/, /scallop/, /weekdier/, /mollus/, /weichtier/,
      /\bsepia\b/, /\bseiche\b/, /coquillage/,
    ],
    diet: { vegan: 'BANNED', vegetarian: 'BANNED' },
    allergen: 'molluscs',
  },
  {
    id: 'celery',
    ru: 'сельдерей',
    reasonRu: 'Аллерген из вашего профиля.',
    patterns: [/selder/, /celeri/, /sellerie/, /celery/],
    allergen: 'celery',
  },
  {
    id: 'mustard',
    ru: 'горчица',
    reasonRu: 'Аллерген из вашего профиля.',
    patterns: [/mosterd/, /moutarde/, /\bsenf/, /senf\b/, /mustard/],
    allergen: 'mustard',
  },
  {
    id: 'sesame',
    ru: 'кунжут',
    reasonRu: 'Аллерген из вашего профиля.',
    patterns: [/sesam/, /tahin/, /gomasio/],
    allergen: 'sesame',
  },
  {
    id: 'lupin',
    ru: 'люпин',
    reasonRu: 'Аллерген из вашего профиля.',
    patterns: [/lupin/],
    allergen: 'lupin',
  },
  {
    id: 'sulphites',
    ru: 'сульфиты / диоксид серы (E220–E228)',
    reasonRu: 'Аллерген из вашего профиля.',
    patterns: [
      E('22[0-8]'), /sul(f|ph)i[et]/, /(zwavel|schwefel)dioxid/, /dioxyde de soufre/, /(sulphur|sulfur) dioxide/,
      /anhydride sulfureux/,
    ],
    allergen: 'sulphites',
  },
];

/**
 * Маркеры «сложных» формулировок: сами по себе не запрет,
 * но для диетических профилей требуют уточнения у ИИ.
 */
export const COMPLEX_MARKERS: { re: RegExp; ru: string; skipIfNear?: RegExp }[] = [
  { re: /\baroma('?s)?\b|\baromen\b|\baromes?\b|flavou?r(ing)?s?\b/, ru: 'ароматизаторы' },
  { re: /emulgator|emulsifiant|emulsifier/, ru: 'эмульгаторы без уточнения' },
  { re: /kruiden|specerijen|epices|gewurze|\bspices?\b/, ru: 'смеси специй' },
  { re: /\benzym|\benzyme/, ru: 'ферменты' },
  { re: /\b(vet|vetten|graisses?|fett|fette|fats?)\b/, ru: 'жиры без указания источника', skipIfNear: NEAR_PLANT },
];

/**
 * Предупреждения о следах. Клауза длится от триггера до ближайших . ; или перевода строки.
 */
export const TRACE_TRIGGERS: RegExp =
  /(kan sporen|sporen van|bevat mogelijk|kan .{0,40}?bevatten|in een (bedrijf|omgeving) waar ook|peut contenir|traces? (eventuelles? |possibles? )?(de|d')|fabrique dans un atelier|kann spuren|spuren von|kann .{0,40}?enthalten|hergestellt in einem betrieb|may contain|may also contain|traces? of|made in a factory)/g;

/**
 * Переводы популярных русских стоп-слов на языки этикеток.
 * Ключ — нормализованное русское слово/фраза.
 */
export const CUSTOM_SYNONYMS: Record<string, RegExp> = {
  'пальмовое масло': /\bpalm|huile de palme|graisse de palme|palmist/,
  'пальма': /\bpalm|huile de palme|graisse de palme|palmist/,
  'сахар': /suiker|sucre|zucker|\bsugar|saccharose|sucrose|glucose|fructose|dextrose|stroop|sirop|sirup|syrup/,
  'глутамат': /glutamat|glutamaat|\be ?-?62[1-5]\b/,
  'глутамат натрия': /glutamat|glutamaat|\be ?-?621\b/,
  'аспартам': /aspartam|\be ?-?951\b/,
  'соль': /\bzout\b|\bsel\b|\bsalz\b|\bsalt\b/,
  'крахмал': /zetmeel|amidon|starke|starch/,
  'дрожжи': /\bgist\b|levure|\bhefe|yeast/,
  'кофеин': /cafeine|caffeine|koffein/,
  'кукуруза': /\bmais\b|\bcorn\b|\bmaize\b/,
  'подсластители': /zoetstof|edulcorant|susstoff|sweetener|aspartam|sucralose|acesulfam|stevia|saccharin|cyclamat/,
};
