import { useState, useEffect, useRef, useCallback } from "react";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, RadarChart, Radar, PolarGrid, PolarAngleAxis } from "recharts";
import { createClient } from "@supabase/supabase-js";

// ── SUPABASE CONFIG ───────────────────────────────────────────────────────────
const SUPABASE_URL = "https://durbgghxbbhqtxncpdcq.supabase.co";
const SUPABASE_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR1cmJnZ2h4YmJocXR4bmNwZGNxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA2NjcyNjYsImV4cCI6MjA5NjI0MzI2Nn0.GK4Xpx1G31_e4m6BW8m9NojWo00O7SRbXfIIvx3vwvA";
const sb = createClient(SUPABASE_URL, SUPABASE_ANON);

// ── CODES ACTIVATION ──────────────────────────────────────────────────────────
const CODES = ["MONECOLE-2026","ECOLE-ALPHA","ECOLE-BETA","ECOLE-DEMO","GNF-TEST"];

// ── CONSTANTES ────────────────────────────────────────────────────────────────
const DEVISES = { GNF:{symbole:"GNF",nom:"Franc Guinéen"}, XOF:{symbole:"FCFA",nom:"Franc CFA"} };
const ROLE_CLR = {Administrateur:"#f59e0b",Professeur:"#3b82f6","Secrétaire":"#10b981",Directeur:"#8b5cf6",Comptable:"#ec4899"};
const MENTION = v => {
  const n=parseFloat(v);
  if(n>=16) return{t:"Très Bien",c:"#10b981",bg:"#d1fae5"};
  if(n>=14) return{t:"Bien",c:"#3b82f6",bg:"#dbeafe"};
  if(n>=12) return{t:"Assez Bien",c:"#8b5cf6",bg:"#ede9fe"};
  if(n>=10) return{t:"Passable",c:"#f59e0b",bg:"#fef3c7"};
  return{t:"Insuffisant",c:"#ef4444",bg:"#fee2e2"};
};
const fmtMoney = (v,d="GNF") => !v&&v!==0?"—":Number(v).toLocaleString("fr-FR")+" "+(DEVISES[d]?.symbole||d);
const calcMoy = (notes,mats,periode) => {
  let tot=0,cf=0;
  mats.forEach(m=>{ const n=periode?notes?.[periode]?.[m.id]:notes?.[m.id]; if(n!=null&&n!==""){tot+=parseFloat(n)*m.coefficient;cf+=m.coefficient;} });
  return cf>0?(tot/cf).toFixed(2):"—";
};
const periodesList = sys => sys==="semestre"?["Semestre 1","Semestre 2"]:["Trimestre 1","Trimestre 2","Trimestre 3"];
const TODAY = new Date().toISOString().split("T")[0];

// ── PRINT HELPER ──────────────────────────────────────────────────────────────
const printHTML = (html, title="MonEcole") => {
  const w=window.open("","_blank");
  w.document.write(`<html><head><title>${title}</title><style>
    *{box-sizing:border-box} body{font-family:Arial,sans-serif;padding:20px;color:#000;margin:0}
    table{width:100%;border-collapse:collapse} td,th{border:1px solid #ccc;padding:7px 10px;font-size:12px}
    th{background:#f0f0f0;font-weight:700} h1{font-size:18px;margin:0 0 4px} h2{font-size:15px;margin:0 0 10px}
    .header{text-align:center;border-bottom:3px solid #1a56db;padding-bottom:14px;margin-bottom:18px}
    .grid{display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:10px;background:#f8fafc;padding:14px;border-radius:8px;margin-bottom:16px}
    .result{display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;padding:16px;border-radius:8px;margin-top:14px}
    .stat{text-align:center} .stat-val{font-size:26px;font-weight:900} .stat-lbl{font-size:10px;color:#666;text-transform:uppercase}
    .page-break{page-break-after:always} @media print{.noprint{display:none}}
  </style></head><body>${html}</body></html>`);
  w.document.close(); w.print();
};

// ── UI ATOMS ──────────────────────────────────────────────────────────────────
const iSt = (x={}) => ({width:"100%",padding:"10px 13px",borderRadius:9,border:"1.5px solid #e2e8f0",fontSize:13,outline:"none",fontFamily:"'Plus Jakarta Sans',sans-serif",boxSizing:"border-box",background:"#fff",color:"#1e293b",...x});
const Lbl = ({t,children,mb=14}) => <div style={{marginBottom:mb}}>{t&&<label style={{display:"block",fontSize:11,fontWeight:700,color:"#64748b",marginBottom:5,textTransform:"uppercase",letterSpacing:0.5}}>{t}</label>}{children}</div>;
const Inp = ({label,...p}) => <Lbl t={label}><input style={iSt()} {...p}/></Lbl>;
const Slt = ({label,opts,...p}) => <Lbl t={label}><select style={iSt()} {...p}>{opts.map(o=><option key={o.v??o} value={o.v??o}>{o.l??o}</option>)}</select></Lbl>;
const Btn = ({ch,v="primary",onClick,disabled,full,s={}}) => {
  const vs={primary:{background:"#1a56db",color:"#fff",border:"none"},success:{background:"#059669",color:"#fff",border:"none"},danger:{background:"#fee2e2",color:"#dc2626",border:"1px solid #fecaca"},ghost:{background:"#f1f5f9",color:"#475569",border:"1px solid #e2e8f0"},warn:{background:"#fef3c7",color:"#d97706",border:"1px solid #fde68a"}};
  return <button disabled={disabled} onClick={onClick} style={{padding:"9px 18px",borderRadius:9,cursor:disabled?"not-allowed":"pointer",fontSize:12,fontWeight:700,fontFamily:"'Plus Jakarta Sans',sans-serif",opacity:disabled?0.5:1,width:full?"100%":"auto",transition:"all 0.15s",...vs[v],...s}}>{ch}</button>;
};
const Badge = ({role}) => <span style={{background:(ROLE_CLR[role]||"#6b7280")+"20",color:ROLE_CLR[role]||"#6b7280",border:`1px solid ${ROLE_CLR[role]||"#6b7280"}35`,padding:"2px 9px",borderRadius:999,fontSize:10,fontWeight:700,textTransform:"uppercase"}}>{role}</span>;
const Card = ({children,s={}}) => <div style={{background:"#fff",borderRadius:14,padding:22,boxShadow:"0 1px 8px rgba(0,0,0,0.06)",border:"1px solid #f1f5f9",...s}}>{children}</div>;
const Modal = ({title,onClose,children,w=520}) => (
  <div style={{position:"fixed",inset:0,background:"rgba(15,23,42,0.55)",zIndex:999,display:"flex",alignItems:"center",justifyContent:"center",backdropFilter:"blur(6px)",padding:16}} onClick={onClose}>
    <div style={{background:"#fff",borderRadius:18,padding:28,width:w,maxWidth:"100%",maxHeight:"90vh",overflowY:"auto",boxShadow:"0 24px 60px rgba(0,0,0,0.22)"}} onClick={e=>e.stopPropagation()}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
        <h3 style={{margin:0,fontSize:16,fontWeight:800,color:"#0f172a"}}>{title}</h3>
        <button onClick={onClose} style={{background:"#f1f5f9",border:"none",borderRadius:8,width:30,height:30,cursor:"pointer",fontSize:14}}>✕</button>
      </div>
      {children}
    </div>
  </div>
);
const SHdr = ({title,sub,action}) => (
  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:22}}>
    <div><h2 style={{margin:0,fontSize:20,fontWeight:800,color:"#0f172a"}}>{title}</h2>{sub&&<p style={{margin:"4px 0 0",color:"#64748b",fontSize:13}}>{sub}</p>}</div>
    {action}
  </div>
);
const StatCard = ({icon,label,value,sub,color,onClick}) => (
  <div onClick={onClick} style={{background:"#fff",borderRadius:14,padding:"18px 20px",boxShadow:"0 1px 8px rgba(0,0,0,0.06)",border:"1px solid #f1f5f9",display:"flex",alignItems:"center",gap:14,flex:1,minWidth:140,cursor:onClick?"pointer":"default"}}>
    <div style={{width:46,height:46,borderRadius:12,background:color+"15",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,flexShrink:0}}>{icon}</div>
    <div><div style={{fontSize:22,fontWeight:800,color:"#0f172a",lineHeight:1}}>{value}</div><div style={{fontSize:12,fontWeight:600,color:"#64748b",marginTop:3}}>{label}</div>{sub&&<div style={{fontSize:11,color,marginTop:2}}>{sub}</div>}</div>
  </div>
);
const Empty = ({icon,text}) => <div style={{textAlign:"center",padding:"60px 20px",color:"#94a3b8"}}><div style={{fontSize:44,marginBottom:12}}>{icon}</div><p style={{margin:0,fontSize:14}}>{text}</p></div>;
const Tbl = ({cols,rows,empty}) => (
  <div style={{background:"#fff",borderRadius:14,overflow:"hidden",boxShadow:"0 1px 8px rgba(0,0,0,0.06)",border:"1px solid #f1f5f9"}}>
    {rows.length===0?empty:(
      <table style={{width:"100%",borderCollapse:"collapse"}}>
        <thead><tr style={{background:"#f8fafc"}}>{cols.map(c=><th key={c} style={{padding:"11px 15px",textAlign:"left",fontSize:10,fontWeight:700,color:"#94a3b8",textTransform:"uppercase",letterSpacing:0.8,whiteSpace:"nowrap"}}>{c}</th>)}</tr></thead>
        <tbody>{rows}</tbody>
      </table>
    )}
  </div>
);
const TR = ({children,onClick}) => <tr onClick={onClick} style={{borderTop:"1px solid #f8fafc",cursor:onClick?"pointer":"default"}} onMouseOver={e=>e.currentTarget.style.background="#f8fafc"} onMouseOut={e=>e.currentTarget.style.background="transparent"}>{children}</tr>;
const TD = ({children,mono,bold,s={}}) => <td style={{padding:"11px 15px",fontSize:13,color:bold?"#0f172a":"#475569",fontWeight:bold?700:400,fontFamily:mono?"monospace":"inherit",...s}}>{children}</td>;

// ── TOAST NOTIFICATION ────────────────────────────────────────────────────────
const Toast = ({msg,type}) => msg?(
  <div style={{position:"fixed",bottom:24,right:24,zIndex:9999,background:type==="error"?"#fee2e2":type==="success"?"#d1fae5":"#dbeafe",color:type==="error"?"#dc2626":type==="success"?"#059669":"#1a56db",border:`1px solid ${type==="error"?"#fecaca":type==="success"?"#a7f3d0":"#bfdbfe"}`,borderRadius:12,padding:"12px 20px",fontSize:13,fontWeight:700,fontFamily:"'Plus Jakarta Sans',sans-serif",boxShadow:"0 4px 20px rgba(0,0,0,0.12)",maxWidth:320}}>
    {type==="success"?"✓ ":type==="error"?"✕ ":"ℹ "}{msg}
  </div>
):null;

// ── SYNC STATUS ───────────────────────────────────────────────────────────────
const SyncBadge = ({status}) => {
  const cfg={online:{c:"#10b981",t:"● Synchronisé"},syncing:{c:"#f59e0b",t:"↻ Sync..."},offline:{c:"#ef4444",t:"✕ Hors ligne"}};
  const s=cfg[status]||cfg.offline;
  return <span style={{fontSize:10,color:s.c,fontWeight:700,background:s.c+"15",padding:"3px 9px",borderRadius:999}}>{s.t}</span>;
};

