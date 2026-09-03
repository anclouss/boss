import type { VercelRequest, VercelResponse } from "@vercel/node";

const TOKEN = process.env.BOT_TOKEN || "";
const ADMIN = String(process.env.ADMIN_TELEGRAM_ID || "");
const APP_URL = process.env.MINI_APP_URL || "";
const SB_URL = process.env.SUPABASE_URL || "";
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

async function tg(method: string, body: any) {
  if (!TOKEN) throw new Error("BOT_TOKEN is missing");
  const r = await fetch(`https://api.telegram.org/bot${TOKEN}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await r.json();
  if (!data.ok) throw new Error(data.description || "Telegram API error");
  return data;
}

async function db(path: string, init: RequestInit = {}) {
  if (!SB_URL || !SB_KEY) throw new Error("Supabase is not configured");
  const r = await fetch(`${SB_URL}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: SB_KEY,
      Authorization: `Bearer ${SB_KEY}`,
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });
  if (!r.ok) throw new Error(await r.text());
  return r.status === 204 ? null : r.json();
}

function menu(enabled: boolean) {
  return {
    inline_keyboard: [
      [{ text: "📅 Открыть расписание", web_app: { url: APP_URL } }],
      [{ text: enabled ? "🔔 Напоминания: ВКЛ" : "🔕 Напоминания: ВЫКЛ", callback_data: "toggle_notifications" }],
    ],
  };
}

async function ensureUser(uid: string, chatId: number) {
  await db("notification_users", {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify({ telegram_user_id: uid, chat_id: chatId }),
  });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(200).json({ ok: true });
  try {
    const update = req.body || {};
    const msg = update.message;
    const cb = update.callback_query;

    if (cb) {
      const uid = String(cb.from?.id || "");
      if (cb.data === "toggle_notifications") {
        const rows = await db(`notification_users?select=enabled&telegram_user_id=eq.${encodeURIComponent(uid)}`);
        const current = rows[0]?.enabled !== false;
        const next = !current;
        await ensureUser(uid, Number(cb.message.chat.id));
        await db(`notification_users?telegram_user_id=eq.${encodeURIComponent(uid)}`, {
          method: "PATCH",
          body: JSON.stringify({ enabled: next, chat_id: Number(cb.message.chat.id), updated_at: new Date().toISOString() }),
        });
        await tg("answerCallbackQuery", {
          callback_query_id: cb.id,
          text: next ? "Напоминания включены" : "Напоминания выключены",
        });
        await tg("editMessageReplyMarkup", {
          chat_id: cb.message.chat.id,
          message_id: cb.message.message_id,
          reply_markup: menu(next),
        });
      }
      return res.status(200).json({ ok: true });
    }

    if (!msg?.chat?.id) return res.status(200).json({ ok: true });
    const uid = String(msg.from?.id || msg.chat.id);
    const text = String(msg.text || "").trim();

    if (text === "/start" || text.startsWith("/start ")) {
      await ensureUser(uid, Number(msg.chat.id));
      const rows = await db(`notification_users?select=enabled&telegram_user_id=eq.${encodeURIComponent(uid)}`);
      const enabled = rows[0]?.enabled !== false;
      await tg("sendMessage", {
        chat_id: msg.chat.id,
        text: "👋 Привет!\n\nЗдесь можно открыть расписание и включить/выключить напоминания за 10 минут до пары.",
        reply_markup: menu(enabled),
      });
      return res.status(200).json({ ok: true });
    }

    if (text === "/notifications") {
      await ensureUser(uid, Number(msg.chat.id));
      const rows = await db(`notification_users?select=enabled&telegram_user_id=eq.${encodeURIComponent(uid)}`);
      await tg("sendMessage", {
        chat_id: msg.chat.id,
        text: "🔔 Настройки напоминаний",
        reply_markup: menu(rows[0]?.enabled !== false),
      });
      return res.status(200).json({ ok: true });
    }

    if (text.startsWith("/broadcast") && uid === ADMIN) {
      const body = text.replace(/^\/broadcast\s*/i, "").trim();
      if (!body) {
        await tg("sendMessage", { chat_id: msg.chat.id, text: "Использование: /broadcast текст" });
        return res.status(200).json({ ok: true });
      }
      const users = await db("notification_users?select=chat_id&enabled=eq.true");
      let sent = 0;
      for (const u of users) {
        try { await tg("sendMessage", { chat_id: u.chat_id, text: `📢 ${body}` }); sent++; } catch {}
      }
      await tg("sendMessage", { chat_id: msg.chat.id, text: `Готово. Отправлено: ${sent}` });
      return res.status(200).json({ ok: true });
    }

    if (text === "/admin" && uid === ADMIN) {
      await tg("sendMessage", {
        chat_id: msg.chat.id,
        text: "🛠 Админ\n\n/broadcast текст — объявление всем пользователям с включёнными уведомлениями.",
      });
      return res.status(200).json({ ok: true });
    }

    await ensureUser(uid, Number(msg.chat.id));
    await tg("sendMessage", { chat_id: msg.chat.id, text: "Используй кнопки ниже.", reply_markup: menu(true) });
    return res.status(200).json({ ok: true });
  } catch (e: any) {
    console.error(e);
    return res.status(200).json({ ok: false, error: e?.message || "BOT_ERROR" });
  }
}
