import type { AdditiveAuditResult, AdditiveRiskLevel, HalalAdditiveStatus } from '../types';

export interface AdditiveEntry {
  code: string;
  name: string;
  riskLevel: AdditiveRiskLevel;
  halalStatus: HalalAdditiveStatus;
  description: string;
}

const RISK_ORDER: Record<AdditiveRiskLevel, number> = {
  high: 0,
  moderate: 1,
  low: 2,
  safe: 3,
  unknown: 4,
};

export const ADDITIVES_DB: AdditiveEntry[] = [
  // ─── Красители ───
  { code: 'E100', name: 'Куркумин', riskLevel: 'safe', halalStatus: 'halal', description: 'Натуральный краситель из корня куркумы, обладает антиоксидантными свойствами.' },
  { code: 'E102', name: 'Тартразин', riskLevel: 'moderate', halalStatus: 'halal', description: 'Синтетический азокраситель, может вызывать аллергические реакции и гиперактивность у детей.' },
  { code: 'E104', name: 'Хинолиновый жёлтый', riskLevel: 'moderate', halalStatus: 'halal', description: 'Синтетический краситель, запрещён в ряде стран из-за возможного влияния на поведение детей.' },
  { code: 'E110', name: 'Жёлтый «солнечный закат»', riskLevel: 'high', halalStatus: 'halal', description: 'Азокраситель, связан с гиперактивностью у детей и аллергическими реакциями, требует маркировки в ЕС.' },
  { code: 'E120', name: 'Кармин (кошениль)', riskLevel: 'moderate', halalStatus: 'haram', description: 'Натуральный краситель из насекомых (кошенильная тля), запрещён в халяль-питании.' },
  { code: 'E122', name: 'Азорубин (кармуазин)', riskLevel: 'high', halalStatus: 'halal', description: 'Синтетический азокраситель, подозревается в канцерогенности и вызывает аллергические реакции.' },
  { code: 'E124', name: 'Понсо 4R', riskLevel: 'high', halalStatus: 'halal', description: 'Азокраситель, запрещён в США; в ЕС требует предупреждения о влиянии на поведение детей.' },
  { code: 'E129', name: 'Красный очаровательный AC', riskLevel: 'high', halalStatus: 'halal', description: 'Синтетический азокраситель, связан с гиперактивностью у детей, требует маркировки в ЕС.' },
  { code: 'E131', name: 'Синий патентованный V', riskLevel: 'moderate', halalStatus: 'halal', description: 'Синтетический краситель, может вызывать аллергические реакции у чувствительных людей.' },
  { code: 'E133', name: 'Бриллиантовый голубой FCF', riskLevel: 'low', halalStatus: 'halal', description: 'Синтетический краситель, в целом безопасен, но в редких случаях вызывает непереносимость.' },
  { code: 'E150A', name: 'Сахарный колер I', riskLevel: 'safe', halalStatus: 'halal', description: 'Простая карамель, получаемая нагреванием сахара, без химических реагентов.' },
  { code: 'E150D', name: 'Сахарный колер IV', riskLevel: 'moderate', halalStatus: 'halal', description: 'Производится с использованием сульфита аммония; содержит следы 4-метилимидазола (потенциальный канцероген).' },
  { code: 'E160A', name: 'Бета-каротин', riskLevel: 'safe', halalStatus: 'halal', description: 'Натуральный провитамин A из овощей и фруктов, безопасный антиоксидант.' },
  { code: 'E160B', name: 'Аннатто', riskLevel: 'safe', halalStatus: 'halal', description: 'Натуральный краситель из семян дерева аннатто, применяется в сырах и маргарине.' },
  { code: 'E171', name: 'Диоксид титана', riskLevel: 'high', halalStatus: 'halal', description: 'Запрещён в ЕС с 2022 года как пищевая добавка из-за генотоксичности наночастиц (заключение EFSA 2021).' },

  // ─── Консерванты ───
  { code: 'E200', name: 'Сорбиновая кислота', riskLevel: 'safe', halalStatus: 'halal', description: 'Натуральный консервант, встречается в ягодах рябины, безопасен в допустимых дозах.' },
  { code: 'E202', name: 'Сорбат калия', riskLevel: 'safe', halalStatus: 'halal', description: 'Калиевая соль сорбиновой кислоты, один из самых безопасных и распространённых консервантов.' },
  { code: 'E210', name: 'Бензойная кислота', riskLevel: 'moderate', halalStatus: 'halal', description: 'В сочетании с аскорбиновой кислотой может образовывать бензол (канцероген).' },
  { code: 'E211', name: 'Бензоат натрия', riskLevel: 'moderate', halalStatus: 'halal', description: 'В сочетании с витамином C может образовывать бензол; связан с гиперактивностью у детей.' },
  { code: 'E220', name: 'Диоксид серы', riskLevel: 'moderate', halalStatus: 'halal', description: 'Сульфит-консервант, опасен для астматиков и людей с чувствительностью к сульфитам.' },
  { code: 'E250', name: 'Нитрит натрия', riskLevel: 'high', halalStatus: 'halal', description: 'При нагревании образует нитрозамины — канцерогены группы 1 по IARC; используется в колбасах.' },
  { code: 'E251', name: 'Нитрат натрия', riskLevel: 'high', halalStatus: 'halal', description: 'Превращается в нитриты в организме; связан с повышенным риском колоректального рака (IARC).' },
  { code: 'E252', name: 'Нитрат калия', riskLevel: 'high', halalStatus: 'halal', description: 'Аналог E251, превращается в нитриты; используется в вяленом мясе и сырах.' },

  // ─── Антиоксиданты ───
  { code: 'E300', name: 'Аскорбиновая кислота', riskLevel: 'safe', halalStatus: 'halal', description: 'Витамин C, натуральный антиоксидант, полностью безопасен.' },
  { code: 'E301', name: 'Аскорбат натрия', riskLevel: 'safe', halalStatus: 'halal', description: 'Натриевая соль витамина C, безопасный антиоксидант.' },
  { code: 'E306', name: 'Токоферол (витамин E)', riskLevel: 'safe', halalStatus: 'halal', description: 'Натуральный антиоксидант из растительных масел, витамин E.' },
  { code: 'E322', name: 'Лецитин', riskLevel: 'safe', halalStatus: 'doubtful', description: 'Натуральный эмульгатор из сои или яиц; халяль-статус зависит от источника (растительный или животный).' },
  { code: 'E330', name: 'Лимонная кислота', riskLevel: 'safe', halalStatus: 'halal', description: 'Натуральная кислота из цитрусовых, широко используется как регулятор кислотности.' },
  { code: 'E331', name: 'Цитрат натрия', riskLevel: 'safe', halalStatus: 'halal', description: 'Натриевая соль лимонной кислоты, безопасный регулятор кислотности.' },

  // ─── Эмульгаторы и загустители ───
  { code: 'E401', name: 'Альгинат натрия', riskLevel: 'safe', halalStatus: 'halal', description: 'Натуральный загуститель из бурых морских водорослей, полностью безопасен.' },
  { code: 'E407', name: 'Каррагинан', riskLevel: 'moderate', halalStatus: 'halal', description: 'Загуститель из красных водорослей; деградированная форма связана с воспалением кишечника (исследования на животных).' },
  { code: 'E410', name: 'Камедь рожкового дерева', riskLevel: 'safe', halalStatus: 'halal', description: 'Натуральный загуститель из стручков рожкового дерева, безопасен.' },
  { code: 'E412', name: 'Гуаровая камедь', riskLevel: 'safe', halalStatus: 'halal', description: 'Натуральный загуститель из семян гуара, безопасен в пищевых дозах.' },
  { code: 'E414', name: 'Гуммиарабик', riskLevel: 'safe', halalStatus: 'halal', description: 'Натуральная камедь из акации, безопасный стабилизатор и эмульгатор.' },
  { code: 'E415', name: 'Ксантановая камедь', riskLevel: 'safe', halalStatus: 'halal', description: 'Полисахарид микробного происхождения, безопасный загуститель.' },
  { code: 'E440', name: 'Пектин', riskLevel: 'safe', halalStatus: 'halal', description: 'Натуральный полисахарид из фруктов, используется как желирующий агент.' },
  { code: 'E450', name: 'Дифосфаты', riskLevel: 'low', halalStatus: 'halal', description: 'Синтетические фосфаты; избыточное потребление может нарушать баланс кальция и фосфора.' },
  { code: 'E460', name: 'Целлюлоза', riskLevel: 'safe', halalStatus: 'halal', description: 'Растительное волокно, используется как наполнитель и стабилизатор, полностью безопасна.' },
  { code: 'E466', name: 'Карбоксиметилцеллюлоза', riskLevel: 'safe', halalStatus: 'halal', description: 'Модифицированная целлюлоза, безопасный загуститель и стабилизатор.' },
  { code: 'E471', name: 'Моно- и диглицериды', riskLevel: 'low', halalStatus: 'doubtful', description: 'Эмульгатор, может производиться из животных или растительных жиров; без указания источника — сомнительный.' },
  { code: 'E472E', name: 'DATEM', riskLevel: 'low', halalStatus: 'doubtful', description: 'Эфир диацетилвинной кислоты; может содержать жирные кислоты животного происхождения.' },
  { code: 'E481', name: 'Стеароиллактилат натрия', riskLevel: 'low', halalStatus: 'doubtful', description: 'Эмульгатор на основе стеариновой кислоты; источник жира может быть животным.' },

  // ─── Подсластители ───
  { code: 'E420', name: 'Сорбит', riskLevel: 'safe', halalStatus: 'halal', description: 'Сахарный спирт, натуральный подсластитель; в больших количествах может вызывать диарею.' },
  { code: 'E950', name: 'Ацесульфам калия', riskLevel: 'low', halalStatus: 'halal', description: 'Синтетический подсластитель, одобрен EFSA; отдельные исследования указывают на влияние на микробиом.' },
  { code: 'E951', name: 'Аспартам', riskLevel: 'moderate', halalStatus: 'halal', description: 'Классифицирован IARC как «возможно канцерогенный» (группа 2B) в 2023 году.' },
  { code: 'E955', name: 'Сукралоза', riskLevel: 'safe', halalStatus: 'halal', description: 'Синтетический подсластитель, одобрен EFSA, не метаболизируется организмом.' },
  { code: 'E960', name: 'Стевиолгликозиды', riskLevel: 'safe', halalStatus: 'halal', description: 'Натуральный подсластитель из листьев стевии, безопасен в допустимых дозах.' },
  { code: 'E965', name: 'Мальтит', riskLevel: 'safe', halalStatus: 'halal', description: 'Сахарный спирт с низким гликемическим индексом; в избытке вызывает слабительный эффект.' },

  // ─── Прочие ───
  { code: 'E500', name: 'Гидрокарбонат натрия (сода)', riskLevel: 'safe', halalStatus: 'halal', description: 'Пищевая сода, натуральный разрыхлитель, полностью безопасен.' },
  { code: 'E621', name: 'Глутамат натрия (MSG)', riskLevel: 'low', halalStatus: 'halal', description: 'Усилитель вкуса; безопасен по заключению EFSA, но у чувствительных людей может вызывать головную боль.' },
  { code: 'E631', name: 'Инозинат натрия', riskLevel: 'low', halalStatus: 'doubtful', description: 'Усилитель вкуса, может производиться из мяса или рыбы; без указания источника — сомнительный.' },
  { code: 'E635', name: 'Рибонуклеотиды натрия', riskLevel: 'low', halalStatus: 'doubtful', description: 'Усилитель вкуса, часто производится из животного сырья; халяль-статус зависит от источника.' },
  { code: 'E901', name: 'Пчелиный воск', riskLevel: 'safe', halalStatus: 'doubtful', description: 'Натуральный воск; по строгим ханафитским стандартам продукты пчеловодства — сомнительны.' },
  { code: 'E903', name: 'Карнаубский воск', riskLevel: 'safe', halalStatus: 'halal', description: 'Натуральный растительный воск из листьев пальмы, полностью безопасен.' },
  { code: 'E904', name: 'Шеллак', riskLevel: 'low', halalStatus: 'haram', description: 'Смола, выделяемая лаковым червецом (насекомое); запрещён в халяль-питании.' },
];

