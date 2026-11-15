# Safa — метаданные для Google Play Console

Тексты для карточки приложения. Каждый блок в рамке ``` — это готовый текст «как есть» (без markdown),
его можно копировать в поле Play Console. Лимиты Google Play: Title — 30, Short description — 80,
Full description — 4000 символов.

| Поле | EN | RU | Лимит |
| --- | --- | --- | --- |
| Title | 26 | 26 | 30 |
| Short description | 73 | 68 | 80 |
| Full description | 2775 | 2934 | 4000 |

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
• Products from Open Food Facts are checked instantly on your phone by local rules
• Photos of the ingredient list are read on your device (Google ML Kit), so the photo is not uploaded
• Optional “Recheck with AI” button for tricky ingredient lists. AI can never lift a ban
• Reads labels in Dutch, French, German and English

FOR THE WHOLE FAMILY
• Separate profiles for each family member: halal, vegan, allergies and more
• History, favourites and a personal blacklist; share any result
• App languages: Russian, English, French, Dutch, German and Arabic

GOOD TO KNOW
• Product data comes from Open Food Facts, a community database that can be incomplete or out of date. Always compare with the package.
• Safa is not a halal certification body and does not give medical advice. If you have a severe allergy, always read the label and follow your doctor's advice.
• Ingredient photos are read on your device and are not uploaded. Barcodes go to Open Food Facts. If you tap “Recheck with AI”, only the ingredient text and your diet settings are sent to the SAFA server, which forwards them to Google's Gemini API. The expiry-date scanner sends the date photo to the SAFA server for AI reading. A photo you attach to a community report is sent to the SAFA server for moderation.
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
• Товары из Open Food Facts проверяются мгновенно на телефоне локальными правилами
• Фото состава распознаётся на устройстве (Google ML Kit), поэтому снимок никуда не загружается
• Необязательная кнопка «Перепроверить через ИИ» для сложных составов. ИИ никогда не снимает запрет
• Читает этикетки на нидерландском, французском, немецком и английском

ДЛЯ ВСЕЙ СЕМЬИ
• Отдельные профили для каждого члена семьи: халяль, веган, аллергии и другое
• История, избранное и личный чёрный список; результатом можно поделиться
• Языки приложения: русский, английский, французский, нидерландский, немецкий и арабский

ВАЖНО ЗНАТЬ
• Данные о продуктах берутся из Open Food Facts — открытой базы, которая может быть неполной или устаревшей. Всегда сверяйте с упаковкой.
• Safa не является сертифицирующим органом по халяль и не даёт медицинских рекомендаций. При тяжёлой аллергии всегда читайте этикетку и следуйте советам врача.
• Фото состава распознаётся на устройстве и никуда не загружается. Штрихкоды отправляются в Open Food Facts. Если нажать «Перепроверить через ИИ», на сервер SAFA уходит только текст состава и ваши настройки питания, а сервер передаёт их в API Google Gemini. Сканер срока годности отправляет фото даты на сервер SAFA для распознавания ИИ. Фото, которое вы прикладываете к отчёту сообщества, уходит на сервер SAFA для модерации.
```

---

## Заметки для публикации (не для вставки в магазин)

- **Data safety (раздел «Безопасность данных»).** Приложение не требует аккаунта. Фото состава обрабатывается на устройстве (Google ML Kit, офлайн). Текст состава уходит на сервер SAFA (Vercel) и оттуда в Google Gemini API только по нажатию «Перепроверить через ИИ»; фото срока годности — на сервер SAFA для распознавания ИИ; штрихкоды — в Open Food Facts; в отчётах сообщества на сервер SAFA попадают фото, штрихкод и случайный анонимный идентификатор установки (хранится хеш); профиль и история остаются на устройстве (AsyncStorage). Заполняйте анкету по фактической сборке.
- **Политика Google Play.** В Title и описаниях не должно быть эмодзи, цен, слов вроде «№1/лучший» и повторяющегося перечисления ключевых слов; в текстах выше этого нет.
- **Ограничения утверждений.** Не пишите в магазине про «халяль-сертификацию» и медицинские эффекты: приложение не сертифицирует и не лечит. Список E-добавок во встроенном справочнике неполный (около 55 записей), поэтому в тексте сказано «распространённых добавок».
- **Категория (предложение, не проверено).** Food & Drink; вариант — Health & Fitness.
- **Название и товарный знак.** Совпадения «Safa» с другими приложениями или товарными знаками я не проверял; сделайте поиск по Google Play и базам товарных знаков до публикации.
- **Идентификатор пакета** сейчас `com.foodaudit.app`. После первой публикации его нельзя изменить, поэтому решите, нужен ли другой, до загрузки в Play Console.
