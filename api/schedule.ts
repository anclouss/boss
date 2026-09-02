import type { VercelRequest, VercelResponse } from "@vercel/node";
import { validate } from "@tma.js/init-data-node";

const ADMIN_ID = String(process.env.ADMIN_TELEGRAM_ID || "");
const SB_URL = process.env.SUPABASE_URL || "";
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

function userId(req: VercelRequest){
  const raw = String(req.headers["x-telegram-init-data"] || "");
  if(!raw) throw new Error("NO_INIT_DATA");
  validate(raw, process.env.BOT_TOKEN || "", { expiresIn: 86400 });
  const params = new URLSearchParams(raw);
  const user = JSON.parse(params.get("user") || "{}");
  return String(user.id || "");
}
async function db(path:string, init:any={}){
  const r=await fetch(`${SB_URL}/rest/v1/${path}`,{
    ...init,headers:{"apikey":SB_KEY,"Authorization":`Bearer ${SB_KEY}`,"Content-Type":"application/json",...(init.headers||{})}
  });
  if(!r.ok) throw new Error(await r.text());
  return r.status===204?null:r.json();
}
export default async function handler(req:VercelRequest,res:VercelResponse){
  try{
    if(!SB_URL||!SB_KEY||!process.env.BOT_TOKEN) return res.status(500).json({error:"SERVER_NOT_CONFIGURED"});
    const id=userId(req);
    if(req.method==="GET"){
      const rows=await db("schedule?select=data,updated_at&id=eq.1");
      return res.status(200).json(rows[0]?.data || {});
    }
    if(req.method==="PUT"){
      if(!ADMIN_ID || id!==ADMIN_ID) return res.status(403).json({error:"ADMIN_ONLY"});
      const data=typeof req.body==="string"?JSON.parse(req.body):req.body;
      await db("schedule?id=eq.1",{method:"PATCH",body:JSON.stringify({data,updated_at:new Date().toISOString()})});
      return res.status(200).json({ok:true});
    }
    return res.status(405).end();
  }catch(e:any){ return res.status(e?.message==="ADMIN_ONLY"?403:401).json({error:e?.message||"UNAUTHORIZED"}); }
}