// ── ACTIVATION ────────────────────────────────────────────────────────────────
function ActivationScreen({onDone}) {
  const [code,setCode]=useState("");const [err,setErr]=useState("");const [loading,setLoading]=useState(false);
  const go=()=>{setLoading(true);setErr("");setTimeout(()=>{CODES.includes(code.trim().toUpperCase())?onDone(code.trim().toUpperCase()):setErr("Code invalide. Contactez MonEcole.");setLoading(false);},900);};
  return(
    <div style={{minHeight:"100vh",background:"linear-gradient(135deg,#0f172a 0%,#1a56db 100%)",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Plus Jakarta Sans',sans-serif",padding:16}}>
      <div style={{width:420,maxWidth:"100%"}}>
        <div style={{textAlign:"center",marginBottom:28}}>
          <div style={{width:70,height:70,borderRadius:22,background:"rgba(255,255,255,0.12)",backdropFilter:"blur(10px)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:34,margin:"0 auto 14px",border:"1px solid rgba(255,255,255,0.18)"}}>🎓</div>
          <h1 style={{color:"#fff",fontSize:30,fontWeight:900,margin:"0 0 5px",letterSpacing:-1}}>MonEcole</h1>
          <p style={{color:"rgba(255,255,255,0.55)",margin:0,fontSize:13}}>Gestion scolaire · Guinée · Synchronisée</p>
        </div>
        <div style={{background:"rgba(255,255,255,0.07)",backdropFilter:"blur(20px)",borderRadius:20,padding:30,border:"1px solid rgba(255,255,255,0.1)"}}>
          <p style={{color:"rgba(255,255,255,0.65)",fontSize:13,margin:"0 0 16px",textAlign:"center"}}>🔑 Code d'activation</p>
          <input value={code} onChange={e=>setCode(e.target.value)} onKeyDown={e=>e.key==="Enter"&&go()} placeholder="EX: MONECOLE-2026"
            style={{width:"100%",padding:"13px 16px",borderRadius:11,border:`2px solid ${err?"#ef4444":"rgba(255,255,255,0.18)"}`,background:"rgba(255,255,255,0.09)",color:"#fff",fontSize:15,fontWeight:800,letterSpacing:3,textAlign:"center",outline:"none",boxSizing:"border-box",fontFamily:"'Plus Jakarta Sans',sans-serif"}}/>
          {err&&<div style={{color:"#fca5a5",fontSize:12,marginTop:7,textAlign:"center"}}>{err}</div>}
          <button onClick={go} disabled={!code||loading} style={{width:"100%",marginTop:14,padding:13,borderRadius:11,border:"none",background:code?"#1a56db":"rgba(255,255,255,0.08)",color:"#fff",fontSize:14,fontWeight:800,cursor:code?"pointer":"not-allowed",fontFamily:"'Plus Jakarta Sans',sans-serif"}}>
            {loading?"Vérification...":"Activer →"}
          </button>
          <p style={{color:"rgba(255,255,255,0.3)",fontSize:11,textAlign:"center",margin:"12px 0 0"}}>Démo : ECOLE-DEMO</p>
        </div>
      </div>
    </div>
  );
}

// ── ONBOARDING ────────────────────────────────────────────────────────────────
function Onboarding({codeActivation,onDone}) {
  const [step,setStep]=useState(1);
  const [ecole,setEcole]=useState({nom:"",devise:"GNF",annee:"",adresse:"",telephone:"",email:"",codeMEN:"",prefixe:"",systeme:"trimestre",devise_txt:"",fraisInscription:"",mensualite:""});
  const [admin,setAdmin]=useState({nom:"",prenom:"",identifiant:"",password:"",confirm:""});
  const [err,setErr]=useState("");const [loading,setLoading]=useState(false);

  const finish=async()=>{
    if(!admin.nom||!admin.identifiant||!admin.password)return setErr("Tous les champs sont requis.");
    if(admin.password!==admin.confirm)return setErr("Mots de passe différents.");
    setLoading(true);
    try {
      // Sauvegarder établissement
      const {data:etabData,error:etabErr}=await sb.from("etablissements").upsert({...ecole,code_activation:codeActivation,created_at:new Date().toISOString()}).select().single();
      if(etabErr)throw etabErr;
      // Sauvegarder admin
      const {error:userErr}=await sb.from("utilisateurs").insert({nom:admin.nom,prenom:admin.prenom,identifiant:admin.identifiant,password:admin.password,role:"Administrateur",etablissement_id:etabData.id});
      if(userErr)throw userErr;
      onDone(etabData,{...admin,role:"Administrateur",etablissement_id:etabData.id});
    } catch(e){setErr("Erreur de connexion : "+e.message);}
    setLoading(false);
  };

  return(
    <div style={{minHeight:"100vh",background:"linear-gradient(135deg,#0f172a,#1a56db)",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Plus Jakarta Sans',sans-serif",padding:16}}>
      <div style={{background:"#fff",borderRadius:22,padding:38,width:560,maxWidth:"100%",boxShadow:"0 32px 80px rgba(0,0,0,0.3)"}}>
        <div style={{display:"flex",gap:8,marginBottom:28}}>
          {[{n:1,l:"École"},{n:2,l:"Admin"}].map((s,i,arr)=>(
            <div key={s.n} style={{display:"flex",alignItems:"center",flex:i<arr.length-1?1:"none",gap:7}}>
              <div style={{width:26,height:26,borderRadius:"50%",background:step>=s.n?"#1a56db":"#e2e8f0",color:step>=s.n?"#fff":"#94a3b8",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:800,flexShrink:0}}>{s.n}</div>
              <span style={{fontSize:12,fontWeight:600,color:step>=s.n?"#1a56db":"#94a3b8"}}>{s.l}</span>
              {i<arr.length-1&&<div style={{flex:1,height:2,background:step>s.n?"#1a56db":"#e2e8f0",borderRadius:2}}/>}
            </div>
          ))}
        </div>
        {step===1?(
          <>
            <div style={{marginBottom:20}}><h2 style={{margin:"0 0 3px",fontSize:19,fontWeight:900,color:"#0f172a"}}>Votre établissement 🏫</h2><p style={{margin:0,color:"#64748b",fontSize:13}}>Ces infos apparaîtront sur les bulletins et reçus.</p></div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0 16px"}}>
              <div style={{gridColumn:"1/-1"}}><Inp label="Nom de l'établissement *" value={ecole.nom} onChange={e=>setEcole(f=>({...f,nom:e.target.value}))} placeholder="Collège Moderne de..."/></div>
              <Inp label="Devise / Slogan" value={ecole.devise_txt} onChange={e=>setEcole(f=>({...f,devise_txt:e.target.value}))} placeholder="L'excellence avant tout"/>
              <Inp label="Année scolaire *" value={ecole.annee} onChange={e=>setEcole(f=>({...f,annee:e.target.value}))} placeholder="2026-2027"/>
              <Slt label="Devise monétaire" value={ecole.devise} onChange={e=>setEcole(f=>({...f,devise:e.target.value}))} opts={[{v:"GNF",l:"GNF — Franc Guinéen"},{v:"XOF",l:"FCFA — Franc CFA"}]}/>
              <Slt label="Système de notation" value={ecole.systeme} onChange={e=>setEcole(f=>({...f,systeme:e.target.value}))} opts={[{v:"trimestre",l:"Trimestriel (3 périodes)"},{v:"semestre",l:"Semestriel (2 périodes)"}]}/>
              <Inp label="Adresse" value={ecole.adresse} onChange={e=>setEcole(f=>({...f,adresse:e.target.value}))} placeholder="Commune, Ville"/>
              <Inp label="Téléphone" value={ecole.telephone} onChange={e=>setEcole(f=>({...f,telephone:e.target.value}))} placeholder="+224 XXX XXX XXX"/>
              <div style={{gridColumn:"1/-1"}}><Inp label="Email" value={ecole.email} onChange={e=>setEcole(f=>({...f,email:e.target.value}))} placeholder="direction@ecole.gn"/></div>
              <Inp label="Code MEN" value={ecole.codeMEN} onChange={e=>setEcole(f=>({...f,codeMEN:e.target.value}))} placeholder="GN 12 345 678"/>
              <Inp label="Préfixe matricule" value={ecole.prefixe} onChange={e=>setEcole(f=>({...f,prefixe:e.target.value}))} placeholder="CMC"/>
              <Inp label="Frais inscription (défaut)" type="number" value={ecole.fraisInscription} onChange={e=>setEcole(f=>({...f,fraisInscription:e.target.value}))} placeholder="500000"/>
              <Inp label="Mensualité (défaut)" type="number" value={ecole.mensualite} onChange={e=>setEcole(f=>({...f,mensualite:e.target.value}))} placeholder="150000"/>
            </div>
          </>
        ):(
          <>
            <div style={{marginBottom:20}}><h2 style={{margin:"0 0 3px",fontSize:19,fontWeight:900,color:"#0f172a"}}>Compte administrateur 🔐</h2><p style={{margin:0,color:"#64748b",fontSize:13}}>Accès complet à toutes les fonctionnalités.</p></div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0 16px"}}>
              <Inp label="Nom *" value={admin.nom} onChange={e=>setAdmin(f=>({...f,nom:e.target.value}))}/>
              <Inp label="Prénom" value={admin.prenom} onChange={e=>setAdmin(f=>({...f,prenom:e.target.value}))}/>
              <div style={{gridColumn:"1/-1"}}><Inp label="Identifiant *" value={admin.identifiant} onChange={e=>setAdmin(f=>({...f,identifiant:e.target.value}))} placeholder="admin.directeur"/></div>
              <Lbl t="Mot de passe *"><input type="password" value={admin.password} onChange={e=>setAdmin(f=>({...f,password:e.target.value}))} style={iSt()}/></Lbl>
              <Lbl t="Confirmer *"><input type="password" value={admin.confirm} onChange={e=>setAdmin(f=>({...f,confirm:e.target.value}))} style={iSt()}/></Lbl>
            </div>
          </>
        )}
        {err&&<div style={{background:"#fef2f2",border:"1px solid #fecaca",borderRadius:9,padding:"9px 13px",color:"#dc2626",fontSize:12,margin:"10px 0"}}>{err}</div>}
        <div style={{display:"flex",justifyContent:"space-between",marginTop:10}}>
          {step===2?<Btn ch="← Retour" v="ghost" onClick={()=>setStep(1)}/>:<div/>}
          {step===1?<Btn ch="Suivant →" v="primary" onClick={()=>{if(!ecole.nom||!ecole.annee)return setErr("Nom et année obligatoires.");setErr("");setStep(2);}} s={{padding:"11px 26px"}}/>
          :<Btn ch={loading?"Création...":"Terminer ✓"} v="primary" onClick={finish} disabled={loading} s={{padding:"11px 26px"}}/>}
        </div>
      </div>
    </div>
  );
}

// ── LOGIN ─────────────────────────────────────────────────────────────────────
function Login({onLogin}) {
  const [id,setId]=useState("");const [pw,setPw]=useState("");const [err,setErr]=useState("");const [loading,setLoading]=useState(false);
  const go=async()=>{
    setLoading(true);setErr("");
    try {
      const {data,error}=await sb.from("utilisateurs").select("*,etablissements(*)").eq("identifiant",id.trim()).eq("password",pw).single();
      if(error||!data)throw new Error("Identifiant ou mot de passe incorrect.");
      onLogin(data,data.etablissements);
    } catch(e){setErr(e.message);}
    setLoading(false);
  };
  return(
    <div style={{minHeight:"100vh",background:"linear-gradient(135deg,#0f172a,#1a56db)",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Plus Jakarta Sans',sans-serif",padding:16}}>
      <div style={{background:"#fff",borderRadius:22,padding:38,width:400,maxWidth:"100%",boxShadow:"0 32px 80px rgba(0,0,0,0.3)"}}>
        <div style={{textAlign:"center",marginBottom:26}}>
          <div style={{width:56,height:56,borderRadius:15,background:"#eff6ff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:26,margin:"0 auto 12px"}}>🎓</div>
          <h2 style={{margin:"0 0 3px",fontSize:19,fontWeight:900,color:"#0f172a"}}>MonEcole</h2>
          <p style={{margin:0,color:"#94a3b8",fontSize:12}}>Connectez-vous pour continuer</p>
        </div>
        <Inp label="Identifiant" value={id} onChange={e=>setId(e.target.value)} placeholder="votre.identifiant"/>
        <Lbl t="Mot de passe"><input type="password" value={pw} onChange={e=>setPw(e.target.value)} onKeyDown={e=>e.key==="Enter"&&go()} style={iSt()} placeholder="••••••••"/></Lbl>
        {err&&<div style={{background:"#fef2f2",borderRadius:9,padding:"9px 13px",color:"#dc2626",fontSize:12,marginBottom:12}}>{err}</div>}
        <Btn ch={loading?"Connexion...":"Se connecter →"} v="primary" onClick={go} disabled={!id||!pw||loading} full/>
      </div>
    </div>
  );
}

// ── HOOK SUPABASE DATA ────────────────────────────────────────────────────────
function useSupabaseData(etablissementId) {
  const [data,setData]=useState({classes:[],matieres:[],eleves:[],utilisateurs:[],paiements:[],presences:[],messages:[],compositions:[]});
  const [syncStatus,setSyncStatus]=useState("online");
  const [toast,setToast]=useState(null);

  const showToast=(msg,type="success")=>{setToast({msg,type});setTimeout(()=>setToast(null),3000);};

  const load=useCallback(async()=>{
    if(!etablissementId)return;
    setSyncStatus("syncing");
    try {
      const [cls,mats,elvs,usrs,pays,pres,msgs,comps]=await Promise.all([
        sb.from("classes").select("*").eq("etablissement_id",etablissementId).order("nom"),
        sb.from("matieres").select("*").eq("etablissement_id",etablissementId).order("nom"),
        sb.from("eleves").select("*").eq("etablissement_id",etablissementId).order("nom"),
        sb.from("utilisateurs").select("*").eq("etablissement_id",etablissementId).order("nom"),
        sb.from("paiements").select("*").eq("etablissement_id",etablissementId).order("created_at",{ascending:false}),
        sb.from("presences").select("*").eq("etablissement_id",etablissementId),
        sb.from("messages").select("*").eq("etablissement_id",etablissementId).order("created_at"),
        sb.from("compositions").select("*").eq("etablissement_id",etablissementId).order("created_at",{ascending:false}),
      ]);
      setData({
        classes:cls.data||[],matieres:mats.data||[],eleves:elvs.data||[],
        utilisateurs:usrs.data||[],paiements:pays.data||[],presences:pres.data||[],
        messages:msgs.data||[],compositions:comps.data||[]
      });
      setSyncStatus("online");
    } catch(e){setSyncStatus("offline");showToast("Erreur de synchronisation","error");}
  },[etablissementId]);

  useEffect(()=>{load();},[load]);

  // Realtime subscriptions
  useEffect(()=>{
    if(!etablissementId)return;
    const tables=["classes","matieres","eleves","paiements","presences","messages","compositions"];
    const channels=tables.map(t=>sb.channel(`${t}_${etablissementId}`).on("postgres_changes",{event:"*",schema:"public",table:t,filter:`etablissement_id=eq.${etablissementId}`},()=>{setSyncStatus("syncing");load();}).subscribe());
    return()=>channels.forEach(c=>sb.removeChannel(c));
  },[etablissementId,load]);

  // CRUD operations
  const ops = {
    addClass: async(form)=>{const{error}=await sb.from("classes").insert({...form,etablissement_id:etablissementId});if(!error){load();showToast("Classe créée");}else showToast(error.message,"error");},
    updateClass: async(id,form)=>{const{error}=await sb.from("classes").update(form).eq("id",id);if(!error){load();showToast("Classe modifiée");}else showToast(error.message,"error");},
    deleteClass: async(id)=>{await sb.from("classes").delete().eq("id",id);load();showToast("Classe supprimée");},

    addMat: async(form)=>{const{error}=await sb.from("matieres").insert({...form,etablissement_id:etablissementId});if(!error){load();showToast("Matière créée");}else showToast(error.message,"error");},
    updateMat: async(id,form)=>{const{error}=await sb.from("matieres").update(form).eq("id",id);if(!error){load();showToast("Matière modifiée");}else showToast(error.message,"error");},
    deleteMat: async(id)=>{await sb.from("matieres").delete().eq("id",id);load();showToast("Matière supprimée");},

    addEleve: async(form)=>{const count=data.eleves.length;const mat=`${form.prefixe||"EL"}-${String(count+1).padStart(4,"0")}`;const{error}=await sb.from("eleves").insert({...form,matricule:mat,etablissement_id:etablissementId,inscription_date:TODAY,notes:{}});if(!error){load();showToast("Élève inscrit");}else showToast(error.message,"error");},
    updateEleve: async(id,form)=>{const{error}=await sb.from("eleves").update(form).eq("id",id);if(!error){load();showToast("Élève modifié");}else showToast(error.message,"error");},
    deleteEleve: async(id)=>{await sb.from("eleves").delete().eq("id",id);load();showToast("Élève supprimé");},

    saveNotes: async(eleveId,periode,matiereId,note)=>{
      const eleve=data.eleves.find(e=>e.id===eleveId);
      if(!eleve)return;
      const notes={...(eleve.notes||{}),[periode]:{...(eleve.notes?.[periode]||{}),[matiereId]:parseFloat(note)||0}};
      const{error}=await sb.from("eleves").update({notes}).eq("id",eleveId);
      if(error)showToast(error.message,"error");
    },
    saveAllNotes: async(updates)=>{
      setSyncStatus("syncing");
      await Promise.all(updates.map(({id,notes})=>sb.from("eleves").update({notes}).eq("id",id)));
      load();showToast("Notes enregistrées");
    },

    addPaiement: async(form)=>{const{error}=await sb.from("paiements").insert({...form,etablissement_id:etablissementId,recu:`REC-${String(data.paiements.length+1).padStart(4,"0")}`,created_at:new Date().toISOString()});if(!error){load();showToast("Paiement enregistré");}else showToast(error.message,"error");},
    deletePaiement: async(id)=>{await sb.from("paiements").delete().eq("id",id);load();showToast("Paiement supprimé");},

    togglePresence: async(eleveId,classeId,present)=>{
      await sb.from("presences").delete().match({eleve_id:eleveId,classe_id:classeId,date:TODAY,etablissement_id:etablissementId});
      await sb.from("presences").insert({eleve_id:eleveId,classe_id:classeId,date:TODAY,present,etablissement_id:etablissementId});
      load();
    },

    sendMessage: async(auteur,role,texte)=>{const{error}=await sb.from("messages").insert({auteur,role,texte,etablissement_id:etablissementId,created_at:new Date().toISOString()});if(error)showToast(error.message,"error");else load();},

    addComp: async(form)=>{const{error}=await sb.from("compositions").insert({...form,etablissement_id:etablissementId,created_at:new Date().toISOString()});if(!error){load();showToast("Composition créée");}else showToast(error.message,"error");},
    deleteComp: async(id)=>{await sb.from("compositions").delete().eq("id",id);load();showToast("Composition supprimée");},

    addUser: async(form)=>{const{error}=await sb.from("utilisateurs").insert({...form,etablissement_id:etablissementId});if(!error){load();showToast("Utilisateur créé");}else showToast(error.message,"error");},
    updateUser: async(id,form)=>{const{error}=await sb.from("utilisateurs").update(form).eq("id",id);if(!error){load();showToast("Utilisateur modifié");}else showToast(error.message,"error");},
    deleteUser: async(id)=>{await sb.from("utilisateurs").delete().eq("id",id);load();showToast("Utilisateur supprimé");},
  };

  return{data,syncStatus,toast,ops,reload:load};
}

// ── DASHBOARD ─────────────────────────────────────────────────────────────────
function Dashboard({data,etab,setPage}) {
  const devise=etab.devise||"GNF";
  const periodes=periodesList(etab.systeme);
  const lastP=periodes[periodes.length-1];
  if(data.eleves.length===0) return(
    <div>
      <SHdr title={`Bienvenue 👋`} sub={etab.nom}/>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(190px,1fr))",gap:12}}>
        {[{icon:"🏫",l:"Classes",p:"classes",c:"#3b82f6"},{icon:"📖",l:"Matières",p:"matieres",c:"#8b5cf6"},{icon:"👨‍🎓",l:"Élèves",p:"eleves",c:"#10b981"},{icon:"👤",l:"Utilisateurs",p:"utilisateurs",c:"#f59e0b"}].map(item=>(
          <div key={item.p} onClick={()=>setPage(item.p)} style={{background:"#fff",borderRadius:14,padding:22,border:"2px dashed #e2e8f0",textAlign:"center",cursor:"pointer",transition:"all 0.2s"}} onMouseOver={e=>{e.currentTarget.style.borderColor=item.c;e.currentTarget.style.background=item.c+"0a";}} onMouseOut={e=>{e.currentTarget.style.borderColor="#e2e8f0";e.currentTarget.style.background="#fff";}}>
            <div style={{fontSize:30,marginBottom:8}}>{item.icon}</div>
            <div style={{fontSize:13,fontWeight:700,color:"#475569"}}>{item.l}</div>
          </div>
        ))}
      </div>
    </div>
  );
  const moyennes=data.eleves.map(e=>{const m=calcMoy(e.notes||{},data.matieres,lastP);return m!=="—"?parseFloat(m):null;}).filter(Boolean);
  const moyGlobale=moyennes.length?(moyennes.reduce((a,b)=>a+b,0)/moyennes.length).toFixed(1):"—";
  const tauxReussite=moyennes.length?Math.round(moyennes.filter(m=>m>=10).length/moyennes.length*100):0;
  const totalPaie=data.paiements.reduce((s,p)=>s+(parseFloat(p.montant)||0),0);
  const absToday=data.presences.filter(p=>p.date===TODAY&&!p.present).length;
  const repartition=[{name:"Très Bien",v:moyennes.filter(m=>m>=16).length,c:"#10b981"},{name:"Bien",v:moyennes.filter(m=>m>=14&&m<16).length,c:"#3b82f6"},{name:"Assez Bien",v:moyennes.filter(m=>m>=12&&m<14).length,c:"#8b5cf6"},{name:"Passable",v:moyennes.filter(m=>m>=10&&m<12).length,c:"#f59e0b"},{name:"Insuffisant",v:moyennes.filter(m=>m<10).length,c:"#ef4444"}].filter(d=>d.v>0);
  const matiereData=data.matieres.map(m=>({name:m.nom.split(" ")[0].slice(0,7),moy:+(data.eleves.reduce((acc,e)=>acc+(parseFloat(e.notes?.[lastP]?.[m.id])||0),0)/data.eleves.length).toFixed(1)}));
  return(
    <div>
      <SHdr title="Tableau de bord 📊" sub={`${etab.annee} · ${etab.systeme==="semestre"?"Semestriel":"Trimestriel"} · Données en temps réel`}/>
      <div style={{display:"flex",gap:13,flexWrap:"wrap",marginBottom:20}}>
        <StatCard icon="👨‍🎓" label="Élèves" value={data.eleves.length} sub={`${data.classes.length} classes`} color="#3b82f6" onClick={()=>setPage("eleves")}/>
        <StatCard icon="📈" label="Moy. générale" value={moyGlobale} sub={lastP} color="#10b981"/>
        <StatCard icon="🏆" label="Taux réussite" value={`${tauxReussite}%`} color="#f59e0b"/>
        <StatCard icon="💰" label="Paiements" value={fmtMoney(totalPaie,devise)} color="#8b5cf6" onClick={()=>setPage("paiements")}/>
        {absToday>0&&<StatCard icon="⚠️" label="Absents auj." value={absToday} color="#ef4444" onClick={()=>setPage("presences")}/>}
      </div>
      {moyennes.length>0&&(
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:16}}>
          <Card><div style={{fontWeight:700,fontSize:13,color:"#0f172a",marginBottom:14}}>Moyennes par matière — {lastP}</div>
            <ResponsiveContainer width="100%" height={170}><BarChart data={matiereData}><CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9"/><XAxis dataKey="name" tick={{fontSize:10}}/><YAxis domain={[0,20]} tick={{fontSize:10}}/><Tooltip/><Bar dataKey="moy" fill="#1a56db" radius={[5,5,0,0]}/></BarChart></ResponsiveContainer>
          </Card>
          <Card><div style={{fontWeight:700,fontSize:13,color:"#0f172a",marginBottom:14}}>Répartition des mentions</div>
            <ResponsiveContainer width="100%" height={130}><PieChart><Pie data={repartition.map(r=>({name:r.name,value:r.v}))} cx="50%" cy="50%" outerRadius={60} dataKey="value">{repartition.map((r,i)=><Cell key={i} fill={r.c}/>)}</Pie><Tooltip/></PieChart></ResponsiveContainer>
            <div style={{display:"flex",flexWrap:"wrap",gap:6,marginTop:6}}>{repartition.map((r,i)=><div key={i} style={{display:"flex",alignItems:"center",gap:4,fontSize:10,color:"#64748b"}}><div style={{width:7,height:7,borderRadius:2,background:r.c}}/>{r.name} ({r.v})</div>)}</div>
          </Card>
        </div>
      )}
      {moyennes.length>0&&(
        <Card><div style={{fontWeight:700,fontSize:13,color:"#0f172a",marginBottom:12}}>🥇 Meilleurs élèves — {lastP}</div>
          <div style={{display:"flex",flexDirection:"column",gap:7}}>
            {data.eleves.map(e=>({...e,moy:parseFloat(calcMoy(e.notes||{},data.matieres,lastP))||0})).sort((a,b)=>b.moy-a.moy).slice(0,5).map((e,i)=>{
              const m=MENTION(e.moy);const cl=data.classes.find(c=>c.id===e.classe_id);
              return(<div key={e.id} style={{display:"flex",alignItems:"center",gap:11,padding:"9px 13px",borderRadius:10,background:i===0?"#fef9c3":"#f8fafc",border:i===0?"1px solid #fde047":"1px solid #f1f5f9"}}>
                <span style={{fontSize:16}}>{["🥇","🥈","🥉"][i]||`${i+1}.`}</span>
                <div style={{flex:1}}><div style={{fontWeight:700,fontSize:13,color:"#0f172a"}}>{e.prenom} {e.nom}</div><div style={{fontSize:11,color:"#94a3b8"}}>{cl?.nom} · {e.matricule}</div></div>
                <div style={{textAlign:"right"}}><div style={{fontWeight:800,fontSize:16,color:m.c}}>{e.moy.toFixed(2)}</div><span style={{background:m.bg,color:m.c,borderRadius:5,padding:"1px 7px",fontSize:10,fontWeight:700}}>{m.t}</span></div>
              </div>);
            })}
          </div>
        </Card>
      )}
    </div>
  );
}

// ── CLASSES ───────────────────────────────────────────────────────────────────
function Classes({data,ops}) {
  const [modal,setModal]=useState(null);
  const [form,setForm]=useState({nom:"",niveau:"",effectif:""});
  const [loading,setLoading]=useState(false);
  const save=async()=>{
    if(!form.nom)return;setLoading(true);
    if(modal==="add")await ops.addClass(form);else await ops.updateClass(modal,form);
    setLoading(false);setModal(null);
  };
  return(
    <div>
      <SHdr title="Classes 🏫" sub={`${data.classes.length} classe(s)`} action={<Btn ch="+ Nouvelle classe" v="primary" onClick={()=>{setForm({nom:"",niveau:"",effectif:""});setModal("add");}}/>}/>
      {data.classes.length===0?<Card><Empty icon="🏫" text="Créez votre première classe."/></Card>:(
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(190px,1fr))",gap:13}}>
          {data.classes.map(c=>(
            <Card key={c.id}>
              <div style={{fontSize:30,marginBottom:9}}>📓</div>
              <div style={{fontWeight:800,fontSize:15,color:"#0f172a",marginBottom:3}}>{c.nom}</div>
              <div style={{fontSize:12,color:"#64748b",marginBottom:13}}>{c.niveau}</div>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <span style={{background:"#eff6ff",color:"#1a56db",borderRadius:7,padding:"3px 9px",fontSize:11,fontWeight:700}}>👤 {data.eleves.filter(e=>e.classe_id===c.id).length}</span>
                <div style={{display:"flex",gap:5}}>
                  <button onClick={()=>{setForm({nom:c.nom,niveau:c.niveau||"",effectif:c.effectif||""});setModal(c.id);}} style={{background:"#f1f5f9",border:"none",borderRadius:7,padding:"5px 9px",cursor:"pointer"}}>✏️</button>
                  <button onClick={()=>ops.deleteClass(c.id)} style={{background:"#fef2f2",border:"none",borderRadius:7,padding:"5px 9px",cursor:"pointer"}}>🗑️</button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
      {modal&&<Modal title={modal==="add"?"Nouvelle classe":"Modifier"} onClose={()=>setModal(null)}>
        <Inp label="Nom *" value={form.nom} onChange={e=>setForm(f=>({...f,nom:e.target.value}))} placeholder="Ex: 3ème A"/>
        <Inp label="Niveau" value={form.niveau} onChange={e=>setForm(f=>({...f,niveau:e.target.value}))} placeholder="Ex: 3ème"/>
        <Inp label="Effectif prévu" type="number" value={form.effectif} onChange={e=>setForm(f=>({...f,effectif:e.target.value}))}/>
        <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}><Btn ch="Annuler" v="ghost" onClick={()=>setModal(null)}/><Btn ch={loading?"...":"Enregistrer"} v="success" onClick={save} disabled={loading}/></div>
      </Modal>}
    </div>
  );
}

// ── MATIÈRES ──────────────────────────────────────────────────────────────────
function Matieres({data,ops}) {
  const [modal,setModal]=useState(null);
  const [form,setForm]=useState({nom:"",coefficient:1,enseignant:""});
  const [loading,setLoading]=useState(false);
  const save=async()=>{if(!form.nom)return;setLoading(true);if(modal==="add")await ops.addMat(form);else await ops.updateMat(modal,form);setLoading(false);setModal(null);};
  return(
    <div>
      <SHdr title="Matières 📖" sub={`${data.matieres.length} matière(s)`} action={<Btn ch="+ Nouvelle matière" v="primary" onClick={()=>{setForm({nom:"",coefficient:1,enseignant:""});setModal("add");}}/>}/>
      <Tbl cols={["Matière","Coeff.","Enseignant","Actions"]} empty={<Empty icon="📖" text="Aucune matière."/>}
        rows={data.matieres.map(m=>(
          <TR key={m.id}>
            <TD bold>{m.nom}</TD>
            <TD><span style={{background:"#eff6ff",color:"#1a56db",borderRadius:7,padding:"2px 9px",fontSize:12,fontWeight:700}}>×{m.coefficient}</span></TD>
            <TD>{m.enseignant||"—"}</TD>
            <TD><div style={{display:"flex",gap:6}}>
              <button onClick={()=>{setForm({nom:m.nom,coefficient:m.coefficient,enseignant:m.enseignant||""});setModal(m.id);}} style={{background:"#f1f5f9",border:"none",borderRadius:7,padding:"5px 10px",cursor:"pointer",fontSize:11,fontWeight:700}}>✏️</button>
              <button onClick={()=>ops.deleteMat(m.id)} style={{background:"#fef2f2",color:"#dc2626",border:"none",borderRadius:7,padding:"5px 10px",cursor:"pointer",fontSize:11,fontWeight:700}}>🗑️</button>
            </div></TD>
          </TR>
        ))}
      />
      {modal&&<Modal title={modal==="add"?"Nouvelle matière":"Modifier"} onClose={()=>setModal(null)}>
        <Inp label="Nom *" value={form.nom} onChange={e=>setForm(f=>({...f,nom:e.target.value}))}/>
        <Inp label="Coefficient" type="number" value={form.coefficient} onChange={e=>setForm(f=>({...f,coefficient:e.target.value}))}/>
        <Inp label="Enseignant responsable" value={form.enseignant} onChange={e=>setForm(f=>({...f,enseignant:e.target.value}))}/>
        <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}><Btn ch="Annuler" v="ghost" onClick={()=>setModal(null)}/><Btn ch={loading?"...":"Enregistrer"} v="success" onClick={save} disabled={loading}/></div>
      </Modal>}
    </div>
  );
}

// ── ÉLÈVES ────────────────────────────────────────────────────────────────────
function Eleves({data,ops,etab}) {
  const [modal,setModal]=useState(null);const [search,setSearch]=useState("");const [filterCl,setFilterCl]=useState("");
  const [form,setForm]=useState({nom:"",prenom:"",classe_id:"",date_naissance:"",lieu_naissance:"",tuteur:"",telephone:""});
  const [loading,setLoading]=useState(false);
  const filtered=data.eleves.filter(e=>`${e.prenom} ${e.nom} ${e.matricule}`.toLowerCase().includes(search.toLowerCase())&&(!filterCl||e.classe_id===parseInt(filterCl)));
  const save=async()=>{if(!form.nom||!form.prenom)return;setLoading(true);if(modal==="add")await ops.addEleve({...form,classe_id:parseInt(form.classe_id)||data.classes[0]?.id,prefixe:etab.prefixe});else await ops.updateEleve(modal,{...form,classe_id:parseInt(form.classe_id)});setLoading(false);setModal(null);};
  return(
    <div>
      <SHdr title="Élèves 👨‍🎓" sub={`${data.eleves.length} élève(s)`} action={
        <div style={{display:"flex",gap:8}}>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍 Rechercher..." style={{padding:"8px 12px",borderRadius:9,border:"1.5px solid #e2e8f0",fontSize:12,outline:"none",fontFamily:"'Plus Jakarta Sans',sans-serif",width:160}}/>
          <select value={filterCl} onChange={e=>setFilterCl(e.target.value)} style={{padding:"8px 11px",borderRadius:9,border:"1.5px solid #e2e8f0",fontSize:12,outline:"none",fontFamily:"'Plus Jakarta Sans',sans-serif"}}>
            <option value="">Toutes classes</option>
            {data.classes.map(c=><option key={c.id} value={c.id}>{c.nom}</option>)}
          </select>
          <Btn ch="+ Inscrire" v="primary" onClick={()=>{setForm({nom:"",prenom:"",classe_id:data.classes[0]?.id||"",date_naissance:"",lieu_naissance:"",tuteur:"",telephone:""});setModal("add");}}/>
        </div>
      }/>
      <Tbl cols={["Élève","Matricule","Classe","Inscription","Actions"]} empty={<Empty icon="👨‍🎓" text="Aucun élève."/>}
        rows={filtered.map(e=>{const cl=data.classes.find(c=>c.id===e.classe_id);return(
          <TR key={e.id}>
            <TD><div style={{display:"flex",alignItems:"center",gap:9}}>
              <div style={{width:31,height:31,borderRadius:9,background:"#eff6ff",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:800,color:"#1a56db",fontSize:11}}>{e.prenom?.[0]}{e.nom?.[0]}</div>
              <div><div style={{fontWeight:700,fontSize:13,color:"#0f172a"}}>{e.prenom} {e.nom}</div>{e.tuteur&&<div style={{fontSize:11,color:"#94a3b8"}}>👤 {e.tuteur}</div>}</div>
            </div></TD>
            <TD mono>{e.matricule}</TD><TD>{cl?.nom||"—"}</TD><TD>{e.inscription_date||"—"}</TD>
            <TD><div style={{display:"flex",gap:6}}>
              <button onClick={()=>{setForm({nom:e.nom,prenom:e.prenom,classe_id:e.classe_id,date_naissance:e.date_naissance||"",lieu_naissance:e.lieu_naissance||"",tuteur:e.tuteur||"",telephone:e.telephone||""});setModal(e.id);}} style={{background:"#f1f5f9",border:"none",borderRadius:7,padding:"5px 9px",cursor:"pointer",fontSize:11,fontWeight:700}}>✏️</button>
              <button onClick={()=>ops.deleteEleve(e.id)} style={{background:"#fef2f2",color:"#dc2626",border:"none",borderRadius:7,padding:"5px 9px",cursor:"pointer",fontSize:11,fontWeight:700}}>🗑️</button>
            </div></TD>
          </TR>);})}
      />
      {modal&&<Modal title={modal==="add"?"Inscrire un élève":"Modifier"} onClose={()=>setModal(null)} w={540}>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0 13px"}}>
          <Inp label="Nom *" value={form.nom} onChange={e=>setForm(f=>({...f,nom:e.target.value}))}/>
          <Inp label="Prénom *" value={form.prenom} onChange={e=>setForm(f=>({...f,prenom:e.target.value}))}/>
          <Inp label="Date naissance" type="date" value={form.date_naissance} onChange={e=>setForm(f=>({...f,date_naissance:e.target.value}))}/>
          <Inp label="Lieu naissance" value={form.lieu_naissance} onChange={e=>setForm(f=>({...f,lieu_naissance:e.target.value}))}/>
          <div style={{gridColumn:"1/-1"}}><Slt label="Classe *" value={form.classe_id} onChange={e=>setForm(f=>({...f,classe_id:e.target.value}))} opts={data.classes.map(c=>({v:c.id,l:c.nom}))}/></div>
          <Inp label="Tuteur/Parent" value={form.tuteur} onChange={e=>setForm(f=>({...f,tuteur:e.target.value}))}/>
          <Inp label="Téléphone parent" value={form.telephone} onChange={e=>setForm(f=>({...f,telephone:e.target.value}))}/>
        </div>
        <div style={{display:"flex",gap:8,justifyContent:"flex-end",marginTop:6}}><Btn ch="Annuler" v="ghost" onClick={()=>setModal(null)}/><Btn ch={loading?"...":"Enregistrer"} v="success" onClick={save} disabled={loading}/></div>
      </Modal>}
    </div>
  );
}

// ── NOTES ─────────────────────────────────────────────────────────────────────
function Notes({data,ops,etab}) {
  const periodes=periodesList(etab.systeme);
  const [periode,setPeriode]=useState(periodes[0]);
  const [classeId,setClasseId]=useState(data.classes[0]?.id||"");
  const [matiereId,setMatiereId]=useState(data.matieres[0]?.id||"");
  const [localNotes,setLocalNotes]=useState({});
  const [saving,setSaving]=useState(false);
  const classeEleves=data.eleves.filter(e=>e.classe_id===parseInt(classeId));
  const matiere=data.matieres.find(m=>m.id===parseInt(matiereId));
  useEffect(()=>{const n={};classeEleves.forEach(e=>{n[e.id]=e.notes?.[periode]?.[matiereId]??""});setLocalNotes(n);},[periode,classeId,matiereId,data.eleves]);
  const saveAll=async()=>{
    setSaving(true);
    const updates=classeEleves.map(e=>({id:e.id,notes:{...(e.notes||{}),[periode]:{...(e.notes?.[periode]||{}),[matiereId]:parseFloat(localNotes[e.id])||0}}}));
    await ops.saveAllNotes(updates);setSaving(false);
  };
  const printFiche=()=>{
    const cl=data.classes.find(c=>c.id===parseInt(classeId));
    const rows=classeEleves.map((e,i)=>{const note=localNotes[e.id];const app=note!==""&&note!=null?MENTION(note):{t:"Non noté",c:"#94a3b8",bg:"#f8fafc"};return`<tr><td>${i+1}</td><td><b>${e.prenom} ${e.nom}</b></td><td>${e.matricule}</td><td style="text-align:center;font-weight:900;font-size:16px;color:${app.c}">${note!==""&&note!=null?note:"—"}</td><td>${app.t}</td></tr>`;}).join("");
    printHTML(`<div class="header"><h1>${etab.nom}</h1><p>${etab.adresse||""}</p></div>
    <h2 style="text-align:center">FICHE DE NOTES — ${matiere?.nom} — ${periode} — ${etab.annee}</h2>
    <p>Classe : <b>${cl?.nom}</b> · Coefficient : <b>${matiere?.coefficient}</b> · Enseignant : <b>${matiere?.enseignant||"—"}</b></p>
    <table><tr><th>N°</th><th>Élève</th><th>Matricule</th><th>Note /20</th><th>Appréciation</th></tr>${rows}</table>
    <p style="margin-top:30px">Signature : _________________________ Date : _____________</p>`,`Fiche Notes - ${matiere?.nom}`);
  };
  if(data.classes.length===0||data.matieres.length===0) return <Card><Empty icon="📝" text="Créez d'abord des classes et matières."/></Card>;
  return(
    <div>
      <SHdr title="Saisie des notes 📝" sub="Par période, classe et matière" action={
        <div style={{display:"flex",gap:8}}>
          <Btn ch="🖨️ Fiche" v="ghost" onClick={printFiche}/>
          <button onClick={saveAll} disabled={saving} style={{padding:"9px 20px",borderRadius:9,border:"none",background:"#1a56db",color:"#fff",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"'Plus Jakarta Sans',sans-serif"}}>
            {saving?"⏳ Sync...":"💾 Enregistrer"}
          </button>
        </div>
      }/>
      <Card s={{marginBottom:14}}>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:13}}>
          <Slt label="Période" value={periode} onChange={e=>setPeriode(e.target.value)} opts={periodes}/>
          <Slt label="Classe" value={classeId} onChange={e=>setClasseId(e.target.value)} opts={data.classes.map(c=>({v:c.id,l:c.nom}))}/>
          <Slt label="Matière" value={matiereId} onChange={e=>setMatiereId(e.target.value)} opts={data.matieres.map(m=>({v:m.id,l:`${m.nom} (coef ${m.coefficient})`}))}/>
        </div>
      </Card>
      {classeEleves.length===0?<Card><Empty icon="👨‍🎓" text="Aucun élève dans cette classe."/></Card>:(
        <Card>
          <div style={{fontWeight:700,fontSize:13,color:"#0f172a",marginBottom:12}}>📋 {matiere?.nom} — {periode}</div>
          <table style={{width:"100%",borderCollapse:"collapse"}}>
            <thead><tr style={{background:"#f8fafc"}}>{["N°","Élève","Note /20","Appréciation"].map(h=><th key={h} style={{padding:"10px 13px",textAlign:"left",fontSize:10,fontWeight:700,color:"#94a3b8",textTransform:"uppercase"}}>{h}</th>)}</tr></thead>
            <tbody>{classeEleves.map((e,i)=>{
              const note=localNotes[e.id]??"";const m=note!==""?MENTION(note):null;
              return(<tr key={e.id} style={{borderTop:"1px solid #f8fafc"}}>
                <td style={{padding:"9px 13px",fontSize:12,color:"#94a3b8"}}>{i+1}</td>
                <td style={{padding:"9px 13px"}}><div style={{fontWeight:700,fontSize:13,color:"#0f172a"}}>{e.prenom} {e.nom}</div><div style={{fontSize:11,color:"#94a3b8"}}>{e.matricule}</div></td>
                <td style={{padding:"7px 13px"}}><input type="number" min="0" max="20" step="0.25" value={note} onChange={ev=>setLocalNotes(n=>({...n,[e.id]:ev.target.value}))} style={{width:78,padding:"7px 10px",borderRadius:8,border:`2px solid ${note!==""&&parseFloat(note)<10?"#fca5a5":"#e2e8f0"}`,fontSize:14,fontWeight:700,textAlign:"center",outline:"none",fontFamily:"'Plus Jakarta Sans',sans-serif",color:m?.c||"#0f172a"}}/></td>
                <td style={{padding:"9px 13px"}}>{m&&<span style={{background:m.bg,color:m.c,borderRadius:7,padding:"3px 9px",fontSize:11,fontWeight:700}}>{m.t}</span>}</td>
              </tr>);
            })}</tbody>
          </table>
        </Card>
      )}
    </div>
  );
}

// ── BULLETINS ─────────────────────────────────────────────────────────────────
function Bulletins({data,etab}) {
  const periodes=periodesList(etab.systeme);
  const [selected,setSelected]=useState(null);
  const [periode,setPeriode]=useState(periodes[0]);
  const [filterCl,setFilterCl]=useState("");
  const filtered=data.eleves.filter(e=>!filterCl||e.classe_id===parseInt(filterCl));

  const bulletinHTML=(e,p)=>{
    const moy=calcMoy(e.notes||{},data.matieres,p);const m=MENTION(moy);
    const cl=data.classes.find(c=>c.id===e.classe_id);
    const classmates=data.eleves.filter(x=>x.classe_id===e.classe_id);
    const rang=classmates.map(x=>({id:x.id,moy:parseFloat(calcMoy(x.notes||{},data.matieres,p))||0})).sort((a,b)=>b.moy-a.moy).findIndex(x=>x.id===e.id)+1;
    const lignes=data.matieres.map((mat,i)=>{const note=e.notes?.[p]?.[mat.id];const app=note!=null&&note!==""?MENTION(note):{t:"Non noté",c:"#94a3b8",bg:"#f8fafc"};return`<tr style="background:${i%2===0?"#f8fafc":"#fff"}"><td>${mat.nom}</td><td style="text-align:center">×${mat.coefficient}</td><td style="text-align:center;font-weight:900;font-size:16px;color:${app.c}">${note!=null&&note!==""?note:"—"}</td><td style="text-align:center">${note!=null&&note!==""?(parseFloat(note)*mat.coefficient).toFixed(2):"—"}</td><td style="text-align:center"><span style="background:${app.bg};color:${app.c};padding:2px 7px;border-radius:4px;font-size:11px;font-weight:700">${app.t}</span></td></tr>`;}).join("");
    return`<div class="header"><h1>${etab.nom}</h1>${etab.devise_txt?`<p><em>${etab.devise_txt}</em></p>`:""}<p>${etab.adresse||""} ${etab.telephone?"· Tél: "+etab.telephone:""}</p>${etab.codeMEN?`<p>Code MEN : ${etab.codeMEN}</p>`:""}<div style="display:inline-block;background:#1a56db;color:#fff;padding:6px 18px;border-radius:6px;font-weight:900;font-size:13px;margin-top:8px">BULLETIN — ${p.toUpperCase()} — ${etab.annee}</div></div>
    <div class="grid"><div><div style="font-size:10px;color:#666;text-transform:uppercase">Élève</div><b>${e.prenom} ${e.nom}</b></div><div><div style="font-size:10px;color:#666;text-transform:uppercase">Matricule</div><b style="font-family:monospace">${e.matricule}</b></div><div><div style="font-size:10px;color:#666;text-transform:uppercase">Classe</div><b>${cl?.nom}</b></div><div><div style="font-size:10px;color:#666;text-transform:uppercase">Année</div><b>${etab.annee}</b></div></div>
    <table><tr style="background:#1a56db;color:#fff"><th>Matière</th><th>Coeff.</th><th>Note /20</th><th>Points</th><th>Appréciation</th></tr>${lignes}</table>
    <div class="result" style="background:${m.bg};border:2px solid ${m.c}40"><div class="stat"><div class="stat-val" style="color:${m.c}">${moy}</div><div class="stat-lbl">Moyenne /20</div></div><div class="stat"><div class="stat-val" style="color:${m.c};font-size:18px">${m.t}</div><div class="stat-lbl">Mention</div></div><div class="stat"><div class="stat-val">${rang}/${classmates.length}</div><div class="stat-lbl">Rang</div></div></div>
    <p style="text-align:center;font-size:11px;color:#999;margin-top:12px">Généré par MonEcole · ${etab.email||""}</p>`;
  };

  if(selected){
    const e=selected;const moy=calcMoy(e.notes||{},data.matieres,periode);const m=MENTION(moy);
    const cl=data.classes.find(c=>c.id===e.classe_id);
    const classmates=data.eleves.filter(x=>x.classe_id===e.classe_id);
    const rang=classmates.map(x=>({id:x.id,moy:parseFloat(calcMoy(x.notes||{},data.matieres,periode))||0})).sort((a,b)=>b.moy-a.moy).findIndex(x=>x.id===e.id)+1;
    return(
      <div>
        <div style={{display:"flex",gap:9,marginBottom:18,alignItems:"center"}}>
          <Btn ch="← Retour" v="ghost" onClick={()=>setSelected(null)}/>
          <select value={periode} onChange={ev=>setPeriode(ev.target.value)} style={{padding:"8px 11px",borderRadius:9,border:"1.5px solid #e2e8f0",fontSize:12,outline:"none",fontFamily:"'Plus Jakarta Sans',sans-serif"}}>{periodes.map(p=><option key={p} value={p}>{p}</option>)}</select>
          <Btn ch="🖨️ Imprimer" v="primary" onClick={()=>printHTML(bulletinHTML(e,periode),`Bulletin ${e.prenom} ${e.nom}`)}/>
        </div>
        <div style={{background:"#fff",borderRadius:18,padding:32,maxWidth:720,margin:"0 auto",boxShadow:"0 4px 24px rgba(0,0,0,0.08)",border:"1.5px solid #e2e8f0"}}>
          <div style={{textAlign:"center",borderBottom:"3px solid #1a56db",paddingBottom:14,marginBottom:18}}>
            <div style={{fontWeight:900,fontSize:18,color:"#0f172a"}}>{etab.nom}</div>
            {etab.devise_txt&&<div style={{fontSize:12,color:"#64748b",fontStyle:"italic",marginTop:2}}>{etab.devise_txt}</div>}
            <div style={{fontSize:11,color:"#94a3b8",marginTop:5}}>{etab.adresse} {etab.telephone&&`· ${etab.telephone}`}</div>
            <div style={{marginTop:10,display:"inline-block",background:"#1a56db",color:"#fff",borderRadius:8,padding:"5px 16px",fontWeight:800,fontSize:12}}>BULLETIN — {periode.toUpperCase()} — {etab.annee}</div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:12,marginBottom:18,background:"#f8fafc",borderRadius:11,padding:14}}>
            {[["Élève",`${e.prenom} ${e.nom}`],["Matricule",e.matricule],["Classe",cl?.nom],["Année",etab.annee]].map(([k,v])=>(<div key={k}><div style={{fontSize:9,color:"#94a3b8",fontWeight:700,textTransform:"uppercase",marginBottom:2}}>{k}</div><div style={{fontWeight:700,fontSize:12,color:"#0f172a"}}>{v}</div></div>))}
          </div>
          <table style={{width:"100%",borderCollapse:"collapse",marginBottom:18}}>
            <thead><tr style={{background:"#1a56db"}}>{["Matière","Coeff.","Note /20","Points","Appréciation"].map(h=><th key={h} style={{padding:"8px 12px",textAlign:"left",fontSize:11,fontWeight:700,color:"#fff"}}>{h}</th>)}</tr></thead>
            <tbody>{data.matieres.map((mat,i)=>{const note=e.notes?.[periode]?.[mat.id];const app=note!=null&&note!==""?MENTION(note):{t:"Non noté",c:"#94a3b8",bg:"#f8fafc"};return(<tr key={mat.id} style={{background:i%2===0?"#f8fafc":"#fff",borderBottom:"1px solid #e2e8f0"}}><td style={{padding:"8px 12px",fontWeight:600,fontSize:12}}>{mat.nom}</td><td style={{padding:"8px 12px",fontSize:12,color:"#64748b"}}>×{mat.coefficient}</td><td style={{padding:"8px 12px",fontWeight:800,fontSize:15,color:app.c}}>{note!=null&&note!==""?note:"—"}</td><td style={{padding:"8px 12px",fontSize:12,color:"#475569"}}>{note!=null&&note!==""?(parseFloat(note)*mat.coefficient).toFixed(2):"—"}</td><td style={{padding:"8px 12px"}}><span style={{background:app.bg,color:app.c,borderRadius:5,padding:"2px 7px",fontSize:10,fontWeight:700}}>{app.t}</span></td></tr>);})}</tbody>
          </table>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12,background:m.bg,borderRadius:11,padding:16,border:`2px solid ${m.c}40`}}>
            <div style={{textAlign:"center"}}><div style={{fontSize:9,color:"#94a3b8",fontWeight:700,textTransform:"uppercase"}}>Moyenne</div><div style={{fontSize:26,fontWeight:900,color:m.c}}>{moy}<span style={{fontSize:12}}>/20</span></div></div>
            <div style={{textAlign:"center"}}><div style={{fontSize:9,color:"#94a3b8",fontWeight:700,textTransform:"uppercase"}}>Mention</div><div style={{fontSize:16,fontWeight:800,color:m.c}}>{m.t}</div></div>
            <div style={{textAlign:"center"}}><div style={{fontSize:9,color:"#94a3b8",fontWeight:700,textTransform:"uppercase"}}>Rang</div><div style={{fontSize:26,fontWeight:900,color:"#0f172a"}}>{rang}<span style={{fontSize:12}}>/{classmates.length}</span></div></div>
          </div>
        </div>
      </div>
    );
  }
  return(
    <div>
      <SHdr title="Bulletins 📄" sub="Consultez et imprimez" action={
        <div style={{display:"flex",gap:8}}>
          <select value={periode} onChange={e=>setPeriode(e.target.value)} style={{padding:"8px 11px",borderRadius:9,border:"1.5px solid #e2e8f0",fontSize:12,outline:"none",fontFamily:"'Plus Jakarta Sans',sans-serif"}}>{periodes.map(p=><option key={p} value={p}>{p}</option>)}</select>
          <select value={filterCl} onChange={e=>setFilterCl(e.target.value)} style={{padding:"8px 11px",borderRadius:9,border:"1.5px solid #e2e8f0",fontSize:12,outline:"none",fontFamily:"'Plus Jakarta Sans',sans-serif"}}><option value="">Toutes classes</option>{data.classes.map(c=><option key={c.id} value={c.id}>{c.nom}</option>)}</select>
          <Btn ch="🖨️ Tout imprimer" v="warn" onClick={()=>{if(!filtered.length)return;const html=filtered.map((e,i)=>`${bulletinHTML(e,periode)}${i<filtered.length-1?'<div class="page-break"></div>':""}`).join("");printHTML(html,"Bulletins — "+periode);}}/>
        </div>
      }/>
      {data.eleves.length===0?<Card><Empty icon="📄" text="Aucun élève."/></Card>:(
        <div style={{display:"flex",flexDirection:"column",gap:8}}>
          {filtered.map(e=>{const moy=calcMoy(e.notes||{},data.matieres,periode);const m=MENTION(moy);const cl=data.classes.find(c=>c.id===e.classe_id);return(
            <div key={e.id} onClick={()=>setSelected(e)} style={{background:"#fff",borderRadius:12,padding:"13px 17px",boxShadow:"0 1px 6px rgba(0,0,0,0.05)",border:"1.5px solid #f1f5f9",display:"flex",alignItems:"center",justifyContent:"space-between",cursor:"pointer",transition:"all 0.15s"}} onMouseOver={ev=>ev.currentTarget.style.borderColor="#1a56db"} onMouseOut={ev=>ev.currentTarget.style.borderColor="#f1f5f9"}>
              <div style={{display:"flex",alignItems:"center",gap:11}}>
                <div style={{width:36,height:36,borderRadius:10,background:"#eff6ff",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:800,color:"#1a56db",fontSize:12}}>{e.prenom?.[0]}{e.nom?.[0]}</div>
                <div><div style={{fontWeight:700,fontSize:13,color:"#0f172a"}}>{e.prenom} {e.nom}</div><div style={{fontSize:11,color:"#94a3b8"}}>{cl?.nom} · {e.matricule}</div></div>
              </div>
              <div style={{display:"flex",alignItems:"center",gap:13}}>
                <div style={{textAlign:"right"}}><div style={{fontWeight:800,fontSize:16,color:m.c}}>{moy}/20</div><span style={{background:m.bg,color:m.c,borderRadius:5,padding:"1px 7px",fontSize:10,fontWeight:700}}>{m.t}</span></div>
                <span style={{color:"#cbd5e1",fontSize:17}}>›</span>
              </div>
            </div>);
          })}
        </div>
      )}
    </div>
  );
}

// ── PAIEMENTS ─────────────────────────────────────────────────────────────────
function Paiements({data,ops,etab}) {
  const devise=etab.devise||"GNF";
  const [modal,setModal]=useState(null);const [filterEl,setFilterEl]=useState("");
  const [form,setForm]=useState({eleve_id:"",type:"Mensualité",montant:"",date:TODAY,mois:"",note:""});
  const [loading,setLoading]=useState(false);
  const filtered=data.paiements.filter(p=>!filterEl||p.eleve_id===parseInt(filterEl));
  const save=async()=>{if(!form.eleve_id||!form.montant)return;setLoading(true);const el=data.eleves.find(e=>e.id===parseInt(form.eleve_id));await ops.addPaiement({...form,eleve_id:parseInt(form.eleve_id),montant:parseFloat(form.montant),eleve_nom:`${el?.prenom} ${el?.nom}`,matricule:el?.matricule});setLoading(false);setModal(null);};
  const printRecu=(p)=>{const el=data.eleves.find(e=>e.id===p.eleve_id);const cl=data.classes.find(c=>c.id===el?.classe_id);printHTML(`<div style="max-width:400px;margin:0 auto"><div class="header"><h1>${etab.nom}</h1><p>${etab.adresse||""}</p></div><h2 style="text-align:center;border:2px solid #000;padding:10px">REÇU DE PAIEMENT</h2><table><tr><td><b>N° Reçu</b></td><td><b>${p.recu}</b></td></tr><tr><td>Date</td><td>${p.date}</td></tr><tr><td>Élève</td><td>${el?.prenom} ${el?.nom}</td></tr><tr><td>Matricule</td><td>${el?.matricule}</td></tr><tr><td>Classe</td><td>${cl?.nom}</td></tr><tr><td>Type</td><td>${p.type}</td></tr>${p.mois?`<tr><td>Période</td><td>${p.mois}</td></tr>`:""}</table><div style="text-align:center;font-size:22px;font-weight:900;background:#f0fff4;padding:14px;border-radius:8px;margin-top:14px;border:2px solid #10b981">${fmtMoney(p.montant,devise)}</div><p style="text-align:center;font-size:11px;color:#999;margin-top:18px">Merci · ${etab.nom}</p><p style="margin-top:28px">Signature : _________________________</p></div>`,`Reçu ${p.recu}`);};
  const total=filtered.reduce((s,p)=>s+(p.montant||0),0);
  return(
    <div>
      <SHdr title="Paiements 💰" sub={`Total : ${fmtMoney(total,devise)}`} action={
        <div style={{display:"flex",gap:8}}>
          <select value={filterEl} onChange={e=>setFilterEl(e.target.value)} style={{padding:"8px 11px",borderRadius:9,border:"1.5px solid #e2e8f0",fontSize:12,outline:"none",fontFamily:"'Plus Jakarta Sans',sans-serif"}}><option value="">Tous les élèves</option>{data.eleves.map(e=><option key={e.id} value={e.id}>{e.prenom} {e.nom}</option>)}</select>
          <Btn ch="+ Paiement" v="primary" onClick={()=>{setForm({eleve_id:data.eleves[0]?.id||"",type:"Mensualité",montant:etab.mensualite||"",date:TODAY,mois:"",note:""});setModal("add");}}/>
        </div>
      }/>
      <Tbl cols={["N° Reçu","Élève","Type","Montant","Date","Actions"]} empty={<Empty icon="💰" text="Aucun paiement."/>}
        rows={filtered.map(p=>(
          <TR key={p.id}>
            <TD mono bold>{p.recu}</TD>
            <TD><div style={{fontWeight:700,fontSize:13,color:"#0f172a"}}>{p.eleve_nom}</div>{p.mois&&<div style={{fontSize:11,color:"#94a3b8"}}>{p.mois}</div>}</TD>
            <TD><span style={{background:"#eff6ff",color:"#1a56db",borderRadius:6,padding:"2px 8px",fontSize:11,fontWeight:700}}>{p.type}</span></TD>
            <TD bold s={{color:"#059669"}}>{fmtMoney(p.montant,devise)}</TD>
            <TD>{p.date}</TD>
            <TD><div style={{display:"flex",gap:6}}>
              <button onClick={()=>printRecu(p)} style={{background:"#eff6ff",color:"#1a56db",border:"none",borderRadius:7,padding:"5px 10px",cursor:"pointer",fontSize:11,fontWeight:700}}>🖨️ Reçu</button>
              <button onClick={()=>ops.deletePaiement(p.id)} style={{background:"#fef2f2",color:"#dc2626",border:"none",borderRadius:7,padding:"5px 10px",cursor:"pointer",fontSize:11,fontWeight:700}}>🗑️</button>
            </div></TD>
          </TR>
        ))}
      />
      {modal&&<Modal title="Enregistrer un paiement" onClose={()=>setModal(null)}>
        <Slt label="Élève *" value={form.eleve_id} onChange={e=>setForm(f=>({...f,eleve_id:e.target.value}))} opts={data.eleves.map(e=>({v:e.id,l:`${e.prenom} ${e.nom}`}))}/>
        <Slt label="Type" value={form.type} onChange={e=>setForm(f=>({...f,type:e.target.value}))} opts={["Frais d'inscription","Mensualité","Frais d'examen","Autre"]}/>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0 13px"}}>
          <Inp label={`Montant (${devise}) *`} type="number" value={form.montant} onChange={e=>setForm(f=>({...f,montant:e.target.value}))}/>
          <Inp label="Date *" type="date" value={form.date} onChange={e=>setForm(f=>({...f,date:e.target.value}))}/>
        </div>
        {form.type==="Mensualité"&&<Inp label="Mois concerné" value={form.mois} onChange={e=>setForm(f=>({...f,mois:e.target.value}))} placeholder="Janvier 2026"/>}
        <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}><Btn ch="Annuler" v="ghost" onClick={()=>setModal(null)}/><Btn ch={loading?"...":"Enregistrer"} v="success" onClick={save} disabled={loading}/></div>
      </Modal>}
    </div>
  );
}

// ── PRÉSENCES ─────────────────────────────────────────────────────────────────
function Presences({data,ops,etab}) {
  const [date,setDate]=useState(TODAY);const [classeId,setClasseId]=useState(data.classes[0]?.id||"");
  const eleves=data.eleves.filter(e=>e.classe_id===parseInt(classeId));
  const getP=(eleveId)=>{const p=data.presences.find(p=>p.eleve_id===eleveId&&p.date===date&&p.classe_id===parseInt(classeId));return p?.present??true;};
  const absents=eleves.filter(e=>!getP(e.id));
  const absHist=data.eleves.map(e=>({...e,tot:data.presences.filter(p=>p.eleve_id===e.id&&!p.present).length})).filter(e=>e.tot>0).sort((a,b)=>b.tot-a.tot);
  return(
    <div>
      <SHdr title="Présences 📅" sub="Feuille de présence quotidienne"/>
      <Card s={{marginBottom:14}}>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:13}}>
          <Inp label="Date" type="date" value={date} onChange={e=>setDate(e.target.value)}/>
          <Slt label="Classe" value={classeId} onChange={e=>setClasseId(e.target.value)} opts={data.classes.map(c=>({v:c.id,l:c.nom}))}/>
        </div>
        {eleves.length>0&&<div style={{display:"flex",gap:14,padding:"9px 13px",background:"#f8fafc",borderRadius:9,marginTop:8}}>
          <span style={{fontSize:12,color:"#059669",fontWeight:700}}>✅ Présents : {eleves.length-absents.length}</span>
          <span style={{fontSize:12,color:"#dc2626",fontWeight:700}}>❌ Absents : {absents.length}</span>
        </div>}
      </Card>
      {eleves.length===0?<Card><Empty icon="📅" text="Sélectionnez une classe."/></Card>:(
        <Card s={{marginBottom:16}}>
          <div style={{fontWeight:700,fontSize:13,color:"#0f172a",marginBottom:11}}>Feuille du {date}</div>
          <div style={{display:"flex",flexDirection:"column",gap:6}}>
            {eleves.map(e=>{const present=getP(e.id);return(
              <div key={e.id} onClick={()=>ops.togglePresence(e.id,parseInt(classeId),!present)} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"11px 15px",borderRadius:10,background:present?"#f0fdf4":"#fef2f2",border:`1.5px solid ${present?"#bbf7d0":"#fecaca"}`,cursor:"pointer",transition:"all 0.15s"}}>
                <div style={{display:"flex",alignItems:"center",gap:9}}>
                  <div style={{width:30,height:30,borderRadius:8,background:present?"#dcfce7":"#fee2e2",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:800,color:present?"#059669":"#dc2626",fontSize:11}}>{e.prenom?.[0]}{e.nom?.[0]}</div>
                  <div style={{fontWeight:700,fontSize:13,color:"#0f172a"}}>{e.prenom} {e.nom}</div>
                </div>
                <span style={{fontSize:12,fontWeight:700,color:present?"#059669":"#dc2626"}}>{present?"✅ Présent":"❌ Absent"}</span>
              </div>
            );})}
          </div>
        </Card>
      )}
      {absHist.length>0&&<Card><div style={{fontWeight:700,fontSize:13,color:"#0f172a",marginBottom:11}}>⚠️ Historique absences</div>
        <Tbl cols={["Élève","Classe","Total"]} empty={null} rows={absHist.slice(0,10).map(e=>{const cl=data.classes.find(c=>c.id===e.classe_id);return(<TR key={e.id}><TD bold>{e.prenom} {e.nom}</TD><TD>{cl?.nom}</TD><TD><span style={{background:e.tot>=5?"#fee2e2":"#fef3c7",color:e.tot>=5?"#dc2626":"#d97706",borderRadius:7,padding:"2px 10px",fontSize:12,fontWeight:700}}>{e.tot} absence(s)</span></TD></TR>);})}/>
      </Card>}
    </div>
  );
}

