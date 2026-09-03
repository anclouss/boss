import React,{useEffect,useMemo,useState}from"react";
import{createRoot}from"react-dom/client";
import{CalendarDays,Edit3,Save,ShieldCheck,Plus,Trash2,X,Bell,Check,ChevronRight}from"lucide-react";
import"./styles.css";

type Parity="odd"|"even";
type Semester="first"|"second";
type Lesson={id:string;time:string;text:string;room?:string};
type Weekly=Record<Parity,Record<string,Lesson[]>>;
type Schedule={semesters:Record<Semester,Weekly>};

const DAYS=["Пн","Вт","Ср","Чт","Пт","Сб","Вс"];
const STUDY_DAYS=[2,3,4,5,6]; // Tue-Sat, JS day indexes
const TIMES=["08:15","10:00","11:45","13:15","15:15"];
const SEMESTERS=[
 {key:"first" as Semester,name:"1 полугодие",range:"Сентябрь — декабрь",months:[9,10,11,12]},
 {key:"second" as Semester,name:"2 полугодие",range:"Январь — июнь",months:[1,2,3,4,5,6]}
];
const emptyWeekly=():Weekly=>({odd:{},even:{}});
const emptySchedule=():Schedule=>({semesters:{first:emptyWeekly(),second:emptyWeekly()}});
const cloneLessons=(x:Lesson[])=>x.map(l=>({...l}));
function isoWeek(date:Date){const d=new Date(Date.UTC(date.getFullYear(),date.getMonth(),date.getDate()));const day=d.getUTCDay()||7;d.setUTCDate(d.getUTCDate()+4-day);const yearStart=new Date(Date.UTC(d.getUTCFullYear(),0,1));return Math.ceil((((d.getTime()-yearStart.getTime())/86400000)+1)/7)}
function parityFor(date:Date):Parity{return isoWeek(date)%2===0?"even":"odd"}
function semesterFor(month:number):Semester{return month>=9?"first":"second"}
function daysInMonth(year:number,month:number){return new Date(year,month,0).getDate()}
function defaultLesson(i:number):Lesson{return{id:crypto.randomUUID(),time:TIMES[i]||"",text:"",room:""}}

