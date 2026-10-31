# Food Audit — аудит состава продуктов (Halal · Vegan · Аллергены)

Мобильное приложение на React Native (Expo SDK 52, TypeScript). Сканирует штрихкод или фотографирует
состав на NL / FR / DE / EN и выдаёт вердикт по профилю пользователя: 🟢 SAFE · 🟡 WARNING · 🔴 BANNED.

## Запуск

```bash
cd food-audit-app
npm install
cp .env.example .env        # вписать EXPO_PUBLIC_GEMINI_API_KEY
npx expo start              # открыть в Expo Go или dev-build
npm test                    # тесты движка правил
npm run typecheck
```

Без ключа Gemini работает режим «Штрихкод» с локальным фильтром; режим «Фото состава» требует ключ.

## Архитектура

```
App.tsx                         корень: SafeAreaProvider → ProfileProvider → Scanner | Settings
src/
  types/index.ts                Severity, UserProfile, Issue, ScanResult, RawIngredients
  constants/
    allergens.ts                14 аллергенов ЕС + соответствие тегам Open Food Facts
    config.ts                   ключ/модель Gemini из EXPO_PUBLIC_*, таймауты, User-Agent для OFF
    theme.ts                    цвета и подписи вердиктов
  storage/profileStorage.ts     AsyncStorage: загрузка/сохранение, слияние с дефолтами
  context/ProfileContext.tsx    состояние профиля + автосохранение при каждом изменении
  services/
    http.ts                     fetch с таймаутом
    openFoodFacts.ts            Шаг 1А: GET /api/v2/product/{barcode}.json
    gemini.ts                   Шаг 3: generateContent, JSON-схема ответа, валидация
  engine/
    textNormalize.ts            нижний регистр, снятие диакритики, карта индексов → цитата оригинала
    dictionaries.ts             правила стоп-компонентов на 4 языках, исключения, уточнители, следы
    localFilter.ts              Шаг 2: детерминированный фильтр
    auditor.ts                  оркестратор шагов 1→2→3 и политика вердикта
  screens/
    ScannerScreen.tsx           камера, рамка, переключатель режимов, фонарик
    SettingsScreen.tsx          профиль: Halal / Vegan / Vegetarian / 14 аллергенов / следы / стоп-слова
  components/
    ResultModal.tsx             цветной вердикт, «Найденные проблемы», «Следы аллергенов»
    ToggleRow.tsx
__tests__/localFilter.test.ts   22 теста на реальных формулировках этикеток
```

## Поток данных

1. **Получение текста.** Штрихкод → Open Food Facts (`ingredients_text`, `allergens_tags`, `traces_tags`,
   `ingredients_analysis_tags`, `labels_tags`). Фото → base64 → Gemini распознаёт и аудирует одним запросом.
2. **Локальный фильтр.** Текст нормализуется (`Gélatine` → `gelatine`, `Käse` → `kase`), затем к нему
   применяются правила из `dictionaries.ts`. У каждого правила есть:
   - `patterns` — словоформы на NL/FR/DE/EN и E-номера (`E 471`, `E-471`, `e471` — одинаково);
   - `ignoreIn` — ложные срабатывания: `kokosmelk`, `beurre de cacao`, `Buchweizen`, `Erdnüsse` для орехов,
     `inktvis` для рыбы, `Fruchtfleisch` для мяса;
   - `overrides` — уточнения в пределах того же ингредиента: `gélatine (bovine)` → WARNING,
     `gelatine halal` / рыбный → SAFE, `E471 (plantaardig)` → SAFE, `présure microbienne` → SAFE.
   Клаузы «kan sporen bevatten / peut contenir / kann Spuren / may contain» выделяются отдельно: в них
   ищутся только аллергены, с серьёзностью WARNING или BANNED (флаг «Учитывать следы»).
3. **ИИ-аудитор** вызывается, только если нет локального BANNED и есть неоднозначности
   (ароматизаторы, E471/E472 без источника, смеси специй, жиры без источника, русские стоп-слова без
   локального перевода).

### Политика вердикта (`auditor.ts`)
- Локальный BANNED выдаётся мгновенно, токены ИИ не тратятся.
- Итог = максимум(локальный, ИИ): ИИ может только **ужесточить** вердикт, но не снять запрет.
- Ответ ИИ фильтруется по профилю: категорию, которую пользователь не включал, ИИ добавить не может.
- Если проверка ИИ была нужна, но не удалась (нет ключа, нет сети, отключено) — минимум WARNING с пояснением.
- Пустой состав никогда не даёт SAFE.

## Важные замечания

- **Модель.** В ТЗ указана `gemini-1.5-flash`; Google снял модели 1.5 с обслуживания, поэтому по умолчанию
  стоит `gemini-2.5-flash`. Модель задаётся через `EXPO_PUBLIC_GEMINI_MODEL` — проверьте актуальный список
  моделей в документации Google AI перед релизом.
- **Безопасность ключа.** `EXPO_PUBLIC_*` попадает в бандл. Для продакшена поднимите свой прокси и укажите
  `EXPO_PUBLIC_AI_PROXY_URL`: приложение отправит `POST {model, body}`, прокси добавит ключ и перешлёт
  `body` в `generateContent`.
- **Ограничения.** Словари покрывают типичные формулировки, но не все. Приложение — вспомогательный
  инструмент; при тяжёлой аллергии сверяйтесь с упаковкой и производителем.
- Для фото без ИИ можно добавить on-device OCR (например, ML Kit через dev-build) — распознанный текст
  передаётся в `auditRawIngredients()` без изменений остальной логики.