// ── MESSAGERIE ────────────────────────────────────────────────────────────────
function Messagerie({data,ops,currentUser}) {
  const [msg,setMsg]=useState("");const endRef=useRef(null);
  const send=()=>{if(!msg.trim())return;ops.sendMessage(`${currentUser.prenom} ${currentUser.nom}`,currentUser.role,msg.trim());setMsg("");};
  useEffect(()=>endRef.current?.scrollIntoView({behavior:"smooth"}),[data.messages]);
  return(
    <div>
      <SHdr title="Messagerie 💬" sub="Direction ↔ Enseignants · Temps réel"/>
      <Card s={{display:"flex",flexDirection:"column",height:480,padding:0,overflow:"hidden"}}>
        <div style={{flex:1,overflowY:"auto",padding:18,display:"flex",flexDirection:"column",gap:11}}>
          {data.messages.length===0?<div style={{textAlign:"center",color:"#94a3b8",padding:"40px 0"}}><div style={{fontSize:34}}>💬</div><p style={{fontSize:13}}>Aucun message.</p></div>:
          data.messages.map(m=>{const mine=m.auteur===`${currentUser.prenom} ${currentUser.nom}`;return(
            <div key={m.id} style={{display:"flex",flexDirection:"column",alignItems:mine?"flex-end":"flex-start"}}>
              <div style={{fontSize:10,color:"#94a3b8",marginBottom:3}}>{m.auteur} · <Badge role={m.role}/></div>
              <div style={{maxWidth:"68%",background:mine?"#1a56db":"#f1f5f9",color:mine?"#fff":"#0f172a",borderRadius:mine?"14px 14px 4px 14px":"14px 14px 14px 4px",padding:"9px 13px",fontSize:13,lineHeight:1.5}}>{m.texte}</div>
            </div>
          );})}
          <div ref={endRef}/>
        </div>
        <div style={{padding:"12px 15px",borderTop:"1px solid #f1f5f9",display:"flex",gap:9}}>
          <input value={msg} onChange={e=>setMsg(e.target.value)} onKeyDown={e=>e.key==="Enter"&&send()} placeholder="Écrire un message..." style={{flex:1,padding:"9px 13px",borderRadius:10,border:"1.5px solid #e2e8f0",fontSize:13,outline:"none",fontFamily:"'Plus Jakarta Sans',sans-serif"}}/>
          <button onClick={send} disabled={!msg.trim()} style={{padding:"9px 16px",borderRadius:10,border:"none",background:msg.trim()?"#1a56db":"#e2e8f0",color:msg.trim()?"#fff":"#94a3b8",fontSize:12,fontWeight:700,cursor:msg.trim()?"pointer":"not-allowed",fontFamily:"'Plus Jakarta Sans',sans-serif"}}>→</button>
        </div>
      </Card>
    </div>
  );
}

