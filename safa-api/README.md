# SAFA API

Отдельный Next.js-проект: серверная часть мобильного приложения SAFA (папка `food-audit-app/`).
**К сайту slid-tech.com (корень репозитория, проект Vercel `smartlid-site`) он не относится**: свой `package.json`,
свой lock-файл, свои переменные окружения, своя база данных, свой домен.

## Что делает
| Маршрут | Назначение |
| --- | --- |
| `GET /api/ingredient-audit` | проверка, что сервер на связи и ключ задан (`{"ok":true,"aiConfigured":true}`) |
| `POST /api/ingredient-audit` | действия `audit-text`, `audit-image`, `expiry`, `find-product` (все вызовы Gemini) |
| `POST /api/community-report` | отчёт «не халяль» / «подтвердить халяль» с фото (MongoDB, ждёт модерации) |
| `GET /api/community-status?barcode=` | статус по подтверждённым модератором отчётам |
| `GET /api/admin/reports?status=pending` | список отчётов для модератора (`Authorization: Bearer <ADMIN_TOKEN>`) |
| `GET/POST /api/admin/reports/<id>` | фото отчёта / решение `{"decision":"approve"|"reject"}` |

Ключ Gemini читается только из `process.env.GEMINI_API_KEY` и уходит только заголовком `x-goog-api-key`.

## Запуск и проверки
```bash
cd safa-api
npm install
cp .env.example .env.local   # заполнить локально (файл игнорируется git)
npm run dev                  # http://localhost:3001
npm test                     # 43 теста на node:test, без сети и без ключей
npm run build
```

## Развёртывание на Vercel (отдельный проект)
1. Vercel → Add New → Project → выбрать репозиторий `borz-007/smartlid-site`.
2. **Project Name**: `safa-api` (адрес по умолчанию `https://safa-api.vercel.app`, если имя свободно).
3. **Root Directory**: `safa-api`. Framework Preset: Next.js (определится сам), остальное по умолчанию.
4. Environment Variables (Production и Preview): `GEMINI_API_KEY`, `MONGO_URL`, `DB_NAME` (содержит «safa»), `ADMIN_TOKEN`;
   по желанию `GEMINI_MODEL`, `GEMINI_FALLBACK_MODEL`, `AI_DEBUG_ERRORS`, `REPORT_SALT`. Имена — в `.env.example`.
5. Deploy. Проверка: `<адрес>/api/ingredient-audit` должен вернуть `{"ok":true,"aiConfigured":true}`.

## Изоляция
- База: отдельная база MongoDB (рекомендуется отдельный пользователь с доступом только к ней). Сервер не подключится,
  если `DB_NAME` не содержит «safa» (страховка от случайного использования базы сайта).
- Переменные сайта в этот проект не копируются; ключ Gemini хранится только здесь.
- Мобильное приложение знает лишь публичный адрес (`API_BASE_URL` в GitHub Variables) и не содержит ключей.
