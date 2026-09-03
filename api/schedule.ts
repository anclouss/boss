import type { VercelRequest, VercelResponse } from "@vercel/node";
import { validate } from "@tma.js/init-data-node";

const ADMIN_ID = String(process.env.ADMIN_TELEGRAM_ID || "");
const BOT_TOKEN = process.env.BOT_TOKEN || "";
const SB_URL = process.env.SUPABASE_URL || "";
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

const empty = () => ({ semesters: { first: { odd: {}, even: {} }, second: { odd: {}, even: {} } } });

function getUserId(req: VercelRequest) {
  const raw = String(req.headers["x-telegram-init-data"] || "");
  if (!raw) throw new Error("NO_INIT_DATA");
  validate(raw, BOT_TOKEN, { expiresIn: 86400 });
  const params = new URLSearchParams(raw);
  const user = JSON.parse(params.get("user") || "{}");
  if (!user.id) throw new Error("NO_USER");
  return String(user.id);
}

async function db(path: string, init: RequestInit = {}) {
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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (!SB_URL || !SB_KEY || !BOT_TOKEN) return res.status(500).json({ error: "SERVER_NOT_CONFIGURED" });
    const uid = getUserId(req);

    if (req.method === "GET") {
      const rows = await db("schedule?select=data,updated_at&id=eq.1");
      const data = rows[0]?.data;
      return res.status(200).json(data?.semesters ? data : empty());
    }

    if (req.method === "PUT") {
      if (uid !== ADMIN_ID) return res.status(403).json({ error: "ADMIN_ONLY" });
      const data = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
      if (!data?.semesters?.first || !data?.semesters?.second) return res.status(400).json({ error: "INVALID_SCHEDULE" });
      await db("schedule?id=eq.1", {
        method: "PATCH",
        headers: { Prefer: "return=minimal" },
        body: JSON.stringify({ data, updated_at: new Date().toISOString() }),
      });
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: "METHOD_NOT_ALLOWED" });
  } catch (e: any) {
    console.error(e);
    if (e?.message === "ADMIN_ONLY") return res.status(403).json({ error: e.message });
    return res.status(401).json({ error: e?.message || "UNAUTHORIZED" });
  }
}
