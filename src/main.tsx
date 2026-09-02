import React,{useEffect,useMemo,useState}from"react";
import{createRoot}from"react-dom/client";
import{CalendarDays,ChevronLeft,ChevronRight,Plus,RotateCcw,Trophy,X,ShieldCheck,Save}from"lucide-react";
import"./styles.css";

type Tab="schedule"|"rating";
type Task={id:string;text:string;done:boolean};
type Schedule=Record<string,Task[]>;
type Criterion={id:string;title:string;labels:string[];values:number[]};

const MEDALS=[
 {name:"Herald",min:1,max:769,src:"https://prosettings.net/wp-content/uploads/image-903-1168x193.webp"},
 {name:"Guardian",min:770,max:1539,src:"https://prosettings.net/wp-content/uploads/image-904-1169x194.webp"},
 {name:"Crusader",min:1540,max:2309,src:"https://prosettings.net/wp-content/uploads/image-905-1169x195.webp"},
 {name:"Archon",min:2310,max:3079,src:"https://prosettings.net/wp-content/uploads/image-906-1166x194.webp"},
 {name:"Legend",min:3080,max:3849,src:"https://prosettings.net/wp-content/uploads/image-907-1167x195.webp"},
 {name:"Ancient",min:3850,max:4619,src:"https://prosettings.net/wp-content/uploads/image-908-1166x192.webp"},
 {name:"Divine",min:4620,max:5419,src:"https://prosettings.net/wp-content/uploads/image-909-1166x194.webp"},
 {name:"Immortal",min:5420,max:9000,src:"https://prosettings.net/wp-content/uploads/image-910-1166x192.webp"}
];

const criteria:Criterion[]=[
{id:"stars",title:"Потраченные звезды",labels:["0","1–100","101–1k","1k–10k","50k+"],values:[100,75,50,25,0]},
{id:"tgk",title:"ТГК",labels:["0","1–2","3–5","6–10","10+"],values:[100,75,50,25,0]},
{id:"avatar",title:"Аватарки",labels:["отсутствие","аниме","смешанное","фото","баба"],values:[100,75,50,25,0]},
{id:"name",title:"Ник",labels:["уменьшительно-ласкательная форма","нейтральный","просто имя","обычный ник","точка"],values:[100,75,55,25,0]},
{id:"username",title:"Юзер",labels:["удар об клавиатуру","слово","нейтральный","короткий","qhqjqjquqqu"],values:[0,25,50,75,100]},
{id:"gifts",title:"Подарки",labels:["от всех подряд","много разных","смешанные","от подруг","скрыты все"],values:[0,25,50,75,100]},
{id:"hiddenGifts",title:"Скрытые подарки",labels:["100+","70+","50+","30+","20+"],values:[0,25,50,75,100]},
{id:"socials",title:"Другие соц. сети",labels:["открытый ВК","открытый профиль","смешанные","нет открытых","приватные аккаунты"],values:[0,25,50,75,100]}
];

const days=["Пн","Вт","Ср","Чт","Пт","Сб","Вс"];
const initial=()=>Object.fromEntries(criteria.map(c=>[c.id,Math.floor(c.labels.length/2)]));
const rank=(score:number)=>MEDALS.find(m=>score>=m.min&&score<=m.max)||MEDALS[7];

