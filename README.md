# Telegram Mini App v2

## Изменения
- Никаких полей для username, ссылок или ввода Telegram-профиля.
- Рейтинг остаётся ручным: 8 ползунков → 1–9000 PTS → Dota 2 medal.
- Расписание теперь **общее для всех пользователей**: оно хранится в Supabase, а не в localStorage.
- Только администратор может добавлять, удалять, отмечать и сохранять задачи.
- Администратор определяется по Telegram ID после серверной проверки `initData`.
- `initDataUnsafe` не используется для авторизации. Сервер проверяет подпись Telegram.

## Что нужно перед деплоем

В Vercel добавь:
- `BOT_TOKEN` — токен бота.
- `ADMIN_TELEGRAM_ID` — твой числовой Telegram ID.
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

Опционально для UI:
- `VITE_ADMIN_TELEGRAM_ID` — тот же ID, чтобы сразу показывать кнопку админки; реальная защита всё равно на сервере.

В Supabase SQL Editor выполни `supabase.sql`.

После этого:
1. `npm install`
2. `npm run build`
3. залить проект на Vercel
4. URL Vercel указать как URL Mini App у бота.

Telegram передаёт Mini App подписанные `initData`; сервер должен валидировать эти данные до использования user ID. Поэтому админка сделана через серверную проверку, а не через скрытый ID в JavaScript.