const ADDITIVES_MAP = new Map<string, AdditiveEntry>();
for (const entry of ADDITIVES_DB) {
  ADDITIVES_MAP.set(entry.code.toUpperCase(), entry);
}

const E_NUMBER_RE = /e\d{3,4}[a-z]?/i;

export function analyzeAdditives(tags: string[]): AdditiveAuditResult[] {
  const seen = new Set<string>();
  const results: AdditiveAuditResult[] = [];

  for (const tag of tags) {
    const match = tag.match(E_NUMBER_RE);
    if (!match) continue;
    const code = match[0].toUpperCase();
    if (seen.has(code)) continue;
    seen.add(code);

    const entry = ADDITIVES_MAP.get(code);
    if (entry) {
      results.push({
        code: entry.code,
        name: entry.name,
        riskLevel: entry.riskLevel,
        halalStatus: entry.halalStatus,
        description: entry.description,
      });
    } else {
      results.push({
        code,
        name: code,
        riskLevel: 'unknown',
        halalStatus: 'doubtful',
        description: 'Добавка отсутствует в локальной базе; рекомендуется проверить вручную.',
      });
    }
  }

  results.sort((a, b) => (RISK_ORDER[a.riskLevel] ?? 4) - (RISK_ORDER[b.riskLevel] ?? 4));
  return results;
}