function App(){
 const tg=(window as any).Telegram?.WebApp;
 const [tab,setTab]=useState<Tab>("rating");
 const [ratings,setRatings]=useState<Record<string,number>>(()=>{try{return JSON.parse(localStorage.getItem("ratings")||"null")||initial()}catch{return initial()}});
 const [schedule,setSchedule]=useState<Schedule>({});
 const [day,setDay]=useState(new Date().getDay()===0?6:new Date().getDay()-1);
 const [task,setTask]=useState(""); const [adding,setAdding]=useState(false); const [loading,setLoading]=useState(false);
 const [admin,setAdmin]=useState(false); const [dirty,setDirty]=useState(false);
 useEffect(()=>{tg?.ready?.();tg?.expand?.();tg?.disableVerticalSwipes?.();},[]);
 const initData=tg?.initData||"";
 const score=useMemo(()=>Math.max(1,Math.min(9000,Math.round(criteria.reduce((s,c)=>s+(c.values[ratings[c.id]??0]||0),0)/criteria.length*90))),[ratings]);
 const r=rank(score);
 useEffect(()=>localStorage.setItem("ratings",JSON.stringify(ratings)),[ratings]);
 useEffect(()=>{(async()=>{try{setLoading(true);const res=await fetch("/api/schedule",{headers:{"X-Telegram-Init-Data":initData}});if(res.ok){setSchedule(await res.json())}}finally{setLoading(false)}})()},[initData]);
 useEffect(()=>{const user=tg?.initDataUnsafe?.user; if(user){/* server is source of truth; this is only UI hint */ setAdmin(String(user.id)===String((import.meta as any).env?.VITE_ADMIN_TELEGRAM_ID||""))}},[tg]);
 const update=(id:string,v:number)=>setRatings(x=>({...x,[id]:v}));
 const save=async()=>{setLoading(true);try{const res=await fetch("/api/schedule",{method:"PUT",headers:{"Content-Type":"application/json","X-Telegram-Init-Data":initData},body:JSON.stringify(schedule)});if(res.ok)setDirty(false);else alert("Нет доступа администратора")}finally{setLoading(false)}};
 const add=()=>{if(!task.trim())return;setSchedule(s=>({...s,[String(day)]:[...(s[String(day)]||[]),{id:crypto.randomUUID(),text:task.trim(),done:false}]}));setTask("");setAdding(false);setDirty(true)};
 const toggle=(id:string)=>{setSchedule(s=>({...s,[String(day)]: (s[String(day)]||[]).map(t=>t.id===id?{...t,done:!t.done}:t)}));setDirty(true)};
 const del=(id:string)=>{setSchedule(s=>({...s,[String(day)]: (s[String(day)]||[]).filter(t=>t.id!==id)}));setDirty(true)};
 return <div className="app">
  <header className="topbar"><div><div className="eyebrow">{tab==="rating"?"PROFILE ANALYTICS":"STUDY SCHEDULE"}</div><h1>{tab==="rating"?"Рейтинг профиля":"Расписание"}</h1></div>{admin&&<div className="admin-badge"><ShieldCheck size={15}/> ADMIN</div>}</header>
  <main>
   {tab==="rating"?<><section className="score-card"><div className="score-copy"><span className="muted">Итоговый рейтинг</span><strong>{score.toLocaleString("ru-RU")} <small>PTS</small></strong><span className="rank-caption">{r.name}</span></div><img className="medal" src={r.src}/></section>
    <div className="section-head"><div><h2>Анализ профиля</h2><p>Только ручные критерии — никаких юзеров и ссылок.</p></div><button className="icon-btn" onClick={()=>setRatings(initial())}><RotateCcw size={17}/></button></div>
    <div className="criteria">{criteria.map(c=>{const p=ratings[c.id]??0;return <div className="criterion" key={c.id}><div className="criterion-top"><span>{c.title}</span><b>{c.labels[p]}</b></div><input type="range" min="0" max={c.labels.length-1} value={p} onChange={e=>update(c.id,+e.target.value)} style={{"--pct":`${p/(c.labels.length-1)*100}%`} as React.CSSProperties}/><div className="range-labels"><span>{c.labels[0]}</span><span>{c.labels[Math.floor((c.labels.length-1)/2)]}</span><span>{c.labels[c.labels.length-1]}</span></div></div>})}</div>
    <p className="disclaimer">Субъективный игровой рейтинг профиля, а не объективная характеристика человека.</p>
   </>:<><section className="calendar-card"><div className="week-head"><button className="icon-btn" onClick={()=>setDay(d=>(d+6)%7)}><ChevronLeft size={18}/></button>{days.map((d,i)=><button className={`day ${day===i?"active":""}`} onClick={()=>setDay(i)} key={d}><span>{d}</span><b>{i+1}</b></button>)}<button className="icon-btn" onClick={()=>setDay(d=>(d+1)%7)}><ChevronRight size={18}/></button></div></section>
    <div className="section-head"><div><h2>{days[day]}</h2><p>{loading?"Загрузка…":`${(schedule[String(day)]||[]).filter(x=>!x.done).length} задач осталось`}</p></div>{admin&&<div className="admin-actions"><button className="add-btn" onClick={()=>setAdding(true)}><Plus size={17}/> Добавить</button>{dirty&&<button className="save-btn" onClick={save} disabled={loading}><Save size={16}/> Сохранить</button>}</div>}</div>
    <div className="tasks">{(schedule[String(day)]||[]).length===0?<div className="empty"><CalendarDays size={24}/><span>На этот день пока ничего нет</span></div>:(schedule[String(day)]||[]).map(t=><div className={`task ${t.done?"done":""}`} key={t.id}><button className="check" onClick={()=>admin&&toggle(t.id)}>{t.done?"✓":""}</button><span>{t.text}</span>{admin&&<button className="delete" onClick={()=>del(t.id)}><X size={15}/></button>}</div>)}</div>
   </>}
  </main>
  {adding&&<div className="modal-backdrop" onClick={()=>setAdding(false)}><div className="modal" onClick={e=>e.stopPropagation()}><div className="modal-title">Добавить в расписание</div><input autoFocus value={task} onChange={e=>setTask(e.target.value)} onKeyDown={e=>e.key==="Enter"&&add()} placeholder="Например: повторить анатомию"/><div className="modal-actions"><button className="secondary" onClick={()=>setAdding(false)}>Отмена</button><button className="primary" onClick={add}>Добавить</button></div></div></div>}
  <nav className="bottom-nav"><button className={tab==="schedule"?"selected":""} onClick={()=>setTab("schedule")}><CalendarDays size={21}/><span>Расписание</span></button><button className={tab==="rating"?"selected":""} onClick={()=>setTab("rating")}><Trophy size={21}/><span>Рейтинг</span></button></nav>
 </div>
}
createRoot(document.getElementById("root")!).render(<App/>);