function App(){
 const tg=(window as any).Telegram?.WebApp;
 const initData=tg?.initData||"";
 const user=tg?.initDataUnsafe?.user;
 const [schedule,setSchedule]=useState<Schedule>(emptySchedule());
 const [semester,setSemester]=useState<Semester>(new Date().getMonth()+1>=9?"first":"second");
 const [month,setMonth]=useState<number>(new Date().getMonth()+1);
 const [selectedDay,setSelectedDay]=useState<number>(new Date().getDate());
 const [admin,setAdmin]=useState(false);
 const [loading,setLoading]=useState(false);
 const [dirty,setDirty]=useState(false);
 const [editing,setEditing]=useState(false);
 const [draft,setDraft]=useState<Lesson[]>([]);
 const [fillOpen,setFillOpen]=useState(false);
 const [fillParity,setFillParity]=useState<Parity>("odd");
 const [fillDay,setFillDay]=useState(2);
 const [fillDraft,setFillDraft]=useState<Lesson[]>([]);
 const [fillData,setFillData]=useState<Record<string,Lesson[]>>({});
 const [notice,setNotice]=useState("");
 const [viewParity,setViewParity]=useState<Parity>("odd");

 useEffect(()=>{tg?.ready?.();tg?.expand?.();tg?.disableVerticalSwipes?.()},[]);
 useEffect(()=>{if(user)setAdmin(String(user.id)===String((import.meta as any).env?.VITE_ADMIN_TELEGRAM_ID||"831036378"))},[user]);
 useEffect(()=>{(async()=>{try{setLoading(true);const r=await fetch("/api/schedule",{headers:{"X-Telegram-Init-Data":initData}});if(r.ok){const d=await r.json();if(d.semesters)setSchedule(d)} }catch{}finally{setLoading(false)}})()},[initData]);
 useEffect(()=>{setSemester(semesterFor(month));},[month]);
 const year=month>=9?2026:2027;
 const date=new Date(year,month-1,selectedDay);
 const jsDay=date.getDay();
 const actualParity=parityFor(date);
 const parity=viewParity;
 const week=isoWeek(date);
 const lessons=jsDay===0||jsDay===1?[]:(schedule.semesters[semester]?.[parity]?.[String(jsDay)]||[]);
 const monthName=new Intl.DateTimeFormat("ru-RU",{month:"long"}).format(date);
 const monthList=SEMESTERS.find(s=>s.key===semester)!.months;
 const saveSchedule=async(next=schedule)=>{setLoading(true);try{const r=await fetch("/api/schedule",{method:"PUT",headers:{"Content-Type":"application/json","X-Telegram-Init-Data":initData},body:JSON.stringify(next)});if(r.ok){setSchedule(next);setDirty(false);setNotice("Сохранено для всех пользователей")}else setNotice("Нет доступа администратора")}catch{setNotice("Ошибка сохранения")}finally{setLoading(false)}};
 const openEdit=()=>{setDraft(cloneLessons(lessons));setEditing(true)};
 const addLesson=()=>setDraft(d=>[...d,defaultLesson(d.length)]);
 const updateLesson=(id:string,key:keyof Lesson,value:string)=>setDraft(d=>d.map(x=>x.id===id?{...x,[key]:value}:x));
 const saveDay=()=>{const next=structuredClone(schedule);if(!next.semesters[semester])next.semesters[semester]=emptyWeekly();if(!next.semesters[semester][parity])next.semesters[semester][parity]={};next.semesters[semester][parity][String(jsDay)]=draft.filter(x=>x.text.trim());setSchedule(next);setEditing(false);setDirty(true)};
 const openFill=()=>{setFillParity("odd");setFillDay(2);setFillData({});setFillDraft([]);setFillOpen(true);loadFillDay("odd",2,{})};
 const fillDays=[2,3,4,5,6];
 const fillDayName=DAYS[fillDay-1];
 const loadFillDay=(p:Parity,d:number,data=fillData)=>setFillDraft(cloneLessons(data[String(d)]||schedule.semesters[semester]?.[p]?.[String(d)]||[]));
 const startFill=(p:Parity)=>{setFillParity(p);setFillDay(2);setFillData({});loadFillDay(p,2,{});};
 const saveFillDay=()=>{const next={...fillData,[String(fillDay)]:fillDraft.filter(x=>x.text.trim())};setFillData(next);const idx=fillDays.indexOf(fillDay);if(idx<fillDays.length-1){const nd=fillDays[idx+1];setFillDay(nd);loadFillDay(fillParity,nd,next)}return next};
 const applyFilled=async(data=fillData)=>{const next=structuredClone(schedule);next.semesters[semester][fillParity]={...next.semesters[semester][fillParity],...Object.fromEntries(Object.entries(data).map(([k,v])=>[k,cloneLessons(v)]))};setFillOpen(false);await saveSchedule(next)};
 const currentSemester=SEMESTERS.find(s=>s.key===semester)!;
 const monthsWithDates=monthList.map(m=>({m,year:m>=9?2026:2027}));
 const dateButtons=Array.from({length:daysInMonth(year,month)},(_,i)=>i+1).filter(d=>{const wd=new Date(year,month-1,d).getDay();return STUDY_DAYS.includes(wd)});
 return <div className="app">
  <header className="topbar"><div><div className="eyebrow">STUDY SCHEDULE</div><h1>Расписание</h1></div>{admin&&<div className="admin-badge"><ShieldCheck size={15}/> ADMIN</div>}</header>
  <main>
   <div className="semester-tabs">{SEMESTERS.map(s=><button key={s.key} className={semester===s.key?"selected":""} onClick={()=>{setSemester(s.key);setMonth(s.months[0]);setSelectedDay(1)}}><b>{s.name}</b><small>{s.range}</small></button>)}</div>
   <section className="info-card"><div><b>{currentSemester.name}</b><span>{currentSemester.range}</span></div>{admin&&<button className="fill-btn" onClick={openFill}><Plus size={16}/> Заполнить</button>}</section>
   <div className="month-tabs">{monthsWithDates.map(x=><button key={x.m} className={month===x.m?"selected":""} onClick={()=>{setMonth(x.m);setSelectedDay(1)}}>{new Intl.DateTimeFormat("ru-RU",{month:"short"}).format(new Date(x.year,x.m-1,1))}</button>)}</div>
   <div className="parity-tabs"><button className={viewParity==="odd"?"selected":""} onClick={()=>setViewParity("odd")}>Нечётная неделя</button><button className={viewParity==="even"?"selected":""} onClick={()=>setViewParity("even")}>Чётная неделя</button></div>
   <section className="calendar-card"><div className="calendar-title"><span>{monthName} {year}</span><span>{loading?"Загрузка…":"Вт–Сб"}</span></div><div className="date-grid">{dateButtons.map(d=>{const dt=new Date(year,month-1,d);const wd=dt.getDay();return <button className={`date-btn ${selectedDay===d?"selected":""}`} key={d} onClick={()=>setSelectedDay(d)}><small>{DAYS[wd]}</small><b>{d}</b></button>})}</div></section>
   <div className="section-head"><div><h2>{selectedDay} {monthName}</h2><p>{jsDay===0||jsDay===1?"Выходной":`${parity==="odd"?"Нечётная":"Чётная"} неделя · ${lessons.length} занятий`}</p></div>{admin&&<div className="admin-actions"><button className="add-btn" onClick={openEdit}><Edit3 size={16}/> Изменить</button>{dirty&&<button className="save-btn" onClick={()=>saveSchedule()}><Save size={16}/> Сохранить</button>}</div>}</div>
   <div className="tasks">{jsDay===0||jsDay===1?<div className="empty"><CalendarDays size={24}/><span>Выходной</span></div>:lessons.length===0?<div className="empty"><CalendarDays size={24}/><span>Занятий пока нет</span>{admin&&<button className="add-btn" onClick={openEdit}><Plus size={16}/> Заполнить день</button>}</div>:lessons.map((l,i)=><div className="lesson" key={l.id}><div className="lesson-num">{i+1}</div><div className="lesson-main"><b>{l.time||TIMES[i]||"Время не указано"}</b><span>{l.text}</span>{l.room&&<small>{l.room}</small>}</div></div>)}</div>
   <div className="notice"><Bell size={16}/><span>Напоминания за 10 минут до пары настраиваются в боте.</span></div>
   <p className="disclaimer">Учебные дни: вторник–суббота. Понедельник и воскресенье — выходные. Расписание общее для всех.</p>
  </main>
  {notice&&<div className="toast" onClick={()=>setNotice("")}>{notice}<X size={16}/></div>}
  {editing&&<div className="modal-backdrop"><div className="modal"><div className="modal-title">{selectedDay} {monthName} · {parity==="odd"?"нечётная":"чётная"} неделя</div><div className="editor-list">{draft.map((l,i)=><div className="editor-row" key={l.id}><span>{i+1}</span><select value={l.time} onChange={e=>updateLesson(l.id,"time",e.target.value)}><option value="">Время</option>{TIMES.map(t=><option key={t}>{t}</option>)}</select><input value={l.text} onChange={e=>updateLesson(l.id,"text",e.target.value)} placeholder="Предмет / занятие"/><input value={l.room||""} onChange={e=>updateLesson(l.id,"room",e.target.value)} placeholder="Каб."/><button onClick={()=>setDraft(d=>d.filter(x=>x.id!==l.id))}><Trash2 size={15}/></button></div>)}</div><button className="add-full" onClick={addLesson}><Plus size={16}/> Добавить занятие</button><div className="modal-actions"><button className="secondary" onClick={()=>setEditing(false)}>Отмена</button><button className="primary" onClick={saveDay}>Применить</button></div><button className="clear-day" onClick={()=>setDraft([])}>Очистить день</button></div></div>}
  {fillOpen&&<div className="modal-backdrop"><div className="modal fill-modal"><div className="modal-title">Заполнение · {currentSemester.name}</div><div className="fill-switch"><button className={fillParity==="odd"?"selected":""} onClick={()=>startFill("odd")}>Нечётная неделя</button><button className={fillParity==="even"?"selected":""} onClick={()=>startFill("even")}>Чётная неделя</button></div><div className="wizard"><div className="wizard-top"><span>День {fillDays.indexOf(fillDay)+1} из 5</span><b>{fillDayName}</b></div><div className="editor-list">{fillDraft.map((l,i)=><div className="editor-row" key={l.id}><span>{i+1}</span><select value={l.time} onChange={e=>updateLesson(l.id,"time",e.target.value)}><option value="">Время</option>{TIMES.map(t=><option key={t}>{t}</option>)}</select><input value={l.text} onChange={e=>setFillDraft(d=>d.map(x=>x.id===l.id?{...x,text:e.target.value}:x))} placeholder="Предмет / занятие"/><input value={l.room||""} onChange={e=>setFillDraft(d=>d.map(x=>x.id===l.id?{...x,room:e.target.value}:x))} placeholder="Каб."/><button onClick={()=>setFillDraft(d=>d.filter(x=>x.id!==l.id))}><Trash2 size={15}/></button></div>)}</div><button className="add-full" onClick={()=>setFillDraft(d=>[...d,defaultLesson(d.length)])}><Plus size={16}/> Добавить занятие</button><div className="modal-actions"><button className="secondary" onClick={()=>setFillOpen(false)}>Закрыть</button>{fillDays.indexOf(fillDay)<fillDays.length-1?<button className="primary" onClick={saveFillDay}>Сохранить день <ChevronRight size={16}/></button>:<button className="primary" onClick={()=>{const data=saveFillDay();applyFilled(data)}}><Check size={16}/> Готово</button>}</div><p className="fill-hint">После заполнения 5 дней шаблон применяется ко всем соответствующим неделям этого полугодия. Нечётную и чётную неделю заполняй отдельно.</p></div></div></div>}
 </div>
}
createRoot(document.getElementById("root")!).render(<App/>);
