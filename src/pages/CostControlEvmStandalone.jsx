import { useState, useMemo, useRef, useCallback, createContext, useContext, useEffect } from "react";
import { Link } from "react-router-dom";
import * as XLSX from "xlsx";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  BarChart, Bar, LineChart, Line, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, ComposedChart, ReferenceLine, Cell, ScatterChart, Scatter, ZAxis
} from "recharts";

// ═══════════════════════════════ CONSTANTS ═══════════════════════════════
const DISCIPLINES = ["GENERAL","CIVIL","MECHANICAL","ELECTRICAL","ARCHITECTURAL"];
const DC = { GENERAL:"#6366f1",CIVIL:"#0ea5e9",MECHANICAL:"#f59e0b",ELECTRICAL:"#10b981",ARCHITECTURAL:"#ec4899" };
const MN = ["يناير","فبراير","مارس","أبريل","مايو","يونيو","يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"];

const INIT_ACTS = [
  {id:"GEN-001",nameAr:"أعمال عامة",            disc:"GENERAL",      items:64,bac:58900000,ac:26400000,pct:44},
  {id:"GEN-002",nameAr:"أعمال الحديد",           disc:"GENERAL",      items:1, bac:2500000, ac:0,        pct:0},
  {id:"GEN-003",nameAr:"رواتب الموظفين",         disc:"GENERAL",      items:12,bac:18000000,ac:9800000, pct:55},
  {id:"GEN-004",nameAr:"المصاريف العامة",        disc:"GENERAL",      items:8, bac:6200000, ac:3100000, pct:50},
  {id:"GEN-005",nameAr:"السلامة والبيئة",        disc:"GENERAL",      items:5, bac:3400000, ac:1800000, pct:53},
  {id:"GEN-006",nameAr:"مراقبة الجودة",          disc:"GENERAL",      items:6, bac:4100000, ac:2100000, pct:51},
  {id:"GEN-007",nameAr:"النقل والمواصلات",       disc:"GENERAL",      items:4, bac:2800000, ac:1400000, pct:50},
  {id:"GEN-008",nameAr:"المنشآت المؤقتة",       disc:"GENERAL",      items:7, bac:5600000, ac:3900000, pct:70},
  {id:"GEN-009",nameAr:"التأمينات",              disc:"GENERAL",      items:3, bac:1200000, ac:800000,  pct:67},
  {id:"GEN-010",nameAr:"السقالات",               disc:"GENERAL",      items:5, bac:3800000, ac:1200000, pct:32},
  {id:"CIV-001",nameAr:"أعمال الحفر والردم",    disc:"CIVIL",        items:15,bac:12200000,ac:4000000, pct:32},
  {id:"CIV-002",nameAr:"أعمال الخرسانة",        disc:"CIVIL",        items:3, bac:556700,  ac:113000,  pct:20},
  {id:"CIV-003",nameAr:"أعمال الطرق والأرصفة", disc:"CIVIL",        items:12,bac:28000000,ac:5600000, pct:20},
  {id:"CIV-004",nameAr:"شبكات الصرف الصحي",    disc:"CIVIL",        items:22,bac:45000000,ac:22000000,pct:49},
  {id:"CIV-005",nameAr:"شبكات مياه الأمطار",   disc:"CIVIL",        items:18,bac:38000000,ac:18500000,pct:49},
  {id:"CIV-006",nameAr:"أعمال البنية التحتية", disc:"CIVIL",        items:9, bac:15000000,ac:4200000, pct:28},
  {id:"CIV-007",nameAr:"أعمال الجسور",          disc:"CIVIL",        items:6, bac:22000000,ac:3300000, pct:15},
  {id:"CIV-008",nameAr:"الحواجز والأسوار",      disc:"CIVIL",        items:8, bac:9500000, ac:4300000, pct:45},
  {id:"MEC-001",nameAr:"أعمال السباكة",         disc:"MECHANICAL",   items:4, bac:17000,   ac:2600,    pct:15},
  {id:"MEC-002",nameAr:"أعمال التكييف",         disc:"MECHANICAL",   items:8, bac:12000000,ac:1800000, pct:15},
  {id:"MEC-003",nameAr:"أعمال الأنابيب",        disc:"MECHANICAL",   items:14,bac:18500000,ac:4200000, pct:23},
  {id:"MEC-004",nameAr:"المضخات والمعدات",      disc:"MECHANICAL",   items:6, bac:8200000, ac:1600000, pct:20},
  {id:"MEC-005",nameAr:"محطات الضخ",            disc:"MECHANICAL",   items:3, bac:14000000,ac:3500000, pct:25},
  {id:"ELE-001",nameAr:"أعمال الكهرباء",        disc:"ELECTRICAL",   items:8, bac:958500,  ac:218900,  pct:23},
  {id:"ELE-002",nameAr:"الإنارة الخارجية",      disc:"ELECTRICAL",   items:16,bac:22000000,ac:5500000, pct:25},
  {id:"ELE-003",nameAr:"لوحات التوزيع",         disc:"ELECTRICAL",   items:5, bac:8500000, ac:1700000, pct:20},
  {id:"ELE-004",nameAr:"كابلات وأسلاك",        disc:"ELECTRICAL",   items:12,bac:14000000,ac:2100000, pct:15},
  {id:"ELE-005",nameAr:"الطاقة الشمسية",        disc:"ELECTRICAL",   items:4, bac:6000000, ac:600000,  pct:10},
  {id:"ARC-001",nameAr:"أعمال التشطيبات",      disc:"ARCHITECTURAL", items:18,bac:25000000,ac:3000000, pct:12},
  {id:"ARC-002",nameAr:"البلاط والسيراميك",    disc:"ARCHITECTURAL", items:10,bac:12000000,ac:1800000, pct:15},
  {id:"ARC-003",nameAr:"أعمال الدهانات",        disc:"ARCHITECTURAL", items:8, bac:8500000, ac:1700000, pct:20},
  {id:"ARC-004",nameAr:"الأبواب والنوافذ",     disc:"ARCHITECTURAL", items:12,bac:15000000,ac:600000,  pct:4},
  {id:"ARC-005",nameAr:"أعمال الحدائق والري",  disc:"ARCHITECTURAL", items:7, bac:9500000, ac:500000,  pct:5},
];

const CUM=[
  {pv:18,ev:14,ac:20},{pv:42,ev:35,ac:40},{pv:78,ev:65,ac:85},{pv:118,ev:92,ac:100},
  {pv:155,ev:118,ac:125},{pv:188,ev:140,ac:145},{pv:218,ev:158,ac:157},{pv:245,ev:168,ac:163},
  {pv:268,ev:175,ac:168},{pv:290,ev:180,ac:174},{pv:312,ev:184,ac:183},{pv:332,ev:186,ac:190},
];
const INIT_CF=CUM.map((s,i)=>({
  id:i,month:"M"+(i+1),label:MN[i]+" 2025",
  pvM:i===0?s.pv:+(s.pv-CUM[i-1].pv).toFixed(1),
  acM:i===0?s.ac:+(s.ac-CUM[i-1].ac).toFixed(1),
  evM:i===0?s.ev:+(s.ev-CUM[i-1].ev).toFixed(1),
  isForecast:false,
}));

const INIT_RISKS=[
  {id:"R001",title:"تأخر توريد الأنابيب",category:"توريد",prob:4,impact:4,mitigation:"تعاقد مبكر مع موردين بديلين",status:"مفتوح",owner:"مدير المشتريات",cost:500000},
  {id:"R002",title:"ارتفاع أسعار الخرسانة",category:"تكلفة",prob:3,impact:3,mitigation:"قفل الأسعار في العقود المبكرة",status:"مفتوح",owner:"مدير التكلفة",cost:300000},
  {id:"R003",title:"تأخر الموافقات الحكومية",category:"تنظيمي",prob:3,impact:5,mitigation:"التواصل المستمر مع الجهات المختصة",status:"مفتوح",owner:"مدير المشروع",cost:800000},
  {id:"R004",nameAr:"نقص العمالة المؤهلة",category:"موارد",prob:2,impact:3,mitigation:"خطة استقطاب بديلة مع شركاء محليين",status:"مغلق",owner:"مدير الموارد البشرية",cost:0,title:"نقص العمالة المؤهلة"},
  {id:"R005",title:"عدم استقرار التربة",category:"جيوتقني",prob:2,impact:5,mitigation:"دراسات تربة إضافية في المناطق الحرجة",status:"مفتوح",owner:"المهندس المدني",cost:250000},
  {id:"R006",title:"تضارب المواصفات",category:"هندسي",prob:3,impact:4,mitigation:"مراجعة شاملة للوثائق قبل البدء",status:"مفتوح",owner:"المهندس المصمم",cost:150000},
];

const INIT_ISSUES=[
  {id:"I001",title:"تأخر تسليم خطوط الكهرباء",disc:"ELECTRICAL",priority:"عالية",status:"مفتوح",date:"2025-03-15",impact:"تأخر 3 أسابيع في المنطقة الشمالية",cost:180000,owner:"مهندس كهرباء"},
  {id:"I002",title:"تلف في الأنابيب المستلمة",disc:"CIVIL",priority:"متوسطة",status:"قيد المعالجة",date:"2025-04-02",impact:"إعادة طلب 200م أنابيب",cost:95000,owner:"مدير المخازن"},
  {id:"I003",title:"تعارض في التصميم المعماري",disc:"ARCHITECTURAL",priority:"عالية",status:"مغلق",date:"2025-02-20",impact:"تعديل مخططات 3 مناطق",cost:50000,owner:"مهندس معماري"},
  {id:"I004",title:"نقص في فرق الحفر",disc:"CIVIL",priority:"متوسطة",status:"مفتوح",date:"2025-04-10",impact:"تباطؤ الإنجاز 15%",cost:0,owner:"مدير الموقع"},
];

const INIT_RESOURCES = [
  // Labor
  {id:"L001",name:"أحمد محمد السالم",   role:"مدير المشروع",       disc:"GENERAL",      type:"labor",   planQty:1, actQty:1, unitCost:18000,planDays:30,actDays:30,unit:"شهر"},
  {id:"L002",name:"خالد عبدالله",         role:"مهندس مدني أول",     disc:"CIVIL",        type:"labor",   planQty:2, actQty:2, unitCost:12000,planDays:30,actDays:28,unit:"شهر"},
  {id:"L003",name:"سعد الحربي",           role:"مهندس ميكانيكا",     disc:"MECHANICAL",   type:"labor",   planQty:1, actQty:1, unitCost:11000,planDays:30,actDays:25,unit:"شهر"},
  {id:"L004",name:"فهد العتيبي",          role:"مهندس كهرباء",       disc:"ELECTRICAL",   type:"labor",   planQty:1, actQty:1, unitCost:11000,planDays:30,actDays:22,unit:"شهر"},
  {id:"L005",name:"محمد الزهراني",        role:"مهندس معماري",       disc:"ARCHITECTURAL",type:"labor",   planQty:1, actQty:0, unitCost:10000,planDays:30,actDays:0, unit:"شهر"},
  {id:"L006",name:"عمال الحفر والردم",    role:"عمالة عامة",          disc:"CIVIL",        type:"labor",   planQty:30,actQty:22,unitCost:180,  planDays:26,actDays:26,unit:"يوم"},
  {id:"L007",name:"فريق السباكة",         role:"عمالة متخصصة",       disc:"MECHANICAL",   type:"labor",   planQty:8, actQty:5, unitCost:250,  planDays:26,actDays:20,unit:"يوم"},
  {id:"L008",name:"فريق الكهرباء",        role:"عمالة متخصصة",       disc:"ELECTRICAL",   type:"labor",   planQty:6, actQty:4, unitCost:280,  planDays:26,actDays:18,unit:"يوم"},
  {id:"L009",name:"فريق التشطيبات",       role:"عمالة متخصصة",       disc:"ARCHITECTURAL",type:"labor",   planQty:12,actQty:6, unitCost:220,  planDays:26,actDays:10,unit:"يوم"},
  {id:"L010",name:"مشرفو الجودة",         role:"إشراف",               disc:"GENERAL",      type:"labor",   planQty:3, actQty:3, unitCost:8000, planDays:30,actDays:30,unit:"شهر"},
  // Equipment
  {id:"E001",name:"حفارة هيدروليكية كبيرة",role:"معدات حفر",          disc:"CIVIL",        type:"equip",  planQty:2, actQty:2, unitCost:1800, planDays:22,actDays:20,unit:"يوم"},
  {id:"E002",name:"لودر (شيول)",          role:"معدات نقل",           disc:"CIVIL",        type:"equip",  planQty:2, actQty:2, unitCost:1200, planDays:22,actDays:22,unit:"يوم"},
  {id:"E003",name:"خلاطة خرسانة",         role:"معدات خرسانة",       disc:"CIVIL",        type:"equip",  planQty:1, actQty:1, unitCost:900,  planDays:15,actDays:10,unit:"يوم"},
  {id:"E004",name:"رافعة برجية",          role:"رفع ونقل",            disc:"CIVIL",        type:"equip",  planQty:1, actQty:0, unitCost:3500, planDays:10,actDays:0, unit:"يوم"},
  {id:"E005",name:"مولد كهربائي 400KVA",  role:"طاقة كهربائية",       disc:"ELECTRICAL",   type:"equip",  planQty:2, actQty:2, unitCost:650,  planDays:30,actDays:30,unit:"يوم"},
  {id:"E006",name:"مضخات مياه",           role:"ضخ وصرف",            disc:"MECHANICAL",   type:"equip",  planQty:3, actQty:2, unitCost:400,  planDays:20,actDays:15,unit:"يوم"},
  // Materials
  {id:"M001",name:"أنابيب GRP ⌀600mm",   role:"مواد مدنية",          disc:"CIVIL",        type:"material",planQty:1200,actQty:480,unitCost:850, planDays:1,actDays:1,unit:"م.ط"},
  {id:"M002",name:"أنابيب UPVC ⌀200mm",  role:"مواد مدنية",          disc:"CIVIL",        type:"material",planQty:3000,actQty:1800,unitCost:120,planDays:1,actDays:1,unit:"م.ط"},
  {id:"M003",name:"خرسانة جاهزة C30",    role:"مواد إنشائية",        disc:"CIVIL",        type:"material",planQty:800, actQty:200, unitCost:380, planDays:1,actDays:1,unit:"م³"},
  {id:"M004",name:"كابلات كهربائية",      role:"مواد كهربائية",       disc:"ELECTRICAL",   type:"material",planQty:5000,actQty:1200,unitCost:45,  planDays:1,actDays:1,unit:"م.ط"},
];

// ═══════════════════════════════ HELPERS ═══════════════════════════════
const fmt=(n,d=1)=>{if(n===null||n===undefined||isNaN(n))return"—";const a=Math.abs(n);if(a>=1e9)return(n/1e9).toFixed(d)+"B";if(a>=1e6)return(n/1e6).toFixed(d)+"M";if(a>=1e3)return(n/1e3).toFixed(d)+"K";return n.toFixed(0)};
const fmtSAR=n=>n?new Intl.NumberFormat("ar-SA").format(Math.round(n)):"0";
const fmtM=v=>(+v||0).toFixed(1)+"M";
const sColor=v=>v>=1?"#10b981":v>=0.9?"#f59e0b":"#ef4444";
const sBg=v=>v>=1?"#d1fae5":v>=0.9?"#fef3c7":"#fee2e2";
const rColor=s=>s>=16?"#ef4444":s>=9?"#f59e0b":s>=4?"#6366f1":"#10b981";
const rLabel=s=>s>=16?"عالي جداً":s>=9?"عالي":s>=4?"متوسط":"منخفض";

const calcEVM=acts=>{
  if(!acts||!acts.length)return{bac:0,pv:0,ev:0,ac:0,SV:0,CV:0,SPI:0,CPI:0,EAC:0,EAC_pert:0,ETC:0,TCPI:0,prog:0};
  const bac=acts.reduce((s,a)=>s+a.bac,0);
  const pv=acts.reduce((s,a)=>s+(a.bac*(a.pct/100)*1.12+a.bac*0.018),0);
  const ev=acts.reduce((s,a)=>s+a.bac*(a.pct/100),0);
  const ac=acts.reduce((s,a)=>s+a.ac,0);
  const SV=ev-pv,CV=ev-ac,SPI=pv>0?ev/pv:0,CPI=ac>0?ev/ac:0;
  const EAC=CPI>0?bac/CPI:bac,EAC_pert=ac+(bac-ev)/(CPI>0?CPI:1),ETC=Math.max(0,EAC-ac);
  const TCPI=(bac-ev)>0&&(bac-ac)>0?(bac-ev)/(bac-ac):0,prog=bac>0?(ev/bac)*100:0;
  return{bac,pv,ev,ac,SV,CV,SPI,CPI,EAC,EAC_pert,ETC,TCPI,prog};
};
const calcAct=a=>{
  const pv=a.bac*(a.pct/100)*1.12+a.bac*0.018,ev=a.bac*(a.pct/100),ac=a.ac;
  const cpi=ac>0?ev/ac:0,spi=pv>0?ev/pv:0,eac=cpi>0?a.bac/cpi:a.bac;
  return{pv,ev,ac,cpi,spi,eac,etc:Math.max(0,eac-ac)};
};

const validateAct=(d,ids=[],curId=null)=>{
  const e={};
  if(!String(d.nameAr||"").trim())e.nameAr="الاسم مطلوب";
  if(!String(d.id||"").trim())e.id="الكود مطلوب";
  else if(ids.includes(String(d.id).trim())&&d.id!==curId)e.id="الكود موجود مسبقاً";
  if(isNaN(+d.bac)||+d.bac<=0)e.bac="الميزانية يجب أن تكون أكبر من صفر";
  if(isNaN(+d.ac)||+d.ac<0)e.ac="التكلفة لا يمكن أن تكون سالبة";
  if(isNaN(+d.pct)||+d.pct<0||+d.pct>100)e.pct="النسبة بين 0 و 100";
  if(isNaN(+d.items)||+d.items<1)e.items="البنود يجب أن تكون ≥ 1";
  return e;
};
const validateCF=d=>{const e={};if(isNaN(+d.pvM)||+d.pvM<0)e.pvM="≥ 0";if(isNaN(+d.acM)||+d.acM<0)e.acM="≥ 0";if(isNaN(+d.evM)||+d.evM<0)e.evM="≥ 0";return e;};

// ═══════════════════════════════ ATOMS ═══════════════════════════════
const PBar=({pct,color="#6366f1",h=5})=>(
  <div style={{background:"#f0f0f5",borderRadius:999,height:h,width:"100%",overflow:"hidden"}}>
    <div style={{width:`${Math.min(100,Math.max(0,+pct||0))}%`,height:"100%",background:color,borderRadius:999,transition:"width .4s"}}/>
  </div>
);
const IdxBadge=({v})=>(
  <span style={{display:"inline-flex",alignItems:"center",justifyContent:"center",background:sBg(v),color:sColor(v),borderRadius:999,padding:"5px 18px",fontSize:22,fontWeight:900,fontFamily:"monospace",border:`2px solid ${sColor(v)}30`}}>
    {(+v||0).toFixed(2)}
  </span>
);
const CTip=({active,payload,label})=>{
  if(!active||!payload?.length)return null;
  return(
    <div style={{background:"#0f172a",color:"#fff",borderRadius:10,padding:"10px 14px",fontSize:12,boxShadow:"0 10px 30px rgba(0,0,0,.4)"}}>
      <div style={{fontWeight:700,marginBottom:6,borderBottom:"1px solid rgba(255,255,255,.1)",paddingBottom:4}}>{label}</div>
      {payload.map((p,i)=><div key={i} style={{color:p.color||"#ccc",display:"flex",gap:8,alignItems:"center",marginTop:3}}><span style={{fontSize:10}}>●</span><span style={{opacity:.8}}>{p.name}:</span><span style={{fontFamily:"monospace",fontWeight:700,color:"#fff"}}>{typeof p.value==="number"?fmtM(p.value):p.value}</span></div>)}
    </div>
  );
};
const Modal=({show,onClose,title,children,width=480})=>{
  const dm=useDark();
  if(!show)return null;
  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.6)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000}} onClick={e=>{if(e.target===e.currentTarget)onClose();}}>
      <div style={{background:dm?"#1e293b":"#fff",color:dm?"#f1f5f9":"#1a1a2e",borderRadius:16,padding:28,width,maxWidth:"95vw",boxShadow:"0 24px 60px rgba(0,0,0,.5)",maxHeight:"90vh",overflowY:"auto",border:dm?"1px solid #334155":"none"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
          <h3 style={{margin:0,fontSize:15,fontWeight:900,color:dm?"#f1f5f9":"#1a1a2e"}}>{title}</h3>
          <button onClick={onClose} style={{background:dm?"#334155":"#f4f5fb",border:"none",borderRadius:8,padding:"4px 12px",cursor:"pointer",fontSize:16,color:dm?"#94a3b8":"#888"}}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
};
const ErrMsg=({msg})=>msg?<div style={{fontSize:10,color:"#ef4444",marginTop:3,display:"flex",alignItems:"center",gap:3}}><span>⚠</span>{msg}</div>:null;
const Field=({label,value,onChange,type="text",error,min,max,step,placeholder,readOnly})=>{
  const dm=useDark();
  return(
    <div>
      <div style={{fontSize:11,fontWeight:600,color:error?"#ef4444":dm?"#94a3b8":"#555",marginBottom:4}}>{label}</div>
      <input type={type} value={value} onChange={onChange} min={min} max={max} step={step} placeholder={placeholder} readOnly={readOnly}
        style={{width:"100%",border:`1px solid ${error?"#ef4444":dm?"#475569":"#e5e7eb"}`,borderRadius:8,padding:"8px 12px",fontSize:13,boxSizing:"border-box",outline:"none",
                background:error?"#fff5f5":readOnly?(dm?"#0f172a":"#f8f9fc"):(dm?"#0f172a":"#fff"),color:dm?"#f1f5f9":"#1a1a2e"}}/>
      <ErrMsg msg={error}/>
    </div>
  );
};
// ── Dark Mode Context ──
const DarkCtx = createContext(false);
const useDark = () => useContext(DarkCtx);

const Kpi=({l,v,c,ic,sub,sc,onClick,active})=>{
  const dm=useDark();
  return(
    <div
      className="evm-kpi-card"
      onClick={onClick}
      style={{
        background:dm?"linear-gradient(145deg,#1e293b 0%,#172033 100%)":"linear-gradient(145deg,#ffffff 0%,#fafbff 100%)",
        borderRadius:14,padding:"15px 17px",
        border:`1px solid ${active?c:(dm?"#334155":"#eef0f7")}`,
        boxShadow:active?`0 0 0 2px ${c}55, 0 8px 22px ${c}33`:(dm?"0 4px 18px rgba(0,0,0,.35)":"0 4px 18px rgba(99,102,241,.07)"),
        position:"relative",overflow:"hidden",
        transition:"transform .18s ease, box-shadow .18s ease",
        cursor:onClick?"pointer":"default",
      }}
      onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-2px)";if(!active)e.currentTarget.style.boxShadow=dm?"0 8px 22px rgba(0,0,0,.45)":"0 10px 24px rgba(99,102,241,.14)";}}
      onMouseLeave={e=>{e.currentTarget.style.transform="";if(!active)e.currentTarget.style.boxShadow=dm?"0 4px 18px rgba(0,0,0,.35)":"0 4px 18px rgba(99,102,241,.07)";}}
    >
      <div style={{position:"absolute",top:-30,right:-30,width:90,height:90,borderRadius:"50%",background:`radial-gradient(circle, ${c}33 0%, transparent 70%)`,pointerEvents:"none"}}/>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:7,position:"relative"}}>
        <span style={{fontSize:9,fontWeight:700,color:dm?"#94a3b8":"#888",letterSpacing:.8,textTransform:"uppercase"}}>{l}</span>
        {ic&&<div style={{width:30,height:30,borderRadius:9,background:`linear-gradient(135deg, ${c}22, ${c}44)`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,boxShadow:`inset 0 0 0 1px ${c}33`}}>{ic}</div>}
      </div>
      <div style={{fontSize:23,fontWeight:900,fontFamily:"monospace",color:dm?"#f1f5f9":"#0f172a",letterSpacing:-.5,position:"relative"}}>{v}</div>
      {sub&&<div style={{fontSize:10,marginTop:3,color:sc||(dm?"#94a3b8":"#888"),fontWeight:600,position:"relative"}}>{sub}</div>}
      {onClick&&<div style={{position:"absolute",top:6,left:8,fontSize:9,color:dm?"#64748b":"#94a3b8",fontWeight:700,letterSpacing:.5}}>{active?"▼":"▸"}</div>}
      <div style={{position:"absolute",bottom:0,left:0,right:0,height:3,background:`linear-gradient(90deg, ${c}, ${c}88)`}}/>
    </div>
  );
};

const Card=({children,style={}})=>{
  const dm=useDark();
  return <div style={{background:dm?"#1e293b":"#fff",borderRadius:13,padding:18,border:`1px solid ${dm?"#334155":"#f0f0f0"}`,boxShadow:"0 2px 12px rgba(0,0,0,.05)",...style}}>{children}</div>;
};
const H3=({children,style={}})=><h3 style={{margin:"0 0 12px",fontSize:13,fontWeight:800,...style}}>{children}</h3>;

const useColors=()=>{
  const dm=useDark();
  return {
    bg:    dm?"#0f172a":"#f4f5fb",
    card:  dm?"#1e293b":"#fff",
    border:dm?"#334155":"#f0f0f0",
    text:  dm?"#f1f5f9":"#1a1a2e",
    sub:   dm?"#94a3b8":"#888",
    tHead: dm?"#1e2d3d":"#f8f9fc",
    tRow1: dm?"#1e293b":"#fff",
    tRow2: dm?"#0f172a":"#fafbfc",
    tBorder:dm?"#334155":"#f5f5f5",
    input: dm?"#1e293b":"#fff",
    inputBorder:dm?"#475569":"#e5e7eb",
  };
};

// ═══════════════════════════════ EXPORT ═══════════════════════════════
const exportExcel=(acts,kpi,cf,risks,issues,project)=>{
  const wb=XLSX.utils.book_new();

  // ── Sheet 1: EVM Summary ──
  const summaryData=[
    ["COST CONTROL REPORT — تقرير ضبط التكلفة"],
    [project.name],
    ["رقم العقد",project.number,"العميل",project.client],
    ["المقاول",project.contractor,"تاريخ التقرير",new Date().toLocaleDateString("ar-SA")],
    [],
    ["مؤشر","القيمة","الوصف"],
    ["BAC — الميزانية الأصلية",kpi.bac,"Budget At Completion"],
    ["PV — القيمة المخططة",kpi.pv,"Planned Value"],
    ["EV — القيمة المكتسبة",kpi.ev,"Earned Value"],
    ["AC — التكلفة الفعلية",kpi.ac,"Actual Cost"],
    ["SV — انحراف الجدول",kpi.SV,kpi.SV>=0?"في الموعد":"متأخر"],
    ["CV — انحراف التكلفة",kpi.CV,kpi.CV>=0?"ضمن التكلفة":"تجاوز"],
    ["SPI — مؤشر أداء الجدول",kpi.SPI.toFixed(3),kpi.SPI>=1?"جيد":"تحذير"],
    ["CPI — مؤشر أداء التكلفة",kpi.CPI.toFixed(3),kpi.CPI>=1?"جيد":"تحذير"],
    ["EAC — التقدير عند الإتمام",kpi.EAC,"Estimate At Completion (CPI)"],
    ["EAC PERT",kpi.EAC_pert,"Estimate At Completion (PERT)"],
    ["ETC — تكلفة الإتمام",kpi.ETC,"Estimate To Complete"],
    ["TCPI — مؤشر الأداء المستهدف",kpi.TCPI.toFixed(3),"To-Complete Performance Index"],
    ["VAC — انحراف الإتمام",kpi.bac-kpi.EAC,kpi.bac>kpi.EAC?"وفورات":"خسائر"],
    ["نسبة الإنجاز",+(kpi.prog.toFixed(1))+"%","Overall Progress"],
  ];
  const ws1=XLSX.utils.aoa_to_sheet(summaryData);
  ws1["!cols"]=[{wch:35},{wch:20},{wch:25}];
  ws1["!merges"]=[{s:{r:0,c:0},e:{r:0,c:2}}];
  XLSX.utils.book_append_sheet(wb,ws1,"ملخص EVM");

  // ── Sheet 2: Activities ──
  const actHeaders=["#","كود النشاط","اسم النشاط","التخصص","عدد البنود","الميزانية BAC","التكلفة الفعلية AC","EV المكتسب","PV المخطط","نسبة الإنجاز%","CPI","SPI","EAC (PERT)","ETC","VAC","الحالة"];
  const actRows=acts.map((a,i)=>{
    const{pv,ev,ac,cpi,spi,eac,etc}=calcAct(a);
    const vac=a.bac-eac;
    return[i+1,a.id,a.nameAr,a.disc,a.items,a.bac,a.ac,ev,pv,a.pct+"%",+cpi.toFixed(3),+spi.toFixed(3),+eac.toFixed(0),+etc.toFixed(0),+vac.toFixed(0),cpi>=1?"✅ جيد":cpi>=0.9?"⚠️ تحذير":"🔴 حرج"];
  });
  const totRow=["","GRAND TOTAL","—","—",acts.reduce((s,a)=>s+a.items,0),kpi.bac,kpi.ac,kpi.ev,kpi.pv,+(kpi.prog.toFixed(1))+"%",+kpi.CPI.toFixed(3),+kpi.SPI.toFixed(3),+kpi.EAC.toFixed(0),+kpi.ETC.toFixed(0),+(kpi.bac-kpi.EAC).toFixed(0),kpi.CPI>=1?"✅":"🔴"];
  const ws2=XLSX.utils.aoa_to_sheet([actHeaders,...actRows,totRow]);
  ws2["!cols"]=actHeaders.map((_,i)=>({wch:i===2?28:i===3?14:16}));
  XLSX.utils.book_append_sheet(wb,ws2,"أنشطة المشروع");

  // ── Sheet 3: Cashflow ──
  const cfHeaders=["#","الشهر","التاريخ","PV المخطط (M)","AC الفعلي (M)","EV المكتسب (M)","PV تراكمي","AC تراكمي","EV تراكمي","فرق PV-AC","الحالة"];
  let pvC=0,acC=0,evC=0;
  const cfRows=cf.map((c,i)=>{pvC+=c.pvM;acC+=c.acM;evC+=c.evM;return[i+1,c.month,c.label,c.pvM,c.acM,c.evM,+pvC.toFixed(1),+acC.toFixed(1),+evC.toFixed(1),+(c.pvM-c.acM).toFixed(1),c.isForecast?"متوقع":"فعلي"];});
  const ws3=XLSX.utils.aoa_to_sheet([cfHeaders,...cfRows]);
  ws3["!cols"]=cfHeaders.map(()=>({wch:16}));
  XLSX.utils.book_append_sheet(wb,ws3,"التدفق النقدي");

  // ── Sheet 4: Risk Register ──
  const rHeaders=["#","كود المخاطرة","المخاطرة","الفئة","الاحتمالية","الأثر","درجة الخطر","مستوى الخطر","خطة المعالجة","الحالة","المسؤول","التكلفة المحتملة"];
  const rRows=risks.map((r,i)=>{const s=r.prob*r.impact;return[i+1,r.id,r.title,r.category,r.prob,r.impact,s,rLabel(s),r.mitigation,r.status,r.owner,r.cost||0];});
  const ws4=XLSX.utils.aoa_to_sheet([rHeaders,...rRows]);
  ws4["!cols"]=[{wch:4},{wch:10},{wch:30},{wch:14},{wch:12},{wch:8},{wch:12},{wch:14},{wch:40},{wch:12},{wch:20},{wch:18}];
  XLSX.utils.book_append_sheet(wb,ws4,"سجل المخاطر");

  // ── Sheet 5: Issues ──
  const iHeaders=["#","الكود","المشكلة","التخصص","الأولوية","الحالة","التاريخ","التأثير","التكلفة","المسؤول"];
  const iRows=issues.map((x,i)=>[i+1,x.id,x.title,x.disc,x.priority,x.status,x.date,x.impact,x.cost||0,x.owner]);
  const ws5=XLSX.utils.aoa_to_sheet([iHeaders,...iRows]);
  ws5["!cols"]=[{wch:4},{wch:8},{wch:35},{wch:14},{wch:12},{wch:16},{wch:14},{wch:40},{wch:14},{wch:20}];
  XLSX.utils.book_append_sheet(wb,ws5,"سجل المشكلات");

  XLSX.writeFile(wb,`Cost_Control_Report_${new Date().toISOString().slice(0,10)}.xlsx`);
};

// ── CSV Export (current filtered activities + KPI snapshot) ──
const exportCSV=(acts,kpi,project)=>{
  const esc=v=>{const s=String(v??"");return /[",\n;]/.test(s)?`"${s.replace(/"/g,'""')}"`:s;};
  const rows=[
    ["# Cost Control EVM — CSV Export"],
    ["Project",project?.name||""],
    ["Generated",new Date().toISOString()],
    [],
    ["KPI","Value"],
    ["BAC",kpi.bac],["PV",kpi.pv],["EV",kpi.ev],["AC",kpi.ac],
    ["SV",kpi.SV],["CV",kpi.CV],
    ["SPI",kpi.SPI?.toFixed?.(3)??kpi.SPI],["CPI",kpi.CPI?.toFixed?.(3)??kpi.CPI],
    ["EAC",kpi.EAC],["ETC",kpi.ETC],["TCPI",kpi.TCPI?.toFixed?.(3)??kpi.TCPI],
    ["VAC",kpi.bac-kpi.EAC],["Progress%",+(kpi.prog?.toFixed?.(1)??kpi.prog)],
    [],
    ["#","ID","Name","Discipline","Items","BAC","AC","EV","PV","Progress%","CPI","SPI","EAC","ETC","VAC","Status"],
  ];
  acts.forEach((a,i)=>{
    const{pv,ev,cpi,spi,eac,etc}=calcAct(a);
    rows.push([i+1,a.id,a.nameAr,a.disc,a.items,a.bac,a.ac,+ev.toFixed(0),+pv.toFixed(0),a.pct,+cpi.toFixed(3),+spi.toFixed(3),+eac.toFixed(0),+etc.toFixed(0),+(a.bac-eac).toFixed(0),cpi>=1?"OK":cpi>=0.9?"Warn":"Crit"]);
  });
  const csv="\uFEFF"+rows.map(r=>r.map(esc).join(",")).join("\n");
  const blob=new Blob([csv],{type:"text/csv;charset=utf-8;"});
  const url=URL.createObjectURL(blob);
  const a=document.createElement("a");
  a.href=url;a.download=`evm_export_${new Date().toISOString().slice(0,10)}.csv`;
  document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(url);
};

// ── XER Parser (Primavera P6) — extracts TASK section into activities ──
const parseXERText=text=>{
  const lines=text.split(/\r?\n/);
  const tables={};
  let curTable=null,headers=[];
  for(const line of lines){
    const parts=line.split("\t");
    if(parts[0]==="%T"){curTable=parts[1];headers=[];tables[curTable]=tables[curTable]||[];}
    else if(parts[0]==="%F"){headers=parts.slice(1);}
    else if(parts[0]==="%R"&&curTable){
      const o={};headers.forEach((h,i)=>o[h]=parts[i+1]);
      tables[curTable].push(o);
    }
  }
  const taskRows=tables.TASK||[];
  const projRow=(tables.PROJECT||[])[0]||{};
  const toIso=v=>{if(!v)return"";const m=String(v).match(/(\d{4})-(\d{1,2})-(\d{1,2})/);return m?`${m[1]}-${m[2].padStart(2,"0")}-${m[3].padStart(2,"0")}`:"";};
  const dates=taskRows.flatMap(t=>[t.target_start_date,t.target_end_date,t.act_start_date,t.act_end_date,t.early_start_date,t.early_end_date]).map(toIso).filter(Boolean).sort();
  const schedule={
    start:toIso(projRow.plan_start_date)||dates[0]||"",
    end:toIso(projRow.plan_end_date)||toIso(projRow.scd_end_date)||dates[dates.length-1]||"",
  };
  const activities=taskRows.map((t,idx)=>{
    const bac=+t.target_cost||+t.target_work_qty||0;
    const ac=+t.act_total_cost||+t.act_work_qty||0;
    const pct=Math.min(100,Math.max(0,+t.phys_complete_pct||+t.act_pct_complete||0));
    return{
      id:t.task_code||`TASK-${idx+1}`,
      nameAr:t.task_name||`Activity ${idx+1}`,
      disc:"GENERAL",
      items:1,
      bac,ac,pct,
      _startDate:toIso(t.target_start_date||t.early_start_date),
      _endDate:toIso(t.target_end_date||t.early_end_date),
    };
  }).filter(r=>r.bac>0||r.ac>0||r.id);
  return{activities,schedule,_meta:{taskCount:taskRows.length,projectName:projRow.proj_short_name||""}};
};


// Full export including resources
const exportExcelFull=(acts,kpi,cf,risks,issues,resources,project)=>{
  const wb=XLSX.utils.book_new();
  // EVM Summary
  const ws1=XLSX.utils.aoa_to_sheet([
    ["COST CONTROL REPORT — تقرير ضبط التكلفة"],[project.name],
    ["رقم العقد",project.number,"العميل",project.client],
    ["المقاول",project.contractor,"تاريخ التقرير",new Date().toLocaleDateString("ar-SA")],[],
    ["مؤشر","القيمة","الوصف"],
    ["BAC",kpi.bac,"Budget At Completion"],["PV",kpi.pv,"Planned Value"],
    ["EV",kpi.ev,"Earned Value"],["AC",kpi.ac,"Actual Cost"],
    ["SPI",+kpi.SPI.toFixed(3),kpi.SPI>=1?"جيد ✓":"تحذير ⚠"],
    ["CPI",+kpi.CPI.toFixed(3),kpi.CPI>=1?"جيد ✓":"تحذير ⚠"],
    ["EAC (CPI)",+kpi.EAC.toFixed(0),"Estimate At Completion"],
    ["EAC (PERT)",+kpi.EAC_pert.toFixed(0),"PERT Method"],
    ["ETC",+kpi.ETC.toFixed(0),"Estimate To Complete"],
    ["VAC",+(kpi.bac-kpi.EAC).toFixed(0),kpi.bac>kpi.EAC?"وفورات":"خسائر"],
    ["TCPI",+kpi.TCPI.toFixed(3),"To-Complete Perf. Index"],
    ["الإنجاز%",+(kpi.prog.toFixed(1)),"Overall Progress"],
  ]);
  ws1["!cols"]=[{wch:35},{wch:22},{wch:28}];
  ws1["!merges"]=[{s:{r:0,c:0},e:{r:0,c:2}}];
  XLSX.utils.book_append_sheet(wb,ws1,"ملخص EVM");

  // Activities
  const ah=["#","الكود","النشاط","التخصص","البنود","BAC","AC","EV","PV","الإنجاز%","CPI","SPI","EAC","ETC","VAC","الحالة"];
  const ar=acts.map((a,i)=>{const{pv,ev,ac,cpi,spi,eac,etc}=calcAct(a);return[i+1,a.id,a.nameAr,a.disc,a.items,a.bac,a.ac,+ev.toFixed(0),+pv.toFixed(0),a.pct,+cpi.toFixed(3),+spi.toFixed(3),+eac.toFixed(0),+etc.toFixed(0),+(a.bac-eac).toFixed(0),cpi>=1?"✅ جيد":cpi>=0.9?"⚠️ تحذير":"🔴 حرج"];});
  const at=["","TOTAL","","",acts.reduce((s,a)=>s+a.items,0),kpi.bac,kpi.ac,+kpi.ev.toFixed(0),+kpi.pv.toFixed(0),+kpi.prog.toFixed(1),+kpi.CPI.toFixed(3),+kpi.SPI.toFixed(3),+kpi.EAC.toFixed(0),+kpi.ETC.toFixed(0),+(kpi.bac-kpi.EAC).toFixed(0),""];
  const ws2=XLSX.utils.aoa_to_sheet([ah,...ar,at]);
  ws2["!cols"]=ah.map((_,i)=>({wch:i===2?28:i===3?14:14}));
  XLSX.utils.book_append_sheet(wb,ws2,"أنشطة المشروع");

  // Cashflow
  const ch=["#","الشهر","التاريخ","PV (M)","AC (M)","EV (M)","PV تراكمي","AC تراكمي","EV تراكمي","PV-AC","الحالة"];
  let pC=0,aC=0,eC=0;
  const cr=cf.map((c,i)=>{pC+=c.pvM;aC+=c.acM;eC+=c.evM;return[i+1,c.month,c.label,c.pvM,c.acM,c.evM,+pC.toFixed(1),+aC.toFixed(1),+eC.toFixed(1),+(c.pvM-c.acM).toFixed(1),c.isForecast?"متوقع":"فعلي"];});
  const ws3=XLSX.utils.aoa_to_sheet([ch,...cr]);
  ws3["!cols"]=ch.map(()=>({wch:14}));
  XLSX.utils.book_append_sheet(wb,ws3,"التدفق النقدي");

  // Resources
  const rh=["#","الكود","الاسم","الدور","التخصص","النوع","الكمية المخططة","الكمية الفعلية","الوحدة","التكلفة/وحدة","الأيام المخططة","الأيام الفعلية","التكلفة المخططة","التكلفة الفعلية","الانحراف"];
  const rr=resources.map((r,i)=>{const p=r.planQty*r.unitCost*r.planDays,a=r.actQty*r.unitCost*r.actDays;return[i+1,r.id,r.name,r.role,r.disc,r.type==="labor"?"عمالة":r.type==="equip"?"معدات":"مواد",r.planQty,r.actQty,r.unit,r.unitCost,r.planDays,r.actDays,+p.toFixed(0),+a.toFixed(0),+(a-p).toFixed(0)];});
  const ws4r=XLSX.utils.aoa_to_sheet([rh,...rr]);
  ws4r["!cols"]=rh.map((_,i)=>({wch:i===2?26:i===3?20:14}));
  XLSX.utils.book_append_sheet(wb,ws4r,"سجل الموارد");

  // Risks
  const rkh=["#","الكود","المخاطرة","الفئة","الاحتمالية","الأثر","الدرجة","المستوى","خطة المعالجة","الحالة","المسؤول","التكلفة"];
  const rkr=risks.map((r,i)=>{const s=r.prob*r.impact;return[i+1,r.id,r.title,r.category,r.prob,r.impact,s,rLabel(s),r.mitigation,r.status,r.owner,r.cost||0];});
  const ws5=XLSX.utils.aoa_to_sheet([rkh,...rkr]);
  ws5["!cols"]=[{wch:4},{wch:8},{wch:30},{wch:14},{wch:10},{wch:8},{wch:10},{wch:14},{wch:40},{wch:12},{wch:20},{wch:16}];
  XLSX.utils.book_append_sheet(wb,ws5,"سجل المخاطر");

  // Issues
  const ih=["#","الكود","المشكلة","التخصص","الأولوية","الحالة","التاريخ","التأثير","التكلفة","المسؤول"];
  const ir=issues.map((x,i)=>[i+1,x.id,x.title,x.disc,x.priority,x.status,x.date,x.impact,x.cost||0,x.owner]);
  const ws6=XLSX.utils.aoa_to_sheet([ih,...ir]);
  ws6["!cols"]=[{wch:4},{wch:8},{wch:35},{wch:14},{wch:12},{wch:16},{wch:14},{wch:40},{wch:14},{wch:20}];
  XLSX.utils.book_append_sheet(wb,ws6,"سجل المشكلات");

  XLSX.writeFile(wb,`Cost_Control_Full_Report_${new Date().toISOString().slice(0,10)}.xlsx`);
};

// ═══════════════════════════════ SAVED PROJECTS TAB ═══════════════════════════════
function ProjectsTab({projectsList,projectsLoading,projectsErr,fetchProjects,linkedProjectId,loadProjectFromDb,loadingItems,savedKpis,savedKpisLoading,computeProjectKpi,compareIds,setCompareIds,darkMode,fmt,sColor}){
  const [search,setSearch]=useState(()=>localStorage.getItem("evm:projSearch")||"");
  const [statusFilter,setStatusFilter]=useState(()=>localStorage.getItem("evm:projStatus")||"all"); // all|favorites|archived
  const [dateFrom,setDateFrom]=useState(()=>localStorage.getItem("evm:projDateFrom")||"");
  const [dateTo,setDateTo]=useState(()=>localStorage.getItem("evm:projDateTo")||"");
  const [favorites,setFavorites]=useState(()=>{ try{return JSON.parse(localStorage.getItem("evm:favorites")||"[]");}catch{return[];} });
  const [archived,setArchived]=useState(()=>{ try{return JSON.parse(localStorage.getItem("evm:archived")||"[]");}catch{return[];} });

  useEffect(()=>{try{localStorage.setItem("evm:projSearch",search);}catch{}},[search]);
  useEffect(()=>{try{localStorage.setItem("evm:projStatus",statusFilter);}catch{}},[statusFilter]);
  useEffect(()=>{try{localStorage.setItem("evm:projDateFrom",dateFrom);}catch{}},[dateFrom]);
  useEffect(()=>{try{localStorage.setItem("evm:projDateTo",dateTo);}catch{}},[dateTo]);

  const persistFav=(arr)=>{setFavorites(arr);try{localStorage.setItem("evm:favorites",JSON.stringify(arr));}catch{}};
  const persistArc=(arr)=>{setArchived(arr);try{localStorage.setItem("evm:archived",JSON.stringify(arr));}catch{}};
  const toggleFav=(id)=>{ const next=favorites.includes(id)?favorites.filter(x=>x!==id):[...favorites,id]; persistFav(next); toast.success(favorites.includes(id)?"أُزيل من المفضلة":"⭐ أُضيف للمفضلة"); };
  const toggleArc=(id)=>{ const next=archived.includes(id)?archived.filter(x=>x!==id):[...archived,id]; persistArc(next); toast.info(archived.includes(id)?"تم استعادة المشروع":"📦 تم أرشفة المشروع"); };

  const filtered=useMemo(()=>{
    let arr=(projectsList||[]).filter(p=>!search||(p.name||"").toLowerCase().includes(search.toLowerCase()));
    if(statusFilter==="favorites")arr=arr.filter(p=>favorites.includes(p.id));
    else if(statusFilter==="archived")arr=arr.filter(p=>archived.includes(p.id));
    else arr=arr.filter(p=>!archived.includes(p.id));
    if(dateFrom){const f=new Date(dateFrom).getTime();arr=arr.filter(p=>{const t=new Date(p.updated_at||p.created_at||0).getTime();return t>=f;});}
    if(dateTo){const t=new Date(dateTo).getTime()+86400000;arr=arr.filter(p=>{const x=new Date(p.updated_at||p.created_at||0).getTime();return x<=t;});}
    return arr.slice().sort((a,b)=>(favorites.includes(b.id)?1:0)-(favorites.includes(a.id)?1:0));
  },[projectsList,search,statusFilter,favorites,archived,dateFrom,dateTo]);

  // Lazy-load KPIs for the visible projects
  useEffect(()=>{
    filtered.slice(0,30).forEach(p=>{ if(!savedKpis[p.id]&&!savedKpisLoading[p.id])computeProjectKpi(p.id); });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[filtered]);

  useEffect(()=>{ if(!projectsList.length)fetchProjects(); /* eslint-disable-next-line */ },[]);

  const toggleCompare=(id)=>setCompareIds(prev=>prev.includes(id)?prev.filter(x=>x!==id):prev.length>=4?prev:[...prev,id]);
  const compareData=compareIds.map(id=>{
    const p=projectsList.find(x=>x.id===id); const k=savedKpis[id]||{};
    return{id,name:(p?.name||id).slice(0,18),CPI:+(k.cpi||0).toFixed(2),SPI:+(k.spi||0).toFixed(2),BAC:k.bac||0,AC:k.ac||0,EV:k.ev||0,prog:+(k.prog||0).toFixed(1)};
  });

  const cardBg=darkMode?"#1e293b":"#fff";
  const border=darkMode?"#334155":"#e5e7eb";
  const txt=darkMode?"#f1f5f9":"#1a1a2e";
  const sub=darkMode?"#94a3b8":"#888";

  const FilterChip=({val,label,count})=>(
    <button onClick={()=>setStatusFilter(val)}
      style={{background:statusFilter===val?"hsl(var(--primary))":"hsl(var(--muted))",color:statusFilter===val?"hsl(var(--primary-foreground))":txt,border:"none",borderRadius:999,padding:"6px 12px",cursor:"pointer",fontSize:11,fontWeight:700}}>
      {label} {count!=null&&<span style={{opacity:.75}}>({count})</span>}
    </button>
  );

  return(
    <div>
      <div style={{display:"flex",gap:8,marginBottom:10,alignItems:"center",flexWrap:"wrap"}}>
        <select value={linkedProjectId||""} onChange={e=>{const id=e.target.value;const p=(projectsList||[]).find(x=>x.id===id);if(p&&!loadingItems)loadProjectFromDb(p);}}
          title="قائمة منسدلة بالمشاريع المحفوظة"
          style={{minWidth:220,border:`1px solid ${border}`,borderRadius:9,padding:"9px 12px",fontSize:13,outline:"none",background:cardBg,color:txt,fontWeight:600,cursor:"pointer"}}>
          <option value="">📂 اختر مشروعاً من القائمة...</option>
          {(projectsList||[]).map(p=><option key={p.id} value={p.id}>{p.name||"بدون اسم"}{linkedProjectId===p.id?" ✓":""}</option>)}
        </select>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍 ابحث في مشاريعك المحفوظة..."
          style={{flex:1,minWidth:200,border:`1px solid ${border}`,borderRadius:9,padding:"9px 13px",fontSize:13,outline:"none",background:cardBg,color:txt}}/>
        <button onClick={fetchProjects} style={{background:"hsl(var(--muted))",color:"hsl(var(--foreground))",border:`1px solid ${border}`,borderRadius:9,padding:"9px 14px",cursor:"pointer",fontSize:12,fontWeight:600}}>🔄 تحديث</button>
        <span style={{fontSize:11,color:sub,fontWeight:600}}>{filtered.length} مشروع</span>
        {compareIds.length>0&&<button onClick={()=>setCompareIds([])} style={{background:"hsl(var(--destructive))",color:"hsl(var(--destructive-foreground))",border:"none",borderRadius:9,padding:"7px 12px",cursor:"pointer",fontSize:11,fontWeight:700}}>✕ مسح المقارنة ({compareIds.length})</button>}
      </div>

      <div style={{display:"flex",gap:6,marginBottom:14,flexWrap:"wrap",alignItems:"center"}}>
        <FilterChip val="all" label="الكل" count={(projectsList||[]).filter(p=>!archived.includes(p.id)).length}/>
        <FilterChip val="favorites" label="⭐ المفضلة" count={favorites.length}/>
        <FilterChip val="archived" label="📦 الأرشيف" count={archived.length}/>
        <span style={{width:1,height:22,background:border,margin:"0 4px"}}/>
        <span style={{fontSize:11,color:sub,fontWeight:700}}>📅 من:</span>
        <input type="text" placeholder="yyyy-MM-dd" value={dateFrom} onChange={e=>setDateFrom(e.target.value)} style={{border:`1px solid ${border}`,borderRadius:7,padding:"5px 9px",fontSize:11,outline:"none",background:cardBg,color:txt,width:120,fontFamily:"monospace"}}/>
        <span style={{fontSize:11,color:sub,fontWeight:700}}>إلى:</span>
        <input type="text" placeholder="yyyy-MM-dd" value={dateTo} onChange={e=>setDateTo(e.target.value)} style={{border:`1px solid ${border}`,borderRadius:7,padding:"5px 9px",fontSize:11,outline:"none",background:cardBg,color:txt,width:120,fontFamily:"monospace"}}/>
        {(dateFrom||dateTo)&&<button onClick={()=>{setDateFrom("");setDateTo("");}} style={{background:"hsl(var(--muted))",color:txt,border:`1px solid ${border}`,borderRadius:7,padding:"4px 9px",cursor:"pointer",fontSize:10,fontWeight:600}}>✕ مسح التاريخ</button>}
      </div>

      {projectsErr&&<div style={{background:"hsl(var(--destructive)/.1)",color:"hsl(var(--destructive))",padding:"10px 14px",borderRadius:9,fontSize:12,marginBottom:12,border:"1px solid hsl(var(--destructive)/.3)"}}>{projectsErr}</div>}
      {projectsLoading&&<div style={{textAlign:"center",padding:30,color:sub,fontSize:13}}>⏳ جاري تحميل المشاريع...</div>}
      {!projectsLoading&&!filtered.length&&<div style={{textAlign:"center",padding:40,color:sub,fontSize:13}}>لا توجد مشاريع في هذا التصنيف.</div>}

      {/* Project cards grid */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))",gap:12,marginBottom:14}}>
        {filtered.map(p=>{
          const k=savedKpis[p.id]; const loading=savedKpisLoading[p.id];
          const isLinked=linkedProjectId===p.id; const inCompare=compareIds.includes(p.id);
          const isFav=favorites.includes(p.id); const isArc=archived.includes(p.id);
          return(
            <div key={p.id} style={{background:cardBg,border:`2px solid ${isLinked?"hsl(var(--primary))":border}`,borderRadius:12,padding:14,boxShadow:"0 2px 10px rgba(0,0,0,.04)",position:"relative",transition:"transform .15s, box-shadow .15s",opacity:isArc?.75:1}}
              onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-2px)";e.currentTarget.style.boxShadow="0 8px 22px rgba(0,0,0,.08)";}}
              onMouseLeave={e=>{e.currentTarget.style.transform="";e.currentTarget.style.boxShadow="0 2px 10px rgba(0,0,0,.04)";}}>
              <div style={{position:"absolute",top:8,left:8,display:"flex",gap:5,alignItems:"center"}}>
                {isLinked&&<span style={{background:"hsl(var(--success))",color:"hsl(var(--success-foreground))",borderRadius:999,padding:"2px 9px",fontSize:9,fontWeight:800}}>✓ نشط</span>}
              </div>
              <div style={{position:"absolute",top:6,right:6,display:"flex",gap:2}}>
                <button onClick={()=>toggleFav(p.id)} title={isFav?"إزالة من المفضلة":"إضافة للمفضلة"}
                  style={{background:"transparent",border:"none",cursor:"pointer",fontSize:15,padding:"2px 5px",color:isFav?"#fbbf24":sub}}>{isFav?"⭐":"☆"}</button>
                <button onClick={()=>toggleArc(p.id)} title={isArc?"استعادة":"أرشفة"}
                  style={{background:"transparent",border:"none",cursor:"pointer",fontSize:13,padding:"2px 5px",color:isArc?"hsl(var(--accent))":sub}}>{isArc?"↩️":"📦"}</button>
              </div>
              <div style={{marginBottom:10,paddingTop:isLinked?12:0,paddingRight:isFav?0:0,paddingLeft:50}}>
                <div style={{fontSize:13,fontWeight:800,color:txt,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.name||"بدون اسم"}</div>
                <div style={{fontSize:10,color:sub,marginTop:3}}>{p.file_name||"—"} · {new Date(p.updated_at||p.created_at).toLocaleDateString("ar-SA")}</div>
              </div>
              {loading?(
                <div style={{padding:"18px 0",textAlign:"center",color:sub,fontSize:11}}>⏳ حساب المؤشرات...</div>
              ):k?(
                <>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:6,marginBottom:9}}>
                    <KpiMini lbl="CPI" val={k.cpi>0?k.cpi.toFixed(2):"—"} color={k.cpi>0?sColor(k.cpi):"hsl(var(--muted-foreground))"}/>
                    <KpiMini lbl="SPI" val={k.spi>0?k.spi.toFixed(2):"—"} color={k.spi>0?sColor(k.spi):"hsl(var(--muted-foreground))"}/>
                    <KpiMini lbl="إنجاز" val={k.prog.toFixed(0)+"%"} color="hsl(var(--accent))"/>
                  </div>
                  <div style={{height:5,background:"hsl(var(--muted))",borderRadius:99,overflow:"hidden",marginBottom:9}}>
                    <div style={{width:Math.min(100,k.prog)+"%",height:"100%",background:"linear-gradient(90deg,hsl(var(--accent)),hsl(var(--primary)))"}}/>
                  </div>
                  <div style={{display:"flex",justifyContent:"space-between",fontSize:10,color:sub,marginBottom:10}}>
                    <span>BAC: <b style={{color:txt}}>{fmt(k.bac)}</b></span>
                    <span>AC: <b style={{color:"hsl(var(--warning))"}}>{fmt(k.ac)}</b></span>
                    <span>{k.items} بند</span>
                  </div>
                </>
              ):(
                <button onClick={()=>computeProjectKpi(p.id)} style={{width:"100%",padding:"7px",fontSize:10,background:"hsl(var(--muted))",border:"none",borderRadius:7,cursor:"pointer",marginBottom:9,color:txt}}>📊 حساب المؤشرات</button>
              )}
              <div style={{display:"flex",gap:6}}>
                <button onClick={()=>!loadingItems&&loadProjectFromDb(p)} disabled={loadingItems||isLinked}
                  style={{flex:1,background:isLinked?"hsl(var(--muted))":"var(--gradient-primary)",color:isLinked?"hsl(var(--muted-foreground))":"hsl(var(--primary-foreground))",border:"none",borderRadius:7,padding:"7px",fontWeight:700,cursor:isLinked||loadingItems?"not-allowed":"pointer",fontSize:11}}>
                  {isLinked?"✓ مرتبط":"🔗 ربط"}
                </button>
                <button onClick={()=>toggleCompare(p.id)} title="إضافة للمقارنة"
                  style={{background:inCompare?"hsl(var(--accent))":"hsl(var(--muted))",color:inCompare?"hsl(var(--accent-foreground))":"hsl(var(--foreground))",border:"none",borderRadius:7,padding:"7px 10px",fontWeight:700,cursor:"pointer",fontSize:11}}>
                  {inCompare?"✓":"⚖️"}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Comparison panel */}
      {compareIds.length>=2&&(
        <div style={{background:cardBg,border:`1px solid ${border}`,borderRadius:12,padding:16,boxShadow:"0 4px 14px rgba(0,0,0,.06)"}}>
          <h3 style={{margin:"0 0 14px",fontSize:14,fontWeight:800,color:txt}}>⚖️ مقارنة بين {compareIds.length} مشاريع</h3>

          {/* Comparison bar chart */}
          <div style={{height:240,marginBottom:18,background:darkMode?"#0f172a":"#fafbfc",borderRadius:10,padding:"12px 8px",border:`1px solid ${border}`}}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={compareData} margin={{top:10,right:14,left:0,bottom:6}}>
                <defs>
                  <linearGradient id="gCPI" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.95}/><stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.55}/></linearGradient>
                  <linearGradient id="gSPI" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="hsl(var(--accent))" stopOpacity={0.95}/><stop offset="100%" stopColor="hsl(var(--accent))" stopOpacity={0.55}/></linearGradient>
                  <linearGradient id="gPRG" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="hsl(var(--success))" stopOpacity={0.95}/><stop offset="100%" stopColor="hsl(var(--success))" stopOpacity={0.55}/></linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={border}/>
                <XAxis dataKey="name" tick={{fontSize:10,fill:sub}}/>
                <YAxis yAxisId="l" tick={{fontSize:10,fill:sub}}/>
                <YAxis yAxisId="r" orientation="right" tick={{fontSize:10,fill:sub}} domain={[0,100]}/>
                <Tooltip contentStyle={{background:darkMode?"rgba(15,23,42,.95)":"rgba(255,255,255,.96)",border:`1px solid ${border}`,borderRadius:8,fontSize:12,color:txt,backdropFilter:"blur(8px)"}}/>
                <Legend wrapperStyle={{fontSize:11}}/>
                <ReferenceLine yAxisId="l" y={1} stroke="hsl(var(--destructive))" strokeDasharray="4 4" label={{value:"الهدف 1.0",fontSize:10,fill:sub}}/>
                <Bar yAxisId="l" dataKey="CPI" fill="url(#gCPI)" radius={[6,6,0,0]} maxBarSize={36}/>
                <Bar yAxisId="l" dataKey="SPI" fill="url(#gSPI)" radius={[6,6,0,0]} maxBarSize={36}/>
                <Bar yAxisId="r" dataKey="prog" name="الإنجاز %" fill="url(#gPRG)" radius={[6,6,0,0]} maxBarSize={36}/>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div style={{overflowX:"auto"}}>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
              <thead>
                <tr style={{background:"hsl(var(--muted))"}}>
                  <th style={{padding:"9px 10px",textAlign:"right",fontWeight:700,color:txt}}>المشروع</th>
                  <th style={{padding:"9px 10px",fontWeight:700,color:txt}}>CPI</th>
                  <th style={{padding:"9px 10px",fontWeight:700,color:txt}}>SPI</th>
                  <th style={{padding:"9px 10px",fontWeight:700,color:txt}}>الإنجاز</th>
                  <th style={{padding:"9px 10px",fontWeight:700,color:txt}}>BAC</th>
                  <th style={{padding:"9px 10px",fontWeight:700,color:txt}}>AC</th>
                  <th style={{padding:"9px 10px",fontWeight:700,color:txt}}>EV</th>
                </tr>
              </thead>
              <tbody>
                {compareData.map((d,i)=>(
                  <tr key={i} style={{borderBottom:`1px solid ${border}`}}>
                    <td style={{padding:"9px 10px",fontWeight:700,color:txt}}>{d.name}</td>
                    <td style={{padding:"9px 10px",textAlign:"center",color:sColor(d.CPI),fontWeight:800}}>{d.CPI||"—"}</td>
                    <td style={{padding:"9px 10px",textAlign:"center",color:sColor(d.SPI),fontWeight:800}}>{d.SPI||"—"}</td>
                    <td style={{padding:"9px 10px",textAlign:"center",color:txt}}>{d.prog.toFixed(0)}%</td>
                    <td style={{padding:"9px 10px",textAlign:"center",color:txt}}>{fmt(d.BAC)}</td>
                    <td style={{padding:"9px 10px",textAlign:"center",color:"hsl(var(--warning))"}}>{fmt(d.AC)}</td>
                    <td style={{padding:"9px 10px",textAlign:"center",color:"hsl(var(--success))"}}>{fmt(d.EV)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

const KpiMini=({lbl,val,color})=>(
  <div style={{background:"hsl(var(--muted)/.5)",borderRadius:7,padding:"6px 8px",textAlign:"center"}}>
    <div style={{fontSize:8,color:"hsl(var(--muted-foreground))",fontWeight:700,letterSpacing:.5}}>{lbl}</div>
    <div style={{fontSize:13,fontWeight:900,color,marginTop:2,fontFamily:"monospace"}}>{val}</div>
  </div>
);

// ── Project date helpers ──
const toIso=(d)=>d?d.toISOString().slice(0,10):"";
const parseIso=(s)=>{ if(!s)return null; const d=new Date(s); return isNaN(d)?null:d; };
const addMonths=(d,n)=>{ const x=new Date(d); x.setMonth(x.getMonth()+Math.round(Number(n)||0)); return x; };
const monthsBetween=(a,b)=>{ if(!a||!b)return 0; return ((b.getFullYear()-a.getFullYear())*12)+(b.getMonth()-a.getMonth())+((b.getDate()-a.getDate())/30); };
const recomputeProjectDates=(buf)=>{
  const s=parseIso(buf.startDate), e=parseIso(buf.endDate), dur=Number(buf.duration);
  const lock=buf.lockedField||"endDate";
  if(lock==="endDate" && s && dur>0) return {...buf,endDate:toIso(addMonths(s,dur))};
  if(lock==="duration" && s && e) return {...buf,duration:String(Math.max(1,Math.round(monthsBetween(s,e))))};
  if(lock==="startDate" && e && dur>0) return {...buf,startDate:toIso(addMonths(e,-dur))};
  return buf;
};

// ═══════════════════════════════ APP ═══════════════════════════════
export default function App(){
  const [acts,setActs]=useState(INIT_ACTS);
  const [cf,setCf]=useState(INIT_CF);
  const [risks,setRisks]=useState(INIT_RISKS);
  const [issues,setIssues]=useState(INIT_ISSUES);
  const [selDisc,setSelDisc]=useState(null);
  const [selAct,setSelAct]=useState(null);
  const [tab,setTab]=useState("overview");
  const [search,setSearch]=useState("");
  const [editId,setEditId]=useState(null);
  const [editBuf,setEditBuf]=useState({});
  const [editErrs,setEditErrs]=useState({});
  const [addModal,setAddModal]=useState(false);
  const [newAct,setNewAct]=useState({nameAr:"",id:"",disc:"CIVIL",items:1,bac:0,ac:0,pct:0});
  const [addErrs,setAddErrs]=useState({});
  const [cfEditId,setCfEditId]=useState(null);
  const [cfBuf,setCfBuf]=useState({});
  const [cfErrs,setCfErrs]=useState({});
  const [threshSPI,setThreshSPI]=useState(0.9);
  const [threshCPI,setThreshCPI]=useState(0.9);
  const [threshModal,setThreshModal]=useState(false);
  const [kpiDrill,setKpiDrill]=useState(null); // null | "PV" | "EV" | "AC" | "EAC" | "ETC" | "CPI" | "SPI" | "TCPI" | "PROG"
  const [density,setDensity]=useState(()=>localStorage.getItem("evm_density")||"compact"); // "compact" | "comfortable"
  const [shortcutsModal,setShortcutsModal]=useState(false);
  const [kpiSearch,setKpiSearch]=useState(()=>localStorage.getItem("evm_kpiSearch")||"");
  const [kpiStatus,setKpiStatus]=useState(()=>localStorage.getItem("evm_kpiStatus")||"all"); // all|healthy|warn|crit
  useEffect(()=>{try{localStorage.setItem("evm_kpiSearch",kpiSearch);}catch{}},[kpiSearch]);
  useEffect(()=>{try{localStorage.setItem("evm_kpiStatus",kpiStatus);}catch{}},[kpiStatus]);

  useEffect(()=>{localStorage.setItem("evm_density",density);},[density]);


  const [projModal,setProjModal]=useState(false);
  const [project,setProject]=useState(()=>recomputeProjectDates({name:"مشروع البنية التحتية — جامعة تبوك",number:"NWC-TAB-2024-P1",client:"شركة المياه الوطنية",contractor:"الإمتياز الوطنية للمقاولات",startDate:"2025-01-01",endDate:"",duration:"24",currency:"SAR",lockedField:"endDate"}));
  const [projBuf,setProjBuf]=useState(project);
  const [riskModal,setRiskModal]=useState(false);
  const [newRisk,setNewRisk]=useState({id:"",title:"",category:"تكلفة",prob:2,impact:2,mitigation:"",status:"مفتوح",owner:"",cost:0});
  const [issueModal,setIssueModal]=useState(false);
  const [newIssue,setNewIssue]=useState({id:"",title:"",disc:"CIVIL",priority:"متوسطة",status:"مفتوح",date:"",impact:"",cost:0,owner:""});
  const [importModal,setImportModal]=useState(false);
  const [importText,setImportText]=useState("");
  const [importErr,setImportErr]=useState("");
  const [importPreview,setImportPreview]=useState([]);
  const fileRef=useRef(null);
  const lastExcelFile=useRef(null);
  const [sortCol,setSortCol]=useState("id");
  const [sortDir,setSortDir]=useState("asc");
  const [healthFilter,setHealthFilter]=useState("all");
  const [tableSearch,setTableSearch]=useState("");
  // Resources
  const [resources,setResources]=useState(INIT_RESOURCES);
  const [resFilter,setResFilter]=useState("all"); // all|labor|equip|material
  const [resModal,setResModal]=useState(false);
  const [newRes,setNewRes]=useState({name:"",role:"",disc:"CIVIL",type:"labor",planQty:1,actQty:1,unitCost:0,planDays:26,actDays:26,unit:"يوم"});
  // Narrative
  const [narrativeText,setNarrativeText]=useState("");
  const [narrativeLoading,setNarrativeLoading]=useState(false);
  const [narrativeError,setNarrativeError]=useState("");
  // Forecast settings (growth + horizon + deficit threshold)
  const [forecastSettings,setForecastSettings]=useState(()=>{
    try{const s=localStorage.getItem("evm:forecastSettings");if(s)return JSON.parse(s);}catch{}
    return{months:6,growthPct:0,deficitThresholdM:0};
  });
  useEffect(()=>{try{localStorage.setItem("evm:forecastSettings",JSON.stringify(forecastSettings));}catch{}},[forecastSettings]);
  // Generation history (cashflow + narrative)
  const [genHistory,setGenHistory]=useState(()=>{
    try{const s=localStorage.getItem("evm:genHistory");if(s)return JSON.parse(s);}catch{}
    return[];
  });
  const pushHistory=useCallback((entry)=>{
    setGenHistory(prev=>{
      const next=[{id:Date.now()+":"+Math.random().toString(36).slice(2,6),ts:new Date().toISOString(),...entry},...prev].slice(0,50);
      try{localStorage.setItem("evm:genHistory",JSON.stringify(next));}catch{}
      return next;
    });
  },[]);
  const [showHistory,setShowHistory]=useState(false);
  // UI extras
  const [darkMode,setDarkMode]=useState(()=>localStorage.getItem("evm_darkMode")==="1");
  useEffect(()=>{try{localStorage.setItem("evm_darkMode",darkMode?"1":"0");}catch{}},[darkMode]);
  const [autoSyncAC,setAutoSyncAC]=useState(()=>localStorage.getItem("evm_autoSyncAC")==="1");
  useEffect(()=>{try{localStorage.setItem("evm_autoSyncAC",autoSyncAC?"1":"0");}catch{}},[autoSyncAC]);
  const [changelog,setChangelog]=useState([
    {ts:"2025-01-15 09:00",user:"النظام",action:"إنشاء المشروع وتحميل البيانات الأولية",type:"create"},
  ]);
  const logChange=(action,type="edit")=>{
    const ts=new Date().toLocaleString("ar-SA");
    setChangelog(p=>[{ts,user:"مدير التكلفة",action,type},...p].slice(0,50));
  };

  // ── Forward-declared state (referenced by callbacks below) ──
  const [milestones,setMilestones]=useState([
    {id:"MS-001",title:"انطلاق المشروع",         date:"2025-01-01",done:true, disc:"GENERAL"},
    {id:"MS-002",title:"اعتماد التصاميم",         date:"2025-02-15",done:true, disc:"CIVIL"},
    {id:"MS-003",title:"إتمام أعمال الحفر",       date:"2025-05-01",done:false,disc:"CIVIL"},
    {id:"MS-004",title:"تسليم الأنابيب",          date:"2025-06-30",done:false,disc:"MECHANICAL"},
    {id:"MS-005",title:"اكتمال الشبكة الكهربائية",date:"2025-09-15",done:false,disc:"ELECTRICAL"},
    {id:"MS-006",title:"الفحص النهائي",           date:"2025-11-30",done:false,disc:"GENERAL"},
    {id:"MS-007",title:"التسليم المبدئي",          date:"2025-12-31",done:false,disc:"GENERAL"},
  ]);
  const [baseline,setBaseline]=useState(null);
  const [baselineDate,setBaselineDate]=useState("");
  const [scenarios,setScenarios]=useState([
    {id:"S1",name:"السيناريو المتفائل",   spiAdj:1.15, cpiAdj:1.10, color:"#10b981", active:false},
    {id:"S2",name:"السيناريو الأساسي",   spiAdj:1.00, cpiAdj:1.00, color:"#6366f1", active:true},
    {id:"S3",name:"السيناريو المتشائم",  spiAdj:0.80, cpiAdj:0.85, color:"#f59e0b", active:false},
    {id:"S4",name:"سيناريو الأزمة",     spiAdj:0.60, cpiAdj:0.70, color:"#ef4444", active:false},
  ]);

  // ── Project picker (Supabase) ──
  const [pickerModal,setPickerModal]=useState(false);
  const [projectsList,setProjectsList]=useState([]);
  const [projectsLoading,setProjectsLoading]=useState(false);
  const [projectsErr,setProjectsErr]=useState("");
  const [pickerSearch,setPickerSearch]=useState("");
  const [linkedProjectId,setLinkedProjectId]=useState(null);
  const [loadingItems,setLoadingItems]=useState(false);

  const guessDisc=(text="")=>{
    const t=String(text).toLowerCase();
    if(/(كهرب|إنار|إضاء|كابل|electric|light|cable|panel)/i.test(t))return"ELECTRICAL";
    if(/(ميكان|تكييف|سباك|مضخ|أنابيب|hvac|mech|pump|pipe|plumb)/i.test(t))return"MECHANICAL";
    if(/(عمار|تشطيب|دهان|سيرام|بلاط|باب|نواف|حدائق|arch|finish|paint|tile|door|window)/i.test(t))return"ARCHITECTURAL";
    if(/(مدني|خرسان|حفر|ردم|طرق|جسر|صرف|مياه|civil|concrete|excav|road|bridge|sewer|water)/i.test(t))return"CIVIL";
    return"GENERAL";
  };

  const fetchProjects=useCallback(async()=>{
    setProjectsLoading(true);setProjectsErr("");
    try{
      const{data,error}=await supabase.from("saved_projects").select("id,name,file_name,updated_at,created_at").order("updated_at",{ascending:false}).limit(200);
      if(error)throw error;
      setProjectsList(data||[]);
    }catch(e){setProjectsErr(e.message||"فشل تحميل المشاريع");}
    finally{setProjectsLoading(false);}
  },[]);

  useEffect(()=>{ if(pickerModal&&!projectsList.length&&!projectsLoading)fetchProjects(); },[pickerModal]);
  // Auto-open picker on first mount if no project is linked yet
  // ── Saved-projects KPIs (lazy) + comparison + persistence ──
  const [savedKpis,setSavedKpis]=useState({});           // {projectId: {bac,ac,prog,cpi,spi,ev,pv,items}}
  const [savedKpisLoading,setSavedKpisLoading]=useState({});
  const [compareIds,setCompareIds]=useState([]);          // up to 4
  const LS_LAST="evm:lastLinkedProjectId";

  const computeProjectKpi=useCallback(async(projectId)=>{
    if(savedKpis[projectId]||savedKpisLoading[projectId])return;
    setSavedKpisLoading(s=>({...s,[projectId]:true}));
    try{
      const[{data:items},{data:certs}]=await Promise.all([
        supabase.from("project_items").select("total_price,quantity,unit_price").eq("project_id",projectId),
        supabase.from("progress_certificates").select("net_amount,total_work_done,current_work_done").eq("project_id",projectId),
      ]);
      const bac=(items||[]).reduce((s,i)=>s+Number(i.total_price||(Number(i.quantity||0)*Number(i.unit_price||0))||0),0);
      const ac=(certs||[]).reduce((s,c)=>s+Number(c.net_amount||c.total_work_done||c.current_work_done||0),0);
      const prog=bac>0?Math.min(100,(ac/bac)*100):0;
      const ev=bac*(prog/100);
      const pv=bac*0.5;
      const cpi=ac>0?ev/ac:0;
      const spi=pv>0?ev/pv:0;
      setSavedKpis(s=>({...s,[projectId]:{bac,ac,ev,pv,prog,cpi,spi,items:(items||[]).length}}));
    }catch(_){}
    finally{setSavedKpisLoading(s=>{const n={...s};delete n[projectId];return n;});}
  },[savedKpis,savedKpisLoading]);

  // Auto-restore last opened project from localStorage; picker stays integrated in the header (no auto-popup)
  useEffect(()=>{
    if(linkedProjectId)return;
    const last=typeof window!=="undefined"&&localStorage.getItem(LS_LAST);
    (async()=>{
      await fetchProjects();
      if(last){
        try{
          const{data}=await supabase.from("saved_projects").select("id,name,file_name").eq("id",last).maybeSingle();
          if(data){loadProjectFromDb(data);return;}
        }catch(_){}
      }
      // Do NOT auto-open picker modal — user can open it from the header/sidebar button
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[]);

  const loadProjectFromDb=useCallback(async(p)=>{
    setLoadingItems(true);
    try{
      const{data:items,error}=await supabase.from("project_items").select("id,item_number,description,unit,quantity,unit_price,total_price,category,sort_order").eq("project_id",p.id).order("sort_order");
      if(error)throw error;
      // Group items by category → one activity per category
      const groups={};
      (items||[]).forEach((it,idx)=>{
        const cat=(it.category||"عام").toString().trim()||"عام";
        if(!groups[cat])groups[cat]={cat,items:0,bac:0,disc:guessDisc(cat+" "+(it.description||""))};
        groups[cat].items+=1;
        groups[cat].bac+=Number(it.total_price||(Number(it.quantity||0)*Number(it.unit_price||0))||0);
      });
      const discCount={};
      const newActs=Object.values(groups).map((g,i)=>{
        const d=g.disc; discCount[d]=(discCount[d]||0)+1;
        const code=d.slice(0,3).toUpperCase()+"-"+String(discCount[d]).padStart(3,"0");
        return{id:code,nameAr:g.cat,disc:d,items:g.items,bac:Math.round(g.bac),ac:0,pct:0};
      });
      if(!newActs.length){
        (items||[]).slice(0,200).forEach((it,i)=>{
          const d=guessDisc(it.category+" "+(it.description||""));
          discCount[d]=(discCount[d]||0)+1;
          newActs.push({id:d.slice(0,3).toUpperCase()+"-"+String(discCount[d]).padStart(3,"0"),nameAr:it.description||it.item_number||"بند",disc:d,items:1,bac:Math.round(Number(it.total_price||0)),ac:0,pct:0});
        });
      }
      setActs(newActs);
      let savedMeta={};
      try{ const raw=localStorage.getItem(`evm:projectMeta:${p.id}`); if(raw)savedMeta=JSON.parse(raw)||{}; }catch(_){}
      setProject(prev=>recomputeProjectDates({...prev,...savedMeta,name:p.name||prev.name,number:p.file_name||prev.number}));
      setLinkedProjectId(p.id);
      try{localStorage.setItem(LS_LAST,p.id);}catch(_){}
      setSelDisc(null);setSelAct(null);
      setPickerModal(false);
      logChange(`ربط المشروع: ${p.name} (${newActs.length} نشاط)`,"create");
      // Invalidate cached KPI so it recomputes on next view
      setSavedKpis(s=>{const n={...s};delete n[p.id];return n;});
    }catch(e){
      setProjectsErr(e.message||"فشل تحميل بنود المشروع");
    }finally{setLoadingItems(false);}
  },[]);

  // Realtime: refresh activities when BOQ items of the linked project change
  useEffect(()=>{
    if(!linkedProjectId)return;
    const channel=supabase.channel(`evm-items-${linkedProjectId}`)
      .on("postgres_changes",{event:"*",schema:"public",table:"project_items",filter:`project_id=eq.${linkedProjectId}`},
        ()=>{ loadProjectFromDb({id:linkedProjectId,name:project?.name,file_name:project?.number}); toast.info("🔄 تم تحديث بنود المشروع تلقائياً"); })
      .subscribe();
    return()=>{ supabase.removeChannel(channel); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[linkedProjectId]);

  // Persist project meta (dates, duration, currency) per linked project
  useEffect(()=>{
    if(!linkedProjectId)return;
    try{ localStorage.setItem(`evm:projectMeta:${linkedProjectId}`, JSON.stringify({startDate:project.startDate,endDate:project.endDate,duration:project.duration,lockedField:project.lockedField,currency:project.currency,client:project.client,contractor:project.contractor})); }catch(_){}
  },[project.startDate,project.endDate,project.duration,project.lockedField,project.currency,project.client,project.contractor,linkedProjectId]);


  // ── Sync AC from Progress Certificates ──
  const [syncingAC,setSyncingAC]=useState(false);
  const syncACFromCertificates=useCallback(async()=>{
    if(!linkedProjectId){toast.error("اربط مشروعاً أولاً من زر 📂 اختيار مشروع");return;}
    setSyncingAC(true);
    try{
      const{data,error}=await supabase
        .from("progress_certificates")
        .select("net_amount,total_work_done,current_work_done,status")
        .eq("project_id",linkedProjectId);
      if(error)throw error;
      const totalAC=(data||[])
        .filter(c=>c.status!=="cancelled")
        .reduce((s,c)=>s+Number(c.total_work_done||c.net_amount||c.current_work_done||0),0);
      if(!totalAC){toast.warning("لا توجد شهادات تقدم لهذا المشروع");return;}
      // Distribute AC across activities proportionally to BAC
      const totalBac=acts.reduce((s,a)=>s+Number(a.bac||0),0);
      if(!totalBac){toast.error("BAC = 0، تعذّر التوزيع");return;}
      setActs(prev=>prev.map(a=>({...a,ac:Math.round(totalAC*(Number(a.bac||0)/totalBac))})));
      toast.success(`تمت مزامنة AC من ${data.length} شهادة تقدم — الإجمالي ${totalAC.toLocaleString()}`);
      logChange?.(`مزامنة AC من شهادات التقدم: ${totalAC.toLocaleString()}`,"update");
    }catch(e){toast.error("فشل المزامنة: "+(e.message||""));}
    finally{setSyncingAC(false);}
  },[linkedProjectId,acts]);

  // ── Auto-sync AC every 5 minutes when enabled ──
  useEffect(()=>{
    if(!autoSyncAC||!linkedProjectId)return;
    const id=setInterval(()=>{syncACFromCertificates();},5*60*1000);
    return()=>clearInterval(id);
  },[autoSyncAC,linkedProjectId,syncACFromCertificates]);



  // ── DB-backed Scenarios ──
  const saveScenarioToDb=useCallback(async(name)=>{
    try{
      const{data:auth}=await supabase.auth.getUser();
      if(!auth?.user){toast.error("سجّل الدخول لحفظ السيناريو في السحابة");return;}
      const snap={acts,risks,issues,resources,milestones,cf,project,scenarios,baseline,threshSPI,threshCPI};
      const{error}=await supabase.from("evm_scenarios").insert({
        user_id:auth.user.id,
        project_id:linkedProjectId,
        name:name||`سيناريو ${new Date().toLocaleString("ar-EG")}`,
        snapshot:snap,
      });
      if(error)throw error;
      toast.success("تم حفظ السيناريو في قاعدة البيانات ☁️");
    }catch(e){toast.error("فشل الحفظ: "+(e.message||""));}
  },[acts,risks,issues,resources,milestones,cf,project,linkedProjectId]);

  const [dbScenarios,setDbScenarios]=useState([]);
  const [scenariosModal,setScenariosModal]=useState(false);
  const fetchDbScenarios=useCallback(async()=>{
    try{
      let q=supabase.from("evm_scenarios").select("id,name,created_at,project_id,snapshot").order("created_at",{ascending:false}).limit(50);
      if(linkedProjectId)q=q.eq("project_id",linkedProjectId);
      const{data,error}=await q;
      if(error)throw error;
      setDbScenarios(data||[]);
    }catch(e){toast.error("فشل تحميل السيناريوهات: "+(e.message||""));}
  },[linkedProjectId]);

  const loadScenarioFromDb=useCallback((s)=>{
    try{
      const snap=s.snapshot||{};
      if(snap.acts)setActs(snap.acts);
      if(snap.risks)setRisks(snap.risks);
      if(snap.issues)setIssues(snap.issues);
      if(snap.resources)setResources(snap.resources);
      if(snap.milestones)setMilestones(snap.milestones);
      if(snap.cf)setCf(snap.cf);
      if(snap.project)setProject(snap.project);
      if(snap.scenarios)setScenarios(snap.scenarios);
      if(snap.baseline)setBaseline(snap.baseline);
      if(snap.threshSPI!=null)setThreshSPI(snap.threshSPI);
      if(snap.threshCPI!=null)setThreshCPI(snap.threshCPI);
      toast.success(`تم تحميل: ${s.name}`);
      setScenariosModal(false);
    }catch(e){toast.error("فشل التحميل: "+(e.message||""));}
  },[]);

  const deleteScenarioFromDb=useCallback(async(id)=>{
    if(!confirm("حذف هذا السيناريو نهائياً؟"))return;
    try{
      const{error}=await supabase.from("evm_scenarios").delete().eq("id",id);
      if(error)throw error;
      setDbScenarios(p=>p.filter(x=>x.id!==id));
      toast.success("تم الحذف");
    }catch(e){toast.error("فشل الحذف");}
  },[]);

  // ── Export PDF ──
  const exportPDF=useCallback(()=>{
    try{
      const doc=new jsPDF({orientation:"landscape",unit:"pt"});
      doc.setFontSize(16);
      doc.text("EVM Cost Control Report",40,40);
      doc.setFontSize(10);
      doc.text(`Project: ${project.name||"-"}    Date: ${new Date().toISOString().slice(0,10)}`,40,60);
      autoTable(doc,{
        startY:80,
        head:[["KPI","Value"]],
        body:[
          ["BAC",fmt(kpi.bac)],["PV",fmt(kpi.pv)],["EV",fmt(kpi.ev)],["AC",fmt(kpi.ac)],
          ["CV",fmt(kpi.CV)],["SV",fmt(kpi.SV)],["CPI",kpi.CPI.toFixed(2)],["SPI",kpi.SPI.toFixed(2)],
          ["EAC",fmt(kpi.EAC)],["ETC",fmt(kpi.ETC)],["TCPI",kpi.TCPI.toFixed(2)],["VAC",fmt(kpi.bac-kpi.EAC)],
        ],
        styles:{fontSize:9},headStyles:{fillColor:[99,102,241]},
      });
      autoTable(doc,{
        startY:doc.lastAutoTable.finalY+20,
        head:[["ID","Name","Disc","BAC","AC","%","CPI","SPI"]],
        body:acts.map(a=>{const k=calcAct(a);return[a.id,a.nameAr,a.disc,fmt(a.bac),fmt(a.ac),(a.pct||0)+"%",k.cpi.toFixed(2),k.spi.toFixed(2)];}),
        styles:{fontSize:8},headStyles:{fillColor:[16,185,129]},
      });
      doc.save(`EVM_Report_${new Date().toISOString().slice(0,10)}.pdf`);
      toast.success("تم تصدير PDF");
    }catch(e){toast.error("فشل التصدير: "+(e.message||""));}
  },[acts,project]);


  // ── Computed ──
  const filtered=useMemo(()=>{
    let r=acts;if(selDisc)r=r.filter(a=>a.disc===selDisc);if(selAct)r=r.filter(a=>a.id===selAct);return r;
  },[acts,selDisc,selAct]);
  const kpi=useMemo(()=>calcEVM(filtered),[filtered]);
  const byDisc=useMemo(()=>DISCIPLINES.map(d=>{const da=acts.filter(a=>a.disc===d);const k=calcEVM(da);const avgPct=da.length?da.reduce((s,a)=>s+a.pct,0)/da.length:0;return{disc:d,avgPct,count:da.length,...k};}), [acts]);
  const alerts=useMemo(()=>{
    const a=[];
    if(kpi.SPI<threshSPI)a.push({t:"c",msg:`SPI حرج (${kpi.SPI.toFixed(2)}) — تأخر جدولي`});
    if(kpi.CPI<threshCPI)a.push({t:"c",msg:`CPI حرج (${kpi.CPI.toFixed(2)}) — تجاوز تكلفة`});
    if(kpi.EAC>kpi.bac)a.push({t:"w",msg:`EAC يتجاوز الميزانية بـ ${fmt(kpi.EAC-kpi.bac)}`});
    if(kpi.TCPI>1.1)a.push({t:"w",msg:`TCPI=${kpi.TCPI.toFixed(2)} — صعب التحقيق`});
    const critRisks=risks.filter(r=>r.prob*r.impact>=16&&r.status==="مفتوح");
    if(critRisks.length)a.push({t:"c",msg:`${critRisks.length} مخاطر حرجة مفتوحة`});
    const openHigh=issues.filter(x=>x.priority==="عالية"&&x.status!=="مغلق");
    if(openHigh.length)a.push({t:"w",msg:`${openHigh.length} مشكلات عالية الأولوية`});
    return a;
  },[kpi,risks,issues,threshSPI,threshCPI]);

  // Auto-toast when CPI/SPI cross critical thresholds (one-shot per breach)
  const lastBreachRef=useRef({cpi:false,spi:false});
  useEffect(()=>{
    if(!kpi||!isFinite(kpi.CPI))return;
    const cpiBreach=kpi.CPI>0 && kpi.CPI<threshCPI;
    const spiBreach=kpi.SPI>0 && kpi.SPI<threshSPI;
    if(cpiBreach && !lastBreachRef.current.cpi){
      toast.error(`⚠️ تجاوز عتبة CPI: ${kpi.CPI.toFixed(2)} < ${threshCPI}`,{duration:6000});
    }
    if(spiBreach && !lastBreachRef.current.spi){
      toast.error(`⚠️ تجاوز عتبة SPI: ${kpi.SPI.toFixed(2)} < ${threshSPI}`,{duration:6000});
    }
    if(!cpiBreach && lastBreachRef.current.cpi){
      toast.success(`✅ CPI عاد للوضع الآمن (${kpi.CPI.toFixed(2)})`);
    }
    if(!spiBreach && lastBreachRef.current.spi){
      toast.success(`✅ SPI عاد للوضع الآمن (${kpi.SPI.toFixed(2)})`);
    }
    lastBreachRef.current={cpi:cpiBreach,spi:spiBreach};
  },[kpi.CPI,kpi.SPI,threshCPI,threshSPI]);

  // Timeline / SPI-from-dates
  const timeMetrics=useMemo(()=>{
    const s=parseIso(project.startDate), e=parseIso(project.endDate);
    if(!s||!e||e<=s) return {elapsedPct:0,timeProg:0,overdue:false,daysLeft:0,spiTime:0,valid:false};
    const now=new Date();
    const total=e-s, done=Math.min(total,Math.max(0,now-s));
    const elapsedPct=(done/total)*100;
    const timeProg=done/total;
    const overdue=now>e;
    const daysLeft=Math.round((e-now)/(1000*60*60*24));
    const actProg=(kpi.prog||0)/100;
    const spiTime=timeProg>0?actProg/timeProg:0;
    return {elapsedPct,timeProg,overdue,daysLeft,spiTime,valid:true};
  },[project.startDate,project.endDate,kpi.prog]);

  // One-shot overdue toast
  const overdueShownRef=useRef(false);
  useEffect(()=>{
    if(timeMetrics.overdue && !overdueShownRef.current){
      toast.error(`⛔ تجاوز تاريخ النهاية بـ ${Math.abs(timeMetrics.daysLeft)} يوم`,{duration:7000});
      overdueShownRef.current=true;
    }
    if(!timeMetrics.overdue) overdueShownRef.current=false;
  },[timeMetrics.overdue,timeMetrics.daysLeft]);

  const trendData=useMemo(()=>filtered.slice(0,24).map(a=>{const{cpi,spi}=calcAct(a);return{id:a.id,cpi:+cpi.toFixed(2),spi:+spi.toFixed(2)};}), [filtered]);
  const varData=useMemo(()=>byDisc.map(d=>({disc:d.disc,SV:+(d.SV/1e6).toFixed(1),CV:+(d.CV/1e6).toFixed(1)})),[byDisc]);

  // Weighted progress by BAC
  const weightedProg=useMemo(()=>{
    const totalBac=acts.reduce((s,a)=>s+a.bac,0);
    if(!totalBac)return 0;
    return acts.reduce((s,a)=>s+(a.bac/totalBac)*a.pct,0);
  },[acts]);

  // BAC distribution
  const bacDist=useMemo(()=>byDisc.map(d=>({name:d.disc,value:+d.bac,pct:kpi.bac>0?+(d.bac/kpi.bac*100).toFixed(1):0,color:DC[d.disc]})),[byDisc,kpi]);

  // Sorted + filtered table
  const sortedFiltered=useMemo(()=>{
    let rows=[...filtered];
    // health filter
    if(healthFilter!=="all"){
      rows=rows.filter(a=>{
        const{cpi}=calcAct(a);
        if(healthFilter==="good") return cpi>=1;
        if(healthFilter==="warn") return cpi>=0.9&&cpi<1;
        if(healthFilter==="bad")  return cpi<0.9&&cpi>0;
        return true;
      });
    }
    // text search in table
    if(tableSearch.trim()){
      const q=tableSearch.trim().toUpperCase();
      rows=rows.filter(a=>a.nameAr.includes(tableSearch)||a.id.toUpperCase().includes(q)||a.disc.includes(q));
    }
    // sort
    rows.sort((a,b)=>{
      let av,bv;
      switch(sortCol){
        case "pct": av=a.pct; bv=b.pct; break;
        case "bac": av=a.bac; bv=b.bac; break;
        case "ac":  av=a.ac;  bv=b.ac;  break;
        case "cpi": av=calcAct(a).cpi; bv=calcAct(b).cpi; break;
        case "spi": av=calcAct(a).spi; bv=calcAct(b).spi; break;
        case "eac": av=calcAct(a).eac; bv=calcAct(b).eac; break;
        case "ev":  av=calcAct(a).ev;  bv=calcAct(b).ev;  break;
        case "disc": av=a.disc; bv=b.disc; break;
        default:    av=a.id;   bv=b.id;
      }
      if(typeof av==="string") return sortDir==="asc"?av.localeCompare(bv):bv.localeCompare(av);
      return sortDir==="asc"?av-bv:bv-av;
    });
    return rows;
  },[filtered,sortCol,sortDir,healthFilter,tableSearch]);

  const toggleSort=col=>{if(sortCol===col)setSortDir(d=>d==="asc"?"desc":"asc");else{setSortCol(col);setSortDir("asc");}};
  const SortIco=({col})=><span style={{marginLeft:3,opacity:.5,fontSize:9}}>{sortCol===col?(sortDir==="asc"?"▲":"▼"):"⇅"}</span>;

  // ── Resource computed ──
  const filteredRes=useMemo(()=>resources.filter(r=>resFilter==="all"||r.type===resFilter),[resources,resFilter]);
  const resStats=useMemo(()=>{
    const labor=resources.filter(r=>r.type==="labor");
    const equip=resources.filter(r=>r.type==="equip");
    const mat=resources.filter(r=>r.type==="material");
    const calcCost=(arr)=>arr.reduce((s,r)=>s+(r.actQty*r.unitCost*r.actDays),0);
    const calcPlanCost=(arr)=>arr.reduce((s,r)=>s+(r.planQty*r.unitCost*r.planDays),0);
    const totalPlan=calcPlanCost(resources), totalAct=calcCost(resources);
    const laborHeadcount=labor.filter(r=>r.unit==="يوم"||r.unit==="شهر").reduce((s,r)=>s+r.actQty,0);
    const utilization=resources.filter(r=>r.planQty>0).reduce((s,r)=>s+(r.actQty/r.planQty),0)/Math.max(1,resources.filter(r=>r.planQty>0).length)*100;
    return{laborCost:calcCost(labor),equipCost:calcCost(equip),matCost:calcCost(mat),totalPlan,totalAct,laborHeadcount,utilization};
  },[resources]);

  const resByDisc=useMemo(()=>DISCIPLINES.map(d=>{
    const dr=resources.filter(r=>r.disc===d);
    const cost=dr.reduce((s,r)=>s+(r.actQty*r.unitCost*r.actDays),0);
    const plan=dr.reduce((s,r)=>s+(r.planQty*r.unitCost*r.planDays),0);
    return{disc:d,cost,plan,count:dr.length,color:DC[d]};
  }),[resources]);

  // ── Resource Levelling State ──
  const [levelMonth,setLevelMonth]=useState(0);
  const [lvlFilter,setLvlFilter]=useState("all"); // all|overloaded|underutil

  // Monthly resource allocation (simulate 12-month spread from planDays/actDays)
  const monthlyAlloc=useMemo(()=>{
    return Array.from({length:12},(_,mi)=>{
      const month=`M${mi+1}`;
      const laborRes=resources.filter(r=>r.type==="labor");
      const equipRes=resources.filter(r=>r.type==="equip");
      // Distribute days evenly across months proportional to overall project progress
      const pct=Math.min(1,(mi+1)/12);
      const prevPct=mi/12;
      // Plan headcount: fraction of plan days falling this month
      const planHead=laborRes.reduce((s,r)=>{
        const monthDays=Math.max(0,Math.min(r.planDays,26)*(pct-prevPct)*12);
        return s+(monthDays>0?r.planQty:0);
      },0);
      const actHead=laborRes.reduce((s,r)=>{
        const monthDays=Math.max(0,Math.min(r.actDays,26)*(pct-prevPct)*12);
        return s+(monthDays>0?r.actQty:0);
      },0);
      const planEquip=equipRes.reduce((s,r)=>s+(r.planQty*(pct-prevPct)*12>0.5?r.planQty:0),0);
      const actEquip=equipRes.reduce((s,r)=>s+(r.actQty*(pct-prevPct)*12>0.5?r.actQty:0),0);
      // Cost this month
      const planCost=resources.reduce((s,r)=>s+(r.planQty*r.unitCost*Math.min(r.planDays,26)*(pct-prevPct)*12),0);
      const actCost=resources.reduce((s,r)=>s+(r.actQty*r.unitCost*Math.min(r.actDays,26)*(pct-prevPct)*12),0);
      return{month,mi,planHead:+planHead.toFixed(0),actHead:+actHead.toFixed(0),planEquip:+planEquip.toFixed(0),actEquip:+actEquip.toFixed(0),planCost:+planCost.toFixed(0),actCost:+actCost.toFixed(0)};
    });
  },[resources]);

  // Per-resource utilisation & overallocation analysis
  const resourceAnalysis=useMemo(()=>{
    return resources
      .filter(r=>r.type!=="material")
      .map(r=>{
        const util=r.planQty>0?+(r.actQty/r.planQty*100).toFixed(0):0;
        const variance=r.actQty-r.planQty;
        const status=util>100?"overloaded":util>=80?"optimal":util>=50?"underutil":"idle";
        const costVar=r.actQty*r.unitCost*r.actDays - r.planQty*r.unitCost*r.planDays;
        const recommendation=
          status==="overloaded"?"🔴 تجاوز الطاقة — يوصى بإضافة موارد بديلة أو تأخير نشاط":
          status==="idle"?"⚫ غير مستخدم — راجع جدولة بدء النشاط":
          status==="underutil"?"🟡 استخدام منخفض — يمكن تحويل للأنشطة الأخرى":
          "✅ استخدام مثالي";
        return{...r,util,variance,status,costVar,recommendation};
      })
      .filter(r=>lvlFilter==="all"||(lvlFilter==="overloaded"&&r.status==="overloaded")||(lvlFilter==="underutil"&&(r.status==="underutil"||r.status==="idle")));
  },[resources,lvlFilter]);

  // Peak month
  const peakMonth=useMemo(()=>monthlyAlloc.reduce((p,c)=>c.actHead>p.actHead?c:p,monthlyAlloc[0]),[monthlyAlloc]);
  const overloadedCount=useMemo(()=>resources.filter(r=>r.type!=="material"&&r.planQty>0&&r.actQty>r.planQty).length,[resources]);
  const avgUtil=useMemo(()=>{const r=resources.filter(x=>x.type!=="material"&&x.planQty>0);return r.length?+(r.reduce((s,x)=>s+x.actQty/x.planQty,0)/r.length*100).toFixed(0):0;},[resources]);

  // Duration forecast
  const durationForecast=useMemo(()=>{
    const origDur=+project.duration||24;
    const forecastDur=kpi.SPI>0?+(origDur/kpi.SPI).toFixed(1):origDur;
    const slipMonths=+(forecastDur-origDur).toFixed(1);
    const startDate=new Date(project.startDate||"2025-01-01");
    const origEnd=new Date(startDate);origEnd.setMonth(origEnd.getMonth()+origDur);
    const forecastEnd=new Date(startDate);forecastEnd.setMonth(forecastEnd.getMonth()+Math.round(forecastDur));
    return{origDur,forecastDur,slipMonths,origEnd:origEnd.toLocaleDateString("ar-SA"),forecastEnd:forecastEnd.toLocaleDateString("ar-SA")};
  },[kpi,project]);

  // ── Gantt / Milestones (state declared above) ──

  // Build Gantt bar data (12 months)
  const ganttData=useMemo(()=>DISCIPLINES.map(d=>{
    const da=acts.filter(a=>a.disc===d);
    const avgPct=da.length?da.reduce((s,a)=>s+a.pct,0)/da.length:0;
    // Distribute work across months based on pct
    const bars=Array.from({length:12},(_,mi)=>{
      const start=mi/12; const end=(mi+1)/12;
      const inRange=avgPct/100;
      const plan=end<=1?1:0;
      const actual=inRange>start?Math.min(1,(inRange-start)/(end-start)):0;
      return{plan:+plan.toFixed(2),actual:+Math.min(1,actual).toFixed(2)};
    });
    return{disc:d,bars,avgPct:+avgPct.toFixed(1),color:DC[d]};
  }),[acts]);

  // ── Baseline (state declared above) ──
  const captureBaseline=()=>{
    const snap={date:new Date().toLocaleDateString("ar-SA"),acts:acts.map(a=>({id:a.id,bac:a.bac,pct:a.pct,ac:a.ac})),kpi:{...kpi}};
    setBaseline(snap);setBaselineDate(snap.date);
    logChange(`تم حفظ خط القاعدة بتاريخ ${snap.date}`,"create");
  };
  const baselineDiff=useMemo(()=>{
    if(!baseline)return[];
    return acts.map(a=>{
      const b=baseline.acts.find(x=>x.id===a.id);
      if(!b)return{id:a.id,nameAr:a.nameAr,disc:a.disc,bacDiff:a.bac,pctDiff:a.pct,acDiff:a.ac,isNew:true};
      return{id:a.id,nameAr:a.nameAr,disc:a.disc,bacDiff:a.bac-b.bac,pctDiff:a.pct-b.pct,acDiff:a.ac-b.ac,isNew:false};
    }).filter(d=>d.bacDiff!==0||d.pctDiff!==0||d.acDiff!==0||d.isNew);
  },[acts,baseline]);

  // ── What-If Scenarios (state declared above) ──
  const [customScen,setCustomScen]=useState({spiAdj:1.0,cpiAdj:1.0});

  const scenarioResults=useMemo(()=>scenarios.map(s=>{
    const adjSPI=kpi.SPI*s.spiAdj;
    const adjCPI=kpi.CPI*s.cpiAdj;
    const adjEAC=adjCPI>0?kpi.bac/adjCPI:kpi.bac;
    const adjDur=adjSPI>0?+(+project.duration/adjSPI).toFixed(1):+project.duration;
    const adjSlip=+(adjDur-+project.duration).toFixed(1);
    return{...s,adjSPI:+adjSPI.toFixed(3),adjCPI:+adjCPI.toFixed(3),adjEAC,adjDur,adjSlip,vac:kpi.bac-adjEAC};
  }),[scenarios,kpi,project]);

  // ── KPI Targets ──
  const [kpiTargets,setKpiTargets]=useState({spi:1.0,cpi:1.0,progress:100,eac:kpi.bac||0});
  const generateNarrative=async()=>{
    setNarrativeLoading(true);setNarrativeError("");setNarrativeText("");
    const prompt=`أنت خبير في إدارة مشاريع البنية التحتية وضبط التكلفة. اكتب تقريراً سردياً احترافياً باللغة العربية (4-6 فقرات) يُحلل الوضع الحالي للمشروع التالي بأسلوب رسمي مناسب لتقديمه للإدارة العليا:

المشروع: ${project.name}
رقم العقد: ${project.number}
العميل: ${project.client}
المقاول: ${project.contractor}

--- مؤشرات الأداء (EVM) ---
BAC (الميزانية الأصلية): ${fmt(kpi.bac)} ريال
PV (القيمة المخططة): ${fmt(kpi.pv)} ريال
EV (القيمة المكتسبة): ${fmt(kpi.ev)} ريال
AC (التكلفة الفعلية): ${fmt(kpi.ac)} ريال
SPI (مؤشر أداء الجدول): ${kpi.SPI.toFixed(3)}
CPI (مؤشر أداء التكلفة): ${kpi.CPI.toFixed(3)}
SV (انحراف الجدول): ${fmt(kpi.SV)} ريال
CV (انحراف التكلفة): ${fmt(kpi.CV)} ريال
EAC (التقدير عند الإتمام): ${fmt(kpi.EAC)} ريال
ETC (تكلفة الإتمام): ${fmt(kpi.ETC)} ريال
TCPI (الكفاءة المستهدفة): ${kpi.TCPI.toFixed(3)}
نسبة الإنجاز: ${kpi.prog.toFixed(1)}%
الإنجاز المرجّح بالميزانية: ${weightedProg.toFixed(1)}%
الانزياح الزمني المتوقع: ${durationForecast.slipMonths} شهر

--- أداء التخصصات ---
${byDisc.map(d=>`${d.disc}: إنجاز ${Math.round(d.avgPct)}%, CPI=${d.CPI>0?d.CPI.toFixed(2):"—"}, SPI=${d.SPI>0?d.SPI.toFixed(2):"—"}`).join("\n")}

--- التنبيهات النشطة ---
${alerts.length?alerts.map(a=>a.msg).join("\n"):"لا توجد تنبيهات"}

--- المخاطر الحرجة ---
${risks.filter(r=>r.prob*r.impact>=9&&r.status==="مفتوح").map(r=>`${r.title} (درجة ${r.prob*r.impact})`).join("\n")||"لا توجد مخاطر عالية مفتوحة"}

التقرير يجب أن يتضمن:
1. فقرة افتتاحية عن الوضع العام للمشروع
2. تحليل الأداء المالي والجدولي
3. أبرز مجالات المخاوف والمخاطر
4. التوقعات عند الإتمام
5. التوصيات الرئيسية للإدارة

اكتب فقط النص السردي بدون ترقيم أو عناوين، وبأسلوب متدفق احترافي.`;
    try{
      const { data, error } = await supabase.functions.invoke("generate-evm-narrative", { body: { prompt } });
      if(error) throw new Error(error.message || "فشل الاتصال");
      if(data?.error) throw new Error(data.error);
      const txt = data?.text || "";
      if(!txt) throw new Error("تقرير فارغ من الخدمة");
      setNarrativeText(txt);
      toast.success("✨ تم توليد التقرير السردي");
      pushHistory({kind:"narrative",mode:"ai",status:"success",message:`AI (${txt.length} حرف)`});
    }catch(e){
      setNarrativeError("فشل توليد التقرير: "+e.message);
      toast.error("⚠️ "+e.message);
      pushHistory({kind:"narrative",mode:"ai",status:"failure",message:e.message});
    }
    finally{setNarrativeLoading(false);}
  };

  // ── Local narrative generator (بدون AI) ──
  const generateLocalNarrative=()=>{
    try{
      const status = kpi.CPI>=1 && kpi.SPI>=1 ? "أداء ممتاز" : kpi.CPI>=0.95 && kpi.SPI>=0.95 ? "أداء جيد" : kpi.CPI>=0.9 || kpi.SPI>=0.9 ? "أداء يحتاج إلى متابعة" : "أداء حرج يستدعي تدخلاً فورياً";
      const txt = `يعرض هذا التقرير الوضع الراهن لمشروع «${project.name}» (عقد رقم ${project.number}) المُنفَّذ لصالح ${project.client} بواسطة ${project.contractor}. الميزانية المعتمدة عند الإتمام (BAC) تبلغ ${fmt(kpi.bac)} ريال، وتاريخ بدء التنفيذ ${project.startDate||"غير محدد"} على أن ينتهي في ${project.endDate||"غير محدد"} بمدة إجمالية ${project.duration||"-"} شهراً.

على صعيد الأداء العام، حقق المشروع نسبة إنجاز فعلية بلغت ${kpi.prog.toFixed(1)}%، وبلغت القيمة المكتسبة (EV) ${fmt(kpi.ev)} ريال مقابل قيمة مخططة (PV) قدرها ${fmt(kpi.pv)} ريال، وتكلفة فعلية (AC) قدرها ${fmt(kpi.ac)} ريال. وعليه فإن مؤشر أداء التكلفة (CPI) بلغ ${kpi.CPI.toFixed(2)} ومؤشر أداء الجدول (SPI) ${kpi.SPI.toFixed(2)}، ما يعكس ${status}.

من ناحية الانحرافات، سجّل المشروع انحراف تكلفة (CV) قدره ${fmt(kpi.CV)} ريال وانحراف جدول (SV) قدره ${fmt(kpi.SV)} ريال. ${kpi.CV<0?`يُشير ذلك إلى تجاوز مالي يتطلب مراجعة بنود الصرف الأعلى من المتوقع.`:`يدل ذلك على ضبط جيد للتكاليف ضمن الميزانية.`} ${kpi.SV<0?`كما يوجد تأخر في الإنجاز مقارنةً بالخطة، ويُتوقع انزياح زمني قدره ${durationForecast.slipMonths} شهراً.`:`ويسير الجدول الزمني وفق الخطة.`}

استناداً إلى الأداء الحالي، يُقدَّر إجمالي تكلفة الإتمام (EAC) بمبلغ ${fmt(kpi.EAC)} ريال، ${kpi.EAC>kpi.bac?`أي بتجاوز قدره ${fmt(kpi.EAC-kpi.bac)} ريال عن الميزانية المعتمدة`:`أي ضمن حدود الميزانية المعتمدة بهامش وفر قدره ${fmt(kpi.bac-kpi.EAC)} ريال`}. ويُظهر مؤشر الكفاءة المستهدفة (TCPI) قيمة ${kpi.TCPI.toFixed(2)}، ${kpi.TCPI<=1?`وهي قيمة قابلة للتحقيق.`:kpi.TCPI<=1.1?`وهي تتطلب رفع كفاءة الأداء.`:`وهي صعبة المنال وتستدعي مراجعة شاملة للنطاق والموارد.`}

${alerts.length?`تجدر الإشارة إلى وجود ${alerts.length} تنبيه(ات) نشطة تشمل: ${alerts.slice(0,3).map(a=>a.msg).join("، ")}.`:`لا توجد تنبيهات حرجة في الوقت الراهن.`} ${risks.filter(r=>r.prob*r.impact>=9&&r.status==="مفتوح").length?`كما يوجد ${risks.filter(r=>r.prob*r.impact>=9&&r.status==="مفتوح").length} مخاطر عالية مفتوحة تتطلب خطط استجابة فورية.`:""}

توصي إدارة المشروع بـ: (1) المتابعة المستمرة للأنشطة ذات الانحراف العالي، (2) تفعيل خطط معالجة المخاطر الحرجة، (3) ${kpi.CPI<1?`إعادة تقييم بنود التكلفة المتجاوزة`:`الحفاظ على نمط الضبط المالي الحالي`}، (4) ${kpi.SPI<1?`تسريع وتيرة التنفيذ في الأنشطة المتأخرة`:`الإبقاء على وتيرة الإنجاز`}.`;
      setNarrativeText(txt);
      setNarrativeError("");
      toast.success("📝 تم توليد التقرير محلياً");
      pushHistory({kind:"narrative",mode:"local",status:"success",message:`Local (${txt.length} حرف)`});
    }catch(e){
      pushHistory({kind:"narrative",mode:"local",status:"failure",message:e.message||"خطأ غير معروف"});
      toast.error("⚠️ فشل التوليد المحلي");
    }
  };

  // ── Export narrative report to PDF (with KPIs table) ──
  const exportNarrativePDF=()=>{
    if(!narrativeText){toast.error("لا يوجد تقرير لتصديره — قم بتوليده أولاً");return;}
    try{
      const doc=new jsPDF({orientation:"p",unit:"mm",format:"a4"});
      const pw=doc.internal.pageSize.getWidth();
      // Header band
      doc.setFillColor(26,26,46);doc.rect(0,0,pw,28,"F");
      doc.setTextColor(255,255,255);doc.setFontSize(16);doc.text("EVM Narrative Report",pw/2,12,{align:"center"});
      doc.setFontSize(10);doc.text(`${project.name} — ${project.number}`,pw/2,20,{align:"center"});
      doc.setFontSize(8);doc.text(new Date().toLocaleString("en-GB"),pw/2,25,{align:"center"});
      // KPI table
      autoTable(doc,{
        startY:34,
        head:[["Metric","Value","Metric","Value"]],
        body:[
          ["BAC",fmt(kpi.bac),"EAC",fmt(kpi.EAC)],
          ["PV",fmt(kpi.pv),"ETC",fmt(kpi.ETC)],
          ["EV",fmt(kpi.ev),"VAC",fmt(kpi.bac-kpi.EAC)],
          ["AC",fmt(kpi.ac),"TCPI",kpi.TCPI.toFixed(3)],
          ["SPI",kpi.SPI.toFixed(3),"CPI",kpi.CPI.toFixed(3)],
          ["SV",fmt(kpi.SV),"CV",fmt(kpi.CV)],
          ["Progress",kpi.prog.toFixed(1)+"%","Slip (mo)",String(durationForecast.slipMonths)],
        ],
        styles:{fontSize:9,halign:"center"},
        headStyles:{fillColor:[99,102,241],textColor:255,fontStyle:"bold"},
        margin:{left:10,right:10},
      });
      // Cash-flow forecast mini table
      const fc=cfCum.filter(c=>c.isForecast).slice(0,12);
      if(fc.length){
        autoTable(doc,{
          startY:(doc.lastAutoTable?.finalY||60)+4,
          head:[["Forecast Month","AC (M)","EV (M)","AC Cum","Gap"]],
          body:fc.map(r=>[r.label,r.acM.toFixed(2),r.evM.toFixed(2),r.acCum.toFixed(1),(r.acCum-r.pvCum).toFixed(2)]),
          styles:{fontSize:8,halign:"center"},
          headStyles:{fillColor:[139,92,246],textColor:255},
          margin:{left:10,right:10},
        });
      }
      // Narrative body
      let y=(doc.lastAutoTable?.finalY||80)+8;
      doc.setTextColor(40,40,40);doc.setFontSize(11);doc.text("Narrative (Arabic):",10,y);y+=6;
      doc.setFontSize(9);
      const lines=doc.splitTextToSize(narrativeText,pw-20);
      lines.forEach(ln=>{
        if(y>280){doc.addPage();y=15;}
        doc.text(ln,pw-10,y,{align:"right"});y+=5;
      });
      // Footer
      const pages=doc.getNumberOfPages();
      for(let i=1;i<=pages;i++){doc.setPage(i);doc.setFontSize(8);doc.setTextColor(150);doc.text(`Page ${i}/${pages}`,pw/2,290,{align:"center"});}
      doc.save(`narrative_${project.number||"report"}_${new Date().toISOString().slice(0,10)}.pdf`);
      toast.success("📄 تم تصدير التقرير PDF");
      pushHistory({kind:"narrative",mode:"pdf",status:"success",message:"تصدير PDF"});
    }catch(e){
      toast.error("فشل التصدير: "+e.message);
      pushHistory({kind:"narrative",mode:"pdf",status:"failure",message:e.message});
    }
  };

  // ── Validate project dates ↔ cash flow consistency ──
  const validateProjectDates=useCallback(()=>{
    const errs=[];
    const s=parseIso(project.startDate),e=parseIso(project.endDate);
    const dur=Number(project.duration)||0;
    if(!s)errs.push("تاريخ بداية المشروع غير محدد");
    if(!e)errs.push("تاريخ نهاية المشروع غير محدد");
    if(s&&e&&e<=s)errs.push("تاريخ النهاية يجب أن يكون بعد البداية");
    if(dur<=0)errs.push("مدة المشروع غير صالحة");
    if(s&&e&&dur>0){
      const calc=Math.round(monthsBetween(s,e));
      if(Math.abs(calc-dur)>1)errs.push(`عدم تطابق: المدة ${dur} شهر بينما الفرق بين التواريخ ${calc} شهر`);
    }
    if(s&&dur>0){
      const outside=cf.filter(c=>!c.isForecast).map(c=>Number(String(c.month).replace(/^M/,""))-1).filter(i=>i<0||i>=dur).length;
      if(outside>0)errs.push(`${outside} صف(وف) في التدفق النقدي خارج نطاق المشروع — أعد التوليد`);
    }
    return errs;
  },[project.startDate,project.endDate,project.duration,cf]);

  // ── Regenerate CF rows from project dates ──
  const regenerateCashFlowFromDates=useCallback((opts={})=>{
    const start=parseIso(project.startDate); const dur=Math.max(1,Math.min(120,Number(project.duration)||12));
    if(!start){
      toast.error("⚠️ حدّد تاريخ بداية المشروع أولاً");
      pushHistory({kind:"cashflow",status:"failure",message:"تاريخ البداية غير محدد",opts});
      return;
    }
    // Auto-consistency check (warn but allow if user confirms)
    const errs=validateProjectDates();
    const blocking=errs.filter(m=>!m.includes("في التدفق النقدي خارج نطاق")); // out-of-window is what we're fixing
    if(blocking.length){
      const ok=window.confirm("⚠️ تنبيهات تناسق:\n• "+blocking.join("\n• ")+"\n\nمتابعة التوليد؟");
      if(!ok){pushHistory({kind:"cashflow",status:"failure",message:"ألغى المستخدم بسبب: "+blocking.join("; "),opts});return;}
    }
    const bacM=(kpi.bac||0)/1e6;
    const evenPV=bacM>0?+(bacM/dur).toFixed(2):0;
    const newRows=Array.from({length:dur},(_,i)=>{
      const d=new Date(start);d.setMonth(d.getMonth()+i);
      const monthLbl=`${MN[d.getMonth()]} ${d.getFullYear()}`;
      const existing=cf.find(c=>c.month===`M${i+1}`);
      return{
        id:i,
        month:`M${i+1}`,
        label:monthLbl,
        pvM: opts.distributePV ? evenPV : (existing?.pvM ?? evenPV),
        acM: opts.resetActuals ? 0 : (existing?.acM ?? 0),
        evM: opts.resetActuals ? 0 : (existing?.evM ?? 0),
        isForecast:false,
      };
    });
    setCf(newRows);
    toast.success(`✅ تم توليد ${dur} شهراً من ${project.startDate}`);
    logChange(`إعادة توليد التدفق النقدي (${dur} شهر) من تواريخ المشروع`,"edit");
    pushHistory({kind:"cashflow",status:"success",message:`توليد ${dur} شهر${opts.distributePV?" + توزيع PV":""}${opts.resetActuals?" (تصفير)":""}`,opts});
  },[project.startDate,project.duration,kpi.bac,cf,validateProjectDates,pushHistory]);

  // Lock-out check: returns true if a CF row is outside the project window
  const cfRowOutOfWindow=useCallback((row)=>{
    const start=parseIso(project.startDate); const dur=Number(project.duration)||0;
    if(!start||!dur||row.isForecast)return false;
    const idx=Number(String(row.month).replace(/^M/,""))-1;
    return idx<0||idx>=dur;
  },[project.startDate,project.duration]);

  const cfWithForecast=useMemo(()=>{
    const etcM=kpi.ETC/1e6,totalEV=cf.reduce((s,c)=>s+c.evM,0),remEV=Math.max(0,kpi.bac/1e6-totalEV);
    const N=Math.max(1,Math.min(24,Number(forecastSettings.months)||6));
    const g=(Number(forecastSettings.growthPct)||0)/100;
    const baseAC=etcM>0?etcM/N:0;
    const baseEV=remEV>0?remEV/N:0;
    // Use last actual month label to continue dates if possible
    const startDate=parseIso(project.startDate);
    const lastIdx=cf.length;
    const forecast=Array.from({length:N},(_,i)=>{
      let label;
      if(startDate){const d=new Date(startDate);d.setMonth(d.getMonth()+lastIdx+i);label=`${MN[d.getMonth()]} ${d.getFullYear()}`;}
      else label=MN[(12+i)%12]+" 2026";
      const factor=Math.pow(1+g,i);
      return{id:1000+i,month:`F${i+1}`,label,pvM:0,acM:+(baseAC*factor).toFixed(2),evM:+(baseEV*factor).toFixed(2),isForecast:true};
    });
    return[...cf,...forecast];
  },[cf,kpi,forecastSettings,project.startDate]);
  const cfCum=useMemo(()=>{let pvC=0,acC=0,evC=0;return cfWithForecast.map(c=>{pvC+=c.pvM;acC+=c.acM;evC+=c.evM;return{...c,pvCum:+pvC.toFixed(1),acCum:+acC.toFixed(1),evCum:+evC.toFixed(1)};});},[cfWithForecast]);
  const cfStats=useMemo(()=>{
    const a=cf.filter(c=>!c.isForecast);
    return{tPV:a.reduce((s,c)=>s+c.pvM,0),tAC:a.reduce((s,c)=>s+c.acM,0),tEV:a.reduce((s,c)=>s+c.evM,0),fAC:cfWithForecast.filter(c=>c.isForecast).reduce((s,c)=>s+c.acM,0)};
  },[cf,cfWithForecast]);

  // Forecast deficit detection (cumulative AC exceeding cumulative PV by threshold)
  const forecastDeficit=useMemo(()=>{
    const thr=Number(forecastSettings.deficitThresholdM)||0;
    const fc=cfCum.filter(c=>c.isForecast);
    for(const r of fc){const gap=r.acCum-r.pvCum;if(gap>thr&&thr>=0&&fc.length){return{month:r.month,label:r.label,gap:+gap.toFixed(2)};}}
    return null;
  },[cfCum,forecastSettings.deficitThresholdM]);
  const deficitShownRef=useRef("");
  useEffect(()=>{
    if(forecastDeficit && deficitShownRef.current!==forecastDeficit.month){
      toast.warning(`⚠️ عجز نقدي متوقع في ${forecastDeficit.label} بفجوة ${forecastDeficit.gap}M`,{duration:6000});
      deficitShownRef.current=forecastDeficit.month;
    }
  },[forecastDeficit]);
  // End-date approaching alert
  const endingSoonRef=useRef(false);
  useEffect(()=>{
    if(timeMetrics.valid && !timeMetrics.overdue && timeMetrics.daysLeft<=30 && timeMetrics.daysLeft>0 && !endingSoonRef.current){
      toast.warning(`⏰ تاريخ نهاية المشروع بعد ${timeMetrics.daysLeft} يوم فقط`,{duration:6000});
      endingSoonRef.current=true;
    }
    if(timeMetrics.daysLeft>30)endingSoonRef.current=false;
  },[timeMetrics.daysLeft,timeMetrics.overdue,timeMetrics.valid]);

  // Risk matrix data
  const riskMatrix=useMemo(()=>risks.map(r=>({...r,score:r.prob*r.impact,x:r.prob,y:r.impact,z:200})),[risks]);
  const riskStats=useMemo(()=>({
    open:risks.filter(r=>r.status==="مفتوح").length,
    critical:risks.filter(r=>r.prob*r.impact>=16).length,
    high:risks.filter(r=>{const s=r.prob*r.impact;return s>=9&&s<16;}).length,
    totalCost:risks.reduce((s,r)=>s+(r.cost||0),0),
  }),[risks]);

  // ── Handlers ──
  const saveEdit=id=>{
    const e=validateAct(editBuf,acts.map(a=>a.id),id);
    if(Object.keys(e).length){setEditErrs(e);return;}
    setActs(p=>p.map(a=>a.id===id?{...a,...editBuf,bac:+editBuf.bac,ac:+editBuf.ac,pct:+editBuf.pct,items:+editBuf.items}:a));
    setEditId(null);setEditErrs({});
  };
  const addActFn=()=>{
    const e=validateAct(newAct,acts.map(a=>a.id));
    if(Object.keys(e).length){setAddErrs(e);return;}
    setActs(p=>[...p,{...newAct,bac:+newAct.bac,ac:+newAct.ac,pct:+newAct.pct,items:+newAct.items}]);
    setAddModal(false);setNewAct({nameAr:"",id:"",disc:"CIVIL",items:1,bac:0,ac:0,pct:0});setAddErrs({});
  };
  const delAct=id=>{if(!window.confirm("حذف هذا النشاط؟"))return;setActs(p=>p.filter(a=>a.id!==id));if(selAct===id)setSelAct(null);};
  const saveCF=id=>{const e=validateCF(cfBuf);if(Object.keys(e).length){setCfErrs(e);return;}setCf(p=>p.map(c=>c.id===id?{...c,...cfBuf,pvM:+cfBuf.pvM,acM:+cfBuf.acM,evM:+cfBuf.evM}:c));setCfEditId(null);setCfErrs({});};
  const addRisk=()=>{
    if(!newRisk.title){alert("اسم المخاطرة مطلوب");return;}
    const id="R"+(String(risks.length+1).padStart(3,"0"));
    setRisks(p=>[...p,{...newRisk,id,prob:+newRisk.prob,impact:+newRisk.impact,cost:+newRisk.cost}]);
    setRiskModal(false);setNewRisk({id:"",title:"",category:"تكلفة",prob:2,impact:2,mitigation:"",status:"مفتوح",owner:"",cost:0});
  };
  const addIssue=()=>{
    if(!newIssue.title){alert("عنوان المشكلة مطلوب");return;}
    const id="I"+(String(issues.length+1).padStart(3,"0"));
    setIssues(p=>[...p,{...newIssue,id,cost:+newIssue.cost}]);
    setIssueModal(false);setNewIssue({id:"",title:"",disc:"CIVIL",priority:"متوسطة",status:"مفتوح",date:"",impact:"",cost:0,owner:""});
  };

  // ── Multi-format Import ──
  const [importType,setImportType]=useState("csv"); // csv | excel | pdf
  const [importSheet,setImportSheet]=useState(0);
  const [importSheets,setImportSheets]=useState([]);

  const parseCSVText=txt=>{
    try{
      const lines=txt.trim().split("\n").filter(l=>l.trim());
      if(!lines.length){setImportErr("الملف فارغ");return;}
      const sep=lines[0].includes("\t")?"\t":",";
      const headers=lines[0].split(sep).map(h=>h.trim().toLowerCase().replace(/\s+/g,""));
      const required=["id","namear","disc","bac","ac","pct"];
      const missing=required.filter(r=>!headers.includes(r));
      if(missing.length){setImportErr("أعمدة ناقصة: "+missing.join(", "));return;}
      const rows=lines.slice(1).map(l=>{
        const cols=l.split(sep);const obj={};
        headers.forEach((h,i)=>obj[h]=(cols[i]||"").trim());
        return{id:obj.id,nameAr:obj.namear||obj.nameار||"",disc:(obj.disc||"GENERAL").toUpperCase(),items:+obj.items||1,bac:+obj.bac||0,ac:+obj.ac||0,pct:Math.min(100,Math.max(0,+obj.pct||0))};
      }).filter(r=>r.id&&r.bac>0);
      if(!rows.length){setImportErr("لا توجد صفوف صالحة — تحقق من القيم");return;}
      setImportPreview(rows);setImportErr("");
    }catch(e){setImportErr("خطأ في تحليل CSV: "+e.message);}
  };

  const parseExcelFile=(file,sheetIdx)=>{
    const reader=new FileReader();
    reader.onload=ev=>{
      try{
        const data=new Uint8Array(ev.target.result);
        const wb=XLSX.read(data,{type:"array"});
        const names=wb.SheetNames;
        setImportSheets(names);
        const sheetName=names[sheetIdx??0]||names[0];
        const ws=wb.Sheets[sheetName];
        const json=XLSX.utils.sheet_to_json(ws,{defval:"",raw:false});
        if(!json.length){setImportErr("الشيت فارغ أو لا يحتوي على بيانات");return;}

        // ── Aggressive column normalizer ──
        const norm=s=>String(s||"")
          .trim()
          .toLowerCase()
          .replace(/\s+/g,"")
          .replace(/[_\-\/\\]/g,"")
          .replace(/[أإآا]/g,"ا")
          .replace(/[يى]/g,"ي")
          .replace(/ة/g,"ه");

        // ── Column alias map ──
        const ALIASES={
          id:   ["id","code","كود","رقم","رقمالنشاط","activityid","actcode","no","#","رقمالبند","item"],
          nameAr:["namear","name","nameار","الاسم","النشاط","اسمالنشاط","activityname","description","وصف","الوصف","اسم","البيان"],
          disc: ["disc","discipline","التخصص","تخصص","category","الفئه","الفئة","section","قسم"],
          items:["items","البنود","عددالبنود","qty","count","العدد","بنود"],
          bac:  ["bac","budgetatcompletion","الميزانية","الميزانيهالكليه","budget","totalbudget","الاجمالي","الإجمالي","تكلفهمخططه","pvtotal","مبلغالعقد","قيمةالعقد","قيمهالعقد","contractvalue"],
          ac:   ["ac","actualcost","التكلفةالفعلية","التكلفهالفعليه","costtodate","actualspend","الصرففعلي","صرففعلي","مصروف","مصروفات","costactual"],
          pct:  ["pct","percentcomplete","progress","الانجاز","الإنجاز","نسبةالانجاز","نسبهالانجاز","completepct","complete%","pct%","انجاز%","اتمام","progress%"],
        };

        // ── Find which actual column maps to which field ──
        const rawHeaders=Object.keys(json[0]||{});
        const normHeaders=rawHeaders.map(h=>({raw:h,norm:norm(h)}));

        const colMap={};
        Object.entries(ALIASES).forEach(([field,aliases])=>{
          for(const alias of aliases){
            const match=normHeaders.find(h=>h.norm===alias||h.norm.includes(alias)||alias.includes(h.norm));
            if(match){colMap[field]=match.raw;break;}
          }
        });

        // ── Diagnostic: what was found ──
        const missing=["id","bac"].filter(f=>!colMap[f]);
        if(missing.length&&rawHeaders.length>0){
          const foundCols=rawHeaders.slice(0,8).join(" | ");
          setImportErr(
            `تعذّر مطابقة الأعمدة الأساسية: ${missing.join(", ")}\n\n`+
            `الأعمدة الموجودة في الملف: ${foundCols}\n\n`+
            `تأكد أن الملف يحتوي على أعمدة مثل: id, nameAr, disc, bac, ac, pct\n`+
            `أو استخدم القالب من زر "تحميل قالب Excel"`
          );
          return;
        }

        // ── Parse number helper (handles "1,500,000" and "1500000") ──
        const parseNum=v=>{
          if(v===null||v===undefined||v==="")return 0;
          const n=+String(v).replace(/,/g,"").replace(/[ر.س]/g,"").trim();
          return isNaN(n)?0:n;
        };

        // ── Map rows ──
        const rows=json.map((r,idx)=>{
          const get=field=>colMap[field]?r[colMap[field]]:"";
          const idVal=String(get("id")||"").trim()||`ROW-${idx+1}`;
          const disc=norm(get("disc")||"general");
          const discMap={general:"GENERAL",civil:"CIVIL",مدني:"CIVIL",عام:"GENERAL",كهرباء:"ELECTRICAL",electrical:"ELECTRICAL",mechanical:"MECHANICAL",ميكانيكا:"MECHANICAL",architectural:"ARCHITECTURAL",معماري:"ARCHITECTURAL"};
          const discFinal=Object.entries(discMap).find(([k])=>disc.includes(k))?.[1]||"GENERAL";
          return{
            id:idVal,
            nameAr:String(get("nameAr")||get("id")||"").trim()||`نشاط ${idx+1}`,
            disc:discFinal,
            items:Math.max(1,parseNum(get("items"))||1),
            bac:parseNum(get("bac")),
            ac:parseNum(get("ac")),
            pct:Math.min(100,Math.max(0,parseNum(get("pct")))),
          };
        }).filter(r=>r.bac>0);

        if(!rows.length){
          setImportErr(
            `تم التعرف على الأعمدة لكن لا توجد صفوف بقيمة BAC > 0.\n`+
            `تأكد أن عمود الميزانية (bac) يحتوي على أرقام وليس نصاً.`
          );
          return;
        }
        setImportPreview(rows);
        setImportErr(`✅ تم التعرف على ${rows.length} نشاط من شيت "${sheetName}"`);
      }catch(e){setImportErr("خطأ في قراءة Excel: "+e.message);}
    };
    reader.readAsArrayBuffer(file);
  };

  const parsePDFFile=async file=>{
    // Extract text from PDF using FileReader + simple text search
    setImportErr("");
    const reader=new FileReader();
    reader.onload=async ev=>{
      try{
        // Read as binary and try to extract text content
        const text=ev.target.result;
        // Try to find CSV-like patterns in PDF text content
        const lines=text.split(/[\n\r]+/).filter(l=>l.trim().length>3);
        // Look for lines that look like activity data (contain numbers)
        const dataLines=lines.filter(l=>/\d{4,}/.test(l)&&l.includes(","));
        if(dataLines.length>0){
          parseCSVText(dataLines.join("\n"));
        }else{
          setImportErr("⚠️ تعذّر استخراج بيانات جدولية من ملف PDF.\n\nتلميح: حوّل ملف PDF إلى Excel أو CSV أولاً باستخدام:\n• Adobe Acrobat → Export to Excel\n• smallpdf.com → PDF to Excel\n• ilovepdf.com");
          setImportPreview([]);
        }
      }catch(e){setImportErr("خطأ في قراءة PDF: "+e.message);}
    };
    reader.readAsText(file,"utf-8");
  };

  const handleFileUpload=e=>{
    const file=e.target.files[0];if(!file)return;
    const ext=file.name.split(".").pop().toLowerCase();
    if(ext==="csv"||ext==="txt"){
      setImportType("csv");lastExcelFile.current=null;
      const r=new FileReader();
      r.onload=ev=>{const txt=ev.target.result;setImportText(txt);parseCSVText(txt);};
      r.readAsText(file,"utf-8");
    }else if(ext==="xlsx"||ext==="xls"){
      setImportType("excel");setImportText("");setImportSheet(0);
      lastExcelFile.current=file;
      parseExcelFile(file,0);
    }else if(ext==="pdf"){
      setImportType("pdf");setImportText("");lastExcelFile.current=null;
      parsePDFFile(file);
    }else if(ext==="xer"){
      setImportType("csv");lastExcelFile.current=null;
      const r=new FileReader();
      r.onload=ev=>{
        try{
          const{activities,schedule,_meta}=parseXERText(ev.target.result);
          if(!activities.length){setImportErr("لم يتم العثور على أنشطة (TASK) في ملف XER");return;}
          setImportPreview(activities);
          // Auto-apply schedule dates to project
          if(schedule.start||schedule.end){
            setProject(p=>recomputeProjectDates({...p,startDate:schedule.start||p.startDate,endDate:schedule.end||p.endDate}));
            toast.success(`📅 تم تحديث الجدول الزمني: ${schedule.start} → ${schedule.end}`);
          }
          setImportErr(`✅ Primavera P6: ${activities.length} نشاط${_meta.projectName?` · مشروع "${_meta.projectName}"`:""}${schedule.start?` · الجدول: ${schedule.start} → ${schedule.end}`:""}`);
          toast.success(`تم قراءة ${activities.length} نشاط من XER`);
        }catch(err){setImportErr("خطأ في قراءة XER: "+err.message);}
      };
      r.readAsText(file,"utf-8");
    }else{
      setImportErr("صيغة غير مدعومة. الصيغ المقبولة: CSV, Excel (.xlsx/.xls), PDF, XER (Primavera P6)");
    }
    e.target.value="";
  };

  const confirmImport=()=>{
    const existing=acts.map(a=>a.id);
    const newRows=importPreview.filter(r=>!existing.includes(r.id));
    const updated=importPreview.filter(r=>existing.includes(r.id));
    setActs(p=>[...p.map(a=>{const u=updated.find(x=>x.id===a.id);return u?{...a,...u}:a;}),...newRows]);
    logChange(`استيراد ${newRows.length} نشاط جديد و تحديث ${updated.length} نشاط من ملف`,"import");
    setImportModal(false);setImportText("");setImportPreview([]);setImportErr("");setImportSheets([]);
  };

  // ── Persistence: auto-save key data to localStorage ──
  useEffect(()=>{
    try{
      const snap={acts,risks,issues,resources,milestones,cf,project,scenarios,baseline,changelog};
      localStorage.setItem("evm_dashboard_v2",JSON.stringify(snap));
    }catch(e){}
  },[acts,risks,issues,resources,milestones,cf,project,scenarios,baseline,changelog]);

  // ── Notifications ──
  const [notifications,setNotifications]=useState([
    {id:"N001",type:"critical",msg:"SPI حرج — تأخر 44% عن الجدول الزمني",ts:"منذ 5 دقائق",read:false},
    {id:"N002",type:"warn",   msg:"EAC يتجاوز الميزانية بـ 24M ريال",      ts:"منذ 1 ساعة",  read:false},
    {id:"N003",type:"info",   msg:"تم استيراد 5 أنشطة جديدة بنجاح",         ts:"منذ 3 ساعات", read:true},
    {id:"N004",type:"info",   msg:"تم حفظ التقرير السردي",                   ts:"منذ يوم",      read:true},
  ]);
  const [showNotif,setShowNotif]=useState(false);
  const unreadCount=notifications.filter(n=>!n.read).length;
  const markAllRead=()=>setNotifications(p=>p.map(n=>({...n,read:true})));
  const addNotif=(msg,type="info")=>setNotifications(p=>[{id:"N"+Date.now(),type,msg,ts:"الآن",read:false},...p].slice(0,20));

  // ── Global Search ──
  const [globalSearch,setGlobalSearch]=useState("");
  const [showGlobalSearch,setShowGlobalSearch]=useState(false);
  const globalResults=useMemo(()=>{
    if(!globalSearch.trim()||globalSearch.length<2)return[];
    const q=globalSearch.trim().toLowerCase();
    const res=[];
    acts.filter(a=>a.nameAr.includes(globalSearch)||a.id.toLowerCase().includes(q)).forEach(a=>res.push({type:"activity",label:a.nameAr,sub:a.id,action:()=>{setSelAct(a.id);setTab("table");}}));
    risks.filter(r=>r.title.includes(globalSearch)).forEach(r=>res.push({type:"risk",label:r.title,sub:r.id,action:()=>setTab("risks")}));
    milestones.filter(m=>m.title.includes(globalSearch)).forEach(m=>res.push({type:"milestone",label:m.title,sub:m.date,action:()=>setTab("gantt")}));
    return res.slice(0,8);
  },[globalSearch,acts,risks,milestones]);

  // ── Keyboard shortcuts ──
  useEffect(()=>{
    const handler=e=>{
      if(e.ctrlKey||e.metaKey){
        if(e.key==="k"){e.preventDefault();setShowGlobalSearch(p=>!p);}
        if(e.key==="d"){e.preventDefault();setDarkMode(p=>!p);}
        if(e.key==="p"){e.preventDefault();window.print();}
        if(e.key==="e"){e.preventDefault();exportExcelFull(acts,kpi,cf,risks,issues,resources,project);}
      }
      if(e.key==="Escape"){setShowGlobalSearch(false);setShowNotif(false);setShortcutsModal(false);setKpiDrill(null);}
      if(e.key==="?"&&!e.ctrlKey&&!e.metaKey&&!["INPUT","TEXTAREA","SELECT"].includes(e.target.tagName)){e.preventDefault();setShortcutsModal(p=>!p);}

    };
    window.addEventListener("keydown",handler);
    return()=>window.removeEventListener("keydown",handler);
  },[acts,kpi,cf,risks,issues,resources,project]);

  // ── Budget Revision / Contingency ──
  const [contingency,setContingency]=useState({amount:5000000,used:1200000,approved:true});
  const [revisions,setRevisions]=useState([
    {id:"BR-001",date:"2025-02-10",reason:"زيادة كميات الحفر",amount:2500000,approved:true,disc:"CIVIL"},
    {id:"BR-002",date:"2025-03-20",reason:"تغيير مواصفات الأنابيب",amount:-800000,approved:true,disc:"MECHANICAL"},
    {id:"BR-003",date:"2025-04-15",reason:"إضافة أعمال إضافية",amount:1800000,approved:false,disc:"GENERAL"},
  ]);

  // ── Subcontractors ──
  const [subcontractors,setSubcontractors]=useState([
    {id:"SC-001",name:"شركة الإنشاءات المتقدمة",  scope:"أعمال الحفر والردم",         disc:"CIVIL",       contract:3500000,paid:1800000,pct:52,status:"نشط"},
    {id:"SC-002",name:"مؤسسة الكهرباء الحديثة",   scope:"تركيب لوحات التوزيع",        disc:"ELECTRICAL",  contract:1200000,paid:480000, pct:40,status:"نشط"},
    {id:"SC-003",name:"شركة التشطيبات الراقية",    scope:"أعمال البلاط والدهانات",     disc:"ARCHITECTURAL",contract:900000, paid:0,      pct:0, status:"لم يبدأ"},
    {id:"SC-004",name:"مؤسسة الأنابيب الخليجية",  scope:"تركيب أنابيب الصرف الصحي",  disc:"MECHANICAL",  contract:2800000,paid:1960000,pct:70,status:"نشط"},
  ]);

  const TABS=[
    {k:"projects",    lbl:"📁 المشاريع المحفوظة"},
    {k:"overview",    lbl:"📊 نظرة عامة"},
    {k:"cashflow",    lbl:"💵 التدفق النقدي"},
    {k:"charts",      lbl:"📈 الرسوم البيانية"},
    {k:"forecast",    lbl:"🔮 التوقعات"},
    {k:"gantt",       lbl:"📅 جانت والمراحل"},
    {k:"baseline",    lbl:"📐 خط القاعدة"},
    {k:"whatif",      lbl:"🎯 سيناريوهات"},
    {k:"resources",   lbl:"👷 الموارد"},
    {k:"levelling",   lbl:"⚖️ توازن الموارد"},
    {k:"subcontract", lbl:"🤝 المقاولون"},
    {k:"budget",      lbl:"💼 مراجعة الميزانية"},
    {k:"risks",       lbl:"⚠️ المخاطر"},
    {k:"table",       lbl:"📋 البيانات"},
    {k:"changelog",   lbl:"📜 سجل التغييرات"},
    {k:"narrative",   lbl:"📝 التقرير السردي"},
    {k:"report",      lbl:"🖨️ طباعة"},
  ];

  const DM={
    bg:darkMode?"#0f172a":"#f4f5fb",
    card:darkMode?"#1e293b":"#fff",
    border:darkMode?"#334155":"#f0f0f0",
    text:darkMode?"#f1f5f9":"#1a1a2e",
    sub:darkMode?"#94a3b8":"#888",
    sidebar:darkMode?"#1e293b":"#fff",
    sidebarBorder:darkMode?"#334155":"#eee",
  };

  return(
    <DarkCtx.Provider value={darkMode}>
    <style>{`
      .evm-density-compact .evm-kpi-card{padding:9px 11px !important;border-radius:10px !important;}
      .evm-density-compact .evm-kpi-card > div[style*="fontSize:23"]{font-size:17px !important;}
      .evm-density-compact table{font-size:11px !important;}
      .evm-density-compact table th,.evm-density-compact table td{padding:5px 8px !important;line-height:1.35 !important;}
      .evm-density-comfortable .evm-kpi-card{padding:18px 20px !important;}
      .evm-density-comfortable table th,.evm-density-comfortable table td{padding:11px 14px !important;}
      [dir="rtl"] .evm-kpi-card > div[style*="top:6px"]{left:auto !important;right:8px !important;}
      /* Sticky table headers inside scrollable cards */
      .evm-density-compact table thead th,.evm-density-comfortable table thead th{position:sticky;top:0;z-index:5;background:hsl(var(--card));box-shadow:inset 0 -1px 0 hsl(var(--border));}
      /* Print mode — hide chrome, expand content */
      @media print{
        body{background:#fff !important;}
        .evm-no-print,.evm-no-print *{display:none !important;}
        .evm-density-compact,.evm-density-comfortable{height:auto !important;overflow:visible !important;}
        .evm-kpi-card{break-inside:avoid;box-shadow:none !important;border:1px solid #ccc !important;}
        table{page-break-inside:auto;}
        tr{page-break-inside:avoid;page-break-after:auto;}
        thead{display:table-header-group;}
      }
    `}</style>

    <div dir="rtl" className={`evm-density-${density}`} style={{display:"flex",height:"100vh",fontFamily:"'Manrope','Cairo','Segoe UI',sans-serif",background:darkMode?"#0f172a":"hsl(var(--background))",color:darkMode?"#f1f5f9":"hsl(var(--foreground))",fontSize:13,overflow:"hidden"}}>


      {/* ═══ SIDEBAR ═══ */}
      <div style={{width:216,background:darkMode?"#1e293b":"#fff",borderRight:`1px solid ${darkMode?"#334155":"#eee"}`,display:"flex",flexDirection:"column",flexShrink:0,overflow:"hidden"}}>
        <div style={{padding:"12px 14px 10px",borderBottom:"1px solid #f0f0f0"}}>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
            <div style={{width:34,height:34,borderRadius:10,background:"var(--gradient-primary)",display:"flex",alignItems:"center",justifyContent:"center",color:"hsl(var(--primary-foreground))",fontWeight:900,fontSize:11,boxShadow:"var(--shadow-glow)"}}>EVM</div>
            <div style={{flex:1,minWidth:0}}><div style={{fontWeight:800,fontSize:12,lineHeight:1.3}}>Cost Control</div><div style={{fontSize:9,color:"#aaa"}}>EVM Dashboard v2.0</div></div>
            <Link to="/" title="الرئيسية" style={{textDecoration:"none",background:darkMode?"#0f172a":"#f4f5fb",border:`1px solid ${darkMode?"#334155":"#e5e7eb"}`,borderRadius:7,padding:"4px 7px",fontSize:11,color:darkMode?"#f1f5f9":"#1a1a2e",lineHeight:1}}>🏠</Link>
          </div>
          <button onClick={()=>{setProjBuf(project);setProjModal(true);}} style={{marginTop:8,width:"100%",background:darkMode?"#0f172a":"#f4f5fb",border:`1px solid ${darkMode?"#334155":"#e5e7eb"}`,borderRadius:7,padding:"5px 8px",cursor:"pointer",fontSize:10,color:"#555",textAlign:"left",overflow:"hidden",whiteSpace:"nowrap",textOverflow:"ellipsis"}}>
            🏗 {project.name}
          </button>
          <button onClick={()=>{setPickerModal(true);fetchProjects();}} style={{marginTop:6,width:"100%",background:"var(--gradient-primary)",border:"none",borderRadius:7,padding:"7px 8px",cursor:"pointer",fontSize:10,color:"hsl(var(--primary-foreground))",fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center",gap:5,boxShadow:"var(--shadow-md)"}}>
            📂 اختيار مشروع محفوظ {linkedProjectId&&<span style={{background:"hsla(0,0%,100%,.25)",borderRadius:999,padding:"1px 6px",fontSize:8}}>✓ مرتبط</span>}
          </button>
        </div>
        <div style={{padding:"10px 10px 6px",flex:1,overflowY:"auto",display:"flex",flexDirection:"column",gap:2}}>
          <div style={{fontSize:9,fontWeight:700,color:"#ccc",letterSpacing:.8,marginBottom:5}}>DISCIPLINE</div>
          <div onClick={()=>{setSelDisc(null);setSelAct(null);}} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"6px 9px",borderRadius:8,cursor:"pointer",background:!selDisc?"#eef2ff":"transparent",border:!selDisc?"1px solid #c7d2fe":"1px solid transparent"}}>
            <span style={{fontWeight:!selDisc?700:400,color:!selDisc?"#6366f1":"#555",fontSize:11}}>🗂 الكل</span>
            <span style={{background:"#6366f1",color:"#fff",borderRadius:999,padding:"1px 7px",fontSize:9,fontWeight:700}}>{acts.length}</span>
          </div>
          {DISCIPLINES.map(d=>{
            const dd=byDisc.find(x=>x.disc===d)||{avgPct:0,count:0,SPI:0};const sel=selDisc===d;
            return(
              <div key={d} onClick={()=>{setSelDisc(d);setSelAct(null);}} style={{padding:"7px 9px",borderRadius:8,cursor:"pointer",marginBottom:1,background:sel?DC[d]+"18":"transparent",border:sel?`1px solid ${DC[d]}50`:"1px solid transparent",transition:"all .15s"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
                  <div style={{display:"flex",alignItems:"center",gap:5}}><div style={{width:8,height:8,borderRadius:"50%",background:DC[d]}}/><span style={{fontWeight:sel?700:500,fontSize:10,color:sel?DC[d]:"#444"}}>{d}</span></div>
                  <span style={{fontSize:9,fontWeight:700,color:DC[d]}}>{Math.round(dd.avgPct)}%</span>
                </div>
                <PBar pct={dd.avgPct} color={DC[d]} h={3}/>
                <div style={{display:"flex",justifyContent:"space-between",marginTop:3,fontSize:9,color:"#bbb"}}>
                  <span>{dd.count} أنشطة</span><span style={{color:sColor(dd.SPI),fontWeight:600}}>SPI {dd.SPI>0?dd.SPI.toFixed(2):"—"}</span>
                </div>
              </div>
            );
          })}

          {/* Saved-projects quick switcher */}
          {projectsList.length>0&&(
            <>
              <div style={{fontSize:9,fontWeight:700,color:"#ccc",letterSpacing:.8,margin:"12px 2px 5px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                <span>📁 المشاريع</span>
                <span onClick={()=>setTab("projects")} style={{cursor:"pointer",background:"hsl(var(--primary))",color:"hsl(var(--primary-foreground))",borderRadius:999,padding:"1px 7px",fontSize:8,fontWeight:700}}>عرض الكل</span>
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:2,maxHeight:140,overflowY:"auto"}}>
                {projectsList.slice(0,6).map(p=>{
                  const isLinked=linkedProjectId===p.id;
                  return(
                    <div key={p.id} onClick={()=>!loadingItems&&!isLinked&&loadProjectFromDb(p)} title={p.name}
                      style={{padding:"5px 7px",borderRadius:6,cursor:isLinked?"default":"pointer",background:isLinked?"hsl(var(--primary)/.1)":"transparent",border:isLinked?"1px solid hsl(var(--primary)/.3)":"1px solid transparent",display:"flex",alignItems:"center",gap:5}}>
                      <span style={{fontSize:11}}>{isLinked?"📂":"📁"}</span>
                      <div style={{minWidth:0,flex:1}}>
                        <div style={{fontSize:9,fontWeight:isLinked?700:500,color:isLinked?"hsl(var(--primary))":"#555",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.name||"بدون اسم"}</div>
                      </div>
                      {isLinked&&<span style={{width:5,height:5,borderRadius:"50%",background:"hsl(var(--success))"}}/>}
                    </div>
                  );
                })}
              </div>
            </>
          )}
          <div style={{fontSize:9,fontWeight:700,color:"#ccc",letterSpacing:.8,margin:"10px 2px 5px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
            <span>ACTIVITIES</span><span style={{background:"#1a1a2e",color:"#fff",borderRadius:999,padding:"1px 6px",fontSize:9}}>{acts.length}</span>
          </div>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍 بحث..." style={{width:"100%",border:`1px solid ${darkMode?"#334155":"#eee"}`,borderRadius:7,padding:"5px 9px",fontSize:10,marginBottom:4,boxSizing:"border-box",outline:"none",background:darkMode?"#0f172a":"#fff",color:darkMode?"#f1f5f9":"#1a1a2e"}}/>
          <div style={{flex:1,overflowY:"auto",display:"flex",flexDirection:"column",gap:1}}>
            {acts.filter(a=>(!selDisc||a.disc===selDisc)&&(a.nameAr.includes(search)||a.id.toUpperCase().includes(search.toUpperCase()))).map(a=>{
              const{cpi}=calcAct(a);
              return(
                <div key={a.id} onClick={()=>setSelAct(selAct===a.id?null:a.id)} style={{padding:"4px 7px",borderRadius:6,cursor:"pointer",background:selAct===a.id?"#eef2ff":"transparent",display:"flex",alignItems:"center",justifyContent:"space-between",gap:5}}>
                  <div style={{minWidth:0}}><div style={{fontSize:10,fontWeight:600,direction:"rtl",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{a.nameAr}</div><div style={{fontSize:8,color:"#bbb"}}>{a.id}</div></div>
                  <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",flexShrink:0}}>
                    <div style={{width:7,height:7,borderRadius:"50%",background:a.pct===100?"#10b981":a.pct>0?"#6366f1":"#e5e7eb",marginBottom:2}}/>
                    <span style={{fontSize:8,fontWeight:700,color:sColor(cpi)}}>{a.pct}%</span>
                  </div>
                </div>
              );
            })}
          </div>
          {/* sidebar quick stats */}
          <div style={{borderTop:"1px solid #f0f0f0",paddingTop:8,marginTop:4}}>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:4,fontSize:9}}>
              {[{l:"مخاطر مفتوحة",v:riskStats.open,c:"#f59e0b"},{l:"مشكلات عالية",v:issues.filter(x=>x.priority==="عالية"&&x.status!=="مغلق").length,c:"#ef4444"}].map(({l,v,c})=>(
                <div key={l} style={{background:"#f8f9fc",borderRadius:6,padding:"5px 7px",border:"1px solid #eee"}}>
                  <div style={{color:"#888"}}>{l}</div><div style={{fontWeight:800,color:c,fontSize:12}}>{v}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ═══ MAIN ═══ */}
      <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
        {/* Header */}
        <div style={{background:"var(--gradient-hero)",padding:"12px 20px 0",color:"hsl(var(--primary-foreground))",flexShrink:0,boxShadow:"var(--shadow-md)"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
            <div>
              <h1 style={{margin:0,fontSize:17,fontWeight:900,display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
                Cost Control Report
                <span style={{background:"rgba(255,255,255,.15)",borderRadius:999,padding:"2px 10px",fontSize:10,fontWeight:600}}>{filtered.length} أنشطة</span>
                {alerts.filter(a=>a.t==="c").length>0&&<span style={{background:"#ef4444",borderRadius:999,padding:"2px 10px",fontSize:10,fontWeight:700}}>⚠ {alerts.length} تنبيه</span>}
              </h1>
              <p style={{margin:"3px 0 0",fontSize:10,opacity:.6}}>{project.name} · {project.number} · {project.client}</p>
              {projectsList.length>0&&(
                <select value={linkedProjectId||""} onChange={e=>{const id=e.target.value;const p=projectsList.find(x=>x.id===id);if(p)loadProjectFromDb(p);}}
                  title="تبديل سريع للمشروع المرتبط"
                  style={{marginTop:6,background:"rgba(255,255,255,.14)",color:"#fff",border:"1px solid rgba(255,255,255,.3)",borderRadius:7,padding:"4px 10px",fontSize:11,fontWeight:600,outline:"none",maxWidth:320,cursor:"pointer"}}>
                  <option value="" style={{color:"#1a1a2e"}}>📂 اختر مشروعاً محفوظاً...</option>
                  {projectsList.map(p=><option key={p.id} value={p.id} style={{color:"#1a1a2e"}}>{p.name||"بدون اسم"}</option>)}
                </select>
              )}
            </div>
            <div style={{display:"flex",gap:6,flexShrink:0,flexWrap:"wrap"}}>
              {/* Global search */}
              <div style={{position:"relative"}}>
                <button onClick={()=>setShowGlobalSearch(p=>!p)} title="بحث عام (Ctrl+K)"
                  style={{background:"rgba(255,255,255,.1)",color:"#fff",border:"1px solid rgba(255,255,255,.25)",borderRadius:7,padding:"6px 12px",fontWeight:600,cursor:"pointer",fontSize:11}}>
                  🔍 بحث
                </button>
                {showGlobalSearch&&(
                  <div style={{position:"absolute",top:36,right:0,width:320,background:darkMode?"#1e293b":"#fff",borderRadius:10,boxShadow:"0 20px 40px rgba(0,0,0,.3)",zIndex:200,border:`1px solid ${darkMode?"#334155":"#e5e7eb"}`,overflow:"hidden"}}>
                    <input autoFocus value={globalSearch} onChange={e=>setGlobalSearch(e.target.value)}
                      placeholder="ابحث في الأنشطة والمخاطر والمراحل..."
                      style={{width:"100%",border:"none",borderBottom:`1px solid ${darkMode?"#334155":"#f0f0f0"}`,padding:"12px 16px",fontSize:13,outline:"none",background:darkMode?"#1e293b":"#fff",color:darkMode?"#f1f5f9":"#1a1a2e",boxSizing:"border-box"}}/>
                    {globalResults.length>0?(
                      <div>
                        {globalResults.map((r,i)=>(
                          <div key={i} onClick={()=>{r.action();setShowGlobalSearch(false);setGlobalSearch("");}}
                            style={{padding:"9px 16px",cursor:"pointer",borderBottom:`1px solid ${darkMode?"#334155":"#f5f5f5"}`,display:"flex",gap:10,alignItems:"center"}}
                            onMouseOver={e=>e.currentTarget.style.background=darkMode?"#334155":"#f8f9fc"}
                            onMouseOut={e=>e.currentTarget.style.background="transparent"}>
                            <span style={{fontSize:14}}>{r.type==="activity"?"📋":r.type==="risk"?"⚠️":"🏁"}</span>
                            <div>
                              <div style={{fontSize:12,fontWeight:600,color:darkMode?"#f1f5f9":"#1a1a2e"}}>{r.label}</div>
                              <div style={{fontSize:10,color:darkMode?"#94a3b8":"#888"}}>{r.sub}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ):globalSearch.length>=2?(
                      <div style={{padding:"16px",textAlign:"center",color:"#888",fontSize:12}}>لا توجد نتائج</div>
                    ):(
                      <div style={{padding:"12px 16px",fontSize:10,color:"#aaa"}}>
                        اكتب للبحث · Ctrl+K للفتح/الإغلاق
                      </div>
                    )}
                  </div>
                )}
              </div>
              {/* Notifications */}
              <div style={{position:"relative"}}>
                <button onClick={()=>{setShowNotif(p=>!p);}} title="الإشعارات"
                  style={{background:unreadCount>0?"rgba(239,68,68,.3)":"rgba(255,255,255,.1)",color:"#fff",border:`1px solid ${unreadCount>0?"rgba(239,68,68,.5)":"rgba(255,255,255,.25)"}`,borderRadius:7,padding:"6px 10px",fontWeight:600,cursor:"pointer",fontSize:14,position:"relative"}}>
                  🔔
                  {unreadCount>0&&<span style={{position:"absolute",top:-4,right:-4,background:"#ef4444",color:"#fff",borderRadius:999,fontSize:9,fontWeight:900,padding:"1px 5px",minWidth:16,textAlign:"center"}}>{unreadCount}</span>}
                </button>
                {showNotif&&(
                  <div style={{position:"absolute",top:36,right:0,width:300,background:darkMode?"#1e293b":"#fff",borderRadius:10,boxShadow:"0 20px 40px rgba(0,0,0,.3)",zIndex:200,border:`1px solid ${darkMode?"#334155":"#e5e7eb"}`,overflow:"hidden"}}>
                    <div style={{padding:"10px 14px",borderBottom:`1px solid ${darkMode?"#334155":"#f0f0f0"}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                      <span style={{fontWeight:700,fontSize:12,color:darkMode?"#f1f5f9":"#1a1a2e"}}>الإشعارات ({unreadCount} جديد)</span>
                      <button onClick={markAllRead} style={{background:"none",border:"none",cursor:"pointer",fontSize:10,color:"#6366f1",fontWeight:600}}>قراءة الكل</button>
                    </div>
                    {notifications.slice(0,6).map(n=>(
                      <div key={n.id} onClick={()=>setNotifications(p=>p.map(x=>x.id===n.id?{...x,read:true}:x))}
                        style={{padding:"9px 14px",borderBottom:`1px solid ${darkMode?"#334155":"#f5f5f5"}`,background:n.read?"transparent":n.type==="critical"?"rgba(239,68,68,.05)":"rgba(251,191,36,.05)",cursor:"pointer",display:"flex",gap:8,alignItems:"flex-start"}}>
                        <span style={{fontSize:14,flexShrink:0}}>{n.type==="critical"?"🔴":n.type==="warn"?"🟡":"🔵"}</span>
                        <div style={{flex:1}}>
                          <div style={{fontSize:11,fontWeight:n.read?400:700,color:darkMode?"#f1f5f9":"#333"}}>{n.msg}</div>
                          <div style={{fontSize:9,color:"#aaa",marginTop:2}}>{n.ts}</div>
                        </div>
                        {!n.read&&<div style={{width:6,height:6,borderRadius:"50%",background:"#6366f1",flexShrink:0,marginTop:3}}/>}
                      </div>
                    ))}
                    <div style={{padding:"8px 14px",textAlign:"center",borderTop:`1px solid ${darkMode?"#334155":"#f0f0f0"}`}}>
                      <button onClick={()=>setNotifications([])} style={{background:"none",border:"none",cursor:"pointer",fontSize:10,color:"#888"}}>مسح الكل</button>
                    </div>
                  </div>
                )}
              </div>
              <button onClick={()=>setDensity(d=>d==="compact"?"comfortable":"compact")} title={density==="compact"?"تبديل إلى وضع مريح":"تبديل إلى وضع مضغوط"} style={{background:"rgba(255,255,255,.1)",color:"#fff",border:"1px solid rgba(255,255,255,.25)",borderRadius:7,padding:"6px 10px",fontWeight:700,cursor:"pointer",fontSize:11}}>{density==="compact"?"⊟ مضغوط":"⊞ مريح"}</button>
              <button onClick={()=>setShortcutsModal(true)} title="اختصارات لوحة المفاتيح (?)" style={{background:"rgba(255,255,255,.1)",color:"#fff",border:"1px solid rgba(255,255,255,.25)",borderRadius:7,padding:"6px 10px",fontWeight:700,cursor:"pointer",fontSize:13}}>❓</button>

              <button onClick={()=>setDarkMode(d=>!d)} title="تبديل الوضع" style={{background:"rgba(255,255,255,.1)",color:"#fff",border:"1px solid rgba(255,255,255,.25)",borderRadius:7,padding:"6px 10px",fontWeight:600,cursor:"pointer",fontSize:14}}>{darkMode?"☀️":"🌙"}</button>

              <button onClick={()=>setImportModal(true)} style={{background:"rgba(255,255,255,.1)",color:"#fff",border:"1px solid rgba(255,255,255,.25)",borderRadius:7,padding:"6px 12px",fontWeight:600,cursor:"pointer",fontSize:11}}>📂 استيراد</button>
              <button onClick={()=>exportExcelFull(acts,kpi,cf,risks,issues,resources,project)} style={{background:"hsl(var(--success))",color:"hsl(var(--success-foreground))",border:"none",borderRadius:7,padding:"6px 12px",fontWeight:700,cursor:"pointer",fontSize:11}}>📥 Excel كامل</button>
              <button onClick={()=>{exportCSV(acts,kpi,project);toast.success("تم تصدير CSV");}} title="تصدير CSV للبيانات الحالية" style={{background:"hsl(var(--success)/.85)",color:"hsl(var(--success-foreground))",border:"none",borderRadius:7,padding:"6px 12px",fontWeight:700,cursor:"pointer",fontSize:11}}>📄 CSV</button>
              <button onClick={exportPDF} style={{background:"hsl(var(--destructive))",color:"hsl(var(--destructive-foreground))",border:"none",borderRadius:7,padding:"6px 12px",fontWeight:700,cursor:"pointer",fontSize:11}}>📑 PDF</button>
              <button onClick={syncACFromCertificates} disabled={syncingAC} title="مزامنة AC من شهادات التقدم" style={{background:"hsl(var(--accent))",color:"hsl(var(--accent-foreground))",border:"none",borderRadius:7,padding:"6px 12px",fontWeight:700,cursor:syncingAC?"wait":"pointer",fontSize:11,opacity:syncingAC?.6:1}}>{syncingAC?"⏳ مزامنة...":"🔁 مزامنة AC"}</button>
              <button onClick={()=>{setAutoSyncAC(v=>{const nv=!v;toast.info(nv?"✅ تفعيل المزامنة التلقائية كل 5 دقائق":"⏸ إيقاف المزامنة التلقائية");return nv;});}} title="مزامنة AC تلقائياً كل 5 دقائق" style={{background:autoSyncAC?"hsl(var(--success))":"rgba(255,255,255,.1)",color:"#fff",border:`1px solid ${autoSyncAC?"hsl(var(--success))":"rgba(255,255,255,.25)"}`,borderRadius:7,padding:"6px 10px",fontWeight:700,cursor:"pointer",fontSize:11,display:"inline-flex",alignItems:"center",gap:4}}>{autoSyncAC?"🟢":"⚪"} Auto{syncingAC&&autoSyncAC?<span style={{display:"inline-block",width:6,height:6,borderRadius:99,background:"#fff",animation:"pulse 1.5s infinite"}}/>:null}</button>

              <button onClick={()=>{const n=prompt("اسم السيناريو:");if(n)saveScenarioToDb(n);}} title="حفظ السيناريو في السحابة" style={{background:"hsl(var(--qa-purple))",color:"#fff",border:"none",borderRadius:7,padding:"6px 12px",fontWeight:700,cursor:"pointer",fontSize:11}}>☁️ حفظ</button>
              <button onClick={()=>{setScenariosModal(true);fetchDbScenarios();}} title="تحميل سيناريو محفوظ" style={{background:"hsla(0,0%,100%,.12)",color:"hsl(var(--primary-foreground))",border:"1px solid hsla(0,0%,100%,.25)",borderRadius:7,padding:"6px 12px",fontWeight:600,cursor:"pointer",fontSize:11}}>📚 السيناريوهات</button>
              <button onClick={()=>setThreshModal(true)} style={{background:"hsla(0,0%,100%,.12)",color:"hsl(var(--primary-foreground))",border:"1px solid hsla(0,0%,100%,.25)",borderRadius:7,padding:"6px 12px",fontWeight:600,cursor:"pointer",fontSize:11}}>⚙️</button>
              <button onClick={()=>setAddModal(true)} style={{background:"hsl(var(--primary))",color:"hsl(var(--primary-foreground))",border:"none",borderRadius:7,padding:"6px 12px",fontWeight:700,cursor:"pointer",fontSize:11}}>+ نشاط</button>
              <button onClick={()=>window.print()} style={{background:"rgba(255,255,255,.1)",color:"#fff",border:"1px solid rgba(255,255,255,.25)",borderRadius:7,padding:"6px 12px",fontWeight:600,cursor:"pointer",fontSize:11}}>🖨️</button>
            </div>
          </div>
          <div style={{display:"flex",gap:2,flexWrap:"nowrap",overflowX:"auto"}}>
            {TABS.map(({k,lbl})=>(
              <button key={k} onClick={()=>setTab(k)} style={{background:tab===k?"rgba(255,255,255,.18)":"transparent",color:"#fff",border:tab===k?"1px solid rgba(255,255,255,.35)":"1px solid transparent",borderBottom:"none",borderRadius:"7px 7px 0 0",padding:"6px 13px",fontWeight:tab===k?700:400,cursor:"pointer",fontSize:11,whiteSpace:"nowrap"}}>
                {lbl}
              </button>
            ))}
          </div>
          {alerts.length>0&&(
            <div style={{marginTop:6,background:"rgba(0,0,0,.22)",borderTop:"1px solid rgba(255,255,255,.12)",borderRadius:"6px 6px 0 0",padding:"6px 12px",display:"flex",gap:14,flexWrap:"wrap",alignItems:"center"}}>
              <span style={{fontSize:10,fontWeight:800,color:"hsl(var(--accent))",letterSpacing:.5,flexShrink:0}}>⚠ التنبيهات</span>
              {alerts.map((a,i)=><span key={i} style={{fontSize:11,fontWeight:600,color:a.t==="c"?"#fecaca":"#fde68a",display:"flex",alignItems:"center",gap:3}}>{a.t==="c"?"🔴":"🟡"} {a.msg}</span>)}
            </div>
          )}
        </div>

        {timeMetrics.valid&&(
          <div style={{background:timeMetrics.overdue?"hsl(var(--destructive)/.08)":(darkMode?"#0f172a":"hsl(var(--card))"),borderBottom:`1px solid ${timeMetrics.overdue?"hsl(var(--destructive)/.3)":"hsl(var(--border))"}`,padding:"8px 20px",flexShrink:0}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6,fontSize:11,fontWeight:700,color:darkMode?"#cbd5e1":"hsl(var(--foreground))",gap:12,flexWrap:"wrap"}}>
              <span>⏱ الجدول الزمني: <b>{project.startDate}</b> → <b>{project.endDate}</b> · {project.duration} شهر</span>
              <span style={{display:"flex",gap:14,alignItems:"center",flexWrap:"wrap"}}>
                <span>الوقت المنقضي: <b style={{color:"hsl(var(--primary))"}}>{timeMetrics.elapsedPct.toFixed(1)}%</b></span>
                <span>الإنجاز الفعلي: <b style={{color:"hsl(var(--success))"}}>{kpi.prog.toFixed(1)}%</b></span>
                <span title="SPI محسوب من نسبة الإنجاز ÷ نسبة الوقت المنقضي">SPI زمني: <b style={{color:sColor(timeMetrics.spiTime)}}>{timeMetrics.spiTime>0?timeMetrics.spiTime.toFixed(2):"—"}</b></span>
                <span style={{color:timeMetrics.overdue?"hsl(var(--destructive))":timeMetrics.daysLeft<30?"hsl(var(--accent))":"hsl(var(--muted-foreground))",fontWeight:800}}>{timeMetrics.overdue?`⛔ متأخر ${Math.abs(timeMetrics.daysLeft)} يوم`:`📅 متبقي ${timeMetrics.daysLeft} يوم`}</span>
              </span>
            </div>
            <div style={{height:9,background:darkMode?"#1e293b":"hsl(var(--muted))",borderRadius:99,overflow:"hidden",position:"relative"}}>
              <div style={{width:Math.min(100,kpi.prog)+"%",height:"100%",background:"linear-gradient(90deg,hsl(var(--success)),hsl(var(--primary)))",position:"absolute",left:0,top:0,transition:"width .3s"}}/>
              <div style={{position:"absolute",left:`calc(${Math.min(100,timeMetrics.elapsedPct)}% - 1px)`,top:-2,width:2,height:13,background:"hsl(var(--destructive))"}} title={`الموقع الزمني الحالي (${timeMetrics.elapsedPct.toFixed(1)}%)`}/>
            </div>
          </div>
        )}
        {/* ═══ Quick Nav Strip — ربط مع باقي الشاشات ═══ */}
        <div style={{background:darkMode?"#0b1220":"hsl(var(--card))",borderBottom:`1px solid hsl(var(--border))`,padding:"6px 16px",display:"flex",gap:6,overflowX:"auto",alignItems:"center",flexShrink:0}}>
          <span style={{fontSize:10,color:"hsl(var(--muted-foreground))",fontWeight:700,whiteSpace:"nowrap",marginInlineEnd:4}}>🔗 تنقّل:</span>
          {[
            {to:"/projects",lbl:"📁 المشاريع",t:"المشاريع المحفوظة"},
            {to:linkedProjectId?`/projects/${linkedProjectId}`:"/projects",lbl:"📊 تفاصيل المشروع",t:"تفاصيل المشروع المرتبط"},
            {to:"/items",lbl:"📋 BOQ",t:"بنود الأعمال"},
            {to:linkedProjectId?`/projects/${linkedProjectId}/pricing`:"/projects",lbl:"💰 التسعير",t:"شاشة التسعير"},
            {to:"/progress-certificates",lbl:"📜 الشهادات",t:"شهادات الإنجاز"},
            {to:"/procurement",lbl:"🛒 المشتريات",t:"المشتريات"},
            {to:"/subcontractors",lbl:"🤝 المقاولون",t:"المقاولون من الباطن"},
            {to:"/risk",lbl:"⚠️ المخاطر",t:"إدارة المخاطر"},
            {to:"/resources-dashboard",lbl:"👷 الموارد",t:"لوحة الموارد"},
            {to:"/calendar",lbl:"📅 التقويم",t:"تقويم المشاريع"},
            {to:"/cost-control-report",lbl:"📑 تقرير التحكم",t:"تقرير التحكم في التكلفة"},
            {to:"/reports",lbl:"🖨 التقارير",t:"التقارير"},
          ].map(({to,lbl,t})=>(
            <Link key={lbl} to={to} title={t} style={{background:darkMode?"#172033":"hsl(var(--muted)/.5)",color:"hsl(var(--foreground))",border:`1px solid hsl(var(--border))`,borderRadius:6,padding:"4px 10px",fontSize:10,fontWeight:600,whiteSpace:"nowrap",textDecoration:"none"}}>{lbl}</Link>
          ))}
        </div>
        <div style={{flex:1,overflowY:"auto",padding:"16px 20px",background:darkMode?"#0f172a":"#f4f5fb"}}>

          {/* ═══ OVERVIEW ═══ */}
          {tab==="overview"&&(<>
            {/* ── Quick KPI search/filter bar ── */}
            <div style={{display:"flex",gap:8,marginBottom:10,alignItems:"center",flexWrap:"wrap",background:darkMode?"#1e293b":"hsl(var(--card))",border:`1px solid hsl(var(--border))`,borderRadius:9,padding:"7px 11px"}}>
              <span style={{fontSize:11,fontWeight:700,color:darkMode?"#94a3b8":"hsl(var(--muted-foreground))"}}>🔍 فلترة KPIs:</span>
              <input value={kpiSearch} onChange={e=>setKpiSearch(e.target.value)} placeholder="ابحث: PV, EV, AC, CPI, SPI..." style={{flex:"0 1 240px",border:`1px solid hsl(var(--border))`,borderRadius:7,padding:"5px 10px",fontSize:11,outline:"none",background:darkMode?"#0f172a":"#fff",color:darkMode?"#f1f5f9":"#1a1a2e"}}/>
              {[["all","الكل"],["healthy","✓ صحي"],["warn","⚠ تحذير"],["crit","🔴 حرج"]].map(([v,lbl])=>(
                <button key={v} onClick={()=>setKpiStatus(v)} style={{background:kpiStatus===v?"hsl(var(--primary))":"hsl(var(--muted))",color:kpiStatus===v?"hsl(var(--primary-foreground))":"hsl(var(--foreground))",border:"none",borderRadius:999,padding:"4px 11px",cursor:"pointer",fontSize:10,fontWeight:700}}>{lbl}</button>
              ))}
              {(kpiSearch||kpiStatus!=="all")&&<button onClick={()=>{setKpiSearch("");setKpiStatus("all");}} style={{background:"transparent",border:"none",color:"hsl(var(--destructive))",fontSize:10,cursor:"pointer",fontWeight:700}}>✕ مسح</button>}
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:11,marginBottom:12}}>
              {(()=>{
                const q=kpiSearch.toLowerCase().trim();
                const matches=(label,statusKey)=>{
                  if(q&&!label.toLowerCase().includes(q))return false;
                  if(kpiStatus==="all")return true;
                  return statusKey===kpiStatus;
                };
                const eacStatus=kpi.EAC>kpi.bac?"crit":"healthy";
                const cards=[
                  {l:"PV — القيمة المخططة",k:"PV",v:fmt(kpi.pv),ic:"🎯",c:"#6366f1",st:"healthy"},
                  {l:"EV — القيمة المكتسبة",k:"EV",v:fmt(kpi.ev),ic:"📈",c:"#10b981",st:"healthy"},
                  {l:"AC — التكلفة الفعلية",k:"AC",v:fmt(kpi.ac),ic:"💰",c:"#f59e0b",st:kpi.ac>kpi.ev?"warn":"healthy"},
                  {l:"EAC — تقدير الإتمام",k:"EAC",v:fmt(kpi.EAC),ic:"🔮",c:kpi.EAC>kpi.bac?"#ef4444":"#8b5cf6",sub:kpi.EAC>kpi.bac?`▲ ${fmt(kpi.EAC-kpi.bac)} تجاوز`:"✓ ضمن الميزانية",sc:kpi.EAC>kpi.bac?"#ef4444":"#10b981",st:eacStatus},
                  {l:"ETC — تكلفة الإتمام",k:"ETC",v:fmt(kpi.ETC),ic:"📌",c:"#ec4899",st:"healthy"},
                ].filter(c=>matches(c.l,c.st));
                if(!cards.length)return <div style={{gridColumn:"1/-1",textAlign:"center",padding:18,color:"hsl(var(--muted-foreground))",fontSize:11}}>لا توجد بطاقات تطابق الفلتر</div>;
                return cards.map(c=><Kpi key={c.k} l={c.l} v={c.v} ic={c.ic} c={c.c} sub={c.sub} sc={c.sc} onClick={()=>setKpiDrill(d=>d===c.k?null:c.k)} active={kpiDrill===c.k}/>);
              })()}
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:11,marginBottom:12}}>
              {[{l:"SPI — أداء الجدول الزمني",k:"SPI",v:kpi.SPI,note:`SV = ${fmt(kpi.SV)}`,nt:kpi.SPI>=1?"في الموعد ✓":"متأخر ⚠",st:kpi.SPI>=1?"healthy":kpi.SPI>=0.9?"warn":"crit"},
                {l:"PROGRESS — نسبة الإنجاز",k:"PROG",prog:true,note:`BAC = ${fmt(kpi.bac)}`,st:"healthy"},
                {l:"CPI — أداء التكلفة",k:"CPI",v:kpi.CPI,note:`CV = ${fmt(kpi.CV)}`,nt:kpi.CPI>=1?"ضمن التكلفة ✓":"تجاوز ⚠",st:kpi.CPI>=1?"healthy":kpi.CPI>=0.9?"warn":"crit"},
                {l:"TCPI — الأداء المستهدف",k:"TCPI",v:kpi.TCPI,inv:true,note:"",nt:kpi.TCPI<=1?"قابل ✓":kpi.TCPI<=1.1?"يحتاج تحسين ⚠":"صعب ⛔",st:kpi.TCPI<=1?"healthy":kpi.TCPI<=1.1?"warn":"crit"},
              ].filter(c=>{
                const q=kpiSearch.toLowerCase().trim();
                if(q&&!c.l.toLowerCase().includes(q))return false;
                if(kpiStatus==="all")return true;
                return c.st===kpiStatus;
              }).map(({l,k,v,prog,note,nt,inv})=>(
                <Card key={l} style={{padding:"14px 16px",cursor:"pointer",border:kpiDrill===k?"2px solid hsl(var(--primary))":undefined,boxShadow:kpiDrill===k?"0 8px 22px hsl(var(--primary)/.25)":undefined}}>
                  <div onClick={()=>setKpiDrill(d=>d===k?null:k)}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:9}}>
                    <span style={{fontSize:9,fontWeight:700,color:"#999",letterSpacing:.7}}>{l}</span>
                    <span style={{fontSize:9,color:"hsl(var(--muted-foreground))",fontWeight:700}}>{kpiDrill===k?"▼":"▸"}</span>
                  </div>
                  {prog
                    ?<span style={{display:"inline-flex",alignItems:"center",justifyContent:"center",background:"#f0f9ff",color:"#0ea5e9",borderRadius:999,padding:"5px 18px",fontSize:22,fontWeight:900,border:"2px solid #bae6fd",fontFamily:"monospace"}}>{kpi.prog.toFixed(1)}%</span>
                    :<IdxBadge v={v}/>}
                  {note&&<div style={{marginTop:7,fontSize:10,color:darkMode?"#64748b":"#888"}}>{note}</div>}
                  {nt&&<div style={{marginTop:2,fontSize:10,color:"#666"}}>{nt}</div>}
                  <div style={{marginTop:8}}><PBar pct={prog?kpi.prog:Math.min((+v||0)*100,100)} color={prog?"#0ea5e9":sColor(inv?2-(+v||0):+v||0)} h={5}/></div>
                  </div>
                </Card>
              ))}
            </div>
            {kpiDrill&&(
              <Card style={{marginBottom:12,border:"2px solid hsl(var(--primary)/.4)",background:"hsl(var(--primary)/.04)"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                  <H3 style={{margin:0,color:"hsl(var(--primary))"}}>🔍 Drill-down: {kpiDrill}</H3>
                  <button onClick={()=>setKpiDrill(null)} style={{background:"hsl(var(--muted))",border:"1px solid hsl(var(--border))",borderRadius:6,padding:"3px 10px",fontSize:11,cursor:"pointer",color:"hsl(var(--foreground))"}}>✕ إغلاق</button>
                </div>
                {(()=>{
                  const explain={
                    PV:{title:"Planned Value — القيمة المخططة",desc:"الجزء من الميزانية الذي كان مخططاً إنجازه حتى تاريخه. يُحسب من خط الأساس الزمني.",rows:[["PV",fmt(kpi.pv)],["BAC",fmt(kpi.bac)],["نسبة المخطط من BAC",kpi.bac>0?((kpi.pv/kpi.bac)*100).toFixed(1)+"%":"—"]]},
                    EV:{title:"Earned Value — القيمة المكتسبة",desc:"القيمة المالية للعمل الفعلي المُنجز حتى تاريخه = نسبة الإنجاز × BAC.",rows:[["EV",fmt(kpi.ev)],["نسبة الإنجاز",kpi.prog.toFixed(1)+"%"],["BAC",fmt(kpi.bac)],["SV (EV-PV)",fmt(kpi.SV)]]},
                    AC:{title:"Actual Cost — التكلفة الفعلية",desc:"إجمالي التكاليف الفعلية المصروفة على العمل المُنجز.",rows:[["AC",fmt(kpi.ac)],["EV",fmt(kpi.ev)],["CV (EV-AC)",fmt(kpi.CV)],["CPI (EV/AC)",kpi.CPI.toFixed(3)]]},
                    EAC:{title:"Estimate At Completion — تقدير الإتمام",desc:"التقدير المحدّث لإجمالي تكلفة المشروع عند الانتهاء بناءً على CPI الحالي. EAC = BAC ÷ CPI",rows:[["EAC (CPI)",fmt(kpi.EAC)],["EAC (PERT)",fmt(kpi.EAC_pert)],["BAC",fmt(kpi.bac)],["VAC (BAC-EAC)",fmt(kpi.bac-kpi.EAC)],["الحالة",kpi.EAC>kpi.bac?"⚠ تجاوز الميزانية":"✓ ضمن الميزانية"]]},
                    ETC:{title:"Estimate To Complete — تكلفة الإتمام",desc:"المبلغ المتبقي المتوقع إنفاقه لإتمام الأعمال = EAC − AC.",rows:[["ETC",fmt(kpi.ETC)],["AC",fmt(kpi.ac)],["EAC",fmt(kpi.EAC)],["متبقي من BAC",fmt(Math.max(0,kpi.bac-kpi.ac))]]},
                    CPI:{title:"Cost Performance Index — مؤشر أداء التكلفة",desc:"كفاءة استخدام الميزانية = EV ÷ AC. القيمة ≥ 1 جيدة.",rows:[["CPI",kpi.CPI.toFixed(3)],["EV",fmt(kpi.ev)],["AC",fmt(kpi.ac)],["CV",fmt(kpi.CV)],["العتبة المعتمدة",threshCPI.toFixed(2)],["الحالة",kpi.CPI>=threshCPI?"✓ ضمن العتبة":"⚠ تحت العتبة"]]},
                    SPI:{title:"Schedule Performance Index — مؤشر أداء الجدول",desc:"كفاءة الالتزام بالجدول = EV ÷ PV. القيمة ≥ 1 جيدة.",rows:[["SPI",kpi.SPI.toFixed(3)],["EV",fmt(kpi.ev)],["PV",fmt(kpi.pv)],["SV",fmt(kpi.SV)],["العتبة المعتمدة",threshSPI.toFixed(2)],["الحالة",kpi.SPI>=threshSPI?"✓ ضمن العتبة":"⚠ تحت العتبة"]]},
                    TCPI:{title:"To-Complete Performance Index — الأداء المستهدف",desc:"الكفاءة المطلوبة في الأعمال المتبقية لإنهاء المشروع ضمن BAC.",rows:[["TCPI",kpi.TCPI.toFixed(3)],["BAC-EV",fmt(kpi.bac-kpi.ev)],["BAC-AC",fmt(kpi.bac-kpi.ac)],["التقييم",kpi.TCPI<=1?"قابل للتحقيق":kpi.TCPI<=1.1?"يحتاج تحسين":"صعب المنال"]]},
                    PROG:{title:"Overall Progress — نسبة الإنجاز الإجمالية",desc:"المتوسط المرجّح لنسب إنجاز جميع الأنشطة.",rows:[["نسبة الإنجاز",kpi.prog.toFixed(2)+"%"],["BAC",fmt(kpi.bac)],["EV",fmt(kpi.ev)],["عدد الأنشطة",acts.length],["التخصصات",byDisc.length]]},
                  }[kpiDrill];
                  if(!explain)return null;
                  return(
                    <>
                      <div style={{fontSize:13,fontWeight:700,marginBottom:4,color:"hsl(var(--foreground))"}}>{explain.title}</div>
                      <div style={{fontSize:11,color:"hsl(var(--muted-foreground))",marginBottom:12,lineHeight:1.6}}>{explain.desc}</div>
                      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))",gap:8}}>
                        {explain.rows.map(([k,v])=>(
                          <div key={k} style={{background:"hsl(var(--card))",border:"1px solid hsl(var(--border))",borderRadius:8,padding:"8px 10px"}}>
                            <div style={{fontSize:9,color:"hsl(var(--muted-foreground))",fontWeight:700,marginBottom:3,letterSpacing:.5}}>{k}</div>
                            <div style={{fontSize:13,fontWeight:800,fontFamily:"monospace",color:"hsl(var(--foreground))"}}>{v}</div>
                          </div>
                        ))}
                      </div>
                      <div style={{marginTop:12,paddingTop:10,borderTop:"1px dashed hsl(var(--border))",fontSize:10,color:"hsl(var(--muted-foreground))"}}>
                        💡 اضغط على نفس البطاقة مرة أخرى لإغلاق هذا العرض، أو على بطاقة أخرى للتنقل بين المؤشرات.
                      </div>
                    </>
                  );
                })()}
              </Card>
            )}

            <Card style={{marginBottom:12}}>
              <H3>📊 ملخص التخصصات</H3>
              <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:10}}>
                {byDisc.map(d=>(
                  <div key={d.disc} onClick={()=>setSelDisc(selDisc===d.disc?null:d.disc)} style={{border:`2px solid ${selDisc===d.disc?DC[d.disc]:"#f0f0f0"}`,borderRadius:11,padding:"12px 13px",cursor:"pointer",background:selDisc===d.disc?DC[d.disc]+"08":"#fafafa",transition:"all .2s"}}>
                    <div style={{display:"flex",alignItems:"center",gap:5,marginBottom:8}}><div style={{width:9,height:9,borderRadius:"50%",background:DC[d.disc]}}/><span style={{fontWeight:700,fontSize:10,color:DC[d.disc]}}>{d.disc}</span></div>
                    <div style={{fontSize:20,fontWeight:900,marginBottom:5}}>{Math.round(d.avgPct)}%</div>
                    <PBar pct={d.avgPct} color={DC[d.disc]} h={4}/>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:2,marginTop:8,fontSize:9,color:"#999"}}>
                      <div>PV <b style={{color:"#333"}}>{fmt(d.pv)}</b></div><div>EV <b style={{color:"#10b981"}}>{fmt(d.ev)}</b></div>
                      <div>CPI <b style={{color:sColor(d.CPI)}}>{d.CPI>0?d.CPI.toFixed(2):"—"}</b></div><div>SPI <b style={{color:sColor(d.SPI)}}>{d.SPI>0?d.SPI.toFixed(2):"—"}</b></div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
            <div style={{display:"grid",gridTemplateColumns:"2fr 1fr",gap:12}}>
              <Card>
                <H3>📈 تحليل القيمة المكتسبة حسب التخصص</H3>
                <ResponsiveContainer width="100%" height={210}>
                  <ComposedChart data={byDisc}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f5"/>
                    <XAxis dataKey="disc" tick={{fontSize:10}}/><YAxis tickFormatter={v=>fmt(v)} tick={{fontSize:9}}/>
                    <Tooltip content={<CTip/>}/><Legend wrapperStyle={{fontSize:10}}/>
                    <Bar dataKey="pv" name="PV" radius={[3,3,0,0]}>{byDisc.map((d,i)=><Cell key={i} fill={DC[d.disc]+"cc"}/>)}</Bar>
                    <Bar dataKey="ev" name="EV" radius={[3,3,0,0]}>{byDisc.map((d,i)=><Cell key={i} fill={DC[d.disc]+"77"}/>)}</Bar>
                    <Bar dataKey="ac" name="AC" radius={[3,3,0,0]}>{byDisc.map((d,i)=><Cell key={i} fill={DC[d.disc]+"44"}/>)}</Bar>
                    <Line dataKey="EAC" name="EAC" stroke="#ef4444" strokeWidth={2} dot={{r:3,fill:"#ef4444"}}/>
                  </ComposedChart>
                </ResponsiveContainer>
              </Card>
              <Card>
                <H3>🔢 مؤشرات سريعة</H3>
                {[
                  {l:"BAC",v:fmt(kpi.bac),c:"#6366f1"},{l:"VAC",v:fmt(kpi.bac-kpi.EAC),c:kpi.bac>kpi.EAC?"#10b981":"#ef4444"},
                  {l:"مخاطر مفتوحة",v:riskStats.open,c:"#f59e0b"},{l:"مخاطر حرجة",v:riskStats.critical,c:"#ef4444"},
                  {l:"مشكلات مفتوحة",v:issues.filter(x=>x.status!=="مغلق").length,c:"#8b5cf6"},
                  {l:"تكلفة المخاطر المحتملة",v:fmt(riskStats.totalCost),c:"#f59e0b"},
                ].map(({l,v,c})=>(
                  <div key={l} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"7px 10px",borderRadius:7,marginBottom:4,background:darkMode?"#1e2d3d":"#f8f9fc",border:"1px solid #f0f0f0"}}>
                    <span style={{fontSize:11,color:darkMode?"#94a3b8":"#555"}}>{l}</span>
                    <span style={{fontFamily:"monospace",fontWeight:800,fontSize:12,color:c}}>{v}</span>
                  </div>
                ))}
              </Card>
            </div>
          </>)}

          {/* ═══ SAVED PROJECTS ═══ */}
          {tab==="projects"&&(<ProjectsTab
            projectsList={projectsList}
            projectsLoading={projectsLoading}
            projectsErr={projectsErr}
            fetchProjects={fetchProjects}
            linkedProjectId={linkedProjectId}
            loadProjectFromDb={loadProjectFromDb}
            loadingItems={loadingItems}
            savedKpis={savedKpis}
            savedKpisLoading={savedKpisLoading}
            computeProjectKpi={computeProjectKpi}
            compareIds={compareIds}
            setCompareIds={setCompareIds}
            darkMode={darkMode}
            fmt={fmt}
            sColor={sColor}
          />)}

          {/* ═══ CASHFLOW ═══ */}
          {tab==="cashflow"&&(<>
            <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:11,marginBottom:12}}>
              <Kpi l="إجمالي المخطط PV"       v={fmtM(cfStats.tPV)}  c="#6366f1" ic="📋"/>
              <Kpi l="إجمالي الصرف الفعلي AC"  v={fmtM(cfStats.tAC)}  c="#f59e0b" ic="💸"/>
              <Kpi l="إجمالي المكتسب EV"       v={fmtM(cfStats.tEV)}  c="#10b981" ic="✅"/>
              <Kpi l="فرق التدفق PV-AC"         v={fmtM(cfStats.tPV-cfStats.tAC)} c={cfStats.tPV-cfStats.tAC>=0?"#10b981":"#ef4444"} ic="⚖️" sub={cfStats.tPV-cfStats.tAC>=0?"وفر في الصرف":"تجاوز في الصرف"}/>
              <Kpi l={`الصرف المتوقع ${forecastSettings.months} أشهر`}    v={fmtM(cfStats.fAC)}  c="#8b5cf6" ic="🔮"/>
            </div>
            {/* Forecast settings + validation banner */}
            <Card style={{marginBottom:12}}>
              <div style={{display:"flex",gap:14,alignItems:"flex-end",flexWrap:"wrap"}}>
                <div style={{flex:"0 0 auto"}}>
                  <div style={{fontSize:10,color:"hsl(var(--muted-foreground))",marginBottom:4,fontWeight:700}}>🔮 إعدادات التنبؤ بالتدفق النقدي</div>
                  <div style={{display:"flex",gap:10,alignItems:"center",flexWrap:"wrap"}}>
                    <label style={{fontSize:11,display:"flex",flexDirection:"column",gap:2}}>
                      <span style={{color:"hsl(var(--muted-foreground))"}}>فترة التوقع (شهر)</span>
                      <input type="number" min={1} max={24} value={forecastSettings.months}
                        onChange={e=>setForecastSettings(p=>({...p,months:Math.max(1,Math.min(24,Number(e.target.value)||1))}))}
                        style={{width:80,border:"1px solid hsl(var(--border))",borderRadius:6,padding:"5px 8px",fontSize:12,fontFamily:"monospace"}}/>
                    </label>
                    <label style={{fontSize:11,display:"flex",flexDirection:"column",gap:2}}>
                      <span style={{color:"hsl(var(--muted-foreground))"}}>نمو شهري للصرف %</span>
                      <input type="number" step="0.5" value={forecastSettings.growthPct}
                        onChange={e=>setForecastSettings(p=>({...p,growthPct:Number(e.target.value)||0}))}
                        style={{width:80,border:"1px solid hsl(var(--border))",borderRadius:6,padding:"5px 8px",fontSize:12,fontFamily:"monospace"}}/>
                    </label>
                    <label style={{fontSize:11,display:"flex",flexDirection:"column",gap:2}}>
                      <span style={{color:"hsl(var(--muted-foreground))"}}>حد العجز (M)</span>
                      <input type="number" step="1" value={forecastSettings.deficitThresholdM}
                        onChange={e=>setForecastSettings(p=>({...p,deficitThresholdM:Number(e.target.value)||0}))}
                        style={{width:80,border:"1px solid hsl(var(--border))",borderRadius:6,padding:"5px 8px",fontSize:12,fontFamily:"monospace"}}/>
                    </label>
                  </div>
                </div>
                <div style={{flex:1,minWidth:260}}>
                  {(()=>{const errs=validateProjectDates();return errs.length?(
                    <div style={{background:"hsl(var(--destructive)/.08)",border:"1px solid hsl(var(--destructive)/.3)",borderRadius:8,padding:"8px 12px",fontSize:11,color:"hsl(var(--destructive))"}}>
                      <div style={{fontWeight:800,marginBottom:4}}>⚠️ تنبيهات تناسق التواريخ:</div>
                      <ul style={{margin:0,paddingInlineStart:18}}>{errs.map((m,i)=><li key={i}>{m}</li>)}</ul>
                    </div>
                  ):(
                    <div style={{background:"hsl(var(--success)/.08)",border:"1px solid hsl(var(--success)/.3)",borderRadius:8,padding:"8px 12px",fontSize:11,color:"hsl(var(--success))",fontWeight:600}}>✅ تواريخ المشروع والتدفق النقدي متناسقة</div>
                  );})()}
                  {forecastDeficit&&(
                    <div style={{marginTop:6,background:"hsl(var(--accent)/.1)",border:"1px solid hsl(var(--accent)/.35)",borderRadius:8,padding:"8px 12px",fontSize:11,color:"hsl(var(--accent-foreground,var(--accent)))",fontWeight:700}}>
                      ⚠️ عجز نقدي متوقع في {forecastDeficit.label} — الفجوة {forecastDeficit.gap}M
                    </div>
                  )}
                </div>
              </div>
            </Card>

            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}>
              <Card>
                <H3>📊 التدفق النقدي الشهري (مليون ريال)</H3>
                <ResponsiveContainer width="100%" height={220}>
                  <ComposedChart data={cfWithForecast}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f5"/>
                    <XAxis dataKey="month" tick={{fontSize:9}}/><YAxis tickFormatter={v=>v+"M"} tick={{fontSize:9}}/>
                    <Tooltip content={<CTip/>}/><Legend wrapperStyle={{fontSize:10}}/>
                    <Bar dataKey="pvM" name="مخطط PV" fill="#6366f160" radius={[2,2,0,0]}/>
                    <Bar dataKey="acM" name="فعلي AC" fill="#f59e0b90" radius={[2,2,0,0]}/>
                    <Line dataKey="evM" name="مكتسب EV" stroke="#10b981" strokeWidth={2.5} dot={{r:2.5}}/>
                  </ComposedChart>
                </ResponsiveContainer>
              </Card>
              <Card>
                <H3>📉 S-Curve تراكمي مع التوقعات</H3>
                <ResponsiveContainer width="100%" height={220}>
                  <ComposedChart data={cfCum}>
                    <defs><linearGradient id="evG" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10b981" stopOpacity={.15}/><stop offset="95%" stopColor="#10b981" stopOpacity={0}/></linearGradient></defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f5"/>
                    <XAxis dataKey="month" tick={{fontSize:9}}/><YAxis tickFormatter={v=>v+"M"} tick={{fontSize:9}}/>
                    <Tooltip content={<CTip/>}/><Legend wrapperStyle={{fontSize:10}}/>
                    <Area dataKey="evCum" name="EV تراكمي" fill="url(#evG)" stroke="#10b981" strokeWidth={2.5} dot={false}/>
                    <Line dataKey="pvCum" name="PV مخطط" stroke="#6366f1" strokeWidth={2} dot={false} strokeDasharray="6 3"/>
                    <Line dataKey="acCum" name="AC فعلي+متوقع" stroke="#f59e0b" strokeWidth={2} dot={false}/>
                  </ComposedChart>
                </ResponsiveContainer>
              </Card>
            </div>
            <Card style={{padding:0,overflow:"hidden",marginBottom:12}}>
              <div style={{padding:"10px 16px",background:"linear-gradient(135deg,hsl(var(--primary)/.08),hsl(var(--accent)/.08))",borderBottom:`1px solid hsl(var(--border))`,display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,flexWrap:"wrap"}}>
                <div style={{fontSize:11,color:darkMode?"#cbd5e1":"#475569",display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
                  <span>📅 <b>{project.startDate||"غير محدد"}</b> → <b>{project.endDate||"—"}</b></span>
                  <span style={{color:"hsl(var(--muted-foreground))"}}>·</span>
                  <span>المدة: <b>{project.duration||"—"} شهر</b></span>
                  <span style={{color:"hsl(var(--muted-foreground))"}}>·</span>
                  <span>BAC: <b>{fmtM((kpi.bac||0)/1e6)}</b></span>
                </div>
                <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                  <button onClick={()=>regenerateCashFlowFromDates({distributePV:true})} style={{background:"linear-gradient(135deg,hsl(var(--primary)),hsl(var(--accent)))",color:"#fff",border:"none",borderRadius:7,padding:"6px 12px",fontWeight:700,cursor:"pointer",fontSize:11}}>🔄 توليد الأشهر + توزيع PV</button>
                  <button onClick={()=>regenerateCashFlowFromDates({distributePV:false})} style={{background:darkMode?"#334155":"#f3f4f6",color:darkMode?"#f1f5f9":"#1a1a2e",border:`1px solid ${darkMode?"#475569":"#e5e7eb"}`,borderRadius:7,padding:"6px 12px",fontWeight:600,cursor:"pointer",fontSize:11}}>📆 توليد الأشهر فقط</button>
                  <button onClick={()=>{if(!window.confirm("سيتم تصفير AC و EV. متابعة؟"))return;regenerateCashFlowFromDates({distributePV:true,resetActuals:true});}} style={{background:"hsl(var(--destructive)/.1)",color:"hsl(var(--destructive))",border:"1px solid hsl(var(--destructive)/.3)",borderRadius:7,padding:"6px 12px",fontWeight:600,cursor:"pointer",fontSize:11}}>🗑 تصفير وتوليد جديد</button>
                </div>
              </div>
            </Card>
            <Card style={{padding:0,overflow:"hidden"}}>
              <div style={{padding:"12px 18px",borderBottom:`1px solid ${darkMode?"#334155":"#f0f0f0"}`,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                <H3 style={{margin:0}}>💵 جدول التدفق النقدي الشهري — قابل للتعديل ضمن نطاق المشروع</H3>
                <div style={{display:"flex",gap:8}}><span style={{background:"#eef2ff",color:"#6366f1",borderRadius:6,padding:"2px 8px",fontSize:10,fontWeight:600}}>🔵 فعلي</span><span style={{background:"#f5f3ff",color:"#8b5cf6",borderRadius:6,padding:"2px 8px",fontSize:10,fontWeight:600}}>🟣 متوقع</span><span style={{background:"hsl(var(--destructive)/.1)",color:"hsl(var(--destructive))",borderRadius:6,padding:"2px 8px",fontSize:10,fontWeight:600}}>🔒 خارج النطاق</span></div>
              </div>
              <div style={{overflowX:"auto"}}>
                <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
                  <thead><tr style={{background:darkMode?"#1e2d3d":"#f8f9fc"}}>{["#","الشهر","التاريخ","PV (M)","AC (M)","EV (M)","PV تراكمي","AC تراكمي","EV تراكمي","فرق PV-AC","إجراء"].map(h=><th key={h} style={{padding:"9px 11px",textAlign:"center",fontWeight:700,color:darkMode?"#94a3b8":"#555",borderBottom:`1px solid ${darkMode?"#334155":"#eee"}`,whiteSpace:"nowrap"}}>{h}</th>)}</tr></thead>
                  <tbody>
                    {cfCum.map((c,idx)=>{
                      const isEd=cfEditId===c.id;const diff=c.pvM-c.acM;const outOfWindow=cfRowOutOfWindow(c);
                      return(
                        <tr key={c.id} style={{borderBottom:"1px solid #f5f5f5",background:outOfWindow?"hsl(var(--destructive)/.05)":c.isForecast?"#f5f3ff":idx%2===0?"#fff":"#fafbfc",opacity:outOfWindow?.55:1}}>
                          <td style={{padding:"6px 10px",textAlign:"center",color:darkMode?"#1e293b":"#ccc",fontSize:10}}>{idx+1}</td>
                          <td style={{padding:"6px 10px",textAlign:"center",fontFamily:"monospace",fontWeight:700,color:outOfWindow?"hsl(var(--destructive))":c.isForecast?"#8b5cf6":"#1a1a2e"}}>{c.month}{outOfWindow&&" 🔒"}</td>
                          <td style={{padding:"6px 10px",textAlign:"center",fontSize:10,color:"#888"}}>{c.label}</td>
                          {["pvM","acM","evM"].map(k=>(
                            <td key={k} style={{padding:"6px 10px",textAlign:"right"}}>
                              {isEd&&!c.isForecast
                                ?<div><input type="number" value={cfBuf[k]} onChange={e=>setCfBuf({...cfBuf,[k]:e.target.value})} style={{width:65,border:`1px solid ${cfErrs[k]?"#ef4444":"#6366f1"}`,borderRadius:5,padding:"3px 5px",fontSize:10,textAlign:"right"}}/><ErrMsg msg={cfErrs[k]}/></div>
                                :<span style={{fontFamily:"monospace",fontWeight:600,color:k==="pvM"?"#6366f1":k==="acM"?c.isForecast?"#8b5cf6":"#f59e0b":"#10b981"}}>{(+c[k]).toFixed(1)}</span>
                              }
                            </td>
                          ))}
                          <td style={{padding:"6px 10px",textAlign:"right",fontFamily:"monospace",color:"#6366f1"}}>{c.pvCum.toFixed(1)}</td>
                          <td style={{padding:"6px 10px",textAlign:"right",fontFamily:"monospace",color:"#f59e0b"}}>{c.acCum.toFixed(1)}</td>
                          <td style={{padding:"6px 10px",textAlign:"right",fontFamily:"monospace",color:"#10b981"}}>{c.evCum.toFixed(1)}</td>
                          <td style={{padding:"6px 10px",textAlign:"right",fontFamily:"monospace",color:diff>=0?"#10b981":"#ef4444",fontWeight:700}}>{diff.toFixed(1)}</td>
                          <td style={{padding:"6px 10px",textAlign:"center"}}>
                            {c.isForecast?<span style={{fontSize:10,color:"#bbb"}}>متوقع</span>
                              :outOfWindow?<span style={{fontSize:10,color:"hsl(var(--destructive))",fontWeight:700}}>🔒 خارج النطاق</span>
                              :isEd
                                ?<div style={{display:"flex",gap:3,justifyContent:"center"}}><button onClick={()=>saveCF(c.id)} style={{background:"#10b981",color:"#fff",border:"none",borderRadius:5,padding:"3px 8px",cursor:"pointer",fontWeight:700,fontSize:10}}>✓</button><button onClick={()=>{setCfEditId(null);setCfErrs({});}} style={{background:darkMode?"#334155":"#f0f0f5",border:"none",borderRadius:5,padding:"3px 8px",cursor:"pointer",fontSize:10}}>✕</button></div>
                                :<button onClick={()=>{setCfEditId(c.id);setCfBuf({pvM:c.pvM,acM:c.acM,evM:c.evM});setCfErrs({});}} style={{background:"#eef2ff",border:"none",borderRadius:5,padding:"3px 7px",cursor:"pointer",fontSize:11,color:"#6366f1"}}>✏️</button>
                            }
                          </td>
                        </tr>
                      );
                    })}
                    <tr style={{background:"#0f172a",color:"#fff",fontWeight:700}}>
                      <td colSpan={3} style={{padding:"9px 12px",textAlign:"center",fontSize:12}}>الإجماليات</td>
                      <td style={{padding:"9px 12px",textAlign:"right",fontFamily:"monospace",color:"#a5b4fc"}}>{cfStats.tPV.toFixed(1)}M</td>
                      <td style={{padding:"9px 12px",textAlign:"right",fontFamily:"monospace",color:"#fde68a"}}>{cfStats.tAC.toFixed(1)}M</td>
                      <td style={{padding:"9px 12px",textAlign:"right",fontFamily:"monospace",color:"#86efac"}}>{cfStats.tEV.toFixed(1)}M</td>
                      <td colSpan={5}/>
                    </tr>
                  </tbody>
                </table>
              </div>
            </Card>
          </>)}

          {/* ═══ CHARTS ═══ */}
          {tab==="charts"&&(
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
              <Card>
                <H3>📉 Cumulative S-Curve</H3>
                <ResponsiveContainer width="100%" height={230}>
                  <ComposedChart data={cfCum.filter(c=>!c.isForecast)}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f5"/>
                    <XAxis dataKey="month" tick={{fontSize:10}}/><YAxis tickFormatter={v=>v+"M"} tick={{fontSize:9}}/>
                    <Tooltip content={<CTip/>}/><Legend wrapperStyle={{fontSize:10}}/>
                    <Area dataKey="evCum" name="EV" fill="#10b98115" stroke="#10b981" strokeWidth={2.5} dot={false}/>
                    <Line dataKey="pvCum" name="PV" stroke="#6366f1" strokeWidth={2} dot={false} strokeDasharray="6 3"/>
                    <Line dataKey="acCum" name="AC" stroke="#f59e0b" strokeWidth={2} dot={false}/>
                  </ComposedChart>
                </ResponsiveContainer>
              </Card>
              <Card>
                <H3>📊 CPI / SPI Trend لكل نشاط</H3>
                <ResponsiveContainer width="100%" height={230}>
                  <LineChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f5"/>
                    <XAxis dataKey="id" tick={{fontSize:8}} angle={-45} textAnchor="end" height={52}/>
                    <YAxis domain={[0,1.6]} tick={{fontSize:9}}/><Tooltip content={<CTip/>}/><Legend wrapperStyle={{fontSize:10}}/>
                    <ReferenceLine y={1} stroke="#888" strokeDasharray="5 3" label={{value:"1.0",position:"right",fontSize:9}}/>
                    <ReferenceLine y={threshSPI} stroke="#f59e0b" strokeDasharray="3 3"/>
                    <Line dataKey="cpi" name="CPI" stroke="#6366f1" strokeWidth={2} dot={{r:2.5}}/>
                    <Line dataKey="spi" name="SPI" stroke="#ec4899" strokeWidth={2} dot={{r:2.5}}/>
                  </LineChart>
                </ResponsiveContainer>
              </Card>
              <Card>
                <H3>📊 انحرافات SV / CV (مليون ريال)</H3>
                <ResponsiveContainer width="100%" height={230}>
                  <BarChart data={varData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f5"/>
                    <XAxis dataKey="disc" tick={{fontSize:10}}/><YAxis tick={{fontSize:9}} tickFormatter={v=>v+"M"}/>
                    <Tooltip content={<CTip/>}/><Legend wrapperStyle={{fontSize:10}}/>
                    <ReferenceLine y={0} stroke="#1a1a2e" strokeWidth={1.5}/>
                    <Bar dataKey="SV" name="SV" radius={[3,3,0,0]}>{varData.map((d,i)=><Cell key={i} fill={d.SV>=0?"#10b981":"#ef4444"}/>)}</Bar>
                    <Bar dataKey="CV" name="CV" radius={[3,3,0,0]}>{varData.map((d,i)=><Cell key={i} fill={d.CV>=0?"#6366f1":"#f59e0b"}/>)}</Bar>
                  </BarChart>
                </ResponsiveContainer>
              </Card>
              <Card>
                <H3>🏗 نسب الإنجاز حسب التخصص</H3>
                <ResponsiveContainer width="100%" height={230}>
                  <BarChart data={byDisc.map(d=>({name:d.disc,progress:+d.avgPct.toFixed(1)}))} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f5"/>
                    <XAxis type="number" domain={[0,100]} tickFormatter={v=>v+"%"} tick={{fontSize:9}}/>
                    <YAxis type="category" dataKey="name" tick={{fontSize:9}} width={90}/><Tooltip formatter={v=>v.toFixed(1)+"%"}/>
                    <ReferenceLine x={50} stroke="#bbb" strokeDasharray="4 4"/>
                    <Bar dataKey="progress" name="الإنجاز" radius={[0,5,5,0]}>{byDisc.map((d,i)=><Cell key={i} fill={DC[d.disc]}/>)}</Bar>
                  </BarChart>
                </ResponsiveContainer>
              </Card>

              {/* BAC Distribution */}
              <Card>
                <H3>💼 توزيع الميزانية حسب التخصص (BAC Distribution)</H3>
                <div style={{display:"flex",gap:16,alignItems:"center"}}>
                  <div style={{flex:1}}>
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={bacDist}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f5"/>
                        <XAxis dataKey="name" tick={{fontSize:9}}/>
                        <YAxis tickFormatter={v=>fmt(v)} tick={{fontSize:9}}/>
                        <Tooltip formatter={(v,n)=>[fmt(v),"BAC"]}/>
                        <Bar dataKey="value" name="BAC" radius={[4,4,0,0]}>
                          {bacDist.map((d,i)=><Cell key={i} fill={d.color}/>)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div style={{width:130,flexShrink:0}}>
                    {bacDist.map(d=>(
                      <div key={d.name} style={{display:"flex",alignItems:"center",gap:6,marginBottom:8}}>
                        <div style={{width:10,height:10,borderRadius:2,background:d.color,flexShrink:0}}/>
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{fontSize:9,fontWeight:700,color:d.color}}>{d.name}</div>
                          <div style={{fontSize:9,color:"#888"}}>{fmt(d.value)} ({d.pct}%)</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>

              {/* Weighted vs Simple Progress */}
              <Card>
                <H3>⚖️ الإنجاز المرجّح بالميزانية (Weighted Progress)</H3>
                <div style={{textAlign:"center",marginBottom:12}}>
                  <div style={{fontSize:10,color:"#888",marginBottom:4}}>الإنجاز المرجّح بالـ BAC (أكثر دقة)</div>
                  <div style={{fontSize:40,fontWeight:900,color:"#6366f1",fontFamily:"monospace"}}>{weightedProg.toFixed(1)}%</div>
                  <div style={{fontSize:11,color:"#888",marginTop:4}}>مقارنة بالمتوسط البسيط: {kpi.prog.toFixed(1)}%</div>
                </div>
                <div style={{display:"flex",flexDirection:"column",gap:10}}>
                  {byDisc.map(d=>{
                    const weight=kpi.bac>0?+(d.bac/kpi.bac*100).toFixed(1):0;
                    return(
                      <div key={d.disc}>
                        <div style={{display:"flex",justifyContent:"space-between",marginBottom:3,fontSize:10}}>
                          <div style={{display:"flex",gap:5,alignItems:"center"}}>
                            <div style={{width:8,height:8,borderRadius:"50%",background:DC[d.disc]}}/>
                            <span style={{fontWeight:600,color:DC[d.disc]}}>{d.disc}</span>
                          </div>
                          <div style={{display:"flex",gap:10,color:"#888"}}>
                            <span>وزن: <b style={{color:DC[d.disc]}}>{weight}%</b></span>
                            <span>إنجاز: <b style={{color:sColor(d.CPI)}}>{Math.round(d.avgPct)}%</b></span>
                          </div>
                        </div>
                        <div style={{display:"flex",gap:4,alignItems:"center"}}>
                          <div style={{flex:1}}><div style={{background:DC[d.disc]+"20",borderRadius:999,height:8,overflow:"hidden"}}><div style={{width:`${d.avgPct}%`,height:"100%",background:DC[d.disc],borderRadius:999}}/></div></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>
            </div>
          )}

          {/* ═══ FORECAST ═══ */}
          {tab==="forecast"&&(<>
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:11,marginBottom:12}}>
              <Kpi l="BAC — الميزانية الأصلية"      v={fmt(kpi.bac)}           c="#6366f1" sub="Total Budget"/>
              <Kpi l="EAC — التقدير المحدّث (CPI)"  v={fmt(kpi.EAC)}           c={kpi.EAC>kpi.bac?"#ef4444":"#10b981"} sub={kpi.EAC>kpi.bac?`تجاوز ${fmt(kpi.EAC-kpi.bac)}`:"ضمن الميزانية"}/>
              <Kpi l="EAC — التقدير (PERT)"          v={fmt(kpi.EAC_pert)}      c="#8b5cf6" sub="AC + (BAC-EV)/CPI"/>
              <Kpi l="VAC — انحراف الإتمام"          v={fmt(kpi.bac-kpi.EAC)}  c={kpi.bac>kpi.EAC?"#10b981":"#ef4444"} sub={kpi.bac>kpi.EAC?"وفورات ✓":"خسائر ⚠"}/>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"3fr 2fr",gap:12,marginBottom:12}}>
              <Card>
                <H3>🔮 S-Curve مع تقدير الإتمام</H3>
                <ResponsiveContainer width="100%" height={250}>
                  <ComposedChart data={cfCum}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f5"/>
                    <XAxis dataKey="month" tick={{fontSize:9}}/><YAxis tickFormatter={v=>v+"M"} tick={{fontSize:9}}/>
                    <Tooltip content={<CTip/>}/><Legend wrapperStyle={{fontSize:10}}/>
                    <Area dataKey="pvCum" name="PV مخطط" fill="#6366f110" stroke="#6366f1" strokeWidth={2} dot={false} strokeDasharray="6 3"/>
                    <Line dataKey="evCum" name="EV مكتسب" stroke="#10b981" strokeWidth={2.5} dot={false}/>
                    <Line dataKey="acCum" name="AC فعلي+متوقع" stroke="#f59e0b" strokeWidth={2} dot={false}/>
                  </ComposedChart>
                </ResponsiveContainer>
              </Card>
              <Card>
                <H3>📋 ملخص التوقعات</H3>
                {[{l:"BAC",v:fmt(kpi.bac),c:"#6366f1"},{l:"EAC (CPI)",v:fmt(kpi.EAC),c:kpi.EAC>kpi.bac?"#ef4444":"#10b981"},{l:"EAC (PERT)",v:fmt(kpi.EAC_pert),c:"#8b5cf6"},{l:"ETC",v:fmt(kpi.ETC),c:"#0ea5e9"},{l:"VAC",v:fmt(kpi.bac-kpi.EAC),c:kpi.bac>kpi.EAC?"#10b981":"#ef4444"},{l:"الإنجاز",v:kpi.prog.toFixed(1)+"%",c:"#333"},{l:"TCPI",v:kpi.TCPI.toFixed(3),c:kpi.TCPI<=1.1?"#10b981":"#ef4444"},{l:"SPI",v:kpi.SPI.toFixed(2),c:sColor(kpi.SPI)},{l:"CPI",v:kpi.CPI.toFixed(2),c:sColor(kpi.CPI)},].map(({l,v,c})=>(
                  <div key={l} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"7px 11px",borderRadius:7,marginBottom:4,background:darkMode?"#1e2d3d":"#f8f9fc",border:"1px solid #f0f0f0"}}>
                    <span style={{fontSize:11,color:"#555"}}>{l}</span><span style={{fontFamily:"monospace",fontWeight:800,fontSize:12,color:c}}>{v}</span>
                  </div>
                ))}
              </Card>
            </div>
            <Card style={{padding:0,overflow:"hidden"}}>
              <div style={{padding:"12px 18px",borderBottom:"1px solid #f0f0f0"}}><H3 style={{margin:0}}>📊 توقعات EAC لكل نشاط</H3></div>
              <div style={{overflowX:"auto"}}>
                <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
                  <thead><tr style={{background:darkMode?"#1e2d3d":"#f8f9fc"}}>{["النشاط","التخصص","BAC","EV","AC","CPI","EAC","ETC","VAC","الحالة"].map(h=><th key={h} style={{padding:"9px 11px",textAlign:"center",fontWeight:700,color:"#555",borderBottom:"1px solid #eee",whiteSpace:"nowrap"}}>{h}</th>)}</tr></thead>
                  <tbody>
                    {filtered.length===0?<tr><td colSpan={10} style={{padding:40,textAlign:"center",color:"#bbb"}}>لا توجد أنشطة</td></tr>
                    :filtered.map((a,i)=>{const{ev,ac,cpi,eac,etc}=calcAct(a);const vac=a.bac-eac;
                      return(<tr key={a.id} style={{borderBottom:"1px solid #f5f5f5",background:i%2===0?(darkMode?"#1e293b":"#fff"):(darkMode?"#0f172a":"#fafbfc")}}>
                        <td style={{padding:"7px 11px"}}><div style={{fontWeight:700,direction:"rtl",fontSize:11}}>{a.nameAr}</div><div style={{fontSize:9,color:"#bbb"}}>{a.id}</div></td>
                        <td style={{padding:"7px 11px",textAlign:"center"}}><span style={{background:DC[a.disc]+"20",color:DC[a.disc],borderRadius:5,padding:"2px 7px",fontWeight:700,fontSize:9}}>{a.disc}</span></td>
                        <td style={{padding:"7px 11px",textAlign:"right",fontFamily:"monospace"}}>{fmt(a.bac)}</td>
                        <td style={{padding:"7px 11px",textAlign:"right",fontFamily:"monospace",color:"#10b981"}}>{fmt(ev)}</td>
                        <td style={{padding:"7px 11px",textAlign:"right",fontFamily:"monospace"}}>{fmt(ac)}</td>
                        <td style={{padding:"7px 11px",textAlign:"center"}}><span style={{color:sColor(cpi),fontWeight:800}}>{cpi>0?cpi.toFixed(2):"—"}</span></td>
                        <td style={{padding:"7px 11px",textAlign:"right",fontFamily:"monospace",color:eac>a.bac?"#ef4444":"#10b981"}}>{fmt(eac)}</td>
                        <td style={{padding:"7px 11px",textAlign:"right",fontFamily:"monospace"}}>{fmt(etc)}</td>
                        <td style={{padding:"7px 11px",textAlign:"right",fontFamily:"monospace",color:vac>=0?"#10b981":"#ef4444",fontWeight:700}}>{fmt(vac)}</td>
                        <td style={{padding:"7px 11px",textAlign:"center",fontSize:11}}>{cpi>=1?"✅ جيد":cpi>=0.9?"⚠️ تحذير":"🔴 حرج"}</td>
                      </tr>);
                    })}
                    <tr style={{background:"#0f172a",color:"#fff",fontWeight:700}}>
                      <td colSpan={2} style={{padding:"9px 12px",textAlign:"center",fontSize:12}}>GRAND TOTAL</td>
                      <td style={{padding:"9px 12px",textAlign:"right",fontFamily:"monospace"}}>{fmt(kpi.bac)}</td>
                      <td style={{padding:"9px 12px",textAlign:"right",fontFamily:"monospace",color:"#86efac"}}>{fmt(kpi.ev)}</td>
                      <td style={{padding:"9px 12px",textAlign:"right",fontFamily:"monospace"}}>{fmt(kpi.ac)}</td>
                      <td style={{padding:"9px 12px",textAlign:"center",color:sColor(kpi.CPI)}}>{kpi.CPI.toFixed(2)}</td>
                      <td style={{padding:"9px 12px",textAlign:"right",fontFamily:"monospace",color:kpi.EAC>kpi.bac?"#fca5a5":"#86efac"}}>{fmt(kpi.EAC)}</td>
                      <td style={{padding:"9px 12px",textAlign:"right",fontFamily:"monospace"}}>{fmt(kpi.ETC)}</td>
                      <td style={{padding:"9px 12px",textAlign:"right",fontFamily:"monospace",color:kpi.bac>kpi.EAC?"#86efac":"#fca5a5"}}>{fmt(kpi.bac-kpi.EAC)}</td>
                      <td style={{padding:"9px 12px",textAlign:"center"}}>{kpi.CPI>=1?"✅":kpi.CPI>=0.9?"⚠️":"🔴"}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </Card>
          </>)}

          {/* ═══ RESOURCE LEVELLING ═══ */}
          {tab==="levelling"&&(<>
            {/* KPIs */}
            <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:11,marginBottom:14}}>
              <Kpi l="إجمالي العمالة الفعلية"  v={resStats.laborHeadcount+" فرد"}   c="#6366f1" ic="👷"/>
              <Kpi l="ذروة الاستخدام الشهري"    v={peakMonth.actHead+" فرد"}         c="#ef4444" ic="📈" sub={peakMonth.month}/>
              <Kpi l="متوسط الاستخدام"           v={avgUtil+"%"}                      c={avgUtil>=80?"#10b981":avgUtil>=50?"#f59e0b":"#ef4444"} ic="📊"/>
              <Kpi l="موارد متجاوزة للطاقة"      v={overloadedCount+" مورد"}          c={overloadedCount>0?"#ef4444":"#10b981"} ic="⚠️" sub={overloadedCount>0?"تحتاج مراجعة":"جميع الموارد ضمن الطاقة"}/>
              <Kpi l="فارق تكلفة الموارد"        v={fmt(resStats.totalAct-resStats.totalPlan)} c={resStats.totalAct>resStats.totalPlan?"#ef4444":"#10b981"} ic="💰" sub={resStats.totalAct>resStats.totalPlan?"تجاوز":"وفر"}/>
            </div>

            {/* Histogram charts */}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:14}}>
              {/* Labor histogram */}
              <Card>
                <H3>👷 هيستوجرام العمالة الشهري (مخطط vs فعلي)</H3>
                <ResponsiveContainer width="100%" height={220}>
                  <ComposedChart data={monthlyAlloc}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f5"/>
                    <XAxis dataKey="month" tick={{fontSize:10}}/>
                    <YAxis tick={{fontSize:9}} label={{value:"عدد الأفراد",angle:-90,position:"insideLeft",fontSize:9}}/>
                    <Tooltip content={<CTip/>}/>
                    <Legend wrapperStyle={{fontSize:10}}/>
                    <Bar dataKey="planHead" name="مخطط" fill="#6366f150" radius={[3,3,0,0]}/>
                    <Bar dataKey="actHead"  name="فعلي"  fill="#6366f1"   radius={[3,3,0,0]}/>
                    <ReferenceLine y={resStats.laborHeadcount} stroke="#ef4444" strokeDasharray="5 3" label={{value:"الحد الأقصى",position:"right",fontSize:9,fill:"#ef4444"}}/>
                  </ComposedChart>
                </ResponsiveContainer>
              </Card>

              {/* Equipment histogram */}
              <Card>
                <H3>🚧 هيستوجرام المعدات الشهري</H3>
                <ResponsiveContainer width="100%" height={220}>
                  <ComposedChart data={monthlyAlloc}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f5"/>
                    <XAxis dataKey="month" tick={{fontSize:10}}/>
                    <YAxis tick={{fontSize:9}}/>
                    <Tooltip content={<CTip/>}/>
                    <Legend wrapperStyle={{fontSize:10}}/>
                    <Bar dataKey="planEquip" name="مخطط" fill="#f59e0b50" radius={[3,3,0,0]}/>
                    <Bar dataKey="actEquip"  name="فعلي"  fill="#f59e0b"   radius={[3,3,0,0]}/>
                  </ComposedChart>
                </ResponsiveContainer>
              </Card>

              {/* Cost histogram */}
              <Card>
                <H3>💰 منحنى تكلفة الموارد الشهري (ريال)</H3>
                <ResponsiveContainer width="100%" height={220}>
                  <ComposedChart data={monthlyAlloc}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f5"/>
                    <XAxis dataKey="month" tick={{fontSize:10}}/>
                    <YAxis tickFormatter={v=>fmt(v)} tick={{fontSize:9}}/>
                    <Tooltip content={<CTip/>}/>
                    <Legend wrapperStyle={{fontSize:10}}/>
                    <Area dataKey="planCost" name="تكلفة مخططة" fill="#6366f115" stroke="#6366f1" strokeWidth={2} strokeDasharray="5 3"/>
                    <Area dataKey="actCost"  name="تكلفة فعلية"  fill="#10b98120" stroke="#10b981" strokeWidth={2}/>
                  </ComposedChart>
                </ResponsiveContainer>
              </Card>

              {/* Utilisation bar */}
              <Card>
                <H3>📊 نسبة استخدام الموارد البشرية</H3>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart
                    data={resources.filter(r=>r.type==="labor"&&r.planQty>0).map(r=>({
                      name:r.name.split(" ").slice(0,2).join(" "),
                      util:+(r.actQty/r.planQty*100).toFixed(0),
                      planQty:r.planQty, actQty:r.actQty
                    }))}
                    layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f5"/>
                    <XAxis type="number" domain={[0,130]} tickFormatter={v=>v+"%"} tick={{fontSize:9}}/>
                    <YAxis type="category" dataKey="name" tick={{fontSize:8}} width={90}/>
                    <Tooltip formatter={(v,n,p)=>[v+"%","الاستخدام"]}/>
                    <ReferenceLine x={100} stroke="#ef4444" strokeDasharray="4 4" label={{value:"100%",position:"right",fontSize:9,fill:"#ef4444"}}/>
                    <ReferenceLine x={80}  stroke="#f59e0b" strokeDasharray="4 4"/>
                    <Bar dataKey="util" name="الاستخدام %" radius={[0,4,4,0]}>
                      {resources.filter(r=>r.type==="labor"&&r.planQty>0).map((r,i)=>{
                        const u=+(r.actQty/r.planQty*100).toFixed(0);
                        return <Cell key={i} fill={u>100?"#ef4444":u>=80?"#10b981":"#f59e0b"}/>;
                      })}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </Card>
            </div>

            {/* Levelling analysis table */}
            <Card style={{padding:0,overflow:"hidden"}}>
              <div style={{padding:"12px 18px",borderBottom:"1px solid #f0f0f0",display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:8}}>
                <H3 style={{margin:0}}>⚖️ تحليل توازن الموارد — Resource Levelling Analysis</H3>
                <div style={{display:"flex",gap:6}}>
                  {[["all","الكل","#6366f1"],["overloaded","🔴 فوق الطاقة","#ef4444"],["underutil","🟡 منخفض","#f59e0b"]].map(([v,l,c])=>(
                    <button key={v} onClick={()=>setLvlFilter(v)}
                      style={{background:lvlFilter===v?c+"20":"#f8f9fc",color:lvlFilter===v?c:"#555",border:`1px solid ${lvlFilter===v?c:"#e5e7eb"}`,borderRadius:6,padding:"4px 10px",cursor:"pointer",fontSize:10,fontWeight:lvlFilter===v?700:400}}>
                      {l}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{overflowX:"auto"}}>
                <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
                  <thead><tr style={{background:darkMode?"#1e2d3d":"#f8f9fc"}}>
                    {["المورد","الدور","التخصص","النوع","مخطط","فعلي","الاستخدام%","الفارق","تكلفة الفارق","الحالة","التوصية"].map(h=>(
                      <th key={h} style={{padding:"9px 10px",textAlign:"center",fontWeight:700,color:"#555",borderBottom:"1px solid #eee",whiteSpace:"nowrap",fontSize:10}}>{h}</th>
                    ))}
                  </tr></thead>
                  <tbody>
                    {resourceAnalysis.length===0
                      ? <tr><td colSpan={11} style={{padding:30,textAlign:"center",color:"#bbb"}}>لا توجد موارد تطابق الفلتر</td></tr>
                      : resourceAnalysis.map((r,i)=>{
                          const statusColor={overloaded:"#ef4444",optimal:"#10b981",underutil:"#f59e0b",idle:"#94a3b8"}[r.status];
                          const statusLabel={overloaded:"🔴 فوق الطاقة",optimal:"✅ مثالي",underutil:"🟡 منخفض",idle:"⚫ خامل"}[r.status];
                          return(
                            <tr key={r.id} style={{borderBottom:"1px solid #f5f5f5",background:r.status==="overloaded"?"#fff5f5":i%2===0?(darkMode?"#1e293b":"#fff"):(darkMode?"#0f172a":"#fafbfc")}}>
                              <td style={{padding:"8px 10px"}}>
                                <div style={{fontWeight:700,fontSize:11}}>{r.name}</div>
                                <div style={{fontSize:9,color:"#aaa"}}>{r.id}</div>
                              </td>
                              <td style={{padding:"8px 10px",fontSize:10,color:"#666"}}>{r.role}</td>
                              <td style={{padding:"8px 10px",textAlign:"center"}}>
                                <span style={{background:DC[r.disc]+"20",color:DC[r.disc],borderRadius:5,padding:"1px 7px",fontWeight:700,fontSize:9}}>{r.disc}</span>
                              </td>
                              <td style={{padding:"8px 10px",textAlign:"center",fontSize:10}}>
                                <span style={{background:r.type==="labor"?"#eef2ff":r.type==="equip"?"#fef3c7":"#d1fae5",color:r.type==="labor"?"#6366f1":r.type==="equip"?"#f59e0b":"#10b981",borderRadius:5,padding:"1px 7px",fontWeight:700,fontSize:9}}>
                                  {r.type==="labor"?"👷 عمالة":r.type==="equip"?"🚧 معدة":"📦 مواد"}
                                </span>
                              </td>
                              <td style={{padding:"8px 10px",textAlign:"center",fontFamily:"monospace"}}>{r.planQty} {r.unit}</td>
                              <td style={{padding:"8px 10px",textAlign:"center",fontFamily:"monospace",color:r.actQty>r.planQty?"#ef4444":r.actQty===r.planQty?"#10b981":"#f59e0b",fontWeight:700}}>{r.actQty}</td>
                              <td style={{padding:"8px 10px",textAlign:"center"}}>
                                <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:2}}>
                                  <span style={{fontWeight:800,color:statusColor,fontSize:12}}>{r.util}%</span>
                                  <div style={{width:60,height:5,background:"#f0f0f5",borderRadius:999,overflow:"hidden"}}>
                                    <div style={{width:`${Math.min(100,r.util)}%`,height:"100%",background:statusColor,borderRadius:999}}/>
                                  </div>
                                </div>
                              </td>
                              <td style={{padding:"8px 10px",textAlign:"center",fontFamily:"monospace",color:r.variance>0?"#ef4444":r.variance<0?"#f59e0b":"#10b981",fontWeight:700}}>
                                {r.variance>0?"+":""}{r.variance}
                              </td>
                              <td style={{padding:"8px 10px",textAlign:"right",fontFamily:"monospace",color:r.costVar>0?"#ef4444":"#10b981",fontWeight:700,fontSize:10}}>
                                {r.costVar>0?"+":""}{fmt(r.costVar)}
                              </td>
                              <td style={{padding:"8px 10px",textAlign:"center"}}>
                                <span style={{background:statusColor+"15",color:statusColor,borderRadius:6,padding:"3px 8px",fontWeight:700,fontSize:9,whiteSpace:"nowrap"}}>{statusLabel}</span>
                              </td>
                              <td style={{padding:"8px 10px",fontSize:10,color:"#555",maxWidth:200}}>{r.recommendation}</td>
                            </tr>
                          );
                        })
                    }
                    {/* Summary row */}
                    <tr style={{background:"#0f172a",color:"#fff",fontWeight:700}}>
                      <td colSpan={4} style={{padding:"9px 10px",textAlign:"center",fontSize:11}}>الإجماليات</td>
                      <td style={{padding:"9px 10px",textAlign:"center",fontFamily:"monospace",color:"#a5b4fc"}}>{resources.filter(r=>r.type!=="material").reduce((s,r)=>s+r.planQty,0)}</td>
                      <td style={{padding:"9px 10px",textAlign:"center",fontFamily:"monospace",color:resStats.laborHeadcount>50?"#fca5a5":"#86efac"}}>{resources.filter(r=>r.type!=="material").reduce((s,r)=>s+r.actQty,0)}</td>
                      <td style={{padding:"9px 10px",textAlign:"center",color:avgUtil>=80?"#86efac":"#fde68a"}}>{avgUtil}%</td>
                      <td colSpan={2} style={{padding:"9px 10px",textAlign:"center",fontFamily:"monospace",color:resStats.totalAct>resStats.totalPlan?"#fca5a5":"#86efac"}}>{fmt(resStats.totalAct-resStats.totalPlan)}</td>
                      <td style={{padding:"9px 10px",textAlign:"center"}}>{overloadedCount>0?`🔴 ${overloadedCount} تجاوز`:"✅ ضمن الطاقة"}</td>
                      <td/>
                    </tr>
                  </tbody>
                </table>
              </div>
            </Card>

            {/* Levelling recommendations */}
            {overloadedCount>0&&(
              <Card style={{marginTop:14,border:"2px solid #fee2e2",background:darkMode?"#1a0808":"#fff5f5"}}>
                <H3 style={{color:"#dc2626"}}>🔴 توصيات تسوية الموارد المتجاوزة — Levelling Recommendations</H3>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                  {resourceAnalysis.filter(r=>r.status==="overloaded").map(r=>(
                    <div key={r.id} style={{background:"#fff",borderRadius:9,padding:"12px 14px",border:"1px solid #fecaca"}}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:6}}>
                        <div>
                          <div style={{fontWeight:700,fontSize:12}}>{r.name}</div>
                          <div style={{fontSize:10,color:"#888"}}>{r.role} · {r.disc}</div>
                        </div>
                        <span style={{background:"#fee2e2",color:"#dc2626",borderRadius:6,padding:"2px 8px",fontWeight:700,fontSize:11}}>{r.util}%</span>
                      </div>
                      <div style={{fontSize:11,color:"#555",lineHeight:1.7}}>
                        <div>📌 الطاقة المخططة: <b>{r.planQty} {r.unit}</b></div>
                        <div>📌 الاستخدام الفعلي: <b style={{color:"#dc2626"}}>{r.actQty} {r.unit}</b> (+{r.variance})</div>
                        <div style={{marginTop:6,padding:"6px 10px",background:"#fef2f2",borderRadius:6,color:"#b91c1c",fontWeight:600}}>
                          💡 الحل المقترح: إضافة {r.variance} {r.unit} من نفس التخصص أو تأجيل {Math.round(r.variance/r.planQty*100)}% من الأنشطة المرتبطة
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </>)}

          {/* ═══ SUBCONTRACTORS ═══ */}
          {tab==="subcontract"&&(<>
            {/* KPIs */}
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:11,marginBottom:14}}>
              <Kpi l="إجمالي قيمة المقاولات" v={fmt(subcontractors.reduce((s,c)=>s+c.contract,0))} c="#6366f1" ic="🤝"/>
              <Kpi l="إجمالي المدفوع"         v={fmt(subcontractors.reduce((s,c)=>s+c.paid,0))}     c="#10b981" ic="💸"/>
              <Kpi l="المتبقي للصرف"          v={fmt(subcontractors.reduce((s,c)=>s+(c.contract-c.paid),0))} c="#f59e0b" ic="⏳"/>
              <Kpi l="عدد المقاولين"           v={subcontractors.length+" مقاول"}                    c="#0ea5e9" ic="🏢" sub={`${subcontractors.filter(s=>s.status==="نشط").length} نشط`}/>
            </div>

            {/* Charts */}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:14}}>
              <Card>
                <H3>📊 توزيع قيمة المقاولات حسب التخصص</H3>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={subcontractors}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f5"/>
                    <XAxis dataKey="name" tick={{fontSize:8}} angle={-20} textAnchor="end" height={50}/>
                    <YAxis tickFormatter={v=>fmt(v)} tick={{fontSize:9}}/>
                    <Tooltip content={<CTip/>}/>
                    <Legend wrapperStyle={{fontSize:10}}/>
                    <Bar dataKey="contract" name="قيمة العقد" radius={[3,3,0,0]}>
                      {subcontractors.map((s,i)=><Cell key={i} fill={DC[s.disc]||"#6366f1"}/>)}
                    </Bar>
                    <Bar dataKey="paid" name="المدفوع" radius={[3,3,0,0]}>
                      {subcontractors.map((s,i)=><Cell key={i} fill={(DC[s.disc]||"#6366f1")+"77"}/>)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </Card>
              <Card>
                <H3>⏳ نسبة الاستنفاذ المالي لكل مقاول</H3>
                <div style={{display:"flex",flexDirection:"column",gap:12,marginTop:4}}>
                  {subcontractors.map(s=>{
                    const pct=s.contract>0?+(s.paid/s.contract*100).toFixed(1):0;
                    return(
                      <div key={s.id}>
                        <div style={{display:"flex",justifyContent:"space-between",marginBottom:4,fontSize:11}}>
                          <span style={{fontWeight:600,direction:"rtl"}}>{s.name.split(" ").slice(0,3).join(" ")}</span>
                          <span style={{fontFamily:"monospace",fontWeight:700,color:DC[s.disc]}}>{pct}%</span>
                        </div>
                        <div style={{background:darkMode?"#334155":"#f0f0f5",borderRadius:999,height:8,overflow:"hidden"}}>
                          <div style={{width:`${pct}%`,height:"100%",background:DC[s.disc],borderRadius:999}}/>
                        </div>
                        <div style={{display:"flex",justifyContent:"space-between",fontSize:9,color:"#aaa",marginTop:2}}>
                          <span>مدفوع: {fmt(s.paid)}</span>
                          <span>متبقي: {fmt(s.contract-s.paid)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>
            </div>

            {/* Subcontractor table */}
            <Card style={{padding:0,overflow:"hidden"}}>
              <div style={{padding:"12px 18px",borderBottom:`1px solid ${darkMode?"#334155":"#f0f0f0"}`,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                <H3 style={{margin:0}}>🤝 سجل المقاولين من الباطن — Subcontractor Register</H3>
                <button onClick={()=>{
                  const name=prompt("اسم المقاول:");if(!name)return;
                  const scope=prompt("نطاق العمل:");
                  const contract=+prompt("قيمة العقد:");
                  if(!contract)return;
                  setSubcontractors(p=>[...p,{id:"SC-"+String(Date.now()).slice(-3),name,scope:scope||"",disc:"GENERAL",contract,paid:0,pct:0,status:"لم يبدأ"}]);
                  logChange(`إضافة مقاول: ${name}`,"create");
                }} style={{background:"#6366f1",color:"#fff",border:"none",borderRadius:7,padding:"6px 14px",fontWeight:700,cursor:"pointer",fontSize:11}}>+ إضافة مقاول</button>
              </div>
              <div style={{overflowX:"auto"}}>
                <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
                  <thead><tr style={{background:darkMode?"#1e2d3d":"#f8f9fc"}}>
                    {["الكود","اسم المقاول","نطاق العمل","التخصص","قيمة العقد","المدفوع","المتبقي","الإنجاز%","الحالة","إجراء"].map(h=>(
                      <th key={h} style={{padding:"9px 10px",textAlign:"center",fontWeight:700,color:darkMode?"#94a3b8":"#555",borderBottom:`1px solid ${darkMode?"#334155":"#eee"}`,whiteSpace:"nowrap",fontSize:10}}>{h}</th>
                    ))}
                  </tr></thead>
                  <tbody>
                    {subcontractors.map((s,i)=>(
                      <tr key={s.id} style={{borderBottom:`1px solid ${darkMode?"#334155":"#f5f5f5"}`,background:i%2===0?(darkMode?"#1e293b":"#fff"):(darkMode?"#0f172a":"#fafbfc")}}>
                        <td style={{padding:"8px 10px",textAlign:"center",fontWeight:700,fontSize:10,color:"#6366f1"}}>{s.id}</td>
                        <td style={{padding:"8px 10px",fontWeight:600,fontSize:11,direction:"rtl"}}>{s.name}</td>
                        <td style={{padding:"8px 10px",fontSize:10,color:darkMode?"#94a3b8":"#666",direction:"rtl"}}>{s.scope}</td>
                        <td style={{padding:"8px 10px",textAlign:"center"}}><span style={{background:(DC[s.disc]||"#888")+"20",color:DC[s.disc]||"#888",borderRadius:5,padding:"2px 7px",fontWeight:700,fontSize:9}}>{s.disc}</span></td>
                        <td style={{padding:"8px 10px",textAlign:"right",fontFamily:"monospace",fontWeight:600}}>{fmt(s.contract)}</td>
                        <td style={{padding:"8px 10px",textAlign:"right",fontFamily:"monospace",color:"#10b981",fontWeight:700}}>{fmt(s.paid)}</td>
                        <td style={{padding:"8px 10px",textAlign:"right",fontFamily:"monospace",color:"#f59e0b",fontWeight:700}}>{fmt(s.contract-s.paid)}</td>
                        <td style={{padding:"8px 10px",textAlign:"center"}}>
                          <div style={{display:"flex",alignItems:"center",gap:4,justifyContent:"center"}}>
                            <div style={{width:40,height:5,background:darkMode?"#334155":"#f0f0f5",borderRadius:999,overflow:"hidden"}}>
                              <div style={{width:`${s.pct}%`,height:"100%",background:DC[s.disc]||"#6366f1",borderRadius:999}}/>
                            </div>
                            <span style={{fontWeight:700,fontSize:10,color:DC[s.disc]}}>{s.pct}%</span>
                          </div>
                        </td>
                        <td style={{padding:"8px 10px",textAlign:"center"}}>
                          <span style={{background:s.status==="نشط"?"#d1fae5":s.status==="لم يبدأ"?"#fef3c7":"#fee2e2",color:s.status==="نشط"?"#065f46":s.status==="لم يبدأ"?"#92400e":"#991b1b",borderRadius:6,padding:"3px 8px",fontWeight:700,fontSize:9}}>{s.status}</span>
                        </td>
                        <td style={{padding:"8px 10px",textAlign:"center",display:"flex",gap:3,justifyContent:"center"}}>
                          <button onClick={()=>{const paid=+prompt("المبلغ المدفوع:",s.paid);if(isNaN(paid))return;const pct=+prompt("نسبة الإنجاز:",s.pct);setSubcontractors(p=>p.map(x=>x.id===s.id?{...x,paid,pct:isNaN(pct)?x.pct:pct}:x));logChange(`تحديث مقاول: ${s.name}`,"edit");}} style={{background:"#eef2ff",border:"none",borderRadius:5,padding:"3px 8px",cursor:"pointer",fontSize:11,color:"#6366f1"}}>✏️</button>
                          <button onClick={()=>{if(!window.confirm("حذف المقاول؟"))return;setSubcontractors(p=>p.filter(x=>x.id!==s.id));logChange(`حذف مقاول: ${s.name}`,"delete");}} style={{background:"#fee2e2",border:"none",borderRadius:5,padding:"3px 8px",cursor:"pointer",fontSize:11,color:"#ef4444"}}>🗑</button>
                        </td>
                      </tr>
                    ))}
                    <tr style={{background:"#0f172a",color:"#fff",fontWeight:700}}>
                      <td colSpan={4} style={{padding:"9px 10px",textAlign:"center",fontSize:12}}>الإجماليات</td>
                      <td style={{padding:"9px 10px",textAlign:"right",fontFamily:"monospace",color:"#a5b4fc"}}>{fmt(subcontractors.reduce((s,c)=>s+c.contract,0))}</td>
                      <td style={{padding:"9px 10px",textAlign:"right",fontFamily:"monospace",color:"#86efac"}}>{fmt(subcontractors.reduce((s,c)=>s+c.paid,0))}</td>
                      <td style={{padding:"9px 10px",textAlign:"right",fontFamily:"monospace",color:"#fde68a"}}>{fmt(subcontractors.reduce((s,c)=>s+(c.contract-c.paid),0))}</td>
                      <td colSpan={3}/>
                    </tr>
                  </tbody>
                </table>
              </div>
            </Card>
          </>)}

          {/* ═══ BUDGET REVISION ═══ */}
          {tab==="budget"&&(<>
            {/* Contingency KPIs */}
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:11,marginBottom:14}}>
              <Kpi l="الاحتياطي الطارئ الكلي"    v={fmt(contingency.amount)} c="#6366f1" ic="🛡️" sub="Contingency Reserve"/>
              <Kpi l="المستخدم من الاحتياطي"      v={fmt(contingency.used)}  c="#f59e0b" ic="📤" sub={`${+(contingency.used/contingency.amount*100).toFixed(0)}% مستخدم`}/>
              <Kpi l="المتبقي من الاحتياطي"       v={fmt(contingency.amount-contingency.used)} c="#10b981" ic="💰" sub="متاح للاستخدام"/>
              <Kpi l="إجمالي المراجعات المعتمدة"  v={fmt(revisions.filter(r=>r.approved).reduce((s,r)=>s+r.amount,0))} c={revisions.filter(r=>r.approved).reduce((s,r)=>s+r.amount,0)>0?"#ef4444":"#10b981"} ic="📋"/>
            </div>

            {/* BAC + Revisions summary */}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:14}}>
              <Card>
                <H3>💼 ملخص تطور الميزانية</H3>
                <div style={{display:"flex",flexDirection:"column",gap:8}}>
                  {[
                    {l:"الميزانية الأصلية (BAC)",      v:fmt(kpi.bac),                                                          c:"#6366f1"},
                    {l:"إجمالي التعديلات المعتمدة",    v:fmt(revisions.filter(r=>r.approved).reduce((s,r)=>s+r.amount,0)),     c:"#f59e0b", sign:true},
                    {l:"الميزانية المعدّلة",            v:fmt(kpi.bac+revisions.filter(r=>r.approved).reduce((s,r)=>s+r.amount,0)), c:"#0ea5e9"},
                    {l:"EAC الحالي",                   v:fmt(kpi.EAC),                                                          c:kpi.EAC>kpi.bac?"#ef4444":"#10b981"},
                    {l:"الاحتياطي المتبقي",             v:fmt(contingency.amount-contingency.used),                              c:"#8b5cf6"},
                    {l:"التوقع الإجمالي (EAC+احتياطي)",v:fmt(kpi.EAC+(contingency.amount-contingency.used)),                   c:"#ec4899"},
                  ].map(({l,v,c,sign})=>(
                    <div key={l} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 12px",background:darkMode?"#0f172a":"#f8f9fc",borderRadius:8,border:`1px solid ${darkMode?"#334155":"#f0f0f0"}`}}>
                      <span style={{fontSize:11,color:darkMode?"#94a3b8":"#555"}}>{l}</span>
                      <span style={{fontFamily:"monospace",fontWeight:800,fontSize:13,color:c}}>{sign&&revisions.filter(r=>r.approved).reduce((s,r)=>s+r.amount,0)>0?"+":""}{v}</span>
                    </div>
                  ))}
                </div>
              </Card>
              <Card>
                <H3>📊 توزيع التعديلات حسب التخصص</H3>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={DISCIPLINES.map(d=>({disc:d,approved:revisions.filter(r=>r.disc===d&&r.approved).reduce((s,r)=>s+r.amount,0),pending:revisions.filter(r=>r.disc===d&&!r.approved).reduce((s,r)=>s+r.amount,0)}))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f5"/>
                    <XAxis dataKey="disc" tick={{fontSize:9}}/>
                    <YAxis tickFormatter={v=>fmt(v)} tick={{fontSize:9}}/>
                    <Tooltip content={<CTip/>}/>
                    <Legend wrapperStyle={{fontSize:10}}/>
                    <ReferenceLine y={0} stroke="#888" strokeWidth={1}/>
                    <Bar dataKey="approved" name="معتمد" radius={[3,3,0,0]}>
                      {DISCIPLINES.map((d,i)=><Cell key={i} fill={DC[d]}/>)}
                    </Bar>
                    <Bar dataKey="pending" name="قيد الاعتماد" radius={[3,3,0,0]}>
                      {DISCIPLINES.map((d,i)=><Cell key={i} fill={DC[d]+"60"}/>)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </Card>
            </div>

            {/* Revisions table */}
            <Card style={{padding:0,overflow:"hidden"}}>
              <div style={{padding:"12px 18px",borderBottom:`1px solid ${darkMode?"#334155":"#f0f0f0"}`,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                <H3 style={{margin:0}}>📋 سجل مراجعات الميزانية — Budget Revision Log</H3>
                <button onClick={()=>{
                  const reason=prompt("سبب المراجعة:");if(!reason)return;
                  const amount=+prompt("المبلغ (+ زيادة / - توفير):");
                  if(isNaN(amount))return;
                  const disc=prompt("التخصص (CIVIL/GENERAL/etc):")||"GENERAL";
                  const newRev={id:"BR-"+String(Date.now()).slice(-3),date:new Date().toISOString().slice(0,10),reason,amount,approved:false,disc:disc.toUpperCase()};
                  setRevisions(p=>[...p,newRev]);
                  logChange(`إضافة مراجعة ميزانية: ${reason} (${fmt(amount)})`,"edit");
                }} style={{background:"#6366f1",color:"#fff",border:"none",borderRadius:7,padding:"6px 14px",fontWeight:700,cursor:"pointer",fontSize:11}}>+ مراجعة جديدة</button>
              </div>
              <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
                <thead><tr style={{background:darkMode?"#1e2d3d":"#f8f9fc"}}>
                  {["الكود","التاريخ","السبب","التخصص","المبلغ","الحالة","إجراء"].map(h=>(
                    <th key={h} style={{padding:"9px 12px",textAlign:"center",fontWeight:700,color:darkMode?"#94a3b8":"#555",borderBottom:`1px solid ${darkMode?"#334155":"#eee"}`,fontSize:10}}>{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {revisions.map((r,i)=>(
                    <tr key={r.id} style={{borderBottom:`1px solid ${darkMode?"#334155":"#f5f5f5"}`,background:i%2===0?(darkMode?"#1e293b":"#fff"):(darkMode?"#0f172a":"#fafbfc")}}>
                      <td style={{padding:"8px 12px",textAlign:"center",fontWeight:700,fontSize:10,color:"#6366f1"}}>{r.id}</td>
                      <td style={{padding:"8px 12px",textAlign:"center",fontSize:10,color:darkMode?"#94a3b8":"#888"}}>{r.date}</td>
                      <td style={{padding:"8px 12px",fontSize:11,direction:"rtl"}}>{r.reason}</td>
                      <td style={{padding:"8px 12px",textAlign:"center"}}><span style={{background:(DC[r.disc]||"#888")+"20",color:DC[r.disc]||"#888",borderRadius:5,padding:"2px 7px",fontWeight:700,fontSize:9}}>{r.disc}</span></td>
                      <td style={{padding:"8px 12px",textAlign:"right",fontFamily:"monospace",fontWeight:700,color:r.amount>0?"#ef4444":"#10b981"}}>{r.amount>0?"+":""}{fmt(r.amount)}</td>
                      <td style={{padding:"8px 12px",textAlign:"center"}}>
                        <span style={{background:r.approved?"#d1fae5":"#fef3c7",color:r.approved?"#065f46":"#92400e",borderRadius:6,padding:"3px 8px",fontWeight:700,fontSize:9}}>{r.approved?"✅ معتمد":"⏳ قيد الاعتماد"}</span>
                      </td>
                      <td style={{padding:"8px 12px",textAlign:"center",display:"flex",gap:3,justifyContent:"center"}}>
                        {!r.approved&&<button onClick={()=>{setRevisions(p=>p.map(x=>x.id===r.id?{...x,approved:true}:x));logChange(`اعتماد مراجعة ميزانية: ${r.reason}`,"edit");addNotif(`تم اعتماد مراجعة: ${r.reason}`,"info");}} style={{background:"#d1fae5",border:"none",borderRadius:5,padding:"3px 9px",cursor:"pointer",fontSize:10,color:"#065f46",fontWeight:700}}>✓ اعتماد</button>}
                        <button onClick={()=>{if(!window.confirm("حذف؟"))return;setRevisions(p=>p.filter(x=>x.id!==r.id));}} style={{background:"#fee2e2",border:"none",borderRadius:5,padding:"3px 7px",cursor:"pointer",fontSize:11,color:"#ef4444"}}>🗑</button>
                      </td>
                    </tr>
                  ))}
                  <tr style={{background:"#0f172a",color:"#fff",fontWeight:700}}>
                    <td colSpan={4} style={{padding:"9px 12px",textAlign:"center",fontSize:12}}>صافي التعديلات</td>
                    <td style={{padding:"9px 12px",textAlign:"right",fontFamily:"monospace",color:revisions.filter(r=>r.approved).reduce((s,r)=>s+r.amount,0)>0?"#fca5a5":"#86efac"}}>
                      {fmt(revisions.filter(r=>r.approved).reduce((s,r)=>s+r.amount,0))}
                    </td>
                    <td colSpan={2}/>
                  </tr>
                </tbody>
              </table>
            </Card>
          </>)}

          {/* ═══ RISKS ═══ */}
          {tab==="risks"&&(<>
            {/* Risk KPIs */}
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:11,marginBottom:12}}>
              <Kpi l="إجمالي المخاطر"        v={risks.length}                    c="#6366f1" ic="📋"/>
              <Kpi l="مخاطر مفتوحة"          v={riskStats.open}                  c="#f59e0b" ic="⚠️"/>
              <Kpi l="مخاطر حرجة (≥16)"     v={riskStats.critical}               c="#ef4444" ic="🔴"/>
              <Kpi l="التكلفة المحتملة"       v={fmt(riskStats.totalCost)}         c="#8b5cf6" ic="💰"/>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}>
              {/* Risk Matrix visual */}
              <Card>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
                  <H3 style={{margin:0}}>📊 مصفوفة المخاطر (Probability × Impact)</H3>
                </div>
                <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:2,position:"relative"}}>
                  {[5,4,3,2,1].map(p=>[1,2,3,4,5].map(i=>{
                    const score=p*i;const c=rColor(score);const rs=risks.filter(r=>r.prob===p&&r.impact===i);
                    return(
                      <div key={`${p}-${i}`} style={{background:c+"20",border:`1px solid ${c}40`,borderRadius:6,padding:"6px 4px",textAlign:"center",minHeight:44,position:"relative",cursor:"default"}}>
                        <div style={{fontSize:8,color:c,fontWeight:700,marginBottom:2}}>{score}</div>
                        {rs.map((r,ri)=><div key={ri} title={r.title} style={{width:14,height:14,borderRadius:"50%",background:c,margin:"1px auto",display:"flex",alignItems:"center",justifyContent:"center",fontSize:7,color:"#fff",fontWeight:700}}>{r.id.slice(-2)}</div>)}
                      </div>
                    );
                  }))}
                </div>
                <div style={{display:"flex",justifyContent:"space-between",marginTop:8,fontSize:9,color:"#bbb"}}>
                  <span>← الأثر منخفض → عالي</span><span style={{color:"#888",fontWeight:600}}>↕ الاحتمالية</span>
                </div>
                <div style={{display:"flex",gap:10,marginTop:6,flexWrap:"wrap"}}>
                  {[{c:"#ef4444",l:"حرج ≥16"},{c:"#f59e0b",l:"عالي ≥9"},{c:"#6366f1",l:"متوسط ≥4"},{c:"#10b981",l:"منخفض"}].map(({c,l})=>(
                    <span key={l} style={{display:"flex",alignItems:"center",gap:4,fontSize:9,color:"#555"}}><div style={{width:10,height:10,borderRadius:2,background:c}}/>{l}</span>
                  ))}
                </div>
              </Card>
              {/* Issue Stats */}
              <Card>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
                  <H3 style={{margin:0}}>📋 إحصاءات المشكلات</H3>
                </div>
                {[["عالية",issues.filter(x=>x.priority==="عالية"),"#ef4444"],["متوسطة",issues.filter(x=>x.priority==="متوسطة"),"#f59e0b"],["منخفضة",issues.filter(x=>x.priority==="منخفضة"),"#10b981"]].map(([p,arr,c])=>(
                  <div key={p} style={{marginBottom:10}}>
                    <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                      <span style={{fontSize:11,fontWeight:600,color:"#555"}}>أولوية {p}</span>
                      <span style={{fontWeight:800,color:c}}>{arr.length} مشكلة ({arr.filter(x=>x.status!=="مغلق").length} مفتوحة)</span>
                    </div>
                    <PBar pct={issues.length?arr.length/issues.length*100:0} color={c} h={6}/>
                  </div>
                ))}
                <div style={{marginTop:12,padding:"10px 12px",background:darkMode?"#1e2d3d":"#f8f9fc",borderRadius:8,border:"1px solid #f0f0f0"}}>
                  <div style={{fontSize:11,color:"#555",marginBottom:4}}>إجمالي تكلفة المشكلات:</div>
                  <div style={{fontFamily:"monospace",fontWeight:900,fontSize:16,color:"#ef4444"}}>{fmtSAR(issues.reduce((s,x)=>s+(x.cost||0),0))} ريال</div>
                </div>
              </Card>
            </div>

            {/* Risk Register Table */}
            <Card style={{padding:0,overflow:"hidden",marginBottom:12}}>
              <div style={{padding:"12px 18px",borderBottom:"1px solid #f0f0f0",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                <H3 style={{margin:0}}>⚠️ سجل المخاطر — Risk Register</H3>
                <button onClick={()=>setRiskModal(true)} style={{background:"#6366f1",color:"#fff",border:"none",borderRadius:7,padding:"6px 12px",fontWeight:700,cursor:"pointer",fontSize:11}}>+ مخاطرة جديدة</button>
              </div>
              <div style={{overflowX:"auto"}}>
                <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
                  <thead><tr style={{background:darkMode?"#1e2d3d":"#f8f9fc"}}>{["الكود","المخاطرة","الفئة","الاحتمالية","الأثر","الدرجة","المستوى","خطة المعالجة","الحالة","المسؤول","التكلفة (ريال)","إجراء"].map(h=><th key={h} style={{padding:"8px 11px",textAlign:"center",fontWeight:700,color:"#555",borderBottom:"1px solid #eee",whiteSpace:"nowrap",fontSize:10}}>{h}</th>)}</tr></thead>
                  <tbody>
                    {risks.map((r,i)=>{const s=r.prob*r.impact;const c=rColor(s);return(
                      <tr key={r.id} style={{borderBottom:"1px solid #f5f5f5",background:i%2===0?(darkMode?"#1e293b":"#fff"):(darkMode?"#0f172a":"#fafbfc")}}>
                        <td style={{padding:"7px 10px",textAlign:"center",fontWeight:700,fontSize:10,color:"#6366f1"}}>{r.id}</td>
                        <td style={{padding:"7px 10px"}}><div style={{fontWeight:600}}>{r.title}</div></td>
                        <td style={{padding:"7px 10px",textAlign:"center"}}><span style={{background:"#f0f0fe",color:"#6366f1",borderRadius:5,padding:"2px 7px",fontSize:9,fontWeight:600}}>{r.category}</span></td>
                        <td style={{padding:"7px 10px",textAlign:"center",fontWeight:700}}>{r.prob}</td>
                        <td style={{padding:"7px 10px",textAlign:"center",fontWeight:700}}>{r.impact}</td>
                        <td style={{padding:"7px 10px",textAlign:"center"}}><span style={{background:c+"20",color:c,borderRadius:5,padding:"3px 8px",fontWeight:900,fontSize:12}}>{s}</span></td>
                        <td style={{padding:"7px 10px",textAlign:"center"}}><span style={{background:c+"20",color:c,borderRadius:5,padding:"2px 7px",fontWeight:700,fontSize:10}}>{rLabel(s)}</span></td>
                        <td style={{padding:"7px 10px",fontSize:10,color:"#555",maxWidth:200}}>{r.mitigation}</td>
                        <td style={{padding:"7px 10px",textAlign:"center"}}>
                          <button onClick={()=>setRisks(p=>p.map(x=>x.id===r.id?{...x,status:x.status==="مفتوح"?"مغلق":"مفتوح"}:x))} style={{background:r.status==="مفتوح"?"#fee2e2":"#d1fae5",color:r.status==="مفتوح"?"#dc2626":"#065f46",border:"none",borderRadius:5,padding:"3px 8px",cursor:"pointer",fontWeight:700,fontSize:10}}>
                            {r.status==="مفتوح"?"🔴 مفتوح":"✅ مغلق"}
                          </button>
                        </td>
                        <td style={{padding:"7px 10px",fontSize:10,color:"#555"}}>{r.owner}</td>
                        <td style={{padding:"7px 10px",textAlign:"right",fontFamily:"monospace",color:"#f59e0b",fontWeight:600}}>{r.cost?fmtSAR(r.cost):"—"}</td>
                        <td style={{padding:"7px 10px",textAlign:"center"}}><button onClick={()=>setRisks(p=>p.filter(x=>x.id!==r.id))} style={{background:"#fee2e2",border:"none",borderRadius:5,padding:"3px 7px",cursor:"pointer",fontSize:11,color:"#ef4444"}}>🗑</button></td>
                      </tr>
                    );})}
                  </tbody>
                </table>
              </div>
            </Card>

            {/* Issues Table */}
            <Card style={{padding:0,overflow:"hidden"}}>
              <div style={{padding:"12px 18px",borderBottom:"1px solid #f0f0f0",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                <H3 style={{margin:0}}>🔧 سجل المشكلات — Issue Log</H3>
                <button onClick={()=>setIssueModal(true)} style={{background:"#f59e0b",color:"#fff",border:"none",borderRadius:7,padding:"6px 12px",fontWeight:700,cursor:"pointer",fontSize:11}}>+ مشكلة جديدة</button>
              </div>
              <div style={{overflowX:"auto"}}>
                <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
                  <thead><tr style={{background:darkMode?"#1e2d3d":"#f8f9fc"}}>{["الكود","المشكلة","التخصص","الأولوية","الحالة","التاريخ","التأثير","التكلفة","المسؤول","إجراء"].map(h=><th key={h} style={{padding:"8px 11px",textAlign:"center",fontWeight:700,color:"#555",borderBottom:"1px solid #eee",whiteSpace:"nowrap",fontSize:10}}>{h}</th>)}</tr></thead>
                  <tbody>
                    {issues.map((x,i)=>{const pc=x.priority==="عالية"?"#ef4444":x.priority==="متوسطة"?"#f59e0b":"#10b981";const sc2=x.status==="مغلق"?"#10b981":x.status==="قيد المعالجة"?"#6366f1":"#ef4444";return(
                      <tr key={x.id} style={{borderBottom:"1px solid #f5f5f5",background:i%2===0?(darkMode?"#1e293b":"#fff"):(darkMode?"#0f172a":"#fafbfc")}}>
                        <td style={{padding:"7px 10px",textAlign:"center",fontWeight:700,fontSize:10,color:"#f59e0b"}}>{x.id}</td>
                        <td style={{padding:"7px 10px"}}><div style={{fontWeight:600}}>{x.title}</div></td>
                        <td style={{padding:"7px 10px",textAlign:"center"}}><span style={{background:DC[x.disc]+"20",color:DC[x.disc],borderRadius:5,padding:"2px 7px",fontWeight:700,fontSize:9}}>{x.disc}</span></td>
                        <td style={{padding:"7px 10px",textAlign:"center"}}><span style={{background:pc+"20",color:pc,borderRadius:5,padding:"2px 7px",fontWeight:700,fontSize:10}}>{x.priority}</span></td>
                        <td style={{padding:"7px 10px",textAlign:"center"}}>
                          <select value={x.status} onChange={e=>setIssues(p=>p.map(y=>y.id===x.id?{...y,status:e.target.value}:y))}
                            style={{border:`1px solid ${sc2}40`,borderRadius:5,padding:"3px 6px",fontSize:10,color:sc2,fontWeight:700,background:sc2+"15",cursor:"pointer",outline:"none"}}>
                            {["مفتوح","قيد المعالجة","مغلق"].map(s=><option key={s}>{s}</option>)}
                          </select>
                        </td>
                        <td style={{padding:"7px 10px",textAlign:"center",fontSize:10,color:"#888"}}>{x.date}</td>
                        <td style={{padding:"7px 10px",fontSize:10,color:"#555",maxWidth:180}}>{x.impact}</td>
                        <td style={{padding:"7px 10px",textAlign:"right",fontFamily:"monospace",color:"#ef4444",fontWeight:600}}>{x.cost?fmtSAR(x.cost):"—"}</td>
                        <td style={{padding:"7px 10px",fontSize:10,color:"#555"}}>{x.owner}</td>
                        <td style={{padding:"7px 10px",textAlign:"center"}}><button onClick={()=>setIssues(p=>p.filter(y=>y.id!==x.id))} style={{background:"#fee2e2",border:"none",borderRadius:5,padding:"3px 7px",cursor:"pointer",fontSize:11,color:"#ef4444"}}>🗑</button></td>
                      </tr>
                    );})}
                  </tbody>
                </table>
              </div>
            </Card>
          </>)}

          {/* ═══ GANTT & MILESTONES ═══ */}
          {tab==="gantt"&&(<>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:14}}>
              {/* Gantt chart */}
              <Card style={{gridColumn:"1/-1"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
                  <H3 style={{margin:0}}>📅 مخطط جانت حسب التخصص (12 شهراً)</H3>
                  <div style={{fontSize:10,color:"#888"}}>■ مخطط &nbsp;■ فعلي</div>
                </div>
                {/* Month headers */}
                <div style={{display:"grid",gridTemplateColumns:"120px repeat(12,1fr)",gap:2,marginBottom:4}}>
                  <div/>
                  {MN.map((m,i)=><div key={i} style={{textAlign:"center",fontSize:8,fontWeight:600,color:"#aaa",padding:"2px 0"}}>{m.slice(0,3)}</div>)}
                </div>
                {/* Rows */}
                {ganttData.map(d=>(
                  <div key={d.disc} style={{display:"grid",gridTemplateColumns:"120px repeat(12,1fr)",gap:2,marginBottom:4,alignItems:"center"}}>
                    <div style={{display:"flex",alignItems:"center",gap:5}}>
                      <div style={{width:8,height:8,borderRadius:"50%",background:d.color,flexShrink:0}}/>
                      <span style={{fontSize:10,fontWeight:700,color:d.color}}>{d.disc}</span>
                      <span style={{fontSize:9,color:"#aaa",marginLeft:"auto"}}>{d.avgPct}%</span>
                    </div>
                    {d.bars.map((b,mi)=>(
                      <div key={mi} style={{position:"relative",height:22,background:d.color+"15",borderRadius:3,overflow:"hidden",border:`1px solid ${d.color}30`}}>
                        {/* Plan bar */}
                        <div style={{position:"absolute",top:0,left:0,width:`${b.plan*100}%`,height:"40%",background:d.color+"40",borderRadius:"3px 3px 0 0"}}/>
                        {/* Actual bar */}
                        <div style={{position:"absolute",bottom:0,left:0,width:`${b.actual*100}%`,height:"60%",background:d.color,borderRadius:"0 0 3px 3px"}}/>
                        {/* Today marker at M12 */}
                        {mi===11&&<div style={{position:"absolute",right:0,top:0,bottom:0,width:2,background:"#ef4444"}}/>}
                      </div>
                    ))}
                  </div>
                ))}
                {/* S-Curve overlay legend */}
                <div style={{marginTop:8,padding:"8px 12px",background:"#f8f9fc",borderRadius:7,fontSize:10,color:"#888",display:"flex",gap:16}}>
                  <span style={{display:"flex",alignItems:"center",gap:4}}><div style={{width:16,height:4,background:"#6366f140",borderRadius:2}}/> مخطط</span>
                  <span style={{display:"flex",alignItems:"center",gap:4}}><div style={{width:16,height:6,background:"#6366f1",borderRadius:2}}/> فعلي</span>
                  <span style={{display:"flex",alignItems:"center",gap:4}}><div style={{width:3,height:12,background:"#ef4444",borderRadius:1}}/> اليوم</span>
                </div>
              </Card>
            </div>

            {/* Milestones */}
            <Card style={{padding:0,overflow:"hidden"}}>
              <div style={{padding:"12px 18px",borderBottom:"1px solid #f0f0f0",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                <H3 style={{margin:0}}>🏁 المراحل الرئيسية — Milestones</H3>
                <div style={{fontSize:11,color:"#888"}}>{milestones.filter(m=>m.done).length}/{milestones.length} مكتملة</div>
              </div>
              {/* Timeline visual */}
              <div style={{padding:"16px 20px",borderBottom:"1px solid #f0f0f0"}}>
                <div style={{position:"relative",paddingBottom:20}}>
                  {/* Line */}
                  <div style={{position:"absolute",top:16,left:0,right:0,height:2,background:"#e5e7eb"}}/>
                  <div style={{position:"absolute",top:16,left:0,width:`${milestones.filter(m=>m.done).length/milestones.length*100}%`,height:2,background:"#10b981"}}/>
                  {/* Dots */}
                  <div style={{display:"flex",justifyContent:"space-between",position:"relative"}}>
                    {milestones.map((m,i)=>(
                      <div key={m.id} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:6,flex:1}}>
                        <div onClick={()=>setMilestones(p=>p.map(x=>x.id===m.id?{...x,done:!x.done}:x))}
                          style={{width:26,height:26,borderRadius:"50%",background:m.done?"#10b981":"#fff",border:`3px solid ${m.done?"#10b981":DC[m.disc]}`,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1,transition:"all .2s"}}>
                          {m.done?<span style={{color:"#fff",fontSize:12,fontWeight:900}}>✓</span>:<span style={{color:DC[m.disc],fontSize:10}}>○</span>}
                        </div>
                        <div style={{textAlign:"center",maxWidth:80}}>
                          <div style={{fontSize:9,fontWeight:700,color:m.done?"#10b981":DC[m.disc],lineHeight:1.3}}>{m.title}</div>
                          <div style={{fontSize:8,color:"#aaa",marginTop:1}}>{m.date}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              {/* Milestones table */}
              <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
                <thead><tr style={{background:darkMode?"#1e2d3d":"#f8f9fc"}}>{["الكود","المرحلة","التاريخ","التخصص","الحالة","إجراء"].map(h=><th key={h} style={{padding:"8px 12px",textAlign:"center",fontWeight:700,color:"#555",borderBottom:"1px solid #eee",fontSize:10}}>{h}</th>)}</tr></thead>
                <tbody>
                  {milestones.map((m,i)=>(
                    <tr key={m.id} style={{borderBottom:"1px solid #f5f5f5",background:i%2===0?(darkMode?"#1e293b":"#fff"):(darkMode?"#0f172a":"#fafbfc")}}>
                      <td style={{padding:"8px 12px",textAlign:"center",fontWeight:700,fontSize:10,color:"#6366f1"}}>{m.id}</td>
                      <td style={{padding:"8px 12px",fontWeight:600}}>{m.title}</td>
                      <td style={{padding:"8px 12px",textAlign:"center",fontSize:10,color:"#888"}}>{m.date}</td>
                      <td style={{padding:"8px 12px",textAlign:"center"}}><span style={{background:DC[m.disc]+"20",color:DC[m.disc],borderRadius:5,padding:"2px 8px",fontWeight:700,fontSize:9}}>{m.disc}</span></td>
                      <td style={{padding:"8px 12px",textAlign:"center"}}>
                        <span style={{background:m.done?"#d1fae5":"#fef3c7",color:m.done?"#065f46":"#92400e",borderRadius:6,padding:"3px 10px",fontWeight:700,fontSize:10}}>
                          {m.done?"✅ مكتملة":"⏳ قيد التنفيذ"}
                        </span>
                      </td>
                      <td style={{padding:"8px 12px",textAlign:"center",display:"flex",gap:4,justifyContent:"center"}}>
                        <button onClick={()=>setMilestones(p=>p.map(x=>x.id===m.id?{...x,done:!x.done}:x))}
                          style={{background:m.done?"#fee2e2":"#d1fae5",color:m.done?"#ef4444":"#10b981",border:"none",borderRadius:5,padding:"3px 9px",cursor:"pointer",fontSize:10,fontWeight:700}}>
                          {m.done?"↩ فتح":"✓ إتمام"}
                        </button>
                        <button onClick={()=>setMilestones(p=>p.filter(x=>x.id!==m.id))} style={{background:"#fee2e2",border:"none",borderRadius:5,padding:"3px 7px",cursor:"pointer",fontSize:11,color:"#ef4444"}}>🗑</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          </>)}

          {/* ═══ BASELINE ═══ */}
          {tab==="baseline"&&(
            <div style={{maxWidth:900,margin:"0 auto"}}>
              {/* Capture baseline */}
              <Card style={{marginBottom:14}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10}}>
                  <div>
                    <H3 style={{margin:"0 0 4px"}}>📐 خط القاعدة — Performance Baseline</H3>
                    <div style={{fontSize:11,color:"#888"}}>
                      {baseline?`آخر خط قاعدة: ${baselineDate} · ${baseline.acts.length} نشاط`:"لم يتم تسجيل خط قاعدة بعد"}
                    </div>
                  </div>
                  <div style={{display:"flex",gap:8}}>
                    <button onClick={captureBaseline} style={{background:"#6366f1",color:"#fff",border:"none",borderRadius:8,padding:"9px 18px",fontWeight:700,cursor:"pointer",fontSize:12}}>📸 حفظ خط القاعدة الحالي</button>
                    {baseline&&<button onClick={()=>setBaseline(null)} style={{background:"#fee2e2",color:"#ef4444",border:"none",borderRadius:8,padding:"9px 14px",fontWeight:600,cursor:"pointer",fontSize:12}}>🗑 حذف</button>}
                  </div>
                </div>
              </Card>

              {baseline?(
                <>
                  {/* Baseline vs Current KPIs */}
                  <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:11,marginBottom:14}}>
                    {[
                      {l:"SPI الأساسي",    bv:baseline.kpi.SPI.toFixed(2),  cv:kpi.SPI.toFixed(2),  c:kpi.SPI>=baseline.kpi.SPI?"#10b981":"#ef4444"},
                      {l:"CPI الأساسي",    bv:baseline.kpi.CPI.toFixed(2),  cv:kpi.CPI.toFixed(2),  c:kpi.CPI>=baseline.kpi.CPI?"#10b981":"#ef4444"},
                      {l:"الإنجاز الأساسي",bv:baseline.kpi.prog.toFixed(1)+"%",cv:kpi.prog.toFixed(1)+"%",c:kpi.prog>=baseline.kpi.prog?"#10b981":"#ef4444"},
                      {l:"EAC الأساسي",    bv:fmt(baseline.kpi.EAC),         cv:fmt(kpi.EAC),        c:kpi.EAC<=baseline.kpi.EAC?"#10b981":"#ef4444"},
                    ].map(({l,bv,cv,c})=>(
                      <Card key={l}>
                        <div style={{fontSize:10,fontWeight:600,color:"#888",marginBottom:8}}>{l}</div>
                        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                          <div style={{textAlign:"center"}}>
                            <div style={{fontSize:9,color:"#aaa",marginBottom:2}}>أساسي</div>
                            <div style={{fontFamily:"monospace",fontWeight:800,fontSize:16,color:"#6366f1"}}>{bv}</div>
                          </div>
                          <div style={{fontSize:18,color:c}}>{kpi.prog>=baseline.kpi.prog?"↑":"↓"}</div>
                          <div style={{textAlign:"center"}}>
                            <div style={{fontSize:9,color:"#aaa",marginBottom:2}}>حالي</div>
                            <div style={{fontFamily:"monospace",fontWeight:800,fontSize:16,color:c}}>{cv}</div>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>

                  {/* Variance chart */}
                  <Card style={{marginBottom:14}}>
                    <H3>📊 انحراف الإنجاز عن خط القاعدة (%)</H3>
                    {baselineDiff.length===0
                      ?<div style={{textAlign:"center",padding:30,color:"#bbb"}}>✅ لا توجد تغييرات منذ تسجيل خط القاعدة</div>
                      :<ResponsiveContainer width="100%" height={220}>
                        <BarChart data={baselineDiff.slice(0,15).map(d=>({name:d.id,pctDiff:d.pctDiff,bacDiff:+(d.bacDiff/1e6).toFixed(1)}))}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f5"/>
                          <XAxis dataKey="name" tick={{fontSize:9}} angle={-30} textAnchor="end" height={44}/>
                          <YAxis tick={{fontSize:9}}/>
                          <Tooltip content={<CTip/>}/>
                          <Legend wrapperStyle={{fontSize:10}}/>
                          <ReferenceLine y={0} stroke="#888" strokeWidth={1}/>
                          <Bar dataKey="pctDiff" name="فارق الإنجاز%" radius={[3,3,0,0]}>
                            {baselineDiff.slice(0,15).map((d,i)=><Cell key={i} fill={d.pctDiff>=0?"#10b981":"#ef4444"}/>)}
                          </Bar>
                          <Bar dataKey="bacDiff" name="فارق الميزانية (M)" radius={[3,3,0,0]}>
                            {baselineDiff.slice(0,15).map((d,i)=><Cell key={i} fill={d.bacDiff>=0?"#6366f1":"#f59e0b"}/>)}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    }
                  </Card>

                  {/* Variance table */}
                  {baselineDiff.length>0&&(
                    <Card style={{padding:0,overflow:"hidden"}}>
                      <div style={{padding:"12px 18px",borderBottom:"1px solid #f0f0f0"}}><H3 style={{margin:0}}>📋 التغييرات منذ خط القاعدة ({baselineDiff.length} نشاط)</H3></div>
                      <div style={{overflowX:"auto"}}>
                        <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
                          <thead><tr style={{background:darkMode?"#1e2d3d":"#f8f9fc"}}>{["النشاط","التخصص","فارق BAC","فارق الإنجاز%","فارق AC","ملاحظة"].map(h=><th key={h} style={{padding:"8px 11px",fontWeight:700,color:"#555",borderBottom:"1px solid #eee",textAlign:"center",fontSize:10}}>{h}</th>)}</tr></thead>
                          <tbody>{baselineDiff.map((d,i)=>(
                            <tr key={d.id} style={{borderBottom:"1px solid #f5f5f5",background:i%2===0?(darkMode?"#1e293b":"#fff"):(darkMode?"#0f172a":"#fafbfc")}}>
                              <td style={{padding:"7px 11px"}}><div style={{fontWeight:700,direction:"rtl",fontSize:11}}>{d.nameAr}</div><div style={{fontSize:9,color:"#aaa"}}>{d.id}</div></td>
                              <td style={{padding:"7px 11px",textAlign:"center"}}><span style={{background:DC[d.disc]+"20",color:DC[d.disc],borderRadius:5,padding:"1px 6px",fontWeight:700,fontSize:9}}>{d.disc}</span></td>
                              <td style={{padding:"7px 11px",textAlign:"right",fontFamily:"monospace",color:d.bacDiff>=0?"#10b981":"#ef4444",fontWeight:700}}>{d.bacDiff>=0?"+":""}{fmt(d.bacDiff)}</td>
                              <td style={{padding:"7px 11px",textAlign:"center",fontFamily:"monospace",color:d.pctDiff>=0?"#10b981":"#ef4444",fontWeight:700}}>{d.pctDiff>=0?"+":""}{d.pctDiff.toFixed(1)}%</td>
                              <td style={{padding:"7px 11px",textAlign:"right",fontFamily:"monospace",color:d.acDiff>=0?"#ef4444":"#10b981",fontWeight:700}}>{d.acDiff>=0?"+":""}{fmt(d.acDiff)}</td>
                              <td style={{padding:"7px 11px",fontSize:10,color:"#888"}}>{d.isNew?"🆕 نشاط جديد":d.pctDiff>0?"تقدم في الإنجاز":d.pctDiff<0?"تراجع في الإنجاز":d.bacDiff!==0?"تعديل الميزانية":"—"}</td>
                            </tr>
                          ))}</tbody>
                        </table>
                      </div>
                    </Card>
                  )}
                </>
              ):(
                <Card>
                  <div style={{textAlign:"center",padding:"40px 20px",color:"#bbb"}}>
                    <div style={{fontSize:48,marginBottom:12}}>📐</div>
                    <div style={{fontSize:15,fontWeight:700,color:"#888",marginBottom:6}}>لم يتم تسجيل خط القاعدة بعد</div>
                    <div style={{fontSize:12,color:"#bbb",marginBottom:16}}>اضغط "حفظ خط القاعدة الحالي" لأخذ لقطة من بيانات المشروع الآن</div>
                    <button onClick={captureBaseline} style={{background:"#6366f1",color:"#fff",border:"none",borderRadius:9,padding:"10px 24px",fontWeight:700,cursor:"pointer",fontSize:13}}>📸 حفظ خط القاعدة الآن</button>
                  </div>
                </Card>
              )}
            </div>
          )}

          {/* ═══ WHAT-IF SCENARIOS ═══ */}
          {tab==="whatif"&&(
            <div style={{maxWidth:960,margin:"0 auto"}}>
              <Card style={{marginBottom:14}}>
                <H3>🎯 تحليل السيناريوهات — What-If Scenario Analysis</H3>
                <p style={{fontSize:12,color:"#888",margin:"0 0 14px"}}>اضبط معاملات الأداء لرؤية أثرها على التكلفة والجدول الزمني المتوقع</p>
                <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10}}>
                  {scenarios.map(s=>{
                    const res=scenarioResults.find(r=>r.id===s.id);
                    return(
                      <div key={s.id} onClick={()=>setScenarios(p=>p.map(x=>({...x,active:x.id===s.id})))}
                        style={{border:`2px solid ${s.active?s.color:"#e5e7eb"}`,borderRadius:12,padding:"14px",cursor:"pointer",background:s.active?s.color+"10":"#fafafa",transition:"all .2s"}}>
                        <div style={{fontWeight:800,color:s.color,fontSize:13,marginBottom:8}}>{s.name}</div>
                        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:4,fontSize:10,color:"#888",marginBottom:10}}>
                          <div>SPI معدّل: <b style={{color:s.color}}>{res?.adjSPI}</b></div>
                          <div>CPI معدّل: <b style={{color:s.color}}>{res?.adjCPI}</b></div>
                        </div>
                        <div style={{borderTop:"1px solid #f0f0f0",paddingTop:8}}>
                          <div style={{fontSize:11,marginBottom:3}}>EAC: <b style={{color:res?.adjEAC>kpi.bac?"#ef4444":"#10b981"}}>{fmt(res?.adjEAC)}</b></div>
                          <div style={{fontSize:11,marginBottom:3}}>مدة: <b style={{color:res?.adjSlip>0?"#ef4444":"#10b981"}}>{res?.adjDur} شهر {res?.adjSlip>0?`(+${res.adjSlip})`:res?.adjSlip<0?`(${res.adjSlip})`:""}</b></div>
                          <div style={{fontSize:11}}>VAC: <b style={{color:res?.vac>=0?"#10b981":"#ef4444"}}>{fmt(res?.vac)}</b></div>
                        </div>
                        {s.active&&<div style={{marginTop:8,background:s.color,color:"#fff",borderRadius:5,padding:"3px 0",textAlign:"center",fontSize:10,fontWeight:700}}>السيناريو النشط</div>}
                      </div>
                    );
                  })}
                </div>
              </Card>

              {/* Custom scenario slider */}
              <Card style={{marginBottom:14}}>
                <H3>🎚️ سيناريو مخصص — Custom Scenario</H3>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:20}}>
                  {[{l:"معامل تعديل SPI",k:"spiAdj",min:0.3,max:1.5},{l:"معامل تعديل CPI",k:"cpiAdj",min:0.3,max:1.5}].map(({l,k,min,max})=>(
                    <div key={k}>
                      <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
                        <span style={{fontSize:12,fontWeight:600,color:"#555"}}>{l}</span>
                        <span style={{fontFamily:"monospace",fontWeight:900,color:"#6366f1",fontSize:16}}>{customScen[k].toFixed(2)}</span>
                      </div>
                      <input type="range" min={min} max={max} step={0.01} value={customScen[k]}
                        onChange={e=>setCustomScen(p=>({...p,[k]:+e.target.value}))}
                        style={{width:"100%",accentColor:"#6366f1"}}/>
                      <div style={{display:"flex",justifyContent:"space-between",fontSize:9,color:"#bbb",marginTop:2}}><span>{min} (متشائم)</span><span>1.0 (أساسي)</span><span>{max} (متفائل)</span></div>
                    </div>
                  ))}
                </div>
                {/* Custom result */}
                {(()=>{
                  const adjCPI=kpi.CPI*customScen.cpiAdj; const adjSPI=kpi.SPI*customScen.spiAdj;
                  const adjEAC=adjCPI>0?kpi.bac/adjCPI:kpi.bac;
                  const adjDur=adjSPI>0?+(+project.duration/adjSPI).toFixed(1):+project.duration;
                  return(
                    <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginTop:16,padding:"14px",background:"#f8f9fc",borderRadius:10,border:"1px solid #f0f0f0"}}>
                      {[
                        {l:"SPI المتوقع",  v:adjSPI.toFixed(3),  c:sColor(adjSPI)},
                        {l:"CPI المتوقع",  v:adjCPI.toFixed(3),  c:sColor(adjCPI)},
                        {l:"EAC المتوقع",  v:fmt(adjEAC),         c:adjEAC>kpi.bac?"#ef4444":"#10b981"},
                        {l:"المدة المتوقعة",v:adjDur+" شهر",      c:adjDur>+project.duration?"#ef4444":"#10b981"},
                      ].map(({l,v,c})=>(
                        <div key={l} style={{textAlign:"center"}}>
                          <div style={{fontSize:10,color:"#888",marginBottom:3}}>{l}</div>
                          <div style={{fontFamily:"monospace",fontWeight:900,fontSize:16,color:c}}>{v}</div>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </Card>

              {/* Comparison chart */}
              <Card>
                <H3>📊 مقارنة السيناريوهات — EAC Comparison</H3>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={scenarioResults.map(s=>({name:s.name,EAC:+(s.adjEAC/1e6).toFixed(1),Duration:s.adjDur,VAC:+(s.vac/1e6).toFixed(1)}))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f5"/>
                    <XAxis dataKey="name" tick={{fontSize:10}}/>
                    <YAxis yAxisId="left" tickFormatter={v=>v+"M"} tick={{fontSize:9}}/>
                    <YAxis yAxisId="right" orientation="right" tick={{fontSize:9}}/>
                    <Tooltip content={<CTip/>}/>
                    <Legend wrapperStyle={{fontSize:10}}/>
                    <ReferenceLine yAxisId="left" y={+(kpi.bac/1e6).toFixed(1)} stroke="#888" strokeDasharray="5 3" label={{value:"BAC",position:"right",fontSize:9}}/>
                    <Bar yAxisId="left" dataKey="EAC" name="EAC (M)" radius={[4,4,0,0]}>
                      {scenarioResults.map((s,i)=><Cell key={i} fill={s.color}/>)}
                    </Bar>
                    <Line yAxisId="right" dataKey="Duration" name="المدة (شهر)" stroke="#8b5cf6" strokeWidth={2} dot={{r:4}}/>
                  </BarChart>
                </ResponsiveContainer>
              </Card>
            </div>
          )}

          {/* ═══ RESOURCES ═══ */}
          {tab==="resources"&&(<>
            {/* KPIs */}
            <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:11,marginBottom:12}}>
              <Kpi l="إجمالي القوى العاملة" v={resStats.laborHeadcount+" فرد"} c="#6366f1" ic="👷"/>
              <Kpi l="تكلفة العمالة الفعلية" v={fmt(resStats.laborCost)} c="#0ea5e9" ic="💼"/>
              <Kpi l="تكلفة المعدات الفعلية" v={fmt(resStats.equipCost)} c="#f59e0b" ic="🚧"/>
              <Kpi l="تكلفة المواد الفعلية"   v={fmt(resStats.matCost)}  c="#10b981" ic="📦"/>
              <Kpi l="نسبة الاستخدام الفعلي" v={resStats.utilization.toFixed(0)+"٪"} c="#8b5cf6" ic="📊" sub={`مخطط: ${fmt(resStats.totalPlan)} — فعلي: ${fmt(resStats.totalAct)}`}/>
            </div>

            {/* Charts row */}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:14}}>
              <Card>
                <H3>📊 تكلفة الموارد حسب التخصص</H3>
                <ResponsiveContainer width="100%" height={210}>
                  <ComposedChart data={resByDisc}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f5"/>
                    <XAxis dataKey="disc" tick={{fontSize:9}}/>
                    <YAxis tickFormatter={v=>fmt(v)} tick={{fontSize:9}}/>
                    <Tooltip content={<CTip/>}/>
                    <Legend wrapperStyle={{fontSize:10}}/>
                    <Bar dataKey="plan" name="مخطط" radius={[3,3,0,0]}>{resByDisc.map((d,i)=><Cell key={i} fill={d.color+"66"}/>)}</Bar>
                    <Bar dataKey="cost" name="فعلي" radius={[3,3,0,0]}>{resByDisc.map((d,i)=><Cell key={i} fill={d.color}/>)}</Bar>
                  </ComposedChart>
                </ResponsiveContainer>
              </Card>
              <Card>
                <H3>💰 توزيع تكاليف الموارد (عمالة / معدات / مواد)</H3>
                <div style={{display:"flex",flexDirection:"column",gap:12,marginTop:8}}>
                  {[
                    {l:"عمالة",v:resStats.laborCost,c:"#6366f1",ic:"👷"},
                    {l:"معدات",v:resStats.equipCost,c:"#f59e0b",ic:"🚧"},
                    {l:"مواد", v:resStats.matCost,  c:"#10b981",ic:"📦"},
                  ].map(({l,v,c,ic})=>{
                    const tot=resStats.laborCost+resStats.equipCost+resStats.matCost||1;
                    const pct=+(v/tot*100).toFixed(1);
                    return(
                      <div key={l}>
                        <div style={{display:"flex",justifyContent:"space-between",marginBottom:4,fontSize:11}}>
                          <span style={{fontWeight:700,color:c}}>{ic} {l}</span>
                          <span style={{fontFamily:"monospace",fontWeight:700}}>{fmt(v)} <span style={{color:"#aaa",fontWeight:400}}>({pct}%)</span></span>
                        </div>
                        <div style={{background:darkMode?"#334155":"#f0f0f5",borderRadius:999,height:10,overflow:"hidden"}}>
                          <div style={{width:`${pct}%`,height:"100%",background:c,borderRadius:999}}/>
                        </div>
                      </div>
                    );
                  })}
                  <div style={{borderTop:"1px solid #f0f0f0",paddingTop:10,display:"flex",justifyContent:"space-between",fontSize:12,fontWeight:800}}>
                    <span>الإجمالي الفعلي</span>
                    <span style={{fontFamily:"monospace",color:"#1a1a2e"}}>{fmt(resStats.totalAct)}</span>
                  </div>
                  <div style={{display:"flex",justifyContent:"space-between",fontSize:11,color:resStats.totalAct>resStats.totalPlan?"#ef4444":"#10b981",fontWeight:700}}>
                    <span>مقابل المخطط {fmt(resStats.totalPlan)}</span>
                    <span>{resStats.totalAct>resStats.totalPlan?"▲ تجاوز":"✓ ضمن الخطة"}</span>
                  </div>
                </div>
              </Card>
            </div>

            {/* Resource Table */}
            <Card style={{padding:0,overflow:"hidden"}}>
              <div style={{padding:"12px 18px",borderBottom:"1px solid #f0f0f0",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                <H3 style={{margin:0}}>👷 جدول الموارد — Resource Register</H3>
                <div style={{display:"flex",gap:6,alignItems:"center"}}>
                  {[["all","الكل"],["labor","👷 عمالة"],["equip","🚧 معدات"],["material","📦 مواد"]].map(([v,l])=>(
                    <button key={v} onClick={()=>setResFilter(v)}
                      style={{background:resFilter===v?"#6366f1":"#f0f0f5",color:resFilter===v?"#fff":"#555",border:"none",borderRadius:6,padding:"5px 10px",cursor:"pointer",fontSize:10,fontWeight:resFilter===v?700:400}}>
                      {l}
                    </button>
                  ))}
                  <button onClick={()=>setResModal(true)} style={{background:"#10b981",color:"#fff",border:"none",borderRadius:7,padding:"6px 12px",fontWeight:700,cursor:"pointer",fontSize:11,marginLeft:4}}>+ مورد</button>
                </div>
              </div>
              <div style={{overflowX:"auto"}}>
                <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
                  <thead><tr style={{background:darkMode?"#1e2d3d":"#f8f9fc"}}>
                    {["الكود","الاسم / الوصف","الدور","التخصص","النوع","الكمية المخططة","الكمية الفعلية","التكلفة/الوحدة","الأيام المخططة","الأيام الفعلية","التكلفة المخططة","التكلفة الفعلية","الاستخدام %","إجراء"].map(h=>(
                      <th key={h} style={{padding:"8px 10px",textAlign:"center",fontWeight:700,color:"#555",borderBottom:"1px solid #eee",whiteSpace:"nowrap",fontSize:9}}>{h}</th>
                    ))}
                  </tr></thead>
                  <tbody>
                    {filteredRes.map((r,i)=>{
                      const planCost=r.planQty*r.unitCost*r.planDays;
                      const actCost=r.actQty*r.unitCost*r.actDays;
                      const utilPct=r.planQty>0?+(r.actQty/r.planQty*100).toFixed(0):0;
                      const typeColor=r.type==="labor"?"#6366f1":r.type==="equip"?"#f59e0b":"#10b981";
                      const typeLabel=r.type==="labor"?"👷 عمالة":r.type==="equip"?"🚧 معدة":"📦 مواد";
                      return(
                        <tr key={r.id} style={{borderBottom:"1px solid #f5f5f5",background:i%2===0?(darkMode?"#1e293b":"#fff"):(darkMode?"#0f172a":"#fafbfc")}}>
                          <td style={{padding:"6px 10px",textAlign:"center",fontWeight:700,fontSize:9,color:typeColor}}>{r.id}</td>
                          <td style={{padding:"6px 10px"}}><div style={{fontWeight:600,direction:"rtl",fontSize:11}}>{r.name}</div></td>
                          <td style={{padding:"6px 10px",fontSize:10,color:"#666"}}>{r.role}</td>
                          <td style={{padding:"6px 10px",textAlign:"center"}}><span style={{background:DC[r.disc]+"20",color:DC[r.disc],borderRadius:4,padding:"1px 6px",fontWeight:700,fontSize:9}}>{r.disc}</span></td>
                          <td style={{padding:"6px 10px",textAlign:"center"}}><span style={{background:typeColor+"20",color:typeColor,borderRadius:4,padding:"1px 6px",fontWeight:700,fontSize:9}}>{typeLabel}</span></td>
                          <td style={{padding:"6px 10px",textAlign:"center",fontFamily:"monospace"}}>{r.planQty} {r.unit}</td>
                          <td style={{padding:"6px 10px",textAlign:"center",fontFamily:"monospace",color:r.actQty<r.planQty?"#ef4444":"#10b981",fontWeight:700}}>{r.actQty}</td>
                          <td style={{padding:"6px 10px",textAlign:"right",fontFamily:"monospace"}}>{r.unitCost.toLocaleString()} ر</td>
                          <td style={{padding:"6px 10px",textAlign:"center",fontFamily:"monospace"}}>{r.planDays}</td>
                          <td style={{padding:"6px 10px",textAlign:"center",fontFamily:"monospace",color:r.actDays<r.planDays?"#f59e0b":"#333"}}>{r.actDays}</td>
                          <td style={{padding:"6px 10px",textAlign:"right",fontFamily:"monospace",color:"#888"}}>{fmt(planCost)}</td>
                          <td style={{padding:"6px 10px",textAlign:"right",fontFamily:"monospace",color:actCost>planCost?"#ef4444":"#10b981",fontWeight:600}}>{fmt(actCost)}</td>
                          <td style={{padding:"6px 10px",textAlign:"center"}}>
                            <div style={{display:"flex",alignItems:"center",gap:4}}>
                              <div style={{flex:1,background:darkMode?"#334155":"#f0f0f5",borderRadius:999,height:6,overflow:"hidden"}}><div style={{width:`${Math.min(100,utilPct)}%`,height:"100%",background:utilPct>=80?"#10b981":utilPct>=50?"#f59e0b":"#ef4444"}}/></div>
                              <span style={{fontSize:9,fontWeight:700,minWidth:28,color:utilPct>=80?"#10b981":utilPct>=50?"#f59e0b":"#ef4444"}}>{utilPct}%</span>
                            </div>
                          </td>
                          <td style={{padding:"6px 10px",textAlign:"center"}}>
                            <button onClick={()=>setResources(p=>p.filter(x=>x.id!==r.id))} style={{background:"#fee2e2",border:"none",borderRadius:5,padding:"3px 7px",cursor:"pointer",fontSize:11,color:"#ef4444"}}>🗑</button>
                          </td>
                        </tr>
                      );
                    })}
                    <tr style={{background:"#0f172a",color:"#fff",fontWeight:700}}>
                      <td colSpan={10} style={{padding:"9px 12px",textAlign:"center",fontSize:12}}>الإجماليات</td>
                      <td style={{padding:"9px 12px",textAlign:"right",fontFamily:"monospace",color:"#a5b4fc"}}>{fmt(resStats.totalPlan)}</td>
                      <td style={{padding:"9px 12px",textAlign:"right",fontFamily:"monospace",color:resStats.totalAct>resStats.totalPlan?"#fca5a5":"#86efac"}}>{fmt(resStats.totalAct)}</td>
                      <td style={{padding:"9px 12px",textAlign:"center",color:resStats.utilization>=80?"#86efac":"#fde68a"}}>{resStats.utilization.toFixed(0)}%</td>
                      <td/>
                    </tr>
                  </tbody>
                </table>
              </div>
            </Card>
          </>)}

          {/* ═══ CHANGELOG ═══ */}
          {tab==="changelog"&&(
            <div style={{maxWidth:780,margin:"0 auto"}}>
              <Card style={{marginBottom:14}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
                  <H3 style={{margin:0}}>📜 سجل التغييرات والأحداث — Audit Log</H3>
                  <div style={{display:"flex",gap:8}}>
                    <span style={{fontSize:11,color:"#888"}}>{changelog.length} حدث مسجّل</span>
                    <button onClick={()=>setChangelog([])} style={{background:"#fee2e2",color:"#ef4444",border:"none",borderRadius:6,padding:"4px 10px",cursor:"pointer",fontSize:11,fontWeight:600}}>مسح الكل</button>
                  </div>
                </div>
                {changelog.length===0
                  ? <div style={{textAlign:"center",padding:"40px 0",color:"#bbb"}}>
                      <div style={{fontSize:36,marginBottom:8}}>📭</div>
                      <div style={{fontSize:13,fontWeight:600,color:"#888"}}>لا توجد أحداث مسجّلة بعد</div>
                      <div style={{fontSize:11,color:"#bbb",marginTop:4}}>سيتم تسجيل كل تعديل واستيراد وإضافة هنا تلقائياً</div>
                    </div>
                  : <div style={{display:"flex",flexDirection:"column",gap:0}}>
                      {changelog.map((c,i)=>{
                        const typeConfig={
                          edit:{ic:"✏️",c:"#6366f1",bg:"#eef2ff"},
                          create:{ic:"➕",c:"#10b981",bg:"#d1fae5"},
                          delete:{ic:"🗑️",c:"#ef4444",bg:"#fee2e2"},
                          import:{ic:"📥",c:"#f59e0b",bg:"#fef3c7"},
                          export:{ic:"📤",c:"#0ea5e9",bg:"#f0f9ff"},
                          risk:{ic:"⚠️",c:"#f59e0b",bg:"#fef3c7"},
                          narrative:{ic:"📝",c:"#8b5cf6",bg:"#f5f3ff"},
                        }[c.type]||{ic:"📋",c:"#888",bg:"#f8f9fc"};
                        return(
                          <div key={i} style={{display:"flex",gap:12,padding:"12px 0",borderBottom:i<changelog.length-1?"1px solid #f5f5f5":"none",alignItems:"flex-start"}}>
                            <div style={{width:32,height:32,borderRadius:8,background:typeConfig.bg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:15,flexShrink:0}}>{typeConfig.ic}</div>
                            <div style={{flex:1}}>
                              <div style={{fontSize:12,fontWeight:600,color:"#1a1a2e",marginBottom:2}}>{c.action}</div>
                              <div style={{display:"flex",gap:12,fontSize:10,color:"#aaa"}}>
                                <span>👤 {c.user}</span>
                                <span>🕐 {c.ts}</span>
                                <span style={{color:typeConfig.c,fontWeight:600}}>{c.type}</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                }
              </Card>

              {/* Stats */}
              <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:11}}>
                {[
                  {l:"تعديلات",v:changelog.filter(c=>c.type==="edit").length,  c:"#6366f1",ic:"✏️"},
                  {l:"استيرادات",v:changelog.filter(c=>c.type==="import").length,c:"#f59e0b",ic:"📥"},
                  {l:"إضافات",  v:changelog.filter(c=>c.type==="create").length,c:"#10b981",ic:"➕"},
                  {l:"حذف",    v:changelog.filter(c=>c.type==="delete").length, c:"#ef4444",ic:"🗑️"},
                ].map(({l,v,c,ic})=>(
                  <div key={l} style={{background:darkMode?"#1e293b":"#fff",borderRadius:12,padding:"14px 16px",border:`1px solid ${darkMode?"#334155":"#f0f0f0"}`,boxShadow:"0 2px 10px rgba(0,0,0,.05)",textAlign:"center"}}>
                    <div style={{fontSize:20,marginBottom:6}}>{ic}</div>
                    <div style={{fontSize:24,fontWeight:900,color:c,fontFamily:"monospace"}}>{v}</div>
                    <div style={{fontSize:10,color:"#888",marginTop:3}}>{l}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ═══ NARRATIVE ═══ */}
          {tab==="narrative"&&(
            <div style={{maxWidth:820,margin:"0 auto"}}>
              <Card style={{marginBottom:14}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:16,gap:10,flexWrap:"wrap"}}>
                  <div>
                    <H3 style={{margin:"0 0 4px"}}>📝 التقرير السردي</H3>
                    <div style={{fontSize:11,color:"#888"}}>تحليل احترافي بالعربية بناءً على مؤشرات الأداء الحالية — يدوي سريع أو بالذكاء الاصطناعي</div>
                  </div>
                  <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                    <button onClick={generateLocalNarrative} disabled={narrativeLoading}
                      style={{background:"hsl(var(--success)/.12)",color:"hsl(var(--success))",border:"1px solid hsl(var(--success)/.35)",borderRadius:9,padding:"10px 16px",fontWeight:700,cursor:"pointer",fontSize:12,whiteSpace:"nowrap"}}>
                      ⚡ توليد سريع (بدون AI)
                    </button>
                    <button onClick={generateNarrative} disabled={narrativeLoading}
                      style={{background:narrativeLoading?"#ccc":"linear-gradient(135deg,hsl(var(--primary)),hsl(var(--accent)))",color:"#fff",border:"none",borderRadius:9,padding:"10px 20px",fontWeight:700,cursor:narrativeLoading?"not-allowed":"pointer",fontSize:12,display:"flex",alignItems:"center",gap:6,whiteSpace:"nowrap"}}>
                      {narrativeLoading?"⏳ جاري التوليد...":"✨ توليد بالذكاء الاصطناعي"}
                    </button>
                  </div>
                </div>

                {/* Quick stats strip */}
                <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8,marginBottom:16,padding:"12px 14px",background:darkMode?"#1e2d3d":"#f8f9fc",borderRadius:10,border:`1px solid ${darkMode?"#334155":"#f0f0f0"}`}}>
                  {[["SPI",kpi.SPI.toFixed(2),sColor(kpi.SPI)],["CPI",kpi.CPI.toFixed(2),sColor(kpi.CPI)],["الإنجاز",kpi.prog.toFixed(1)+"%","#0ea5e9"],["TCPI",kpi.TCPI.toFixed(2),kpi.TCPI<=1.1?"#10b981":"#ef4444"]].map(([l,v,c])=>(
                    <div key={l} style={{textAlign:"center"}}>
                      <div style={{fontSize:9,color:"#aaa",marginBottom:2}}>{l}</div>
                      <div style={{fontFamily:"monospace",fontWeight:900,fontSize:16,color:c}}>{v}</div>
                    </div>
                  ))}
                </div>

                {narrativeError&&(
                  <div style={{background:"#fff5f5",border:"1px solid #fecaca",borderRadius:9,padding:"12px 16px",color:"#dc2626",fontSize:12,marginBottom:12}}>
                    ⚠️ {narrativeError}
                  </div>
                )}

                {!narrativeText&&!narrativeLoading&&!narrativeError&&(
                  <div style={{textAlign:"center",padding:"40px 20px",color:"#bbb"}}>
                    <div style={{fontSize:48,marginBottom:12}}>📄</div>
                    <div style={{fontSize:14,fontWeight:600,color:"#888",marginBottom:6}}>لم يتم توليد التقرير بعد</div>
                    <div style={{fontSize:12,color:"#bbb"}}>اضغط زر "توليد التقرير" لإنشاء تحليل سردي احترافي بالعربية</div>
                  </div>
                )}

                {narrativeLoading&&(
                  <div style={{textAlign:"center",padding:"40px 20px"}}>
                    <div style={{fontSize:36,marginBottom:12,animation:"spin 1s linear infinite",display:"inline-block"}}>⚙️</div>
                    <div style={{fontSize:14,fontWeight:600,color:"#6366f1",marginBottom:4}}>جاري تحليل البيانات وإعداد التقرير...</div>
                    <div style={{fontSize:12,color:"#aaa"}}>يستغرق هذا عادةً 10-15 ثانية</div>
                  </div>
                )}

                {narrativeText&&(
                  <div>
                    {/* Report header */}
                    <div style={{background:"linear-gradient(135deg,#1a1a2e,#302b63)",color:"#fff",borderRadius:10,padding:"16px 20px",marginBottom:16}}>
                      <div style={{fontSize:11,opacity:.6,marginBottom:3}}>تقرير ضبط التكلفة والقيمة المكتسبة</div>
                      <div style={{fontSize:15,fontWeight:800}}>{project.name}</div>
                      <div style={{fontSize:10,opacity:.7,marginTop:3}}>{project.number} · {new Date().toLocaleDateString("ar-SA")}</div>
                    </div>
                    {/* Narrative body */}
                    <div style={{direction:"rtl",lineHeight:2,fontSize:13,color:"#333",textAlign:"justify",whiteSpace:"pre-wrap",fontFamily:"'IBM Plex Sans',serif"}}>
                      {narrativeText}
                    </div>
                    {/* Action buttons */}
                    <div style={{display:"flex",gap:10,marginTop:20,paddingTop:16,borderTop:"1px solid #f0f0f0",flexWrap:"wrap"}}>
                      <button onClick={generateNarrative}
                        style={{background:"#6366f1",color:"#fff",border:"none",borderRadius:8,padding:"8px 16px",fontWeight:700,cursor:"pointer",fontSize:12}}>
                        🔄 إعادة التوليد
                      </button>
                      <button onClick={exportNarrativePDF}
                        style={{background:"linear-gradient(135deg,#dc2626,#b91c1c)",color:"#fff",border:"none",borderRadius:8,padding:"8px 16px",fontWeight:700,cursor:"pointer",fontSize:12}}>
                        📄 تصدير PDF
                      </button>
                      <button onClick={()=>{const el=document.createElement("a");el.href="data:text/plain;charset=utf-8,"+encodeURIComponent(narrativeText);el.download="narrative_report.txt";el.click();}}
                        style={{background:"#10b981",color:"#fff",border:"none",borderRadius:8,padding:"8px 16px",fontWeight:700,cursor:"pointer",fontSize:12}}>
                        💾 حفظ كنص
                      </button>
                    </div>
                  </div>
                )}
              </Card>

              {/* Generation history panel */}
              <Card>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10,gap:8,flexWrap:"wrap"}}>
                  <H3 style={{margin:0}}>🕘 سجل التوليدات ({genHistory.length})</H3>
                  <div style={{display:"flex",gap:6}}>
                    <button onClick={()=>setShowHistory(s=>!s)} style={{background:"hsl(var(--primary)/.1)",color:"hsl(var(--primary))",border:"1px solid hsl(var(--primary)/.3)",borderRadius:7,padding:"5px 12px",fontWeight:700,cursor:"pointer",fontSize:11}}>{showHistory?"إخفاء":"عرض"}</button>
                    {genHistory.length>0&&<button onClick={()=>{if(window.confirm("مسح كل السجل؟")){setGenHistory([]);try{localStorage.removeItem("evm:genHistory");}catch{}toast.success("تم المسح");}}} style={{background:"hsl(var(--destructive)/.1)",color:"hsl(var(--destructive))",border:"1px solid hsl(var(--destructive)/.3)",borderRadius:7,padding:"5px 12px",fontWeight:700,cursor:"pointer",fontSize:11}}>🗑 مسح</button>}
                  </div>
                </div>
                {showHistory && (genHistory.length===0
                  ? <div style={{textAlign:"center",padding:"20px",color:"#bbb",fontSize:12}}>لا توجد عمليات توليد بعد</div>
                  : <div style={{maxHeight:300,overflowY:"auto"}}>
                      <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
                        <thead><tr style={{background:"hsl(var(--muted))",position:"sticky",top:0}}>{["التاريخ","النوع","الوضع","الحالة","التفاصيل"].map(h=><th key={h} style={{padding:"6px 8px",textAlign:"right",fontWeight:700,fontSize:10,borderBottom:"1px solid hsl(var(--border))"}}>{h}</th>)}</tr></thead>
                        <tbody>{genHistory.map(h=>(
                          <tr key={h.id} style={{borderBottom:"1px solid hsl(var(--border)/.5)"}}>
                            <td style={{padding:"6px 8px",fontFamily:"monospace",fontSize:10,color:"#666"}}>{new Date(h.ts).toLocaleString("ar-SA")}</td>
                            <td style={{padding:"6px 8px"}}>{h.kind==="cashflow"?"💰 تدفق نقدي":"📝 تقرير سردي"}</td>
                            <td style={{padding:"6px 8px",fontSize:10,color:"#888"}}>{h.mode||(h.opts?.distributePV?"+PV":"عادي")}</td>
                            <td style={{padding:"6px 8px"}}>{h.status==="success"
                              ?<span style={{background:"hsl(var(--success)/.15)",color:"hsl(var(--success))",padding:"2px 8px",borderRadius:5,fontSize:10,fontWeight:700}}>✓ نجح</span>
                              :<span style={{background:"hsl(var(--destructive)/.15)",color:"hsl(var(--destructive))",padding:"2px 8px",borderRadius:5,fontSize:10,fontWeight:700}}>✕ فشل</span>}</td>
                            <td style={{padding:"6px 8px",fontSize:10,color:"#666",maxWidth:280,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}} title={h.message}>{h.message}</td>
                          </tr>
                        ))}</tbody>
                      </table>
                    </div>
                )}
              </Card>
            </div>
          )}


          {tab==="report"&&(
            <div style={{maxWidth:900,margin:"0 auto"}}>
              <div className="no-print" style={{display:"flex",justifyContent:"flex-end",gap:8,marginBottom:14}}>
                <button onClick={()=>window.print()} style={{background:"#6366f1",color:"#fff",border:"none",borderRadius:8,padding:"9px 20px",fontWeight:700,cursor:"pointer",fontSize:13}}>🖨️ طباعة</button>
                <button onClick={()=>{
                  exportExcelFull(acts,kpi,cf,risks,issues,resources,project);
                }} style={{background:"#10b981",color:"#fff",border:"none",borderRadius:8,padding:"9px 20px",fontWeight:700,cursor:"pointer",fontSize:13}}>📥 Excel</button>
              </div>

              {/* Printable area */}
              <div id="print-report">
                {/* Cover */}
                <div style={{background:"linear-gradient(135deg,#0f0c29,#302b63)",color:"#fff",borderRadius:14,padding:"28px 32px",marginBottom:18}}>
                  <div style={{fontSize:12,opacity:.55,marginBottom:6,letterSpacing:1,textTransform:"uppercase"}}>Cost Control & EVM Report</div>
                  <h1 style={{margin:"0 0 8px",fontSize:22,fontWeight:900,lineHeight:1.3}}>{project.name}</h1>
                  <div style={{fontSize:13,opacity:.75,marginBottom:18}}>{project.number} · {project.client} · {project.contractor}</div>
                  {/* KPI strip */}
                  <div style={{display:"grid",gridTemplateColumns:"repeat(6,1fr)",gap:10,padding:"16px 0",borderTop:"1px solid rgba(255,255,255,.15)"}}>
                    {[["SPI",kpi.SPI.toFixed(2),sColor(kpi.SPI)],["CPI",kpi.CPI.toFixed(2),sColor(kpi.CPI)],["PROGRESS",kpi.prog.toFixed(1)+"%","#0ea5e9"],["EAC",fmt(kpi.EAC),kpi.EAC>kpi.bac?"#fca5a5":"#86efac"],["ETC",fmt(kpi.ETC),"#c4b5fd"],["TCPI",kpi.TCPI.toFixed(2),kpi.TCPI<=1.1?"#86efac":"#fca5a5"]].map(([l,v,c])=>(
                      <div key={l} style={{textAlign:"center"}}>
                        <div style={{fontSize:9,opacity:.5,marginBottom:3,letterSpacing:.8}}>{l}</div>
                        <div style={{fontFamily:"monospace",fontWeight:900,fontSize:19,color:c}}>{v}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{fontSize:10,opacity:.5,marginTop:12}}>تاريخ الإصدار: {new Date().toLocaleDateString("ar-SA")} · مدة المشروع: {project.duration} شهراً · بداية: {project.startDate}</div>
                </div>

                {/* Section 1: EVM KPIs */}
                <div style={{background:darkMode?"#1e293b":"#fff",borderRadius:12,padding:"20px 24px",marginBottom:14,border:`1px solid ${darkMode?"#334155":"#f0f0f0"}`,boxShadow:"0 2px 10px rgba(0,0,0,.05)"}}>
                  <div style={{fontSize:13,fontWeight:800,marginBottom:14,paddingBottom:8,borderBottom:"2px solid #6366f1",display:"flex",alignItems:"center",gap:6}}>
                    <span style={{color:"#6366f1"}}>1.</span> ملخص مؤشرات القيمة المكتسبة — EVM Summary
                  </div>
                  <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10}}>
                    {[
                      {l:"BAC الميزانية الأصلية", v:fmt(kpi.bac),  sub:"Budget At Completion",              c:"#6366f1"},
                      {l:"PV القيمة المخططة",     v:fmt(kpi.pv),  sub:"Planned Value to Date",              c:"#0ea5e9"},
                      {l:"EV القيمة المكتسبة",    v:fmt(kpi.ev),  sub:"Earned Value to Date",               c:"#10b981"},
                      {l:"AC التكلفة الفعلية",    v:fmt(kpi.ac),  sub:"Actual Cost to Date",                c:"#f59e0b"},
                      {l:"SV انحراف الجدول",      v:fmt(kpi.SV),  sub:kpi.SV>=0?"متقدم":"متأخر",           c:kpi.SV>=0?"#10b981":"#ef4444"},
                      {l:"CV انحراف التكلفة",     v:fmt(kpi.CV),  sub:kpi.CV>=0?"ضمن الميزانية":"تجاوز",  c:kpi.CV>=0?"#10b981":"#ef4444"},
                    ].map(({l,v,sub,c})=>(
                      <div key={l} style={{background:darkMode?"#1e2d3d":"#f8f9fc",borderRadius:9,padding:"12px 14px",border:`2px solid ${c}20`}}>
                        <div style={{fontSize:10,color:"#888",marginBottom:3}}>{l}</div>
                        <div style={{fontFamily:"monospace",fontWeight:900,fontSize:18,color:c}}>{v}</div>
                        <div style={{fontSize:9,color:"#aaa",marginTop:2}}>{sub}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Section 2: Indices */}
                <div style={{background:darkMode?"#1e293b":"#fff",borderRadius:12,padding:"20px 24px",marginBottom:14,border:`1px solid ${darkMode?"#334155":"#f0f0f0"}`,boxShadow:"0 2px 10px rgba(0,0,0,.05)"}}>
                  <div style={{fontSize:13,fontWeight:800,marginBottom:14,paddingBottom:8,borderBottom:"2px solid #10b981",display:"flex",alignItems:"center",gap:6}}>
                    <span style={{color:"#10b981"}}>2.</span> مؤشرات الأداء — Performance Indices
                  </div>
                  <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:12}}>
                    {[
                      {l:"SPI — Schedule Performance Index", v:kpi.SPI, desc:kpi.SPI>=1?"المشروع في الموعد أو متقدم على الجدول.":"المشروع متأخر عن الجدول الزمني — يتطلب تسريع الأعمال."},
                      {l:"CPI — Cost Performance Index",     v:kpi.CPI, desc:kpi.CPI>=1?"التكاليف الفعلية أقل من المخطط — أداء مالي جيد.":"التكاليف الفعلية تتجاوز المخطط — يتطلب مراجعة فورية."},
                      {l:"TCPI — To-Complete Perf. Index",  v:kpi.TCPI,desc:kpi.TCPI<=1?"الكفاءة المطلوبة قابلة للتحقيق ضمن الميزانية.":kpi.TCPI<=1.1?"يتطلب تحسناً ملحوظاً في الأداء.":"يتطلب تحسناً جوهرياً جداً — يُنصح بمراجعة الميزانية."},
                      {l:"الإنجاز المرجّح بالميزانية (Weighted)",  v:null, custom:weightedProg.toFixed(1)+"%", desc:`الإنجاز الفعلي بعد تطبيق الأوزان النسبية للتخصصات. المتوسط البسيط: ${kpi.prog.toFixed(1)}%.`},
                    ].map(({l,v,custom,desc})=>(
                      <div key={l} style={{background:darkMode?"#1e2d3d":"#f8f9fc",borderRadius:9,padding:"14px 16px",border:`1px solid ${darkMode?"#334155":"#f0f0f0"}`,display:"flex",gap:12,alignItems:"flex-start"}}>
                        <div>
                          {v!==null
                            ? <span style={{display:"inline-flex",alignItems:"center",justifyContent:"center",background:sBg(v),color:sColor(v),borderRadius:999,padding:"4px 14px",fontSize:18,fontWeight:900,fontFamily:"monospace",border:`2px solid ${sColor(v)}30`,minWidth:70}}>{v.toFixed(2)}</span>
                            : <span style={{fontSize:20,fontWeight:900,color:"#6366f1",fontFamily:"monospace"}}>{custom}</span>
                          }
                        </div>
                        <div>
                          <div style={{fontSize:10,fontWeight:700,color:"#555",marginBottom:4}}>{l}</div>
                          <div style={{fontSize:11,color:"#666",lineHeight:1.6}}>{desc}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Section 3: Forecast */}
                <div style={{background:darkMode?"#1e293b":"#fff",borderRadius:12,padding:"20px 24px",marginBottom:14,border:`1px solid ${darkMode?"#334155":"#f0f0f0"}`,boxShadow:"0 2px 10px rgba(0,0,0,.05)"}}>
                  <div style={{fontSize:13,fontWeight:800,marginBottom:14,paddingBottom:8,borderBottom:"2px solid #8b5cf6",display:"flex",alignItems:"center",gap:6}}>
                    <span style={{color:"#8b5cf6"}}>3.</span> توقعات الإتمام — Completion Forecast
                  </div>
                  <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:14}}>
                    {[
                      {l:"EAC (CPI)", v:fmt(kpi.EAC),        c:kpi.EAC>kpi.bac?"#ef4444":"#10b981",s:"تقدير الإتمام بالكفاءة الحالية"},
                      {l:"EAC (PERT)",v:fmt(kpi.EAC_pert),   c:"#8b5cf6",s:"AC + (BAC-EV)/CPI"},
                      {l:"VAC",       v:fmt(kpi.bac-kpi.EAC),c:kpi.bac>kpi.EAC?"#10b981":"#ef4444",s:kpi.bac>kpi.EAC?"وفورات":"خسائر"},
                      {l:"ETC",       v:fmt(kpi.ETC),        c:"#0ea5e9",s:"تكلفة الأعمال المتبقية"},
                    ].map(({l,v,c,s})=>(
                      <div key={l} style={{background:darkMode?"#1e2d3d":"#f8f9fc",borderRadius:9,padding:"12px 14px",border:`2px solid ${c}20`,textAlign:"center"}}>
                        <div style={{fontSize:10,color:"#888",marginBottom:4}}>{l}</div>
                        <div style={{fontFamily:"monospace",fontWeight:900,fontSize:17,color:c}}>{v}</div>
                        <div style={{fontSize:9,color:"#aaa",marginTop:3}}>{s}</div>
                      </div>
                    ))}
                  </div>
                  {/* Duration forecast */}
                  <div style={{background:"#fef9ff",borderRadius:9,padding:"12px 16px",border:"1px solid #e9d5ff",display:"flex",gap:24,alignItems:"center",flexWrap:"wrap"}}>
                    <div style={{fontSize:11,fontWeight:700,color:"#7c3aed"}}>⏱ توقع الانتهاء:</div>
                    <div style={{fontSize:11,color:"#555"}}>المدة الأصلية: <b>{durationForecast.origDur} شهر</b> — ينتهي: <b>{durationForecast.origEnd}</b></div>
                    <div style={{fontSize:11,color:durationForecast.slipMonths>0?"#ef4444":"#10b981",fontWeight:700}}>
                      المدة المتوقعة: <b>{durationForecast.forecastDur} شهر</b> — ينتهي: <b>{durationForecast.forecastEnd}</b>
                      {durationForecast.slipMonths>0?` (تأخر ${durationForecast.slipMonths} شهر)`:" (في الموعد ✓)"}
                    </div>
                  </div>
                </div>

                {/* Section 4: Discipline table */}
                <div style={{background:darkMode?"#1e293b":"#fff",borderRadius:12,padding:0,marginBottom:14,border:`1px solid ${darkMode?"#334155":"#f0f0f0"}`,boxShadow:"0 2px 10px rgba(0,0,0,.05)",overflow:"hidden"}}>
                  <div style={{padding:"16px 24px",borderBottom:"1px solid #f0f0f0",fontSize:13,fontWeight:800,display:"flex",alignItems:"center",gap:6}}>
                    <span style={{color:"#f59e0b"}}>4.</span> ملخص التخصصات — Discipline Summary
                  </div>
                  <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
                    <thead><tr style={{background:darkMode?"#1e2d3d":"#f8f9fc"}}>{["التخصص","BAC","PV","EV","AC","SPI","CPI","EAC","الإنجاز","الحالة"].map(h=><th key={h} style={{padding:"9px 12px",textAlign:"center",fontWeight:700,color:"#555",borderBottom:"1px solid #eee"}}>{h}</th>)}</tr></thead>
                    <tbody>
                      {byDisc.map((d,i)=>(
                        <tr key={d.disc} style={{borderBottom:"1px solid #f5f5f5",background:i%2===0?(darkMode?"#1e293b":"#fff"):(darkMode?"#0f172a":"#fafbfc")}}>
                          <td style={{padding:"8px 12px"}}><div style={{display:"flex",alignItems:"center",gap:6}}><div style={{width:8,height:8,borderRadius:"50%",background:DC[d.disc]}}/><b style={{color:DC[d.disc],fontSize:11}}>{d.disc}</b></div></td>
                          <td style={{padding:"8px 12px",textAlign:"right",fontFamily:"monospace"}}>{fmt(d.bac)}</td>
                          <td style={{padding:"8px 12px",textAlign:"right",fontFamily:"monospace"}}>{fmt(d.pv)}</td>
                          <td style={{padding:"8px 12px",textAlign:"right",fontFamily:"monospace",color:"#10b981"}}>{fmt(d.ev)}</td>
                          <td style={{padding:"8px 12px",textAlign:"right",fontFamily:"monospace"}}>{fmt(d.ac)}</td>
                          <td style={{padding:"8px 12px",textAlign:"center"}}><b style={{color:sColor(d.SPI)}}>{d.SPI>0?d.SPI.toFixed(2):"—"}</b></td>
                          <td style={{padding:"8px 12px",textAlign:"center"}}><b style={{color:sColor(d.CPI)}}>{d.CPI>0?d.CPI.toFixed(2):"—"}</b></td>
                          <td style={{padding:"8px 12px",textAlign:"right",fontFamily:"monospace",color:d.EAC>d.bac?"#ef4444":"#10b981"}}>{fmt(d.EAC)}</td>
                          <td style={{padding:"8px 12px",textAlign:"center"}}>
                            <div style={{display:"flex",alignItems:"center",gap:5}}>
                              <div style={{flex:1,background:darkMode?"#334155":"#f0f0f5",borderRadius:999,height:5,overflow:"hidden"}}><div style={{width:`${Math.min(100,d.avgPct)}%`,height:"100%",background:DC[d.disc]}}/></div>
                              <span style={{fontWeight:700,color:DC[d.disc],fontSize:10,minWidth:30}}>{Math.round(d.avgPct)}%</span>
                            </div>
                          </td>
                          <td style={{padding:"8px 12px",textAlign:"center",fontSize:12}}>{d.CPI>=1?"✅":d.CPI>=0.9?"⚠️":"🔴"}</td>
                        </tr>
                      ))}
                      <tr style={{background:"#0f172a",color:"#fff",fontWeight:700}}>
                        <td style={{padding:"9px 12px"}}>GRAND TOTAL</td>
                        <td style={{padding:"9px 12px",textAlign:"right",fontFamily:"monospace"}}>{fmt(kpi.bac)}</td>
                        <td style={{padding:"9px 12px",textAlign:"right",fontFamily:"monospace"}}>{fmt(kpi.pv)}</td>
                        <td style={{padding:"9px 12px",textAlign:"right",fontFamily:"monospace",color:"#86efac"}}>{fmt(kpi.ev)}</td>
                        <td style={{padding:"9px 12px",textAlign:"right",fontFamily:"monospace"}}>{fmt(kpi.ac)}</td>
                        <td style={{padding:"9px 12px",textAlign:"center",color:sColor(kpi.SPI)}}>{kpi.SPI.toFixed(2)}</td>
                        <td style={{padding:"9px 12px",textAlign:"center",color:sColor(kpi.CPI)}}>{kpi.CPI.toFixed(2)}</td>
                        <td style={{padding:"9px 12px",textAlign:"right",fontFamily:"monospace",color:kpi.EAC>kpi.bac?"#fca5a5":"#86efac"}}>{fmt(kpi.EAC)}</td>
                        <td style={{padding:"9px 12px",textAlign:"center"}}>{kpi.prog.toFixed(1)}%</td>
                        <td style={{padding:"9px 12px",textAlign:"center"}}>{kpi.CPI>=1?"✅":kpi.CPI>=0.9?"⚠️":"🔴"}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Section 5: Resources summary */}
                <div style={{background:darkMode?"#1e293b":"#fff",borderRadius:12,padding:"20px 24px",marginBottom:14,border:`1px solid ${darkMode?"#334155":"#f0f0f0"}`,boxShadow:"0 2px 10px rgba(0,0,0,.05)"}}>
                  <div style={{fontSize:13,fontWeight:800,marginBottom:12,paddingBottom:8,borderBottom:"2px solid #0ea5e9",display:"flex",alignItems:"center",gap:6}}>
                    <span style={{color:"#0ea5e9"}}>5.</span> ملخص الموارد — Resource Summary
                  </div>
                  <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10}}>
                    {[
                      {l:"👷 تكلفة العمالة",   v:fmt(resStats.laborCost), c:"#6366f1"},
                      {l:"🚧 تكلفة المعدات",   v:fmt(resStats.equipCost), c:"#f59e0b"},
                      {l:"📦 تكلفة المواد",    v:fmt(resStats.matCost),   c:"#10b981"},
                      {l:"📊 نسبة الاستخدام", v:resStats.utilization.toFixed(0)+"%", c:"#8b5cf6"},
                    ].map(({l,v,c})=>(
                      <div key={l} style={{background:darkMode?"#1e2d3d":"#f8f9fc",borderRadius:9,padding:"12px 14px",border:`2px solid ${c}20`,textAlign:"center"}}>
                        <div style={{fontSize:10,color:"#888",marginBottom:4}}>{l}</div>
                        <div style={{fontFamily:"monospace",fontWeight:900,fontSize:16,color:c}}>{v}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Section 6: Alerts & Risks */}
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:14}}>
                  <div style={{background:darkMode?"#1e293b":"#fff",borderRadius:12,padding:"18px 20px",border:`1px solid ${darkMode?"#334155":"#f0f0f0"}`,boxShadow:"0 2px 10px rgba(0,0,0,.05)"}}>
                    <div style={{fontSize:13,fontWeight:800,marginBottom:12,paddingBottom:8,borderBottom:"2px solid #ef4444",display:"flex",alignItems:"center",gap:6}}>
                      <span style={{color:"#ef4444"}}>6.</span> التنبيهات النشطة
                    </div>
                    {alerts.length===0
                      ? <div style={{textAlign:"center",padding:"16px 0",color:"#10b981",fontWeight:700}}>✅ لا توجد تنبيهات</div>
                      : alerts.map((a,i)=>(
                          <div key={i} style={{display:"flex",gap:8,padding:"7px 10px",borderRadius:7,marginBottom:5,background:a.t==="c"?"#fee2e2":"#fff7ed",border:`1px solid ${a.t==="c"?"#fca5a5":"#fed7aa"}`}}>
                            <span>{a.t==="c"?"🔴":"🟡"}</span>
                            <span style={{fontSize:11,color:a.t==="c"?"#dc2626":"#b45309",fontWeight:600}}>{a.msg}</span>
                          </div>
                        ))
                    }
                  </div>
                  <div style={{background:darkMode?"#1e293b":"#fff",borderRadius:12,padding:"18px 20px",border:`1px solid ${darkMode?"#334155":"#f0f0f0"}`,boxShadow:"0 2px 10px rgba(0,0,0,.05)"}}>
                    <div style={{fontSize:13,fontWeight:800,marginBottom:12,paddingBottom:8,borderBottom:"2px solid #f59e0b",display:"flex",alignItems:"center",gap:6}}>
                      <span style={{color:"#f59e0b"}}>7.</span> أبرز المخاطر
                    </div>
                    {risks.filter(r=>r.status==="مفتوح").sort((a,b)=>b.prob*b.impact-a.prob*a.impact).slice(0,4).map(r=>{
                      const s=r.prob*r.impact;const c=rColor(s);
                      return(
                        <div key={r.id} style={{display:"flex",gap:8,alignItems:"center",padding:"7px 10px",borderRadius:7,marginBottom:5,background:c+"12",border:`1px solid ${c}30`}}>
                          <span style={{background:c,color:"#fff",borderRadius:5,padding:"2px 6px",fontSize:9,fontWeight:800,minWidth:22,textAlign:"center"}}>{s}</span>
                          <div style={{flex:1,minWidth:0}}>
                            <div style={{fontSize:11,fontWeight:600,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{r.title}</div>
                            <div style={{fontSize:9,color:"#888"}}>{r.category} · {r.owner}</div>
                          </div>
                          <span style={{fontSize:9,fontWeight:700,color:c,whiteSpace:"nowrap"}}>{rLabel(s)}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Narrative section (if generated) */}
                {narrativeText&&(
                  <div style={{background:darkMode?"#1e293b":"#fff",borderRadius:12,padding:"20px 24px",marginBottom:14,border:`1px solid ${darkMode?"#334155":"#f0f0f0"}`,boxShadow:"0 2px 10px rgba(0,0,0,.05)"}}>
                    <div style={{fontSize:13,fontWeight:800,marginBottom:14,paddingBottom:8,borderBottom:"2px solid #6366f1",display:"flex",alignItems:"center",gap:6}}>
                      <span style={{color:"#6366f1"}}>8.</span> التحليل السردي
                    </div>
                    <div style={{direction:"rtl",lineHeight:2,fontSize:12,color:"#333",textAlign:"justify",whiteSpace:"pre-wrap"}}>{narrativeText}</div>
                  </div>
                )}

                {/* Footer */}
                <div style={{textAlign:"center",color:"#aaa",fontSize:10,padding:"14px 0",borderTop:"1px solid #f0f0f0"}}>
                  Cost Control EVM Dashboard · {project.contractor} · تاريخ الإصدار: {new Date().toLocaleDateString("ar-SA")}
                </div>
              </div>
            </div>
          )}

          {tab==="table"&&(
            <Card style={{padding:0,overflow:"hidden"}}>
              <div style={{padding:"12px 18px",borderBottom:"1px solid #f0f0f0"}}>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
                  <H3 style={{margin:0}}>📋 Detailed Data Table — جدول البيانات التفصيلي</H3>
                  <span style={{fontSize:10,color:"#aaa"}}>{sortedFiltered.length}/{acts.length} أنشطة</span>
                </div>
                {/* Filter bar */}
                <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
                  <input value={tableSearch} onChange={e=>setTableSearch(e.target.value)} placeholder="🔍 بحث في الجدول..."
                    style={{border:"1px solid #e5e7eb",borderRadius:7,padding:"5px 10px",fontSize:11,outline:"none",width:180}}/>
                  <div style={{display:"flex",gap:4}}>
                    {[["all","الكل","#888"],["good","✅ CPI≥1","#10b981"],["warn","⚠️ CPI<1","#f59e0b"],["bad","🔴 CPI<0.9","#ef4444"]].map(([v,lbl,c])=>(
                      <button key={v} onClick={()=>setHealthFilter(v)}
                        style={{background:healthFilter===v?c:"#f0f0f5",color:healthFilter===v?"#fff":c,border:`1px solid ${c}40`,borderRadius:6,padding:"4px 10px",cursor:"pointer",fontSize:10,fontWeight:healthFilter===v?700:400}}>
                        {lbl}
                      </button>
                    ))}
                  </div>
                  <button onClick={()=>{setSortCol("id");setSortDir("asc");setHealthFilter("all");setTableSearch("");}}
                    style={{background:darkMode?"#334155":"#f0f0f5",border:"none",borderRadius:6,padding:"4px 10px",cursor:"pointer",fontSize:10,color:"#888",marginLeft:"auto"}}>
                    ↺ إعادة ضبط
                  </button>
                </div>
              </div>
              {sortedFiltered.length===0
                ?<div style={{padding:60,textAlign:"center",color:"#bbb"}}><div style={{fontSize:40,marginBottom:12}}>📭</div><div style={{fontSize:14,fontWeight:600}}>لا توجد أنشطة تطابق الفلتر</div><button onClick={()=>{setHealthFilter("all");setTableSearch("");}} style={{marginTop:16,background:"#6366f1",color:"#fff",border:"none",borderRadius:9,padding:"9px 20px",fontWeight:700,cursor:"pointer",fontSize:13}}>↺ إزالة الفلتر</button></div>
                :<div style={{overflowX:"auto"}}>
                  <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
                    <thead><tr style={{background:darkMode?"#1e2d3d":"#f8f9fc"}}>
                      {[["#",""],["النشاط","id"],["التخصص","disc"],["البنود",""],["% الإنجاز","pct"],["PV",""],["EV","ev"],["AC","ac"],["EAC PERT","eac"],["ETC",""],["CPI","cpi"],["SPI","spi"],["إجراء",""]].map(([h,col])=>(
                        <th key={h} onClick={col?()=>toggleSort(col):undefined}
                          style={{padding:"9px 11px",textAlign:"center",fontWeight:700,color:col&&sortCol===col?"#6366f1":"#555",borderBottom:"1px solid #eee",whiteSpace:"nowrap",fontSize:10,cursor:col?"pointer":"default",userSelect:"none"}}>
                          {h}{col&&<SortIco col={col}/>}
                        </th>
                      ))}</tr></thead>
                    <tbody>
                      {sortedFiltered.map((a,idx)=>{const{pv,ev,ac,cpi,spi,eac,etc}=calcAct(a);const isEd=editId===a.id;return(
                        <tr key={a.id} style={{borderBottom:"1px solid #f5f5f5",background:idx%2===0?(darkMode?"#1e293b":"#fff"):(darkMode?"#0f172a":"#fafbfc")}}>
                          <td style={{padding:"6px 9px",textAlign:"center",color:"#ccc",fontSize:10}}>{idx+1}</td>
                          <td style={{padding:"6px 9px"}}><div style={{fontWeight:700,direction:"rtl",whiteSpace:"nowrap"}}>{a.nameAr}</div><div style={{fontSize:9,color:"#bbb"}}>{a.id}</div></td>
                          <td style={{padding:"6px 9px",textAlign:"center"}}><span style={{background:DC[a.disc]+"20",color:DC[a.disc],borderRadius:5,padding:"2px 6px",fontWeight:700,fontSize:9}}>{a.disc}</span></td>
                          <td style={{padding:"6px 9px",textAlign:"center"}}>
                            {isEd?<input type="number" value={editBuf.items} onChange={e=>setEditBuf({...editBuf,items:e.target.value})} min={1} style={{width:48,border:`1px solid ${editErrs.items?"#ef4444":"#6366f1"}`,borderRadius:5,padding:"2px 4px",textAlign:"center",fontSize:10}}/>
                            :<span style={{background:"#1a1a2e",color:"#fff",borderRadius:999,padding:"2px 6px",fontSize:9}}>{a.items}</span>}
                            <ErrMsg msg={editErrs.items}/>
                          </td>
                          <td style={{padding:"6px 9px",textAlign:"center"}}>
                            {isEd?<div><input type="number" value={editBuf.pct} onChange={e=>setEditBuf({...editBuf,pct:e.target.value})} min={0} max={100} style={{width:54,border:`1px solid ${editErrs.pct?"#ef4444":"#6366f1"}`,borderRadius:5,padding:"2px 4px",textAlign:"center",fontSize:10}}/><ErrMsg msg={editErrs.pct}/></div>
                            :<div><span style={{color:a.pct>=100?"#10b981":a.pct>=50?"#f59e0b":"#ef4444",fontWeight:700}}>{a.pct}%</span><div style={{marginTop:2}}><PBar pct={a.pct} color={a.pct>=100?"#10b981":a.pct>=50?"#f59e0b":"#ef4444"} h={3}/></div></div>}
                          </td>
                          <td style={{padding:"6px 9px",textAlign:"right",fontFamily:"monospace"}}>{fmt(pv)}</td>
                          <td style={{padding:"6px 9px",textAlign:"right",fontFamily:"monospace",color:"#10b981",fontWeight:600}}>{fmt(ev)}</td>
                          <td style={{padding:"6px 9px",textAlign:"right",fontFamily:"monospace"}}>
                            {isEd?<div><input type="number" value={editBuf.ac} onChange={e=>setEditBuf({...editBuf,ac:e.target.value})} min={0} style={{width:78,border:`1px solid ${editErrs.ac?"#ef4444":"#6366f1"}`,borderRadius:5,padding:"2px 4px",fontSize:10}}/><ErrMsg msg={editErrs.ac}/></div>:fmt(ac)}
                          </td>
                          <td style={{padding:"6px 9px",textAlign:"right",fontFamily:"monospace"}}>
                            {isEd?<div><input type="number" value={editBuf.bac} onChange={e=>setEditBuf({...editBuf,bac:e.target.value})} min={1} style={{width:88,border:`1px solid ${editErrs.bac?"#ef4444":"#6366f1"}`,borderRadius:5,padding:"2px 4px",fontSize:10}}/><ErrMsg msg={editErrs.bac}/></div>:<span style={{color:eac>a.bac?"#ef4444":"#10b981"}}>{fmt(eac)}</span>}
                          </td>
                          <td style={{padding:"6px 9px",textAlign:"right",fontFamily:"monospace"}}>{fmt(etc)}</td>
                          <td style={{padding:"6px 9px",textAlign:"center"}}><span style={{color:sColor(cpi),fontWeight:800}}>{cpi>0?cpi.toFixed(2):"—"}</span></td>
                          <td style={{padding:"6px 9px",textAlign:"center"}}><span style={{color:sColor(spi),fontWeight:800}}>{spi>0?spi.toFixed(2):"—"}</span></td>
                          <td style={{padding:"6px 9px",textAlign:"center"}}>
                            {isEd?<div style={{display:"flex",gap:3,justifyContent:"center"}}><button onClick={()=>saveEdit(a.id)} style={{background:"#10b981",color:"#fff",border:"none",borderRadius:5,padding:"3px 8px",cursor:"pointer",fontWeight:700,fontSize:10}}>✓</button><button onClick={()=>{setEditId(null);setEditErrs({});}} style={{background:darkMode?"#334155":"#f0f0f5",border:"none",borderRadius:5,padding:"3px 8px",cursor:"pointer",fontSize:10}}>✕</button></div>
                            :<div style={{display:"flex",gap:3,justifyContent:"center"}}>
                              <button onClick={()=>{setEditId(a.id);setEditBuf({bac:a.bac,ac:a.ac,pct:a.pct,items:a.items});setEditErrs({});}} style={{background:"#eef2ff",border:"none",borderRadius:5,padding:"3px 7px",cursor:"pointer",fontSize:11,color:"#6366f1"}}>✏️</button>
                              <button onClick={()=>delAct(a.id)} style={{background:"#fee2e2",border:"none",borderRadius:5,padding:"3px 7px",cursor:"pointer",fontSize:11,color:"#ef4444"}}>🗑</button>
                            </div>}
                          </td>
                        </tr>
                      );})}
                      <tr style={{background:"#0f172a",color:"#fff",fontWeight:700}}>
                        <td colSpan={3} style={{padding:"9px 12px",textAlign:"center",fontWeight:900,fontSize:12}}>GRAND TOTAL</td>
                        <td style={{padding:"9px 12px",textAlign:"center"}}><span style={{background:"rgba(255,255,255,.2)",borderRadius:999,padding:"2px 8px",fontSize:10}}>{filtered.reduce((s,a)=>s+a.items,0)}</span></td>
                        <td style={{padding:"9px 12px",textAlign:"center",fontFamily:"monospace"}}>{kpi.prog.toFixed(1)}%</td>
                        <td style={{padding:"9px 12px",textAlign:"right",fontFamily:"monospace"}}>{fmt(kpi.pv)}</td>
                        <td style={{padding:"9px 12px",textAlign:"right",fontFamily:"monospace",color:"#86efac"}}>{fmt(kpi.ev)}</td>
                        <td style={{padding:"9px 12px",textAlign:"right",fontFamily:"monospace"}}>{fmt(kpi.ac)}</td>
                        <td style={{padding:"9px 12px",textAlign:"right",fontFamily:"monospace",color:kpi.EAC>kpi.bac?"#fca5a5":"#86efac"}}>{fmt(kpi.EAC)}</td>
                        <td style={{padding:"9px 12px",textAlign:"right",fontFamily:"monospace"}}>{fmt(kpi.ETC)}</td>
                        <td style={{padding:"9px 12px",textAlign:"center",color:sColor(kpi.CPI),fontWeight:900}}>{kpi.CPI.toFixed(2)}</td>
                        <td style={{padding:"9px 12px",textAlign:"center",color:sColor(kpi.SPI),fontWeight:900}}>{kpi.SPI.toFixed(2)}</td>
                        <td/>
                      </tr>
                    </tbody>
                  </table>
                </div>
              }
            </Card>
          )}
        </div>
      </div>

      {/* ══ PRINT STYLES (injected) ══ */}
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #print-report, #print-report * { visibility: visible !important; }
          #print-report { position: fixed; top: 0; left: 0; right: 0; background: #fff; padding: 20px 30px; font-size: 11pt; }
          .no-print { display: none !important; }
          @page { size: A4; margin: 15mm; }
        }
      `}</style>

      {/* ══ MODALS ══ */}

      {/* Resource Modal */}
      <Modal show={resModal} onClose={()=>setResModal(false)} title="➕ إضافة مورد جديد" width={520}>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
          <div style={{gridColumn:"1/-1"}}><Field label="اسم المورد / الوصف" value={newRes.name} onChange={e=>setNewRes({...newRes,name:e.target.value})} placeholder="مثال: أحمد محمد — مهندس مدني"/></div>
          <Field label="الدور / التخصص الوظيفي" value={newRes.role} onChange={e=>setNewRes({...newRes,role:e.target.value})} placeholder="مهندس مدني أول"/>
          <Field label="التكلفة / الوحدة (ريال)" value={newRes.unitCost} type="number" min="0" onChange={e=>setNewRes({...newRes,unitCost:e.target.value})}/>
          <Field label="الكمية المخططة" value={newRes.planQty} type="number" min="1" onChange={e=>setNewRes({...newRes,planQty:e.target.value})}/>
          <Field label="الكمية الفعلية" value={newRes.actQty} type="number" min="0" onChange={e=>setNewRes({...newRes,actQty:e.target.value})}/>
          <Field label="الأيام المخططة" value={newRes.planDays} type="number" min="1" onChange={e=>setNewRes({...newRes,planDays:e.target.value})}/>
          <Field label="الأيام الفعلية" value={newRes.actDays} type="number" min="0" onChange={e=>setNewRes({...newRes,actDays:e.target.value})}/>
          <div>
            <div style={{fontSize:11,fontWeight:600,color:"#555",marginBottom:4}}>النوع</div>
            <select value={newRes.type} onChange={e=>setNewRes({...newRes,type:e.target.value})} style={{width:"100%",border:"1px solid #e5e7eb",borderRadius:8,padding:"8px 12px",fontSize:13,outline:"none"}}>
              <option value="labor">👷 عمالة</option>
              <option value="equip">🚧 معدات</option>
              <option value="material">📦 مواد</option>
            </select>
          </div>
          <div>
            <div style={{fontSize:11,fontWeight:600,color:"#555",marginBottom:4}}>الوحدة</div>
            <select value={newRes.unit} onChange={e=>setNewRes({...newRes,unit:e.target.value})} style={{width:"100%",border:"1px solid #e5e7eb",borderRadius:8,padding:"8px 12px",fontSize:13,outline:"none"}}>
              {["يوم","شهر","م.ط","م³","طن","قطعة"].map(u=><option key={u}>{u}</option>)}
            </select>
          </div>
          <div>
            <div style={{fontSize:11,fontWeight:600,color:"#555",marginBottom:4}}>التخصص</div>
            <select value={newRes.disc} onChange={e=>setNewRes({...newRes,disc:e.target.value})} style={{width:"100%",border:"1px solid #e5e7eb",borderRadius:8,padding:"8px 12px",fontSize:13,outline:"none"}}>
              {DISCIPLINES.map(d=><option key={d}>{d}</option>)}
            </select>
          </div>
        </div>
        {/* Cost preview */}
        <div style={{marginTop:12,padding:"10px 14px",borderRadius:8,background:"#f0f9ff",border:"1px solid #bae6fd",display:"flex",justifyContent:"space-between",fontSize:12}}>
          <span style={{color:"#0ea5e9",fontWeight:600}}>التكلفة المخططة</span>
          <span style={{fontFamily:"monospace",fontWeight:800,color:"#0ea5e9"}}>{fmt((+newRes.planQty||0)*(+newRes.unitCost||0)*(+newRes.planDays||0))} ريال</span>
          <span style={{color:"#10b981",fontWeight:600}}>التكلفة الفعلية</span>
          <span style={{fontFamily:"monospace",fontWeight:800,color:"#10b981"}}>{fmt((+newRes.actQty||0)*(+newRes.unitCost||0)*(+newRes.actDays||0))} ريال</span>
        </div>
        <div style={{display:"flex",gap:10,marginTop:16}}>
          <button onClick={()=>{
            if(!newRes.name)return;
            const id=(newRes.type==="labor"?"L":newRes.type==="equip"?"E":"M")+String(Date.now()).slice(-4);
            setResources(p=>[...p,{...newRes,id,planQty:+newRes.planQty,actQty:+newRes.actQty,unitCost:+newRes.unitCost,planDays:+newRes.planDays,actDays:+newRes.actDays}]);
            setResModal(false);
            setNewRes({name:"",role:"",disc:"CIVIL",type:"labor",planQty:1,actQty:1,unitCost:0,planDays:26,actDays:26,unit:"يوم"});
          }} style={{flex:1,background:"#10b981",color:"#fff",border:"none",borderRadius:9,padding:11,fontWeight:700,cursor:"pointer",fontSize:14}}>✓ إضافة المورد</button>
          <button onClick={()=>setResModal(false)} style={{flex:1,background:"#f4f5fb",color:"#555",border:"none",borderRadius:9,padding:11,fontWeight:600,cursor:"pointer",fontSize:14}}>إلغاء</button>
        </div>
      </Modal>

      <Modal show={addModal} onClose={()=>{setAddModal(false);setAddErrs({});}} title="➕ إضافة نشاط جديد">
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
          <Field label="اسم النشاط (عربي)" value={newAct.nameAr} error={addErrs.nameAr} onChange={e=>setNewAct({...newAct,nameAr:e.target.value})} placeholder="أعمال الطرق والأرصفة"/>
          <Field label="كود النشاط" value={newAct.id} error={addErrs.id} onChange={e=>setNewAct({...newAct,id:e.target.value})} placeholder="CIV-009"/>
          <Field label="عدد البنود" value={newAct.items} error={addErrs.items} type="number" min="1" onChange={e=>setNewAct({...newAct,items:e.target.value})}/>
          <Field label="نسبة الإنجاز % (0-100)" value={newAct.pct} error={addErrs.pct} type="number" min="0" max="100" onChange={e=>setNewAct({...newAct,pct:e.target.value})}/>
          <Field label="الميزانية BAC (ريال)" value={newAct.bac} error={addErrs.bac} type="number" min="1" onChange={e=>setNewAct({...newAct,bac:e.target.value})} placeholder="5000000"/>
          <Field label="التكلفة الفعلية AC (ريال)" value={newAct.ac} error={addErrs.ac} type="number" min="0" onChange={e=>setNewAct({...newAct,ac:e.target.value})} placeholder="1200000"/>
          <div><div style={{fontSize:11,fontWeight:600,color:"#555",marginBottom:4}}>التخصص</div><select value={newAct.disc} onChange={e=>setNewAct({...newAct,disc:e.target.value})} style={{width:"100%",border:"1px solid #e5e7eb",borderRadius:8,padding:"8px 12px",fontSize:13,outline:"none"}}>{DISCIPLINES.map(d=><option key={d}>{d}</option>)}</select></div>
        </div>
        {Object.keys(addErrs).length>0&&<div style={{marginTop:12,background:"#fff5f5",border:"1px solid #fecaca",borderRadius:8,padding:"10px 14px"}}><div style={{fontSize:11,fontWeight:700,color:"#dc2626",marginBottom:4}}>⚠️ يرجى تصحيح:</div>{Object.values(addErrs).map((e,i)=><div key={i} style={{fontSize:11,color:"#ef4444"}}>• {e}</div>)}</div>}
        <div style={{display:"flex",gap:10,marginTop:18}}><button onClick={addActFn} style={{flex:1,background:"#6366f1",color:"#fff",border:"none",borderRadius:9,padding:11,fontWeight:700,cursor:"pointer",fontSize:14}}>✓ إضافة</button><button onClick={()=>{setAddModal(false);setAddErrs({});}} style={{flex:1,background:"#f4f5fb",color:"#555",border:"none",borderRadius:9,padding:11,fontWeight:600,cursor:"pointer",fontSize:14}}>إلغاء</button></div>
      </Modal>

      <Modal show={riskModal} onClose={()=>setRiskModal(false)} title="⚠️ إضافة مخاطرة جديدة" width={520}>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
          <div style={{gridColumn:"1/-1"}}><Field label="عنوان المخاطرة" value={newRisk.title} onChange={e=>setNewRisk({...newRisk,title:e.target.value})} placeholder="وصف المخاطرة..."/></div>
          <div><div style={{fontSize:11,fontWeight:600,color:"#555",marginBottom:4}}>الفئة</div><select value={newRisk.category} onChange={e=>setNewRisk({...newRisk,category:e.target.value})} style={{width:"100%",border:"1px solid #e5e7eb",borderRadius:8,padding:"8px 12px",fontSize:13,outline:"none"}}>{["تكلفة","جدول","جودة","تقني","تنظيمي","بيئي","موارد","جيوتقني","هندسي","توريد"].map(c=><option key={c}>{c}</option>)}</select></div>
          <div><div style={{fontSize:11,fontWeight:600,color:"#555",marginBottom:4}}>الاحتمالية (1-5): <b style={{color:"#6366f1"}}>{newRisk.prob}</b></div><input type="range" min={1} max={5} value={newRisk.prob} onChange={e=>setNewRisk({...newRisk,prob:+e.target.value})} style={{width:"100%",accentColor:"#6366f1"}}/></div>
          <div><div style={{fontSize:11,fontWeight:600,color:"#555",marginBottom:4}}>الأثر (1-5): <b style={{color:"#ef4444"}}>{newRisk.impact}</b> — درجة الخطر: <b style={{color:rColor(newRisk.prob*newRisk.impact)}}>{newRisk.prob*newRisk.impact}</b></div><input type="range" min={1} max={5} value={newRisk.impact} onChange={e=>setNewRisk({...newRisk,impact:+e.target.value})} style={{width:"100%",accentColor:"#ef4444"}}/></div>
          <div style={{gridColumn:"1/-1"}}><Field label="خطة المعالجة" value={newRisk.mitigation} onChange={e=>setNewRisk({...newRisk,mitigation:e.target.value})} placeholder="كيفية معالجة أو تخفيف هذه المخاطرة..."/></div>
          <Field label="المسؤول" value={newRisk.owner} onChange={e=>setNewRisk({...newRisk,owner:e.target.value})} placeholder="اسم المسؤول"/>
          <Field label="التكلفة المحتملة (ريال)" value={newRisk.cost} type="number" min="0" onChange={e=>setNewRisk({...newRisk,cost:e.target.value})}/>
        </div>
        <div style={{marginTop:12,padding:"10px 14px",borderRadius:8,background:rColor(newRisk.prob*newRisk.impact)+"15",border:`1px solid ${rColor(newRisk.prob*newRisk.impact)}40`}}>
          <span style={{fontWeight:700,color:rColor(newRisk.prob*newRisk.impact)}}>مستوى الخطر: {rLabel(newRisk.prob*newRisk.impact)} ({newRisk.prob*newRisk.impact})</span>
        </div>
        <div style={{display:"flex",gap:10,marginTop:16}}><button onClick={addRisk} style={{flex:1,background:"#6366f1",color:"#fff",border:"none",borderRadius:9,padding:11,fontWeight:700,cursor:"pointer",fontSize:14}}>✓ إضافة المخاطرة</button><button onClick={()=>setRiskModal(false)} style={{flex:1,background:"#f4f5fb",color:"#555",border:"none",borderRadius:9,padding:11,fontWeight:600,cursor:"pointer",fontSize:14}}>إلغاء</button></div>
      </Modal>

      <Modal show={issueModal} onClose={()=>setIssueModal(false)} title="🔧 إضافة مشكلة جديدة" width={500}>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
          <div style={{gridColumn:"1/-1"}}><Field label="عنوان المشكلة" value={newIssue.title} onChange={e=>setNewIssue({...newIssue,title:e.target.value})} placeholder="وصف المشكلة..."/></div>
          <div><div style={{fontSize:11,fontWeight:600,color:"#555",marginBottom:4}}>التخصص</div><select value={newIssue.disc} onChange={e=>setNewIssue({...newIssue,disc:e.target.value})} style={{width:"100%",border:"1px solid #e5e7eb",borderRadius:8,padding:"8px 12px",fontSize:13,outline:"none"}}>{DISCIPLINES.map(d=><option key={d}>{d}</option>)}</select></div>
          <div><div style={{fontSize:11,fontWeight:600,color:"#555",marginBottom:4}}>الأولوية</div><select value={newIssue.priority} onChange={e=>setNewIssue({...newIssue,priority:e.target.value})} style={{width:"100%",border:"1px solid #e5e7eb",borderRadius:8,padding:"8px 12px",fontSize:13,outline:"none"}}>{["عالية","متوسطة","منخفضة"].map(p=><option key={p}>{p}</option>)}</select></div>
          <Field label="تاريخ الاكتشاف" value={newIssue.date} type="date" onChange={e=>setNewIssue({...newIssue,date:e.target.value})}/>
          <Field label="المسؤول" value={newIssue.owner} onChange={e=>setNewIssue({...newIssue,owner:e.target.value})} placeholder="اسم المسؤول"/>
          <Field label="التكلفة (ريال)" value={newIssue.cost} type="number" min="0" onChange={e=>setNewIssue({...newIssue,cost:e.target.value})}/>
          <div style={{gridColumn:"1/-1"}}><Field label="التأثير على المشروع" value={newIssue.impact} onChange={e=>setNewIssue({...newIssue,impact:e.target.value})} placeholder="وصف تأثير هذه المشكلة على المشروع..."/></div>
        </div>
        <div style={{display:"flex",gap:10,marginTop:16}}><button onClick={addIssue} style={{flex:1,background:"#f59e0b",color:"#fff",border:"none",borderRadius:9,padding:11,fontWeight:700,cursor:"pointer",fontSize:14}}>✓ إضافة المشكلة</button><button onClick={()=>setIssueModal(false)} style={{flex:1,background:"#f4f5fb",color:"#555",border:"none",borderRadius:9,padding:11,fontWeight:600,cursor:"pointer",fontSize:14}}>إلغاء</button></div>
      </Modal>

      <Modal show={shortcutsModal} onClose={()=>setShortcutsModal(false)} title="⌨️ اختصارات لوحة المفاتيح" width={460}>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,fontSize:12}}>
          {[
            ["Ctrl + K","البحث العام / Command Palette"],
            ["Ctrl + S","حفظ السيناريو الحالي"],
            ["Ctrl + P","طباعة التقرير"],
            ["Esc","إغلاق النوافذ المنبثقة"],
            ["?","عرض هذه القائمة"],
            ["انقر على KPI","فتح Drill-down التفصيلي"],
            ["⊟ / ⊞","تبديل كثافة العرض"],
            ["🌙 / ☀️","تبديل الوضع الليلي"],
          ].map(([k,d])=>(
            <div key={k} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 10px",background:"hsl(var(--muted))",border:"1px solid hsl(var(--border))",borderRadius:8}}>
              <span style={{color:"hsl(var(--muted-foreground))",fontSize:11}}>{d}</span>
              <kbd style={{background:"hsl(var(--background))",border:"1px solid hsl(var(--border))",borderRadius:5,padding:"2px 8px",fontFamily:"monospace",fontSize:11,fontWeight:700,color:"hsl(var(--primary))"}}>{k}</kbd>
            </div>
          ))}
        </div>
        <button onClick={()=>setShortcutsModal(false)} style={{marginTop:16,width:"100%",background:"hsl(var(--primary))",color:"hsl(var(--primary-foreground))",border:"none",borderRadius:9,padding:11,fontWeight:700,cursor:"pointer",fontSize:13}}>✓ فهمت</button>
      </Modal>

      <Modal show={threshModal} onClose={()=>setThreshModal(false)} title="⚙️ إعدادات الحدود التحذيرية" width={420}>

        <div style={{display:"flex",flexDirection:"column",gap:18}}>
          {[{label:"حد SPI",state:threshSPI,set:setThreshSPI},{label:"حد CPI",state:threshCPI,set:setThreshCPI}].map(({label,state,set})=>(
            <div key={label}><div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}><span style={{fontSize:12,fontWeight:600,color:"#555"}}>{label} (تنبيه إذا أقل من)</span><span style={{fontFamily:"monospace",fontWeight:900,color:"#6366f1",fontSize:16}}>{state.toFixed(2)}</span></div>
            <input type="range" min={0.5} max={1} step={0.01} value={state} onChange={e=>set(+e.target.value)} style={{width:"100%",accentColor:"#6366f1"}}/>
            <div style={{display:"flex",justifyContent:"space-between",fontSize:9,color:"#bbb",marginTop:3}}><span>0.50</span><span>1.00</span></div>
            <div style={{marginTop:8,padding:"7px 12px",borderRadius:7,fontSize:11,fontWeight:600,background:state>=0.95?"#fee2e2":state>=0.85?"#fef3c7":"#d1fae5",color:state>=0.95?"#dc2626":state>=0.85?"#b45309":"#065f46"}}>{state>=0.95?"⛔ صارم":state>=0.85?"⚠️ معتدل":"✓ متساهل"}</div></div>
          ))}
        </div>
        <button onClick={()=>setThreshModal(false)} style={{marginTop:20,width:"100%",background:"#6366f1",color:"#fff",border:"none",borderRadius:9,padding:11,fontWeight:700,cursor:"pointer",fontSize:14}}>✓ حفظ</button>
      </Modal>

      <Modal show={projModal} onClose={()=>setProjModal(false)} title="🏗 إعدادات المشروع" width={560}>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
          {/* Project Name — dropdown from saved projects + free text */}
          <div style={{gridColumn:"1/-1"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
              <span style={{fontSize:11,fontWeight:700,color:"hsl(var(--foreground))"}}>اسم المشروع</span>
              <span style={{fontSize:9,color:"hsl(var(--muted-foreground))"}}>اختر من المحفوظات أو اكتب اسماً جديداً</span>
            </div>
            <div style={{display:"flex",gap:8}}>
              <select value={projectsList.find(p=>p.name===projBuf.name)?.id||""}
                onChange={e=>{const p=projectsList.find(x=>x.id===e.target.value);if(p){setProjBuf(b=>({...b,name:p.name||b.name,number:p.file_name||b.number}));if(loadProjectFromDb)loadProjectFromDb(p);}}}
                style={{width:180,border:"1px solid hsl(var(--border))",borderRadius:8,padding:"8px 10px",fontSize:12,outline:"none",background:"hsl(var(--background))",color:"hsl(var(--foreground))",cursor:"pointer"}}>
                <option value="">📂 المحفوظات...</option>
                {(projectsList||[]).map(p=><option key={p.id} value={p.id}>{p.name||"بدون اسم"}</option>)}
              </select>
              <input list="proj-name-list" value={projBuf.name||""} onChange={e=>setProjBuf({...projBuf,name:e.target.value})}
                placeholder="اسم المشروع"
                style={{flex:1,border:"1px solid hsl(var(--border))",borderRadius:8,padding:"8px 12px",fontSize:13,outline:"none",background:"hsl(var(--background))",color:"hsl(var(--foreground))"}}/>
              <datalist id="proj-name-list">{(projectsList||[]).map(p=><option key={p.id} value={p.name||""}/>)}</datalist>
            </div>
          </div>
          {[{l:"رقم العقد",k:"number"},{l:"الجهة المالكة",k:"client"},{l:"المقاول",k:"contractor"},{l:"مدير المشروع",k:"manager"},{l:"الموقع",k:"location"}].map(({l,k})=>(
            <Field key={k} label={l} value={projBuf[k]||""} onChange={e=>setProjBuf({...projBuf,[k]:e.target.value})}/>
          ))}
          {/* Status */}
          <div>
            <div style={{fontSize:11,fontWeight:600,color:"hsl(var(--muted-foreground))",marginBottom:4}}>حالة المشروع</div>
            <select value={projBuf.status||"active"} onChange={e=>setProjBuf({...projBuf,status:e.target.value})}
              style={{width:"100%",border:"1px solid hsl(var(--border))",borderRadius:8,padding:"8px 12px",fontSize:13,outline:"none",background:"hsl(var(--background))",color:"hsl(var(--foreground))",cursor:"pointer"}}>
              <option value="active">🟢 نشط</option>
              <option value="hold">🟡 متوقف مؤقتاً</option>
              <option value="completed">✅ مكتمل</option>
              <option value="cancelled">⛔ ملغي</option>
            </select>
          </div>
          <div style={{gridColumn:"1/-1",background:darkMode?"hsl(var(--muted))":"hsl(var(--muted)/.5)",border:"1px solid hsl(var(--border))",borderRadius:10,padding:12}}>
            <div style={{fontSize:11,fontWeight:700,color:"hsl(var(--foreground))",marginBottom:8}}>📅 التواريخ والمدة — اضغط 🔒 على الحقل الذي تريد حسابه تلقائياً من الحقلين الآخرين</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
              {[{l:"تاريخ البداية",k:"startDate",ph:"yyyy-MM-dd"},{l:"تاريخ النهاية",k:"endDate",ph:"yyyy-MM-dd"},{l:"المدة (شهر)",k:"duration",ph:"24",t:"number"}].map(({l,k,ph,t="text"})=>{
                const locked=(projBuf.lockedField||"endDate")===k;
                return(
                  <div key={k}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:3,gap:4}}>
                      <span style={{fontSize:10,fontWeight:600,color:"hsl(var(--muted-foreground))"}}>{l}</span>
                      <button type="button" onClick={()=>setProjBuf(b=>recomputeProjectDates({...b,lockedField:k}))} title="اقفل ليُحسب تلقائياً"
                        style={{background:locked?"hsl(var(--primary))":"transparent",color:locked?"hsl(var(--primary-foreground))":"hsl(var(--muted-foreground))",border:`1px solid ${locked?"hsl(var(--primary))":"hsl(var(--border))"}`,borderRadius:6,padding:"1px 6px",fontSize:9,cursor:"pointer",fontWeight:700}}>{locked?"🔒 محسوب":"🔓"}</button>
                    </div>
                    <input value={projBuf[k]||""} placeholder={ph} type={t} disabled={locked}
                      onChange={e=>setProjBuf(b=>recomputeProjectDates({...b,[k]:e.target.value}))}
                      style={{width:"100%",border:"1px solid hsl(var(--border))",borderRadius:7,padding:"7px 10px",fontSize:12,outline:"none",background:locked?"hsl(var(--muted))":"hsl(var(--background))",color:"hsl(var(--foreground))",boxSizing:"border-box",opacity:locked?.7:1}}/>
                  </div>
                );
              })}
            </div>
          </div>
          {/* Financial row */}
          <div>
            <div style={{fontSize:11,fontWeight:600,color:"hsl(var(--muted-foreground))",marginBottom:4}}>قيمة العقد</div>
            <input type="number" value={projBuf.contractValue||""} onChange={e=>setProjBuf({...projBuf,contractValue:e.target.value})} placeholder="0"
              style={{width:"100%",border:"1px solid hsl(var(--border))",borderRadius:8,padding:"8px 12px",fontSize:13,outline:"none",background:"hsl(var(--background))",color:"hsl(var(--foreground))"}}/>
          </div>
          <div>
            <div style={{fontSize:11,fontWeight:600,color:"hsl(var(--muted-foreground))",marginBottom:4}}>ضريبة القيمة المضافة (%)</div>
            <input type="number" value={projBuf.vat??15} onChange={e=>setProjBuf({...projBuf,vat:e.target.value})} placeholder="15"
              style={{width:"100%",border:"1px solid hsl(var(--border))",borderRadius:8,padding:"8px 12px",fontSize:13,outline:"none",background:"hsl(var(--background))",color:"hsl(var(--foreground))"}}/>
          </div>
          <div>
            <div style={{fontSize:11,fontWeight:600,color:"hsl(var(--muted-foreground))",marginBottom:4}}>العملة</div>
            <select value={projBuf.currency} onChange={e=>setProjBuf({...projBuf,currency:e.target.value})}
              style={{width:"100%",border:"1px solid hsl(var(--border))",borderRadius:8,padding:"8px 12px",fontSize:13,outline:"none",background:"hsl(var(--background))",color:"hsl(var(--foreground))",cursor:"pointer"}}>
              {["SAR","USD","EUR","GBP","AED","EGP","KWD"].map(c=><option key={c}>{c}</option>)}
            </select>
          </div>
          {/* Notes */}
          <div style={{gridColumn:"1/-1"}}>
            <div style={{fontSize:11,fontWeight:600,color:"hsl(var(--muted-foreground))",marginBottom:4}}>ملاحظات / وصف</div>
            <textarea value={projBuf.notes||""} onChange={e=>setProjBuf({...projBuf,notes:e.target.value})} rows={2} placeholder="ملاحظات حول نطاق المشروع، الأطراف، البنود الخاصة..."
              style={{width:"100%",border:"1px solid hsl(var(--border))",borderRadius:8,padding:"8px 12px",fontSize:12,outline:"none",background:"hsl(var(--background))",color:"hsl(var(--foreground))",resize:"vertical",fontFamily:"inherit"}}/>
          </div>
        </div>
        <div style={{display:"flex",gap:10,marginTop:18}}>
          <button onClick={()=>{setProject(projBuf);setProjModal(false);toast.success("تم حفظ إعدادات المشروع");}}
            style={{flex:1,background:"hsl(var(--primary))",color:"hsl(var(--primary-foreground))",border:"none",borderRadius:9,padding:11,fontWeight:700,cursor:"pointer",fontSize:14}}>✓ حفظ</button>
          <button onClick={()=>setProjModal(false)}
            style={{flex:1,background:"hsl(var(--muted))",color:"hsl(var(--foreground))",border:"1px solid hsl(var(--border))",borderRadius:9,padding:11,fontWeight:600,cursor:"pointer",fontSize:14}}>إلغاء</button>
        </div>
      </Modal>


      <Modal show={importModal} onClose={()=>{setImportModal(false);setImportText("");setImportPreview([]);setImportErr("");setImportSheets([]);}} title="📂 استيراد أنشطة من ملف" width={560}>
        {/* Format tabs */}
        <div style={{display:"flex",gap:6,marginBottom:14}}>
          {[["csv","📄 CSV","#6366f1"],["excel","📊 Excel","#10b981"],["pdf","📑 PDF","#f59e0b"]].map(([v,l,c])=>(
            <button key={v} onClick={()=>{setImportType(v);setImportErr("");setImportPreview([]);setImportText("");setImportSheets([]);}}
              style={{flex:1,background:importType===v?c+"20":"#f8f9fc",color:importType===v?c:"#666",border:`2px solid ${importType===v?c:"#e5e7eb"}`,borderRadius:8,padding:"8px",cursor:"pointer",fontWeight:importType===v?700:400,fontSize:12}}>
              {l}
            </button>
          ))}
        </div>

        {/* Instructions */}
        <div style={{background:"#f8f9fc",borderRadius:8,padding:"10px 14px",marginBottom:12,fontSize:11,border:"1px solid #f0f0f0"}}>
          {importType==="csv"&&<><b style={{color:"#6366f1"}}>تنسيق CSV:</b><br/>
            <code style={{fontSize:10,color:"#333",display:"block",marginTop:4,direction:"ltr",background:"#eef2ff",padding:"4px 8px",borderRadius:5}}>id,nameAr,disc,items,bac,ac,pct{"\n"}CIV-009,أعمال جديدة,CIVIL,10,8000000,2000000,25</code>
            <div style={{marginTop:5,color:"#888"}}>الأعمدة المطلوبة: id · nameAr · disc · bac · ac · pct — الفاصل: فاصلة أو Tab</div>
          </>}
          {importType==="excel"&&<>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:8}}>
              <div>
                <b style={{color:"#10b981"}}>Excel (.xlsx/.xls):</b>
                <div style={{marginTop:4,color:"#555",lineHeight:1.7}}>
                  • أسماء أعمدة مقبولة: <span style={{fontFamily:"monospace",fontSize:10,color:"#10b981"}}>id, nameAr, disc, bac, ac, pct</span><br/>
                  • أو: الكود، النشاط، التخصص، الميزانية، التكلفة، الإنجاز%<br/>
                  • الأرقام تُقبل بالفواصل مثل: 5,000,000<br/>
                  • التخصص: CIVIL / GENERAL / MECHANICAL / ELECTRICAL / ARCHITECTURAL
                </div>
              </div>
              <button onClick={()=>{
                const wb=XLSX.utils.book_new();
                const ws=XLSX.utils.aoa_to_sheet([
                  ["id","nameAr","disc","items","bac","ac","pct"],
                  ["CIV-001","أعمال الحفر والردم","CIVIL",15,12200000,4000000,32],
                  ["GEN-001","أعمال عامة","GENERAL",64,58900000,26400000,44],
                  ["ELE-001","أعمال الكهرباء","ELECTRICAL",8,958500,218900,23],
                  ["MEC-001","أعمال السباكة","MECHANICAL",4,17000,2600,15],
                  ["ARC-001","أعمال التشطيبات","ARCHITECTURAL",18,25000000,3000000,12],
                ]);
                ws["!cols"]=[{wch:12},{wch:28},{wch:16},{wch:8},{wch:14},{wch:14},{wch:8}];
                XLSX.utils.book_append_sheet(wb,ws,"أنشطة المشروع");
                XLSX.writeFile(wb,"BOQ_Template.xlsx");
              }} style={{background:"#10b981",color:"#fff",border:"none",borderRadius:7,padding:"7px 12px",cursor:"pointer",fontSize:11,fontWeight:700,whiteSpace:"nowrap",flexShrink:0}}>
                📥 تحميل قالب
              </button>
            </div>
          </>}
          {importType==="pdf"&&<><b style={{color:"#f59e0b"}}>⚠️ PDF:</b><div style={{marginTop:4,color:"#555",lineHeight:1.7}}>
            يعمل فقط مع PDF يحتوي على نص قابل للنسخ (ليس صورة).<br/>
            إذا فشل: حوّل PDF → Excel أولاً عبر <span style={{color:"#0ea5e9"}}>smallpdf.com</span> ثم استخدم تبويب Excel.</div></>}
        </div>

        {/* Drag & Drop Upload Area */}
        <div
          onDragOver={e=>{e.preventDefault();e.currentTarget.style.background="#eef2ff";e.currentTarget.style.borderColor="#6366f1";}}
          onDragLeave={e=>{e.currentTarget.style.background="#fafafa";e.currentTarget.style.borderColor="#e5e7eb";}}
          onDrop={e=>{e.preventDefault();e.currentTarget.style.background="#fafafa";e.currentTarget.style.borderColor="#e5e7eb";const f=e.dataTransfer.files[0];if(f)handleFileUpload({target:{files:[f],value:""}});}}
          onClick={()=>fileRef.current?.click()}
          style={{border:"2px dashed #e5e7eb",borderRadius:10,padding:"22px 16px",textAlign:"center",marginBottom:12,cursor:"pointer",background:"#fafafa",transition:"all .2s"}}>
          <input ref={fileRef} type="file" accept=".csv,.txt,.xlsx,.xls,.pdf,.xer" onChange={handleFileUpload} style={{display:"none"}}/>
          <div style={{fontSize:30,marginBottom:6}}>{importType==="csv"?"📄":importType==="excel"?"📊":"📑"}</div>
          <div style={{fontSize:12,fontWeight:700,color:"#555"}}>اسحب الملف هنا أو اضغط للاختيار</div>
          <div style={{fontSize:10,color:"#bbb",marginTop:3}}>CSV · XLSX · XLS · PDF · XER (Primavera P6)</div>
        </div>

        {/* Excel sheet selector */}
        {importSheets.length>1&&(
          <div style={{marginBottom:10}}>
            <div style={{fontSize:11,fontWeight:600,color:"#555",marginBottom:5}}>اختر الشيت:</div>
            <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
              {importSheets.map((s,i)=>(
                <button key={s} onClick={()=>{setImportSheet(i);if(lastExcelFile.current)parseExcelFile(lastExcelFile.current,i);}}
                  style={{background:importSheet===i?"#10b981":"#f0f0f5",color:importSheet===i?"#fff":"#555",border:"none",borderRadius:6,padding:"4px 12px",cursor:"pointer",fontSize:10,fontWeight:importSheet===i?700:400}}>{s}</button>
              ))}
            </div>
          </div>
        )}

        {/* CSV paste area */}
        {importType==="csv"&&(
          <div style={{marginBottom:10}}>
            <div style={{fontSize:11,color:"#888",marginBottom:4}}>أو الصق البيانات مباشرة:</div>
            <textarea value={importText} onChange={e=>{setImportText(e.target.value);parseCSVText(e.target.value);}} rows={4}
              style={{width:"100%",border:"1px solid #e5e7eb",borderRadius:8,padding:"8px 12px",fontSize:10,fontFamily:"monospace",boxSizing:"border-box",outline:"none",resize:"vertical",direction:"ltr"}}
              placeholder={"id,nameAr,disc,items,bac,ac,pct\nCIV-009,أعمال جديدة,CIVIL,10,8000000,2000000,25"}/>
          </div>
        )}

        {/* Error / Success message */}
        {importErr&&(
          <div style={{
            background:importErr.startsWith("✅")?"#f0fdf4":"#fff5f5",
            border:`1px solid ${importErr.startsWith("✅")?"#86efac":"#fecaca"}`,
            borderRadius:8,padding:"10px 14px",fontSize:11,
            color:importErr.startsWith("✅")?"#166534":"#dc2626",
            marginBottom:10,whiteSpace:"pre-line"
          }}>
            {importErr}
          </div>
        )}

        {/* Preview table */}
        {importPreview.length>0&&(
          <div style={{marginBottom:10}}>
            <div style={{fontSize:11,fontWeight:700,color:"#10b981",marginBottom:5}}>
              ✅ {importPreview.length} نشاط — {importPreview.filter(r=>!acts.map(a=>a.id).includes(r.id)).length} جديد · {importPreview.filter(r=>acts.map(a=>a.id).includes(r.id)).length} تحديث
            </div>
            <div style={{overflowX:"auto",maxHeight:150,border:"1px solid #f0f0f0",borderRadius:8}}>
              <table style={{width:"100%",borderCollapse:"collapse",fontSize:10}}>
                <thead><tr style={{background:"#f8f9fc",position:"sticky",top:0}}>{["الكود","الاسم","التخصص","BAC","AC","إنجاز%","حالة"].map(h=><th key={h} style={{padding:"5px 8px",textAlign:"center",fontWeight:700,color:"#555",borderBottom:"1px solid #eee"}}>{h}</th>)}</tr></thead>
                <tbody>
                  {importPreview.slice(0,8).map((r,i)=>{
                    const isNew=!acts.map(a=>a.id).includes(r.id);
                    return<tr key={i} style={{borderBottom:"1px solid #f5f5f5",background:isNew?"#f0fff4":"#fff"}}>
                      <td style={{padding:"4px 8px",fontFamily:"monospace",fontWeight:700,color:"#6366f1"}}>{r.id}</td>
                      <td style={{padding:"4px 8px",direction:"rtl",maxWidth:120,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{r.nameAr}</td>
                      <td style={{padding:"4px 8px",textAlign:"center"}}><span style={{background:DC[r.disc]+"20",color:DC[r.disc]||"#888",borderRadius:4,padding:"1px 5px",fontSize:9}}>{r.disc}</span></td>
                      <td style={{padding:"4px 8px",textAlign:"right",fontFamily:"monospace",color:"#6366f1"}}>{fmt(r.bac)}</td>
                      <td style={{padding:"4px 8px",textAlign:"right",fontFamily:"monospace"}}>{fmt(r.ac)}</td>
                      <td style={{padding:"4px 8px",textAlign:"center",fontWeight:700,color:r.pct>0?"#10b981":"#888"}}>{r.pct}%</td>
                      <td style={{padding:"4px 8px",textAlign:"center",fontSize:9,fontWeight:700,color:isNew?"#10b981":"#f59e0b"}}>{isNew?"🆕 جديد":"🔄 تحديث"}</td>
                    </tr>;
                  })}
                  {importPreview.length>8&&<tr><td colSpan={7} style={{padding:"4px 8px",textAlign:"center",color:"#aaa",fontSize:10}}>+ {importPreview.length-8} أنشطة أخرى...</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div style={{display:"flex",gap:10}}>
          <button onClick={confirmImport} disabled={!importPreview.length||!!importErr}
            style={{flex:1,background:importPreview.length&&!importErr?"#6366f1":"#ccc",color:"#fff",border:"none",borderRadius:9,padding:11,fontWeight:700,cursor:importPreview.length&&!importErr?"pointer":"not-allowed",fontSize:14}}>
            ✓ استيراد {importPreview.length} نشاط
          </button>
          <button onClick={()=>{setImportModal(false);setImportText("");setImportPreview([]);setImportErr("");setImportSheets([]);}}
            style={{flex:1,background:"#f4f5fb",color:"#555",border:"none",borderRadius:9,padding:11,fontWeight:600,cursor:"pointer",fontSize:14}}>إلغاء</button>
        </div>
      </Modal>

      <Modal show={scenariosModal} onClose={()=>setScenariosModal(false)} title="📚 سيناريوهات EVM المحفوظة" width={640}>
        <div style={{display:"flex",flexDirection:"column",gap:8,maxHeight:480,overflowY:"auto"}}>
          {dbScenarios.length===0 && <div style={{textAlign:"center",padding:30,color:"#888",fontSize:12}}>لا توجد سيناريوهات محفوظة بعد. استخدم زر «☁️ حفظ» لحفظ السيناريو الحالي.</div>}
          {dbScenarios.map(s=>(
            <div key={s.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 12px",border:"1px solid #e5e7eb",borderRadius:8,background:"#fafafa"}}>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontWeight:700,fontSize:12,marginBottom:2}}>{s.name}</div>
                <div style={{fontSize:10,color:"#888"}}>{new Date(s.created_at).toLocaleString("ar-EG")} • {s.snapshot?.acts?.length||0} نشاط</div>
              </div>
              <div style={{display:"flex",gap:6}}>
                <button onClick={()=>loadScenarioFromDb(s)} style={{background:"#10b981",color:"#fff",border:"none",borderRadius:6,padding:"5px 10px",fontWeight:700,cursor:"pointer",fontSize:11}}>تحميل</button>
                <button onClick={()=>deleteScenarioFromDb(s.id)} style={{background:"#ef4444",color:"#fff",border:"none",borderRadius:6,padding:"5px 10px",fontWeight:700,cursor:"pointer",fontSize:11}}>حذف</button>
              </div>
            </div>
          ))}
        </div>
      </Modal>

      <Modal show={pickerModal} onClose={()=>setPickerModal(false)} title="📂 اختيار مشروع من حسابك" width={620}>
        <div style={{display:"flex",gap:8,marginBottom:12}}>
          <input value={pickerSearch} onChange={e=>setPickerSearch(e.target.value)} placeholder="🔍 ابحث باسم المشروع..." style={{flex:1,border:"1px solid #e5e7eb",borderRadius:8,padding:"8px 12px",fontSize:13,outline:"none"}}/>
          <button onClick={fetchProjects} style={{background:"#f4f5fb",border:"1px solid #e5e7eb",borderRadius:8,padding:"8px 14px",cursor:"pointer",fontSize:12,fontWeight:600}}>🔄 تحديث</button>
        </div>
        {projectsErr&&<div style={{background:"#fee2e2",color:"#dc2626",padding:"8px 12px",borderRadius:8,fontSize:12,marginBottom:10}}>{projectsErr}</div>}
        {projectsLoading?(
          <div style={{textAlign:"center",padding:30,color:"#888",fontSize:13}}>⏳ جاري تحميل المشاريع...</div>
        ):(
          <div style={{maxHeight:380,overflowY:"auto",border:"1px solid #f0f0f0",borderRadius:10}}>
            {projectsList.filter(p=>!pickerSearch||(p.name||"").toLowerCase().includes(pickerSearch.toLowerCase())).map(p=>(
              <div key={p.id} onClick={()=>!loadingItems&&loadProjectFromDb(p)} style={{padding:"12px 14px",borderBottom:"1px solid #f5f5f5",cursor:loadingItems?"wait":"pointer",display:"flex",justifyContent:"space-between",alignItems:"center",background:linkedProjectId===p.id?"#eef2ff":"transparent"}}
                onMouseEnter={e=>{if(linkedProjectId!==p.id)e.currentTarget.style.background="#fafbff";}}
                onMouseLeave={e=>{if(linkedProjectId!==p.id)e.currentTarget.style.background="transparent";}}>
                <div style={{minWidth:0,flex:1}}>
                  <div style={{fontSize:13,fontWeight:700,color:"#1a1a2e",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.name}</div>
                  <div style={{fontSize:10,color:"#888",marginTop:2}}>{p.file_name||"—"} · آخر تحديث: {new Date(p.updated_at||p.created_at).toLocaleDateString("ar-SA")}</div>
                </div>
                <div style={{display:"flex",alignItems:"center",gap:8,flexShrink:0}}>
                  {linkedProjectId===p.id&&<span style={{background:"#10b981",color:"#fff",borderRadius:999,padding:"2px 8px",fontSize:9,fontWeight:700}}>✓ نشط</span>}
                  <span style={{color:"#6366f1",fontSize:18}}>›</span>
                </div>
              </div>
            ))}
            {!projectsList.length&&!projectsLoading&&(
              <div style={{textAlign:"center",padding:30,color:"#aaa",fontSize:12}}>لا توجد مشاريع محفوظة في حسابك</div>
            )}
          </div>
        )}
        {loadingItems&&<div style={{marginTop:10,padding:"8px 12px",background:"#eef2ff",borderRadius:8,fontSize:12,color:"#6366f1",fontWeight:600,textAlign:"center"}}>⏳ جاري تحميل بنود المشروع وتحويلها إلى أنشطة...</div>}
        <div style={{marginTop:12,padding:"8px 12px",background:"#fffbeb",borderRadius:8,fontSize:11,color:"#92400e",lineHeight:1.6}}>
          💡 سيتم تجميع بنود المشروع حسب الفئة وتحويلها إلى أنشطة EVM. يمكنك بعدها تعديل التكلفة الفعلية ونسبة الإنجاز يدوياً لكل نشاط.
        </div>
      </Modal>
    </div>
    </DarkCtx.Provider>
  );
}
