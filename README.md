# Telegram Study Schedule v4

## Что внутри
- Mini App: только расписание.
- Бот: напоминания и админские сообщения.
- Учебные дни: вторник–суббота.
- Понедельник и воскресенье — выходные.
- Нечётная/чётная неделя — по номеру ISO-недели.
- 1 полугодие: сентябрь–декабрь 2026.
- 2 полугодие: январь–июнь 2027.
- Пары: 08:15, 10:00, 11:45, 13:15, 15:15.
- Напоминание: за 10 минут.
- Рейтинг и таблица лидеров полностью удалены.

## Админ
ADMIN_TELEGRAM_ID и VITE_ADMIN_TELEGRAM_ID = 831036378.
Админ в Mini App может менять любой день.
Кнопка «Заполнить» позволяет отдельно заполнить шаблон нечётной и чётной недели: 5 учебных дней подряд, затем шаблон применяется ко всем соответствующим неделям полугодия. После этого нажми «Сохранить».

## Vercel env
- BOT_TOKEN
- ADMIN_TELEGRAM_ID = 831036378
- SUPABASE_URL
- SUPABASE_SERVICE_ROLE_KEY
- VITE_ADMIN_TELEGRAM_ID = 831036378
- MINI_APP_URL = публичный URL Mini App

## Supabase
1. Выполни `supabase.sql` в SQL Editor.
2. В блоке Vault замени `YOUR_BOT_TOKEN` на токен бота.
3. SQL создаёт таблицу расписания, таблицу подписок и минутный Cron для напоминаний.

Для минутного расписания использован Supabase Cron/pg_net: Supabase поддерживает cron-задачи с минутной точностью и HTTP-вызовы через pg_net.

## Telegram webhook
После деплоя выставь webhook:
`https://api.telegram.org/bot<BOT_TOKEN>/setWebhook?url=<PUBLIC_URL>/api/bot`

В BotFather укажи `MINI_APP_URL` как Main Mini App / Menu Button URL.

## Команды бота
/start — меню.
/notifications — настройки напоминаний.
/admin — админская подсказка.
/broadcast текст — только ADMIN_TELEGRAM_ID, отправка сообщения всем пользователям с включёнными уведомлениями.