// ── UTILISATEURS ──────────────────────────────────────────────────────────────
function Utilisateurs({data,ops,currentUser}) {
  const [modal,setModal]=useState(null);const [form,setForm]=useState({nom:"",prenom:"",identifiant:"",password:"",role:"Professeur"});const [loading,setLoading]=useState(false);
  const save=async()=>{if(!form.nom||!form.identifiant)return;setLoading(true);if(modal==="add")await ops.addUser(form);else await ops.updateUser(modal,{nom:form.nom,prenom:form.prenom,identifiant:form.identifiant,role:form.role,...(form.password?{password:form.password}:{})});setLoading(false);setModal(null);};
  return(
    <div>
      <SHdr title="Utilisateurs 👤" sub="Gérez les accès" action={currentUser.role==="Administrateur"?<Btn ch="+ Nouvel utilisateur" v="primary" onClick={()=>{setForm({nom:"",prenom:"",identifiant:"",password:"",role:"Professeur"});setModal("add");}}/>:null}/>
      <Tbl cols={["Utilisateur","Identifiant","Rôle","Actions"]} empty={<Empty icon="👤" text="Aucun utilisateur."/>}
        rows={data.utilisateurs.map(u=>(
          <TR key={u.id}>
            <TD><div style={{display:"flex",alignItems:"center",gap:9}}><div style={{width:32,height:32,borderRadius:9,background:(ROLE_CLR[u.role]||"#6b7280")+"20",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:800,color:ROLE_CLR[u.role]||"#6b7280",fontSize:11}}>{u.prenom?.[0]}{u.nom[0]}</div><div style={{fontWeight:700,fontSize:13,color:"#0f172a"}}>{u.prenom} {u.nom}</div></div></TD>
            <TD mono>{u.identifiant}</TD>
            <TD><Badge role={u.role}/></TD>
            <TD>{currentUser.role==="Administrateur"&&<div style={{display:"flex",gap:6}}>
              <button onClick={()=>{setForm({nom:u.nom,prenom:u.prenom||"",identifiant:u.identifiant,password:"",role:u.role});setModal(u.id);}} style={{background:"#f1f5f9",border:"none",borderRadius:7,padding:"5px 9px",cursor:"pointer",fontSize:11,fontWeight:700}}>✏️</button>
              {u.id!==currentUser.id&&<button onClick={()=>ops.deleteUser(u.id)} style={{background:"#fef2f2",color:"#dc2626",border:"none",borderRadius:7,padding:"5px 9px",cursor:"pointer",fontSize:11,fontWeight:700}}>🗑️</button>}
            </div>}</TD>
          </TR>
        ))}
      />
      {modal&&<Modal title={modal==="add"?"Nouvel utilisateur":"Modifier"} onClose={()=>setModal(null)}>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0 13px"}}>
          <Inp label="Nom *" value={form.nom} onChange={e=>setForm(f=>({...f,nom:e.target.value}))}/>
          <Inp label="Prénom" value={form.prenom} onChange={e=>setForm(f=>({...f,prenom:e.target.value}))}/>
        </div>
        <Inp label="Identifiant *" value={form.identifiant} onChange={e=>setForm(f=>({...f,identifiant:e.target.value}))}/>
        <Lbl t={modal==="add"?"Mot de passe *":"Nouveau mot de passe"}><input type="password" value={form.password} onChange={e=>setForm(f=>({...f,password:e.target.value}))} style={iSt()}/></Lbl>
        <Slt label="Rôle" value={form.role} onChange={e=>setForm(f=>({...f,role:e.target.value}))} opts={["Administrateur","Directeur","Secrétaire","Professeur","Comptable"]}/>
        <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}><Btn ch="Annuler" v="ghost" onClick={()=>setModal(null)}/><Btn ch={loading?"...":"Enregistrer"} v="success" onClick={save} disabled={loading}/></div>
      </Modal>}
    </div>
  );
}

