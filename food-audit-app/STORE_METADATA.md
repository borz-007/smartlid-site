# Safa — метаданные для Google Play Console

Тексты для карточки приложения. Каждый блок в рамке ``` — это готовый текст «как есть» (без markdown),
его можно копировать в поле Play Console. Лимиты Google Play: Title — 30, Short description — 80,
Full description — 4000 символов.

| Поле | EN | RU | Лимит |
| --- | --- | --- | --- |
| Title | 26 | 26 | 30 |
| Short description | 73 | 68 | 80 |
| Full description | 2434 | 2560 | 4000 |

Название на домашнем экране телефона — **Safa** (отдельно от Title в магазине, см. `plugins/withAndroidAppLabel.js`).

---

## English (en-US)

### Title

```text
Safa: Halal & Food Scanner
```

### Short description

```text
Halal food scanner: E-numbers, Nutri-Score, allergens & expiry date audit
```

### Full description

```text
Safa is a halal and food scanner that tells you in seconds whether a product fits YOUR diet. Scan a barcode or photograph the ingredient list and get a clear verdict: green (OK), yellow (check it) or red (not for you).

WHAT SAFA CHECKS

HALAL
• Pork and its derivatives: lard, bacon, ham
• Alcohol, including alcohol used as a flavour carrier
• Carmine (E120) and gelatin without a halal or fish source
• Doubtful E-numbers such as E471 when the plant or animal origin is not stated

VEGAN & VEGETARIAN
• Meat, fish, dairy, eggs, honey, gelatin, carmine and other animal-derived ingredients
• Vegetarian mode still allows milk and eggs

ALLERGENS
• All 14 major EU allergens
• "May contain" traces can be treated as a critical risk
• Your own stop-words for anything else you want to avoid

ANIMAL & UNSPECIFIED FATS
• Spots animal fats such as lard, tallow and suet
• Warns when "fat" is listed without saying whether it is plant or animal

HEALTH & NUTRITION
• Nutri-Score A–E with a 0–100 quality index
• Eco-Score when data is available
• Traffic-light breakdown per 100 g: sugar, saturated fat, salt and calories, plus protein and fibre
• E-number guide: risk level and halal status of common additives
• Healthier alternatives from the same category that also match your profile

EXPIRY DATE SCANNER
• Point the camera at the date: Gemini AI reads EXP, BBE, THT, MHD and "à consommer avant" labels
• See at a glance whether the product is fresh, expiring soon or expired

SMART BY DESIGN
• Local rules block obvious violations instantly. Gemini AI adds a second opinion and can never lift a ban
• If a product is missing from the database, Safa can search the web for its ingredients and shows the sources
• Reads labels in Dutch, French, German and English

FOR THE WHOLE FAMILY
• Separate profiles for each family member: halal, vegan, allergies and more
• History, favourites and a personal blacklist; share any result
• App languages: Russian, English, French, Dutch, German and Arabic

GOOD TO KNOW
• Product data comes from Open Food Facts, a community database that can be incomplete or out of date. Always compare with the package.
• Safa is not a halal certification body and does not give medical advice. If you have a severe allergy, always read the label and follow your doctor's advice.
• AI features send ingredient text, photos and your diet settings to Google's Gemini API. Barcodes are sent to Open Food Facts.
```

---

## Русский (ru-RU)

### Title

```text
Safa: Halal & Food Scanner
```

### Short description

```text
Халяль-сканер еды: E-добавки, Nutri-Score, аллергены, сроки годности
```

### Full description

```text
Safa — сканер халяль и состава продуктов: за секунды показывает, подходит ли товар именно вашему рациону. Отсканируйте штрихкод или сфотографируйте состав и получите понятный вердикт: зелёный (можно), жёлтый (проверьте) или красный (не подходит).

ЧТО ПРОВЕРЯЕТ SAFA

