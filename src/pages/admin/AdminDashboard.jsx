// src/pages/admin/AdminDashboard.jsx  ── RONDA 6
//
// CAMBIOS v6 (cierre de checklist):
// #22 — useConfirm / ConfirmDialog propio reemplazado por useNotify (NotifyDialog)
//        para consistencia visual con el EmployeeDashboard.
// #27 — calcPrice local eliminado. Ahora se usa calcServicePrice() de pricingRules.js
//        en CalendarModal al crear/editar citas desde el calendario admin.
//        El precio estimado ahora refleja los precios exactos del catálogo.
//
// Mantiene de v5: toLocalISO() para fix de timezone, todos los módulos CRUD,
// CalendarModal completo con vistas mes/semana/día.

import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useData }   from '../../contexts/DataContext';
import { useAuth }   from '../../contexts/AuthContext';
import { appointmentsApi, usersApi } from '../../api/apiClient';
import * as XLSX from 'xlsx';
import {
    FaCut, FaPaw, FaSignOutAlt, FaUserShield, FaUsers,
    FaFileExcel, FaCalendarAlt, FaClock, FaCashRegister,
    FaSearch, FaBoxOpen, FaCartPlus, FaReceipt, FaTrashAlt,
    FaTachometerAlt, FaUserCog, FaTimes, FaChartBar,
    FaExclamationTriangle, FaDollarSign, FaSync,
    FaNotesMedical, FaChevronLeft, FaChevronRight,
    FaUserTie, FaExternalLinkAlt, FaPlus
} from 'react-icons/fa';
import {
    FAB, DSModal, StatusBadge, StatusSelector,
    ClientCard, ClientFormModal,
    PetCard, PetFormModal,
    ServiceCard as DSServiceCard, ServiceFormModal,
    ProductCard, ProductFormModal,
    UserCard, UserFormModal
} from '../../components/shared/DashboardShared';
import { useNotify } from '../../components/shared/NotifyDialog';
import '../../components/shared/DashboardShared.css';
import '../../components/shared/NotifyDialog.css';
import { STATUS_COLORS, STATUS_EMOJI, STATUS_TRANSITIONS, STATUS_ACTION_LABEL, validateSlot } from '../../utils/apptStatus';
import { calcServicePrice } from '../../utils/pricingRules';
import './AdminDashboard.css';

// ─── Helpers ──────────────────────────────────────────────────────────────────
// FIX timezone: construye YYYY-MM-DD desde fecha LOCAL, sin pasar por UTC.
const toLocalISO = (d) => {
    if (!d) return '';
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
};

const todayISO = () => toLocalISO(new Date());
const parseDate = (s) => { if(!s)return null; const str=String(s); if(/^\d{4}-\d{2}-\d{2}$/.test(str))return new Date(str+'T12:00:00'); const p=str.split(/[\/\-T]/); if(p[0].length===4)return new Date(str); return new Date(`${p[2]}-${p[1].padStart(2,'0')}-${p[0].padStart(2,'0')}T12:00:00`); };
const isSameMonth = (d,y,m) => { const p=parseDate(d); return p&&!isNaN(p)&&p.getFullYear()===y&&p.getMonth()===m; };
const isSameDay   = (d,o)   => { const p=parseDate(d); return p&&!isNaN(p)&&p.getFullYear()===o.getFullYear()&&p.getMonth()===o.getMonth()&&p.getDate()===o.getDate(); };
const parseTime   = (t)     => { if(!t)return 8*60; const[h,m]=t.split(':').map(Number); return h*60+(m||0); };
const formatDateLong = (s)  => { if(!s)return''; return new Date(s+'T12:00:00').toLocaleDateString('es-MX',{weekday:'long',day:'numeric',month:'long'}); };
const hueFromId = (id) => { const n=typeof id==='string'?id.split('').reduce((a,c)=>a+c.charCodeAt(0),0):Number(id); return(n*137)%360; };
const buildGCalLink = (a) => { const ds=(a.date||todayISO()).replace(/-/g,'');const ts=(a.time||'10:15').replace(':','');const s=`${ds}T${ts}00`;const eh=String(Number((a.time||'10:15').split(':')[0])+1).padStart(2,'0');const e=`${ds}T${eh}${(a.time||'10:15').split(':')[1]}00`;return`https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(`Cita: ${a.petName} — ${a.serviceName}`)}&dates=${s}/${e}&details=${encodeURIComponent(`Servicio: ${a.serviceName}\nMascota: ${a.petName}\nImporte: $${a.finalPrice}`)}`; };