// ── NAV ───────────────────────────────────────────────────────────────────────
const NAV=[
  {id:"dashboard",l:"Tableau de bord",icon:"📊"},
  {id:"classes",l:"Classes",icon:"🏫"},
  {id:"matieres",l:"Matières",icon:"📖"},
  {id:"eleves",l:"Élèves",icon:"👨‍🎓"},
  {id:"notes",l:"Saisie des notes",icon:"📝"},
  {id:"bulletins",l:"Bulletins",icon:"📄"},
  {id:"paiements",l:"Paiements",icon:"💰"},
  {id:"presences",l:"Présences",icon:"📅"},
  {id:"messagerie",l:"Messagerie",icon:"💬"},
  {id:"utilisateurs",l:"Utilisateurs",icon:"👤"},
];

// ── APP PRINCIPALE ────────────────────────────────────────────────────────────
export default function App() {
  const [screen,setScreen]=useState("activation");
  const [codeActivation,setCodeActivation]=useState("");
  const [currentUser,setCurrentUser]=useState(null);
  const [etab,setEtab]=useState(null);
  const [page,setPage]=useState("dashboard");

  const {data,syncStatus,toast,ops}=useSupabaseData(etab?.id);

  useEffect(()=>{const l=document.createElement("link");l.href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap";l.rel="stylesheet";document.head.appendChild(l);},[]);

  if(screen==="activation") return <ActivationScreen onDone={c=>{setCodeActivation(c);setScreen("check");}}/>;

  if(screen==="check") {
    // Vérifier si l'école existe déjà
    useEffect(()=>{
      sb.from("etablissements").select("*").eq("code_activation",codeActivation).single()
        .then(({data:e})=>{if(e){setEtab(e);setScreen("login");}else setScreen("onboarding");});
    },[]);
    return <div style={{minHeight:"100vh",background:"linear-gradient(135deg,#0f172a,#1a56db)",display:"flex",alignItems:"center",justifyContent:"center"}}><div style={{color:"#fff",fontSize:18,fontWeight:700}}>⏳ Chargement...</div></div>;
  }

  if(screen==="onboarding") return <Onboarding codeActivation={codeActivation} onDone={(e,a)=>{setEtab(e);setCurrentUser(a);setScreen("app");}}/>;
  if(screen==="login") return <Login onLogin={(u,e)=>{setCurrentUser(u);setEtab(e||etab);setScreen("app");}}/>;

  const pages={
    dashboard:<Dashboard data={data} etab={etab||{}} setPage={setPage}/>,
    classes:<Classes data={data} ops={ops}/>,
    matieres:<Matieres data={data} ops={ops}/>,
    eleves:<Eleves data={data} ops={ops} etab={etab||{}}/>,
    notes:<Notes data={data} ops={ops} etab={etab||{}}/>,
    bulletins:<Bulletins data={data} etab={etab||{}}/>,
    paiements:<Paiements data={data} ops={ops} etab={etab||{}}/>,
    presences:<Presences data={data} ops={ops} etab={etab||{}}/>,
    messagerie:<Messagerie data={data} ops={ops} currentUser={currentUser}/>,
    utilisateurs:<Utilisateurs data={data} ops={ops} currentUser={currentUser}/>,
  };

  return(
    <div style={{display:"flex",height:"100vh",fontFamily:"'Plus Jakarta Sans',sans-serif",background:"#f0f4f8"}}>
      {toast&&<Toast msg={toast.msg} type={toast.type}/>}
      <div style={{width:210,background:"#0f172a",display:"flex",flexDirection:"column",flexShrink:0}}>
        <div style={{padding:"18px 13px",borderBottom:"1px solid rgba(255,255,255,0.07)"}}>
          <div style={{display:"flex",alignItems:"center",gap:9,marginBottom:11}}>
            <div style={{width:36,height:36,borderRadius:10,background:"#1a56db",display:"flex",alignItems:"center",justifyContent:"center",fontSize:17}}>🎓</div>
            <div><div style={{fontWeight:900,fontSize:15,color:"#fff",letterSpacing:-0.5}}>MonEcole</div><div style={{fontSize:9,color:"rgba(255,255,255,0.32)"}}>v4.0 · Cloud</div></div>
          </div>
          <div style={{padding:"9px 11px",background:"rgba(255,255,255,0.06)",borderRadius:9,border:"1px solid rgba(255,255,255,0.07)",marginBottom:8}}>
            <div style={{fontSize:10,color:"rgba(255,255,255,0.37)",marginBottom:1}}>Connecté</div>
            <div style={{fontSize:11,fontWeight:700,color:"#fff",marginBottom:3}}>{currentUser?.prenom} {currentUser?.nom}</div>
            <Badge role={currentUser?.role}/>
          </div>
          <div style={{display:"flex",justifyContent:"center"}}><SyncBadge status={syncStatus}/></div>
        </div>
        <nav style={{flex:1,padding:"8px 6px",overflowY:"auto"}}>
          {NAV.map(n=>(
            <button key={n.id} onClick={()=>setPage(n.id)} style={{width:"100%",display:"flex",alignItems:"center",gap:8,padding:"8px 10px",borderRadius:8,border:"none",cursor:"pointer",textAlign:"left",marginBottom:1,background:page===n.id?"#1a56db":"transparent",color:page===n.id?"#fff":"rgba(255,255,255,0.46)",fontWeight:page===n.id?700:500,fontSize:11,fontFamily:"'Plus Jakarta Sans',sans-serif",transition:"all 0.12s"}}
              onMouseOver={e=>{if(page!==n.id)e.currentTarget.style.background="rgba(255,255,255,0.05)";}}
              onMouseOut={e=>{if(page!==n.id)e.currentTarget.style.background="transparent";}}>
              <span style={{fontSize:14}}>{n.icon}</span>{n.l}
            </button>
          ))}
        </nav>
        <div style={{padding:"10px 6px",borderTop:"1px solid rgba(255,255,255,0.07)"}}>
          <div style={{fontSize:9,color:"rgba(255,255,255,0.24)",textAlign:"center",marginBottom:6,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{etab?.nom||"MonEcole"}</div>
          <button onClick={()=>{setCurrentUser(null);setScreen("login");}} style={{width:"100%",background:"rgba(239,68,68,0.13)",color:"#fca5a5",border:"1px solid rgba(239,68,68,0.17)",borderRadius:8,padding:"7px",cursor:"pointer",fontSize:10,fontWeight:700,fontFamily:"'Plus Jakarta Sans',sans-serif"}}>🚪 Déconnexion</button>
        </div>
      </div>
      <div style={{flex:1,overflowY:"auto",padding:"26px 28px"}}>{pages[page]}</div>
    </div>
  );
}