ХАЛЯЛЬ
• Свинина и её производные: сало, бекон, ветчина
• Алкоголь, в том числе как носитель ароматизаторов
• Кармин (E120) и желатин без халяльного или рыбного источника
• Сомнительные E-добавки, например E471, если не указано растительное или животное происхождение

ВЕГАН И ВЕГЕТАРИАНЕЦ
• Мясо, рыба, молочные продукты, яйца, мёд, желатин, кармин и другие компоненты животного происхождения
• В вегетарианском режиме молоко и яйца разрешены

АЛЛЕРГЕНЫ
• Все 14 основных аллергенов ЕС
• Следы («может содержать») можно считать критическим риском
• Свои стоп-слова для всего, чего вы хотите избегать

ЖИВОТНЫЕ И НЕУКАЗАННЫЕ ЖИРЫ
• Находит животные жиры: сало, говяжий и нутряной жир
• Предупреждает, если указан просто «жир» без пометки, растительный он или животный

ЗДОРОВЬЕ И ПИТАНИЕ
• Nutri-Score от A до E и индекс качества от 0 до 100
• Eco-Score, если есть данные
• «Светофор» на 100 г: сахар, насыщенные жиры, соль и калории, а также белок и клетчатка
• Справочник E-добавок: уровень риска и халяль-статус распространённых добавок
• Более полезные альтернативы из той же категории, которые подходят вашему профилю

СКАНЕР СРОКА ГОДНОСТИ
• Наведите камеру на дату: Gemini AI распознает маркировки EXP, BBE, THT, MHD и «à consommer avant»
• Сразу видно: свежий продукт, скоро истекает или просрочен

УМНАЯ ПРОВЕРКА
• Локальные правила мгновенно останавливают явные нарушения. Gemini AI даёт второе мнение и никогда не снимает запрет
• Если товара нет в базе, Safa может найти состав в интернете и покажет источники
• Читает этикетки на нидерландском, французском, немецком и английском

ДЛЯ ВСЕЙ СЕМЬИ
• Отдельные профили для каждого члена семьи: халяль, веган, аллергии и другое
• История, избранное и личный чёрный список; результатом можно поделиться
• Языки приложения: русский, английский, французский, нидерландский, немецкий и арабский

ВАЖНО ЗНАТЬ
• Данные о продуктах берутся из Open Food Facts — открытой базы, которая может быть неполной или устаревшей. Всегда сверяйте с упаковкой.
• Safa не является сертифицирующим органом по халяль и не даёт медицинских рекомендаций. При тяжёлой аллергии всегда читайте этикетку и следуйте советам врача.
• ИИ-функции отправляют текст состава, фото и ваши настройки питания в API Google Gemini. Штрихкоды отправляются в Open Food Facts.
```

---

## Заметки для публикации (не для вставки в магазин)

- **Data safety (раздел «Безопасность данных»).** Приложение не требует аккаунта. При ИИ-функциях фото и текст состава уходят в Google Gemini API, штрихкоды — в Open Food Facts; профиль и история хранятся на устройстве (AsyncStorage). Заполняйте анкету по фактической сборке и пересмотрите её, если подключите прокси или аналитику.
- **Политика Google Play.** В Title и описаниях не должно быть эмодзи, цен, слов вроде «№1/лучший» и повторяющегося перечисления ключевых слов; в текстах выше этого нет.
- **Ограничения утверждений.** Не пишите в магазине про «халяль-сертификацию» и медицинские эффекты: приложение не сертифицирует и не лечит. Список E-добавок во встроенном справочнике неполный (около 55 записей), поэтому в тексте сказано «распространённых добавок».
- **Категория (предложение, не проверено).** Food & Drink; вариант — Health & Fitness.
- **Название и товарный знак.** Совпадения «Safa» с другими приложениями или товарными знаками я не проверял; сделайте поиск по Google Play и базам товарных знаков до публикации.
- **Идентификатор пакета** сейчас `com.foodaudit.app`. После первой публикации его нельзя изменить, поэтому решите, нужен ли другой, до загрузки в Play Console.