const MONTH_NAMES=['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const MONTH_SHORT=['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
const DAYS_SHORT=['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];
const HOURS=Array.from({length:9},(_,i)=>i+9); // 9am-5pm aprox

// ─── Toast ────────────────────────────────────────────────────────────────────
const Toast = ({message,type,onClose}) => {
    useEffect(()=>{const t=setTimeout(onClose,3500);return()=>clearTimeout(t);},[onClose]);
    return <div className={`toast toast--${type}`}><span>{message}</span><button onClick={onClose}><FaTimes/></button></div>;
};
const useToast = () => {
    const [toasts,setToasts]=useState([]);
    const addToast    = useCallback((m,t='info')=>setToasts(p=>[...p,{id:Date.now()+Math.random(),message:m,type:t}]),[]);
    const removeToast = useCallback((id)=>setToasts(p=>p.filter(t=>t.id!==id)),[]);
    return {toasts,addToast,removeToast};
};

// ─── Modal genérico admin ─────────────────────────────────────────────────────
const Modal = ({title,onClose,children,wide,fullscreen}) => (
    <div className="modal-overlay" onClick={onClose}>
        <div className={`modal-box ${wide?'modal-wide':''} ${fullscreen?'modal-fullscreen':''}`} onClick={e=>e.stopPropagation()}>
            <div className="modal-header"><h3>{title}</h3><button className="modal-close" onClick={onClose}><FaTimes/></button></div>
            <div className="modal-body">{children}</div>
        </div>
    </div>
);

// ─── Appt Detail Popup ────────────────────────────────────────────────────────
const ApptDetailPopup = ({appt,anchor,pets,clients,users,role,onStatusChange,onFinalize,onDelete,onClose}) => {
    const ref=useRef(null);
    const [pos,setPos]=useState({top:0,left:0});
    const pet=pets.find(p=>String(p.id)===String(appt.petId));
    const owner=pet?clients.find(c=>String(c.id)===String(pet.ownerId)):null;
    const emp=users.find(u=>String(u.id)===String(appt.assignedTo));
    const sc=STATUS_COLORS[appt.status]||STATUS_COLORS['Pendiente'];
    const transitions=STATUS_TRANSITIONS[role]||STATUS_TRANSITIONS.admin;
    const actionDef=(STATUS_ACTION_LABEL[role]||STATUS_ACTION_LABEL.admin)[appt.status];

    useEffect(()=>{
        if(!anchor||!ref.current)return;
        const W=window.innerWidth,H=window.innerHeight,PW=310,PH=ref.current.offsetHeight||380;
        let left=anchor.left+anchor.width/2-PW/2;
        left=Math.max(12,Math.min(left,W-PW-12));
        let top=anchor.bottom+8;
        if(top+PH>H-12)top=anchor.top-PH-8;
        setPos({top:Math.max(12,top),left});
    },[anchor]);
    useEffect(()=>{const h=(e)=>{if(ref.current&&!ref.current.contains(e.target))onClose();};const t=setTimeout(()=>document.addEventListener('mousedown',h),80);return()=>{clearTimeout(t);document.removeEventListener('mousedown',h);};},[onClose]);
    useEffect(()=>{const h=(e)=>{if(e.key==='Escape')onClose();};document.addEventListener('keydown',h);return()=>document.removeEventListener('keydown',h);},[onClose]);

    const handleAction = () => {
        if(!actionDef)return;
        if(actionDef.style==='finish'){onFinalize(appt);onClose();}
        else{onStatusChange(appt,transitions[appt.status]?.[0]);onClose();}
    };

    return <>
        <div className="appt-popup-backdrop" onClick={onClose}/>
        <div ref={ref} className="adp" style={{position:'fixed',top:pos.top,left:pos.left,zIndex:3000}}>
            <div className="adp-bar" style={{background:sc.border}}/>
            <div className="adp-header">
                <div className="appt-popup-avatar" style={{background:`hsl(${hueFromId(appt.petId)},65%,60%)`}}>{pet?.petName?.[0]?.toUpperCase()||'?'}</div>
                <div className="appt-popup-title">
                    <strong>{pet?.petName||'Mascota'}</strong>
                    <span>{pet?.breed||'—'} · {pet?.weight ? `~${pet.weight} kg` : 'peso por verificar'}</span>
                    {owner&&<span className="appt-popup-owner">{owner.name}{owner.phone?` · ${owner.phone}`:''}</span>}
                    {emp&&<span className="appt-popup-assigned"><FaUserTie/> {emp.name}</span>}
                </div>
                <button className="appt-popup-close" onClick={onClose}><FaTimes/></button>
            </div>
            <div className="adp-body">
                <div className="adp-row"><FaClock className="adp-icon"/><span>{appt.time||'—'} · {appt.date}</span></div>
                <div className="adp-row"><FaNotesMedical className="adp-icon"/><span>{appt.serviceName||'—'}</span><strong className="adp-price">~${appt.finalPrice||0}</strong></div>
                <div className="adp-row">
                    <StatusSelector current={appt.status||'Pendiente'} transitions={transitions}
                        onSelect={(newStatus)=>{onStatusChange(appt,newStatus);onClose();}}/>
                </div>
                {pet?.notes&&<div className="appt-popup-notes"><span className="appt-popup-notes-label">Notas</span><p>{pet.notes}</p></div>}
            </div>
            <div className="adp-footer">
                {actionDef&&<button className={`ds-btn ds-btn--${actionDef.style} adp-action-btn`} onClick={handleAction}>
                    {actionDef.icon} {actionDef.label} {actionDef.style==='finish'?`$${appt.finalPrice}`:''}
                </button>}
                <div className="adp-footer-row">
                    <a href={buildGCalLink(appt)} target="_blank" rel="noopener noreferrer" className="adp-gcal-btn"><FaExternalLinkAlt/> Google Calendar</a>
                    {onDelete&&<button className="adp-del-btn" onClick={()=>{onDelete(appt.id);onClose();}}><FaTimes/></button>}
                </div>
            </div>
        </div>
    </>;
};

// ─── Gráficas ─────────────────────────────────────────────────────────────────
const ServiceChart = ({sales,services}) => {
    const cats=useMemo(()=>{const now=new Date(),map={};sales.forEach(s=>{if(!isSameMonth(s.date,now.getFullYear(),now.getMonth()))return;const svc=services.find(sv=>String(s.item).toLowerCase().includes(sv.title?.toLowerCase()));map[svc?.category||'Otros']=(map[svc?.category||'Otros']||0)+Number(s.price);});return Object.entries(map).sort((a,b)=>b[1]-a[1]);},[sales,services]);
    const max=Math.max(...cats.map(c=>c[1]),1);
    const COLORS=['#74b9ff','#a29bfe','#55efc4','#fdcb6e','#ff7675'];
    return <div className="service-chart">{cats.length===0?<p className="empty-chart">Sin datos</p>:cats.map(([cat,total],i)=><div key={cat} className="svc-bar-row"><span className="svc-bar-label">{cat}</span><div className="svc-bar-track"><div className="svc-bar-fill" style={{width:`${(total/max)*100}%`,background:COLORS[i%5]}}/></div><span className="svc-bar-val">${total.toLocaleString()}</span></div>)}</div>;
};
const WeeklyChart = ({sales}) => {
    const tod=new Date().getDay();
    const totals=useMemo(()=>{const m=[0,0,0,0,0,0,0],now=new Date();sales.forEach(s=>{const d=parseDate(s.date);if(!d||isNaN(d))return;const diff=Math.floor((now-d)/86400000);if(diff>=0&&diff<7)m[d.getDay()]+=Number(s.price)||0;});return m;},[sales]);
    const max=Math.max(...totals,1);
    const DAYS=['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];
    return <div className="weekly-chart-wrap"><div className="chart-bars">{totals.map((v,i)=><div key={i} className="chart-col"><span className="chart-val">{v>0?`$${v}`:''}</span><div className={`chart-bar ${i===tod?'today':''}`} style={{height:`${Math.max((v/max)*80,4)}px`}}/><span className="chart-day">{DAYS[i]}</span></div>)}</div></div>;
};

// ─── Calendar Modal ───────────────────────────────────────────────────────────
const CalendarModal = ({appointments,pets,clients,services,users,role,onClose,onRefresh,onAddAppointment,onStatusChange,onFinalize,onDeleteAppt}) => {
    const now=new Date();
    const [viewDate,setViewDate]=useState(new Date(now.getFullYear(),now.getMonth(),1));
    const [calView,setCalView]=useState('week');
    const [dayDate,setDayDate]=useState(new Date(now));
    const [selAppt,setSelAppt]=useState(null);
    const [anchor,setAnchor]=useState(null);
    const [showForm,setShowForm]=useState(false);
    const [saving,setSaving]=useState(false);
    const [slotError,setSlotError]=useState('');
    const empleados=users.filter(u=>u.role==='empleado');
    const [newAppt,setNewAppt]=useState({petId:'',serviceId:'',assignedTo:'',date:todayISO(),time:'',status:'Pendiente',finalPrice:0});

    // FIX #27: usar calcServicePrice en lugar del multiplicador genérico
    useEffect(()=>{
        if(newAppt.petId && newAppt.serviceId){
            const pet = pets.find(p=>String(p.id)===String(newAppt.petId));
            const svc = services.find(s=>String(s.id)===String(newAppt.serviceId));
            if(pet && svc){
                const price = calcServicePrice(svc, pet.weight);
                setNewAppt(f=>({...f, finalPrice: price}));
            }
        }
        setSlotError('');
    },[newAppt.petId, newAppt.serviceId, newAppt.date, newAppt.time]);

    const apptsByDate=useMemo(()=>{const m={};appointments.forEach(a=>{if(!m[a.date])m[a.date]=[];m[a.date].push(a);});return m;},[appointments]);

    const goBack=()=>{if(calView==='month'){setViewDate(new Date(viewDate.getFullYear(),viewDate.getMonth()-1,1));}else{const d=new Date(dayDate);d.setDate(d.getDate()-(calView==='week'?7:1));setDayDate(d);}};
    const goNext=()=>{if(calView==='month'){setViewDate(new Date(viewDate.getFullYear(),viewDate.getMonth()+1,1));}else{const d=new Date(dayDate);d.setDate(d.getDate()+(calView==='week'?7:1));setDayDate(d);}};
    const goToday=()=>{setViewDate(new Date(now.getFullYear(),now.getMonth(),1));setDayDate(new Date(now));};
    const switchView=(v)=>{const c=new Date(viewDate.getFullYear(),viewDate.getMonth(),1);const isCur=viewDate.getFullYear()===now.getFullYear()&&viewDate.getMonth()===now.getMonth();if(v!=='month')setDayDate(isCur?new Date(now):c);setCalView(v);};
    const headerLabel=()=>{if(calView==='month')return`${MONTH_NAMES[viewDate.getMonth()]} ${viewDate.getFullYear()}`;if(calView==='day')return formatDateLong(toLocalISO(dayDate));const s=new Date(dayDate);s.setDate(s.getDate()-s.getDay());const e=new Date(s);e.setDate(e.getDate()+6);return`${s.getDate()} — ${e.getDate()} ${MONTH_NAMES[e.getMonth()]}`;};

    const openPopup=(appt,e)=>{e.stopPropagation();setAnchor(e.currentTarget.getBoundingClientRect());setSelAppt(appt);};
    const closePopup=()=>{setSelAppt(null);setAnchor(null);};

    const handleCreate=async(e)=>{
        e.preventDefault();
        const check=validateSlot(appointments,newAppt.date,newAppt.time,empleados);
        if(!check.ok){setSlotError(check.message);return;}
        setSaving(true);
        try{
            const svc=services.find(s=>String(s.id)===String(newAppt.serviceId));
            const pet=pets.find(p=>String(p.id)===String(newAppt.petId));
            await onAddAppointment({...newAppt,serviceName:svc?.title,petName:pet?.petName});
            setShowForm(false);
            setNewAppt({petId:'',serviceId:'',assignedTo:'',date:todayISO(),time:'',status:'Pendiente',finalPrice:0});
            setSlotError('');
        }finally{setSaving(false);}
    };

    const EventChip=({appt,style='chip'})=>{
        const sc=STATUS_COLORS[appt.status]||STATUS_COLORS['Pendiente'];
        const cls=style==='block'?'admin-cal-event-block':'admin-cal-event-chip';
        return <div className={cls} style={{background:sc.bg,borderLeft:`3px solid ${sc.border}`,color:sc.text}} onClick={ev=>openPopup(appt,ev)} title={`${appt.petName} · ${appt.serviceName} · ${STATUS_EMOJI[appt.status]} ${appt.status}`}>
            {style==='block'&&<><strong>{appt.time}</strong><span>{appt.petName}</span><span>{appt.serviceName}</span></>}
            {style==='chip'&&<>{appt.time} {appt.petName}</>}
            <span style={{background:sc.dot,display:'inline-block',width:6,height:6,borderRadius:'50%',marginLeft:4}}/>
        </div>;
    };

    const MonthView=()=>{
        const y=viewDate.getFullYear(),m=viewDate.getMonth();
        const first=new Date(y,m,1).getDay();
        const days=new Date(y,m+1,0).getDate();
        const cells=Array.from({length:first+days},(_,i)=>i<first?null:i-first+1);
        while(cells.length%7!==0)cells.push(null);
        return <div className="admin-cal-month">
            <div className="admin-cal-month-header">{DAYS_SHORT.map(d=><div key={d} className="admin-cal-day-label">{d}</div>)}</div>
            <div className="admin-cal-month-grid">
                {cells.map((day,i)=>{
                    if(!day)return<div key={i} className="admin-cal-cell admin-cal-cell--empty"/>;
                    const ds=`${y}-${String(m+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
                    const da=apptsByDate[ds]||[];
                    const isToday=day===now.getDate()&&m===now.getMonth()&&y===now.getFullYear();
                    return <div key={i} className={`admin-cal-cell ${isToday?'admin-cal-cell--today':''}`} onClick={()=>{setDayDate(new Date(y,m,day));switchView('day');}}>
                        <span className="admin-cal-cell-num">{day}</span>
                        {da.slice(0,3).map(a=><EventChip key={a.id} appt={a} style='chip'/>)}
                        {da.length>3&&<div className="admin-cal-more">+{da.length-3} más</div>}
                    </div>;
                })}
            </div>
        </div>;
    };

    const WeekView=()=>{
        const s=new Date(dayDate);s.setDate(s.getDate()-s.getDay());
        const wd=Array.from({length:7},(_,i)=>{const d=new Date(s);d.setDate(s.getDate()+i);return d;});
        return <div className="admin-cal-week">
            <div className="admin-cal-week-header">
                <div className="admin-cal-gutter"/>
                {wd.map((d,i)=>{const isToday=d.toDateString()===now.toDateString();return<div key={i} className={`admin-cal-wdl ${isToday?'today':''}`} onClick={()=>{setDayDate(d);setCalView('day');}}>
                    <span className="wdl-name">{DAYS_SHORT[d.getDay()]}</span>
                    <span className={`wdl-num ${isToday?'wdl-today-circle':''}`}>{d.getDate()}</span>
                </div>;})}
            </div>
            <div className="admin-cal-week-scroll">
                {HOURS.map(h=><div key={h} className="admin-cal-hour-row">
                    <div className="admin-cal-time-label">{h}:00</div>
                    {wd.map((d,di)=>{
                        const ds=toLocalISO(d); // FIX timezone
                        const slot=(apptsByDate[ds]||[]).filter(a=>{const min=parseTime(a.time);return min>=h*60&&min<(h+1)*60;});
                        return <div key={di} className="admin-cal-hour-cell">{slot.map(a=><EventChip key={a.id} appt={a} style='block'/>)}</div>;
                    })}
                </div>)}
            </div>
        </div>;
    };

    const DayView=()=>{
        const ds=toLocalISO(dayDate); // FIX timezone
        const da=(apptsByDate[ds]||[]).sort((a,b)=>parseTime(a.time)-parseTime(b.time));
        return <div className="admin-cal-day">
            <div className="admin-cal-day-label">{formatDateLong(ds)}<span className="admin-cal-day-count">{da.length} cita{da.length!==1?'s':''}</span></div>
            <div className="admin-cal-day-scroll">
                {HOURS.map(h=>{
                    const slot=da.filter(a=>{const min=parseTime(a.time);return min>=h*60&&min<(h+1)*60;});
                    return <div key={h} className="admin-cal-day-row">
                        <div className="admin-cal-time-label">{h}:00</div>
                        <div className="admin-cal-day-events">
                            {slot.map(a=>{
                                const sc=STATUS_COLORS[a.status]||STATUS_COLORS['Pendiente'];
                                const pet=pets.find(p=>String(p.id)===String(a.petId));
                                const owner=pet?clients.find(cl=>String(cl.id)===String(pet.ownerId)):null;
                                const emp=users.find(u=>String(u.id)===String(a.assignedTo));
                                return <div key={a.id} className="admin-cal-day-event" style={{background:sc.bg,borderLeft:`5px solid ${sc.border}`,color:sc.text}} onClick={ev=>openPopup(a,ev)}>
                                    <div className="admin-cal-day-event-top"><strong>{a.time} — {a.petName}</strong><StatusBadge status={a.status}/></div>
                                    <span>{a.serviceName}</span>
                                    {owner&&<span className="admin-cal-owner">{owner.name}</span>}
                                    {emp&&<span className="admin-cal-emp"><FaUserTie/> {emp.name}</span>}
                                    <span className="admin-cal-price">~${a.finalPrice}</span>
                                </div>;
                            })}
                        </div>
                    </div>;
                })}
            </div>
        </div>;
    };

    return <>
        <Modal title={`Agenda — ${headerLabel()}`} onClose={onClose} fullscreen>
            <div className="admin-cal-toolbar">
                <div className="admin-cal-nav">
                    <button className="cal-nav-btn" onClick={goBack}><FaChevronLeft/></button>
                    <button className="cal-today-btn" onClick={goToday}>Hoy</button>
                    <button className="cal-nav-btn" onClick={goNext}><FaChevronRight/></button>
                    <span className="cal-period-label">{headerLabel()}</span>
                </div>
                <div className="admin-cal-controls">
                    {['month','week','day'].map(v=><button key={v} className={`cal-view-btn ${calView===v?'active':''}`} onClick={()=>switchView(v)}>{v==='month'?'Mes':v==='week'?'Semana':'Día'}</button>)}
                    <button className="btn-icon-round" onClick={onRefresh} style={{background:'var(--accent-mint)',color:'#04342C'}}><FaSync/></button>
                    <button className="btn-primary btn-sm" onClick={()=>setShowForm(v=>!v)}><FaPlus/> Nueva cita</button>
                </div>
            </div>

            <div className="cal-legend">
                {Object.entries(STATUS_COLORS).map(([s,c])=>(
                    <span key={s} className="cal-legend-item">
                        <span style={{background:c.dot,display:'inline-block',width:8,height:8,borderRadius:'50%'}}/>
                        {s}
                    </span>
                ))}
            </div>

            {showForm&&<form className="admin-cal-appt-form" onSubmit={handleCreate}>
                <div className="admin-cal-form-grid">
                    <select value={newAppt.petId} onChange={e=>setNewAppt({...newAppt,petId:e.target.value})} required>
                        <option value="">Paciente...</option>
                        {pets.map(p=><option key={p.id} value={p.id}>{p.petName} {p.weight?`(~${p.weight}kg)`:''}</option>)}
                    </select>
                    <select value={newAppt.serviceId} onChange={e=>setNewAppt({...newAppt,serviceId:e.target.value})} required>
                        <option value="">Servicio...</option>
                        {services.map(s=><option key={s.id} value={s.id}>{s.title}</option>)}
                    </select>
                    <select value={newAppt.assignedTo} onChange={e=>setNewAppt({...newAppt,assignedTo:e.target.value})}>
                        <option value="">¿Quién atiende?</option>
                        {empleados.map(u=><option key={u.id} value={u.id}>{u.name} (cap.{u.capacity||1})</option>)}
                    </select>
                    <input type="date" value={newAppt.date} onChange={e=>setNewAppt({...newAppt,date:e.target.value})} required/>
                    <input type="time" value={newAppt.time} onChange={e=>setNewAppt({...newAppt,time:e.target.value})} required/>
                    {newAppt.finalPrice>0&&<div className="appo-price-preview" style={{gridColumn:'span 2'}}>
                        Estimado según catálogo: <strong>~${newAppt.finalPrice}</strong>
                    </div>}
                </div>
                {slotError&&<div className="cal-slot-error"><FaExclamationTriangle/> {slotError}</div>}
                <div className="form-actions form-actions--end">
                    <button type="button" className="btn-secondary" onClick={()=>{setShowForm(false);setSlotError('');}}>Cancelar</button>
                    <button type="submit" className="btn-primary" disabled={saving}>{saving?'Guardando...':'Confirmar cita'}</button>
                </div>
            </form>}

            <div className="admin-cal-view">
                {calView==='month'&&<MonthView/>}
                {calView==='week'&&<WeekView/>}
                {calView==='day'&&<DayView/>}
            </div>
        </Modal>
        {selAppt&&anchor&&<ApptDetailPopup appt={selAppt} anchor={anchor} pets={pets} clients={clients} users={users} role={role||'admin'}
            onStatusChange={(a,s)=>{onStatusChange(a,s);closePopup();}}
            onFinalize={(a)=>{onFinalize(a);closePopup();}}
            onDelete={(id)=>{onDeleteAppt(id);closePopup();}}
            onClose={closePopup}/>}
    </>;
};

// ─── Modales de reporte ───────────────────────────────────────────────────────
const SalesModal = ({sales,onClose}) => {
    const now=new Date();
    const months=Array.from({length:4},(_,i)=>{const d=new Date(now.getFullYear(),now.getMonth()-i,1);return{label:`${MONTH_SHORT[d.getMonth()]} ${d.getFullYear()}`,year:d.getFullYear(),month:d.getMonth()};});
    const [sel,setSel]=useState(0);
    const {year,month}=months[sel];
    const filtered=sales.filter(s=>isSameMonth(s.date,year,month));
    const total=filtered.reduce((a,s)=>a+Number(s.price),0);
    const exportExcel=()=>{const ws=XLSX.utils.json_to_sheet(filtered.map(s=>({Fecha:s.date,Descripción:s.item,Monto:s.price})));const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,'Ventas');XLSX.writeFile(wb,`Ventas_${months[sel].label}.xlsx`);};
    return <Modal title="Ventas del mes" onClose={onClose} wide>
        <div className="modal-filters">{months.map((m,i)=><button key={i} className={`pill-btn ${sel===i?'active':''}`} onClick={()=>setSel(i)}>{m.label}</button>)}<button className="pill-btn export-btn" onClick={exportExcel}><FaFileExcel/> Exportar</button></div>
        <div className="modal-summary-row"><span>Total</span><span className="modal-total">${total.toLocaleString()}</span></div>
        <table className="modal-table"><thead><tr><th>Fecha</th><th>Descripción</th><th>Monto</th></tr></thead><tbody>{filtered.length===0?<tr><td colSpan="3" className="empty-td">Sin ventas</td></tr>:filtered.slice().reverse().map(s=><tr key={s.id}><td>{s.date}</td><td>{s.item}</td><td className="td-amount">${Number(s.price).toLocaleString()}</td></tr>)}</tbody></table>
    </Modal>;
};

const ClientsReportModal = ({sales,clients,onClose}) => {
    const [date,setDate]=useState(todayISO());
    const dObj=new Date(date+'T12:00:00');
    const daySales=sales.filter(s=>isSameDay(s.date,dObj));
    const total=daySales.reduce((a,s)=>a+Number(s.price),0);
    const byC=daySales.reduce((acc,s)=>{const k=s.clientId||'__';if(!acc[k])acc[k]=[];acc[k].push(s);return acc;},{});
    return <Modal title="Reporte por día" onClose={onClose} wide>
        <div className="modal-filters"><input type="date" value={date} onChange={e=>setDate(e.target.value)} className="date-input"/></div>
        <div className="modal-summary-row"><span>Total del día</span><span className="modal-total">${total.toLocaleString()}</span></div>
        {Object.keys(byC).length===0?<p className="empty-td">Sin ventas</p>:Object.entries(byC).map(([cid,cs])=>{const c=clients.find(cl=>String(cl.id)===String(cid));const sub=cs.reduce((a,s)=>a+Number(s.price),0);return<div key={cid} className="client-report-block"><div className="client-report-header"><div className="pet-avatar-sm" style={{background:'#eef2ff',color:'#3730a3'}}>{c?.name?.[0]?.toUpperCase()||'?'}</div><strong>{c?.name||'Sin cliente'}</strong><span className="td-amount">${sub.toLocaleString()}</span></div><div className="client-report-items">{cs.map(s=><div key={s.id} className="client-report-item"><span>{s.item}</span><span className="muted-text">${Number(s.price).toLocaleString()}</span></div>)}</div></div>;})}
    </Modal>;
};

const StockModal = ({products,onClose}) => {
    const cr=products.filter(p=>Number(p.stock)<5).sort((a,b)=>Number(a.stock)-Number(b.stock));
    return <Modal title="Stock crítico" onClose={onClose}>{cr.length===0?<p className="empty-td">Todo bien ✓</p>:cr.map(p=><div key={p.id} className="stock-critical-row"><div><strong>{p.name}</strong><span className="muted-text"> · {p.category}</span></div><div className="stock-badge-wrap"><span className={`stock-badge ${p.stock<=1?'danger':'warning'}`}>{p.stock} unid.</span></div></div>)}</Modal>;
};

// ─── GlobalSearchPanel ────────────────────────────────────────────────────────
const GlobalSearchPanel = ({query,clients,pets,services,products,onNavigate,onClose}) => {
    if(!query||query.length<2)return null;
    const q=query.toLowerCase();
    const res={clientes:clients.filter(c=>c.name?.toLowerCase().includes(q)||c.phone?.includes(q)),pacientes:pets.filter(p=>p.petName?.toLowerCase().includes(q)||p.breed?.toLowerCase().includes(q)),servicios:services.filter(s=>s.title?.toLowerCase().includes(q)),productos:products.filter(p=>p.name?.toLowerCase().includes(q))};
    const labels={clientes:'Clientes',pacientes:'Pacientes',servicios:'Servicios',productos:'Inventario'};
    const icons={clientes:'👤',pacientes:'🐾',servicios:'✂️',productos:'📦'};
    const nameOf={clientes:i=>i.name,pacientes:i=>i.petName,servicios:i=>i.title,productos:i=>i.name};
    const total=Object.values(res).reduce((a,arr)=>a+arr.length,0);
    if(total===0)return<div className="search-panel"><p className="search-panel-empty">Sin resultados para "{query}"</p></div>;
    return<div className="search-panel">{Object.entries(res).map(([k,items])=>{if(!items.length)return null;return<div key={k} className="search-section"><div className="search-section-label">{icons[k]} {labels[k]} <span className="search-count">{items.length}</span></div>{items.slice(0,4).map(item=><div key={item.id} className="search-result-row" onClick={()=>{onNavigate(k);onClose();}}><span className="search-result-name">{nameOf[k](item)}</span></div>)}{items.length>4&&<div className="search-more" onClick={()=>{onNavigate(k);onClose();}}>Ver los {items.length} →</div>}</div>;})}</div>;
};

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
const AdminDashboard = () => {
    const {services,products,pets,clients,sales,addService,updateService,deleteService,addProduct,updateProduct,deleteProduct,addClient,updateClient,deleteClient,addPet,updatePet,deletePet,addSale}=useData();
    const {logout,user}=useAuth();
    const {toasts,addToast,removeToast}=useToast();
    // FIX #22: usar useNotify en lugar de useConfirm propio
    const {notify, NotifyNode} = useNotify();

    const [tab,setTab]=useState('control');
    const [searchTerm,setSearchTerm]=useState('');
    const [searchFocus,setSearchFocus]=useState(false);
    const searchRef=useRef(null);
    useEffect(()=>{const h=(e)=>{if(searchRef.current&&!searchRef.current.contains(e.target))setSearchFocus(false);};document.addEventListener('mousedown',h);return()=>document.removeEventListener('mousedown',h);},[]);
    const showSearchPanel=searchFocus&&searchTerm.length>=2;

    const [activeModal,setActiveModal]=useState(null);
    const [showCalendar,setShowCalendar]=useState(false);
    const [clientModal,setClientModal]=useState(null);
    const [petModal,setPetModal]=useState(null);
    const [serviceModal,setServiceModal]=useState(null);
    const [productModal,setProductModal]=useState(null);
    const [userModal,setUserModal]=useState(null);

    const [appointments,setAppointments]=useState([]);
    const [apptLoading,setApptLoading]=useState(false);
    const loadAppointments=useCallback(async()=>{setApptLoading(true);try{setAppointments(await appointmentsApi.getAll());}catch{addToast('Error al cargar citas','error');}finally{setApptLoading(false);}},[addToast]);
    useEffect(()=>{loadAppointments();},[loadAppointments]);

    const [users,setUsers]=useState([]);
    useEffect(()=>{usersApi.getAll().then(setUsers).catch(()=>addToast('Error usuarios','error'));},[]);
    const empleados=users.filter(u=>u.role==='empleado');

    const [cart,setCart]=useState([]);
    const [posSearch,setPosSearch]=useState('');
    const [posCategory,setPosCategory]=useState('Todos');
    const [posClientId,setPosClientId]=useState('');
    const [showCheckout,setShowCheckout]=useState(false);

    const now=new Date(),todayStr_=todayISO();
    const stats=useMemo(()=>{const ms=sales.filter(s=>isSameMonth(s.date,now.getFullYear(),now.getMonth()));const ta=appointments.filter(a=>a.date===todayStr_);return{monthSales:ms.reduce((a,s)=>a+Number(s.price),0),appointmentsCount:ta.length,totalClients:clients.length,lowStock:products.filter(p=>Number(p.stock)<5).length};},[sales,appointments,clients,products,todayStr_]);

    // ── POS ───────────────────────────────────────────────────────────────────
    const addToCart=(item,type)=>{if(type==='product'&&item.stock<=0){addToast('Sin stock','error');return;}const ex=cart.find(c=>c.id===item.id&&c.type===type);if(ex)setCart(cart.map(c=>c.id===item.id&&c.type===type?{...c,qty:c.qty+1}:c));else setCart([...cart,{...item,qty:1,type}]);};
    const removeFromCart=(id,type)=>setCart(cart.filter(c=>!(c.id===id&&c.type===type)));
    const cartTotal=cart.reduce((a,i)=>a+i.price*i.qty,0);
    const processCheckout=async()=>{if(!cart.length)return;try{const sum=cart.map(i=>`${i.qty}x ${i.name||i.title}`).join(', ');await addSale(sum,+cartTotal.toFixed(2),posClientId||null);for(const item of cart){if(item.type==='product'){const o=products.find(p=>p.id===item.id);if(o)await updateProduct(item.id,{...o,stock:o.stock-item.qty});}}setCart([]);setPosClientId('');setShowCheckout(false);addToast('¡Venta procesada!','success');}catch{addToast('Error al procesar','error');}};

    // ── CRUD con NotifyDialog ─────────────────────────────────────────────────
    const handleSaveClient=async(form)=>{try{form.id?await updateClient(form.id,form):await addClient(form);addToast(form.id?'Cliente actualizado':'Cliente guardado','success');setClientModal(null);}catch(err){addToast(`Error: ${err.message}`,'error');throw err;}};
    const handleSavePet=async(form)=>{try{form.id?await updatePet(form.id,form):await addPet(form);addToast(form.id?'Paciente actualizado':'Paciente registrado','success');setPetModal(null);}catch(err){addToast(`Error: ${err.message}`,'error');throw err;}};
    const handleSaveService=async(form)=>{try{form.id?await updateService(form.id,form):await addService(form);addToast(form.id?'Servicio actualizado':'Servicio guardado','success');setServiceModal(null);}catch(err){addToast(`Error: ${err.message}`,'error');throw err;}};
    const handleSaveProduct=async(form)=>{try{form.id?await updateProduct(form.id,form):await addProduct(form);addToast(form.id?'Producto actualizado':'Producto guardado','success');setProductModal(null);}catch(err){addToast(`Error: ${err.message}`,'error');throw err;}};
    const handleSaveUser=async(form)=>{try{const payload={...form};if(form.id&&!form.password)delete payload.password;if(form.id){const s=await usersApi.update(form.id,payload);setUsers(p=>p.map(u=>u.id===form.id?s:u));}else{const c=await usersApi.create(payload);setUsers(p=>[...p,c]);}addToast(form.id?'Usuario actualizado':'Usuario creado','success');setUserModal(null);}catch(err){addToast(`Error: ${err.message}`,'error');throw err;}};

    // FIX #22: handleDelete usa notify() en lugar de confirm() propio
    const handleDelete=async(type,id,label)=>{
        const ok=await notify({
            type: 'confirm',
            icon: '🗑️',
            accent: 'red',
            title: `¿Eliminar "${label}"?`,
            message: 'Esta acción no se puede deshacer.',
            confirmLabel: 'Sí, eliminar',
            cancelLabel:  'Cancelar',
        });
        if(!ok)return;
        try{
            if(type==='client')  await deleteClient(id);
            if(type==='pet')     await deletePet(id);
            if(type==='service') await deleteService(id);
            if(type==='product') await deleteProduct(id);
            if(type==='user')    { await usersApi.delete(id); setUsers(p=>p.filter(u=>u.id!==id)); }
            addToast('Eliminado','info');
        }catch(err){addToast(`Error: ${err.message}`,'error');}
    };

    // ── Appointments con notify() ─────────────────────────────────────────────
    const handleAddAppointment=useCallback(async(formData)=>{
        const check=validateSlot(appointments,formData.date,formData.time,empleados);
        if(!check.ok){addToast(check.message,'error');throw new Error(check.message);}
        const pet=pets.find(p=>String(p.id)===String(formData.petId));
        const dataWithClient={...formData,clientId:pet?.ownerId||formData.clientId||null};
        try{const c=await appointmentsApi.create(dataWithClient);setAppointments(p=>[...p,c]);addToast('Cita agendada','success');}
        catch(err){addToast(`Error al agendar: ${err.message}`,'error');throw err;}
    },[appointments,empleados,pets,addToast]);

    const handleStatusChange=useCallback(async(appt,newStatus)=>{
        if(!newStatus)return;
        try{
            const updated=await appointmentsApi.update(appt.id,{status:newStatus});
            setAppointments(p=>p.map(a=>a.id===appt.id?{...a,...updated}:a));
            if(newStatus==='Finalizada'){
                const pet=pets.find(p=>String(p.id)===String(appt.petId));
                await addSale(`Servicio: ${appt.serviceName} (${appt.petName})`,Number(appt.finalPrice),pet?.ownerId||null,'service');
                if(pet)await updatePet(pet.id,{...pet,history:[...(pet.history||[]),{date:todayStr_,detail:`${appt.serviceName} finalizado — $${appt.finalPrice}`,author:user?.name||'Admin'}]});
            }
            addToast(`Estado → ${newStatus}`,'success');
        }catch(err){addToast(`Error: ${err.message}`,'error');}
    },[addToast,pets,addSale,updatePet,todayStr_,user]);

    // FIX #22: handleFinalize usa notify()
    const handleFinalize=useCallback(async(appo)=>{
        const ok=await notify({
            type: 'confirm',
            icon: '🏁',
            accent: 'mint',
            title: '¿Finalizar y cobrar?',
            message: `"${appo.serviceName}" de ${appo.petName} — $${appo.finalPrice}`,
            confirmLabel: `Cobrar $${appo.finalPrice}`,
            cancelLabel:  'Cancelar',
        });
        if(!ok)return;
        try{
            const pet=pets.find(p=>String(p.id)===String(appo.petId));
            await addSale(`Servicio: ${appo.serviceName} (${appo.petName})`,Number(appo.finalPrice),pet?.ownerId||null,'service');
            if(pet)await updatePet(pet.id,{...pet,history:[...(pet.history||[]),{date:todayStr_,detail:`${appo.serviceName} finalizado — $${appo.finalPrice}`}]});
            const upd=await appointmentsApi.update(appo.id,{status:'Finalizada'});
            setAppointments(p=>p.map(a=>a.id===appo.id?{...a,...upd}:a));
            addToast('Servicio finalizado y cobrado','success');
        }catch(err){addToast(`Error: ${err.message}`,'error');}
    },[notify,pets,addSale,updatePet,todayStr_,addToast]);

    // FIX #22: handleDeleteAppt usa notify()
    const handleDeleteAppt=useCallback(async(id)=>{
        const ok=await notify({
            type: 'confirm',
            icon: '🗑️',
            accent: 'red',
            title: '¿Eliminar esta cita?',
            message: 'Esta acción no se puede deshacer.',
            confirmLabel: 'Sí, eliminar',
            cancelLabel:  'Mantener',
        });
        if(!ok)return;
        setAppointments(p=>p.filter(a=>a.id!==id));
        try{await appointmentsApi.delete(id);}catch{}
        addToast('Cita eliminada','info');
    },[notify,addToast]);

    // ── Filtros ───────────────────────────────────────────────────────────────
    const q=searchTerm.toLowerCase();
    const filteredClients=clients.filter(c=>c.name?.toLowerCase().includes(q)||c.phone?.includes(q)||c.email?.toLowerCase().includes(q));
    const filteredPets=pets.filter(p=>p.petName?.toLowerCase().includes(q)||p.breed?.toLowerCase().includes(q));
    const filteredServices=services.filter(s=>s.title?.toLowerCase().includes(q)||s.category?.toLowerCase().includes(q));
    const filteredProducts=products.filter(p=>p.name?.toLowerCase().includes(q)||p.category?.toLowerCase().includes(q));
    const filteredUsers=users.filter(u=>u.name?.toLowerCase().includes(q)||u.email?.toLowerCase().includes(q));
    const posProducts=products.filter(p=>p.name?.toLowerCase().includes(posSearch.toLowerCase()));
    const posServices=services.filter(s=>s.title?.toLowerCase().includes(posSearch.toLowerCase()));

    const NAV=[{id:'control',icon:<FaTachometerAlt/>,label:'Panel'},{id:'pos',icon:<FaCashRegister/>,label:'Venta'},{id:'clientes',icon:<FaUsers/>,label:'Clientes'},{id:'pacientes',icon:<FaPaw/>,label:'Pacientes'},{id:'servicios',icon:<FaCut/>,label:'Servicios'},{id:'productos',icon:<FaBoxOpen/>,label:'Inventario'},{id:'usuarios',icon:<FaUserCog/>,label:'Usuarios'}];

    return (
        <div className="admin-layout">
            <div className="toast-container">{toasts.map(t=><Toast key={t.id} message={t.message} type={t.type} onClose={()=>removeToast(t.id)}/>)}</div>
            {/* FIX #22: NotifyNode en lugar de ConfirmNode */}
            {NotifyNode}

            {activeModal==='ventas'   &&<SalesModal sales={sales} onClose={()=>setActiveModal(null)}/>}
            {activeModal==='clientes' &&<ClientsReportModal sales={sales} clients={clients} onClose={()=>setActiveModal(null)}/>}
            {activeModal==='stock'    &&<StockModal products={products} onClose={()=>setActiveModal(null)}/>}

            {showCalendar&&<CalendarModal appointments={appointments} pets={pets} clients={clients} services={services} users={users} role="admin"
                onClose={()=>setShowCalendar(false)} onRefresh={loadAppointments}
                onAddAppointment={handleAddAppointment} onStatusChange={handleStatusChange}
                onFinalize={handleFinalize} onDeleteAppt={handleDeleteAppt}/>}

            {clientModal!==null&&<ClientFormModal initial={clientModal||undefined} onSave={handleSaveClient} onClose={()=>setClientModal(null)}/>}
            {petModal!==null&&<PetFormModal initial={petModal||undefined} clients={clients} onSave={handleSavePet} onClose={()=>setPetModal(null)}/>}
            {serviceModal!==null&&<ServiceFormModal initial={serviceModal||undefined} onSave={handleSaveService} onClose={()=>setServiceModal(null)}/>}
            {productModal!==null&&<ProductFormModal initial={productModal||undefined} onSave={handleSaveProduct} onClose={()=>setProductModal(null)}/>}
            {userModal!==null&&<UserFormModal initial={userModal||undefined} onSave={handleSaveUser} onClose={()=>setUserModal(null)}/>}

            {showCheckout&&<Modal title="Confirmar venta" onClose={()=>setShowCheckout(false)}>
                <p className="checkout-modal-note">Selecciona el cliente (opcional).</p>
                <select value={posClientId} onChange={e=>setPosClientId(e.target.value)} className="checkout-client-select"><option value="">Sin cliente</option>{clients.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select>
                <div className="checkout-items-preview">{cart.map((i,idx)=><div key={idx} className="checkout-item-row"><span>{i.qty}x {i.name||i.title}</span><span>${(i.price*i.qty).toFixed(2)}</span></div>)}</div>
                <div className="checkout-total-row"><span>Total</span><strong>${cartTotal.toFixed(2)}</strong></div>
                <div className="form-actions form-actions--end" style={{marginTop:16}}><button className="btn-secondary" onClick={()=>setShowCheckout(false)}>Cancelar</button><button className="btn-primary" onClick={processCheckout}><FaReceipt/> Confirmar</button></div>
            </Modal>}

            <header className="admin-top-bar">
                <div className="topbar-left">
                    <span className="admin-logo">perrucho<span>.</span></span>
                    {tab!=='pos'&&<div className="search-bar-wrapper" ref={searchRef}>
                        <div className={`search-bar-global ${showSearchPanel?'focused':''}`}>
                            <FaSearch/><input type="text" placeholder="Buscar en todo el sistema..." value={searchTerm} onChange={e=>setSearchTerm(e.target.value)} onFocus={()=>setSearchFocus(true)}/>
                            {searchTerm&&<button style={{background:'none',border:'none',cursor:'pointer',color:'var(--text-muted)',padding:0}} onClick={()=>{setSearchTerm('');setSearchFocus(false);}}><FaTimes/></button>}
                        </div>
                        {showSearchPanel&&<GlobalSearchPanel query={searchTerm} clients={clients} pets={pets} services={services} products={products} onNavigate={(t)=>{setTab(t);setSearchFocus(false);}} onClose={()=>{setSearchFocus(false);setSearchTerm('');}}/>}
                    </div>}
                </div>
                <div className="topbar-right">
                    <div className="user-pill"><FaUserShield/><span>{user?.name}</span></div>
                    <button className="logout-pill" onClick={logout}><FaSignOutAlt/></button>
                </div>
            </header>

            <aside className="admin-sidebar">
                <nav className="sidebar-nav">{NAV.map(item=><button key={item.id} className={`nav-btn ${tab===item.id?'active':''}`} onClick={()=>{setTab(item.id);setSearchTerm('');setSearchFocus(false);}} title={item.label}>{item.icon}<span className="nav-label">{item.label}</span></button>)}</nav>
                <button className="sidebar-logout" onClick={logout}><FaSignOutAlt/></button>
            </aside>

            <main className="admin-main-panel">

                {tab==='control'&&<div className="fade-in">
                    <div className="page-header"><h2>Panel de control</h2><p>{MONTH_NAMES[now.getMonth()]} {now.getFullYear()}</p></div>
                    <div className="stats-grid">
                        <div className="stat-card stat-card--blue clickable" onClick={()=>setActiveModal('ventas')}><span className="stat-label">Ventas del mes</span><span className="stat-value">${stats.monthSales.toLocaleString()}</span><span className="stat-hint">Ver detalle →</span></div>
                        <div className="stat-card stat-card--teal clickable" onClick={()=>setShowCalendar(true)}><span className="stat-label">Citas hoy</span><span className="stat-value">{stats.appointmentsCount}</span><span className="stat-hint">Ver agenda →</span></div>
                        <div className="stat-card stat-card--purple clickable" onClick={()=>setActiveModal('clientes')}><span className="stat-label">Clientes</span><span className="stat-value">{stats.totalClients}</span><span className="stat-hint">Reporte →</span></div>
                        <div className="stat-card stat-card--red clickable" onClick={()=>setActiveModal('stock')}><span className="stat-label">Stock crítico</span><span className="stat-value">{stats.lowStock}</span><span className="stat-hint">Ver →</span></div>
                    </div>
                    <div className="control-lower-grid">
                        <div className="panel-card"><div className="panel-card-header"><h4><FaChartBar/> Servicios por categoría</h4></div><ServiceChart sales={sales} services={services}/></div>
                        <div className="panel-card"><div className="panel-card-header"><h4><FaDollarSign/> Ventas esta semana</h4></div><WeeklyChart sales={sales}/></div>
                    </div>
                </div>}

                {tab==='pos'&&<div className="fade-in">
                    <div className="page-header"><h2>Punto de venta</h2></div>
                    <div className="pos-container">
                        <div className="pos-catalog">
                            <div className="pos-search-row">
                                <div className="search-input-wrapper"><FaSearch/><input type="text" placeholder="Buscar..." value={posSearch} onChange={e=>setPosSearch(e.target.value)}/></div>
                                <div className="pos-filters">{['Todos','Productos','Servicios'].map(cat=><button key={cat} className={posCategory===cat?'active':''} onClick={()=>setPosCategory(cat)}>{cat}</button>)}</div>
                            </div>
                            <div className="pos-grid">
                                {(posCategory==='Todos'||posCategory==='Productos')&&posProducts.map(p=><div key={p.id} className={`pos-card ${p.stock<=0?'pos-card--disabled':''}`} onClick={()=>addToCart(p,'product')}><div className="pos-card-icon product-icon"><FaBoxOpen/></div><h5>{p.name}</h5><p className="pos-price">${p.price}</p><span className={p.stock<5?'low-stock':'in-stock'}>{p.stock<=0?'Sin stock':`Stock: ${p.stock}`}</span></div>)}
                                {(posCategory==='Todos'||posCategory==='Servicios')&&posServices.map(s=><div key={s.id} className="pos-card pos-card--service" onClick={()=>addToCart(s,'service')}><div className="pos-card-icon service-icon"><FaCut/></div><h5>{s.title}</h5><p className="pos-price">${s.price} base*</p><span className="in-stock">Precio según talla</span></div>)}
                            </div>
                        </div>
                        <aside className="pos-cart">
                            <div className="pos-cart-header"><h4><FaCartPlus/> Carrito</h4><button className="clear-cart-btn" onClick={()=>setCart([])}>Vaciar</button></div>
                            <div className="pos-cart-items">{cart.length===0&&<p className="empty-cart">Vacío</p>}{cart.map((item,i)=><div key={`${item.id}-${i}`} className="cart-item"><div><span className="cart-item-name">{item.qty}x {item.name||item.title}</span><span className="cart-item-price">${(item.price*item.qty).toFixed(2)}</span></div><button onClick={()=>removeFromCart(item.id,item.type)}><FaTrashAlt/></button></div>)}</div>
                            <div className="pos-cart-footer"><div className="cart-total-row"><span>Total</span><span className="cart-total-amount">${cartTotal.toFixed(2)}</span></div><button className="checkout-btn" onClick={()=>setShowCheckout(true)} disabled={!cart.length}><FaReceipt/> Finalizar</button></div>
                        </aside>
                    </div>
                </div>}

                {tab==='clientes'&&<div className="fade-in">
                    <div className="ds-page-header"><div className="ds-page-header-left"><h2>Clientes</h2><p>{clients.length} registrados</p></div></div>
                    <div className="ds-cards-grid">{filteredClients.length===0&&<p className="empty-td">Sin resultados</p>}{filteredClients.map(c=><ClientCard key={c.id} client={c} petsCount={pets.filter(p=>String(p.ownerId)===String(c.id)).length} onEdit={cl=>setClientModal(cl)} onDelete={(id,name)=>handleDelete('client',id,name)}/>)}</div>
                    <FAB onClick={()=>setClientModal({})} title="Nuevo cliente"/>
                </div>}

                {tab==='pacientes'&&<div className="fade-in">
                    <div className="ds-page-header"><div className="ds-page-header-left"><h2>Pacientes</h2><p>{pets.length} mascotas</p></div><div className="ds-page-header-actions"><button className="btn-agenda-open" onClick={()=>setShowCalendar(true)}><FaCalendarAlt/> Agenda</button></div></div>
                    <div className="ds-cards-grid">{filteredPets.length===0&&<p className="empty-td">Sin resultados</p>}{filteredPets.map(p=><PetCard key={p.id} pet={p} owner={clients.find(c=>String(c.id)===String(p.ownerId))} onEdit={pet=>setPetModal(pet)} onDelete={(id,name)=>handleDelete('pet',id,name)}/>)}</div>
                    <FAB onClick={()=>setPetModal({})} title="Nueva mascota"/>
                </div>}

                {tab==='servicios'&&<div className="fade-in">
                    <div className="ds-page-header"><div className="ds-page-header-left"><h2>Servicios</h2><p>{services.length} en catálogo</p></div></div>
                    <div className="ds-cards-grid">{filteredServices.length===0&&<p className="empty-td">Sin resultados</p>}{filteredServices.map(s=><DSServiceCard key={s.id} service={s} onEdit={svc=>setServiceModal(svc)} onDelete={(id,name)=>handleDelete('service',id,name)}/>)}</div>
                    <FAB onClick={()=>setServiceModal({})} title="Nuevo servicio" color="#a29bfe"/>
                </div>}

                {tab==='productos'&&<div className="fade-in">
                    <div className="ds-page-header"><div className="ds-page-header-left"><h2>Inventario</h2><p>{products.length} productos</p></div></div>
                    <div className="ds-cards-grid">{filteredProducts.length===0&&<p className="empty-td">Sin resultados</p>}{filteredProducts.map(p=><ProductCard key={p.id} product={p} onEdit={prod=>setProductModal(prod)} onDelete={(id,name)=>handleDelete('product',id,name)}/>)}</div>
                    <FAB onClick={()=>setProductModal({})} title="Nuevo producto" color="#55efc4"/>
                </div>}

                {tab==='usuarios'&&<div className="fade-in">
                    <div className="ds-page-header"><div className="ds-page-header-left"><h2>Usuarios</h2><p>{users.length} registrados</p></div></div>
                    <div className="ds-cards-grid ds-cards-grid--compact">{filteredUsers.length===0&&<p className="empty-td">Sin resultados</p>}{filteredUsers.map(u=><UserCard key={u.id} user={u} currentUserId={user?.id} onEdit={usr=>setUserModal(usr)} onDelete={(id,name)=>handleDelete('user',id,name)}/>)}</div>
                    <FAB onClick={()=>setUserModal({})} title="Nuevo usuario" color="#636e72"/>
                </div>}

            </main>
        </div>
    );
};

export default AdminDashboard;