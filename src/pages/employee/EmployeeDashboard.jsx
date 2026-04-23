// src/pages/employee/EmployeeDashboard.jsx  ── RONDA 4 FIX
// FIXES aplicados:
// 1. usersApi importado estáticamente (no más import() dinámico que fallaba)
// 2. handleStatusChange registra venta + historial al pasar a Finalizada
// 3. DataReloaderBridge compatible (no necesita cambios aquí)

import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useData }   from '../../contexts/DataContext';
import { useAuth }   from '../../contexts/AuthContext';
import { appointmentsApi, usersApi } from '../../api/apiClient';
import {
    FaPaw, FaSignOutAlt, FaUserTie, FaUsers, FaCalendarAlt,
    FaNotesMedical, FaClock, FaCheckCircle, FaTimes, FaSave,
    FaHistory, FaBoxOpen, FaExclamationTriangle, FaClipboardList,
    FaChevronLeft, FaChevronRight, FaSync, FaPlus, FaEdit
} from 'react-icons/fa';
import {
    FAB, DSModal, StatusBadge, StatusSelector,
    ClientCard, ClientFormModal,
    PetCard, PetFormModal
} from '../../components/shared/DashboardShared';
import '../../components/shared/DashboardShared.css';
import { STATUS_COLORS, STATUS_EMOJI, STATUS_TRANSITIONS, STATUS_ACTION_LABEL, validateSlot } from '../../utils/apptStatus';
import { formatMexPhone } from '../../utils/formatPhone';
import './EmployeeDashboard.css';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const todayStr  = () => new Date().toISOString().split('T')[0];
const parseTime = (t) => { if(!t)return 8*60; const[h,m]=t.split(':').map(Number); return h*60+(m||0); };
const formatDateLong = (s) => { if(!s)return''; return new Date(s+'T12:00:00').toLocaleDateString('es-MX',{weekday:'long',day:'numeric',month:'long'}); };
const hueFromId = (id) => { const n=typeof id==='string'?id.split('').reduce((a,c)=>a+c.charCodeAt(0),0):Number(id); return(n*137)%360; };
const MONTHS=['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const DAYS_SHORT=['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];
const HOURS=Array.from({length:12},(_,i)=>i+8);

// ─── Toast ────────────────────────────────────────────────────────────────────
const Toast = ({message,type,onClose}) => {
    useEffect(()=>{const t=setTimeout(onClose,3500);return()=>clearTimeout(t);},[onClose]);
    return <div className={`emp-toast emp-toast--${type}`}><span>{message}</span><button onClick={onClose}><FaTimes/></button></div>;
};
const useToast = () => {
    const [toasts,setToasts]=useState([]);
    const addToast    = useCallback((m,t='info')=>setToasts(p=>[...p,{id:Date.now(),message:m,type:t}]),[]);
    const removeToast = useCallback((id)=>setToasts(p=>p.filter(t=>t.id!==id)),[]);
    return {toasts,addToast,removeToast};
};

// ─── Confirm ──────────────────────────────────────────────────────────────────
const ConfirmDialog = ({message,onConfirm,onCancel}) => (
    <div className="emp-modal-overlay" onClick={onCancel}>
        <div className="emp-modal-box emp-confirm-dialog" onClick={e=>e.stopPropagation()}>
            <div className="emp-modal-header"><h3><FaExclamationTriangle style={{color:'#ff7675',marginRight:8}}/>Confirmar</h3><button className="emp-modal-close" onClick={onCancel}><FaTimes/></button></div>
            <div className="emp-modal-body" style={{gap:16}}><p style={{fontSize:'0.92rem',lineHeight:1.6}}>{message}</p>
                <div style={{display:'flex',gap:10}}><button className="emp-btn-danger" onClick={onConfirm}>Confirmar</button><button className="emp-btn-ghost" onClick={onCancel}>Cancelar</button></div>
            </div>
        </div>
    </div>
);
const useConfirm = () => {
    const [dlg,setDlg]=useState(null);
    const confirm=useCallback((m)=>new Promise(r=>setDlg({m,r})),[]);
    const ConfirmNode=dlg?<ConfirmDialog message={dlg.m} onConfirm={()=>{dlg.r(true);setDlg(null);}} onCancel={()=>{dlg.r(false);setDlg(null);}}/>:null;
    return {confirm,ConfirmNode};
};

// ─── Modal genérico empleado ──────────────────────────────────────────────────
const Modal = ({title,onClose,children,wide,full}) => (
    <div className="emp-modal-overlay" onClick={onClose}>
        <div className={`emp-modal-box ${wide?'modal-wide':''} ${full?'modal-full':''}`} onClick={e=>e.stopPropagation()}>
            <div className="emp-modal-header"><h3>{title}</h3><button className="emp-modal-close" onClick={onClose}><FaTimes/></button></div>
            <div className="emp-modal-body">{children}</div>
        </div>
    </div>
);

// ─── Appt Detail Popup ────────────────────────────────────────────────────────
const ApptDetailPopup = ({appt,anchor,pets,clients,onStatusChange,onOpenExp,onDelete,onClose}) => {
    const ref=useRef(null);
    const [pos,setPos]=useState({top:0,left:0});
    const pet=pets.find(p=>String(p.id)===String(appt.petId));
    const owner=pet?clients.find(c=>String(c.id)===String(pet.ownerId)):null;
    const sc=STATUS_COLORS[appt.status]||STATUS_COLORS['Pendiente'];
    const transitions=STATUS_TRANSITIONS.empleado;
    const actionDef=STATUS_ACTION_LABEL.empleado[appt.status];

    useEffect(()=>{if(!anchor||!ref.current)return;const W=window.innerWidth,H=window.innerHeight,PW=300,PH=ref.current.offsetHeight||340;let left=anchor.left+anchor.width/2-PW/2;left=Math.max(12,Math.min(left,W-PW-12));let top=anchor.bottom+8;if(top+PH>H-12)top=anchor.top-PH-8;setPos({top:Math.max(12,top),left});},[anchor]);
    useEffect(()=>{const h=(e)=>{if(ref.current&&!ref.current.contains(e.target))onClose();};const t=setTimeout(()=>document.addEventListener('mousedown',h),80);return()=>{clearTimeout(t);document.removeEventListener('mousedown',h);};},[onClose]);
    useEffect(()=>{const h=(e)=>{if(e.key==='Escape')onClose();};document.addEventListener('keydown',h);return()=>document.removeEventListener('keydown',h);},[onClose]);

    return <>
        <div className="appt-popup-backdrop" onClick={onClose}/>
        <div ref={ref} className="adp" style={{position:'fixed',top:pos.top,left:pos.left,zIndex:3000}}>
            <div className="adp-bar" style={{background:sc.border}}/>
            <div className="adp-header">
                <div className="appt-popup-avatar" style={{background:`hsl(${hueFromId(appt.petId)},65%,60%)`}}>{pet?.petName?.[0]?.toUpperCase()||'?'}</div>
                <div className="appt-popup-title">
                    <strong>{pet?.petName||'Mascota'}</strong>
                    <span>{pet?.breed||'—'} · {pet?.weight} kg</span>
                    {owner&&<span className="appt-popup-owner">{owner.name}{owner.phone?` · ${owner.phone}`:''}</span>}
                </div>
                <button className="appt-popup-close" onClick={onClose}><FaTimes/></button>
            </div>
            <div className="adp-body">
                <div className="adp-row"><FaClock className="adp-icon"/><span>{appt.time||'—'} · {appt.date}</span></div>
                <div className="adp-row"><FaNotesMedical className="adp-icon"/><span>{appt.serviceName||'—'}</span><strong className="adp-price">${appt.finalPrice||0}</strong></div>
                <div className="adp-row">
                    <StatusSelector current={appt.status||'Pendiente'} transitions={transitions}
                        onSelect={(newStatus)=>{onStatusChange(appt,newStatus);onClose();}}/>
                </div>
                {pet?.notes&&<div className="appt-popup-notes"><span className="appt-popup-notes-label">Notas</span><p>{pet.notes}</p></div>}
            </div>
            <div className="adp-footer">
                {actionDef&&<button className={`ds-btn ds-btn--${actionDef.style} adp-action-btn`}
                    onClick={()=>{onStatusChange(appt,transitions[appt.status]?.[0]);onClose();}}>
                    {actionDef.icon} {actionDef.label}
                </button>}
                {pet&&onOpenExp&&<button className="adp-gcal-btn" onClick={()=>{onOpenExp(pet);onClose();}}>
                    <FaEdit/> Ver expediente
                </button>}
                {onDelete&&<button className="adp-del-btn" onClick={()=>{onDelete(appt.id);onClose();}}><FaTimes/></button>}
            </div>
        </div>
    </>;
};

// ─── Medical Modal ────────────────────────────────────────────────────────────
const MedicalModal = ({pet,clients,onSave,onClose}) => {
    const [notes,setNotes]=useState(pet.notes||'');
    const [sessionNote,setSessionNote]=useState('');
    const [history,setHistory]=useState(pet.history||[]);
    const [saving,setSaving]=useState(false);
    const [hasUnsaved,setHasUnsaved]=useState(false);
    const owner=clients.find(c=>String(c.id)===String(pet.ownerId));

    const addEntry=()=>{if(!sessionNote.trim())return;setHistory(p=>[...p,{date:new Date().toLocaleDateString('es-MX'),detail:sessionNote.trim(),author:'Empleado'}]);setSessionNote('');setHasUnsaved(true);};
    const handleSave=async()=>{setSaving(true);try{await onSave({...pet,notes,history});setHasUnsaved(false);}catch(err){console.error(err);}finally{setSaving(false);}};

    return <Modal title={`Expediente — ${pet.petName}`} onClose={onClose} wide>
        <div className="exp-patient-header">
            <div className="exp-avatar" style={{background:`hsl(${hueFromId(pet.id)},65%,60%)`}}>{pet.petName?.[0]?.toUpperCase()}</div>
            <div><h4>{pet.petName}</h4><span>{pet.breed||'—'} · {pet.weight} kg</span><span className="exp-owner">Dueño: {owner?.name||'Sin asignar'} {owner?.phone?`· ${owner.phone}`:''}</span></div>
        </div>
        {hasUnsaved&&<div className="emp-unsaved-warning"><FaExclamationTriangle/> Cambios sin guardar</div>}
        <div className="exp-section">
            <label className="exp-label"><FaNotesMedical/> Notas generales / alergias</label>
            <textarea className="exp-textarea" rows={3} value={notes} onChange={e=>{setNotes(e.target.value);setHasUnsaved(true);}} placeholder="Alergias, condiciones crónicas..."/>
        </div>
        <div className="exp-section">
            <label className="exp-label"><FaPlus/> Registrar nota de sesión</label>
            <div className="exp-session-row">
                <textarea className="exp-textarea sm" rows={2} value={sessionNote} onChange={e=>setSessionNote(e.target.value)} placeholder="Servicio aplicado, observaciones..."/>
                <button className="btn-add-entry" onClick={addEntry} disabled={!sessionNote.trim()}>Agregar</button>
            </div>
        </div>
        {history.length>0&&<div className="exp-section">
            <label className="exp-label"><FaHistory/> Historial</label>
            <div className="exp-history">{[...history].reverse().map((h,i)=><div key={i} className="exp-history-entry"><div className="exp-history-meta"><span className="exp-history-date">{h.date}</span>{h.author&&<span className="exp-history-author">{h.author}</span>}</div><p className="exp-history-detail">{h.detail}</p></div>)}</div>
        </div>}
        <button className="btn-save-exp" onClick={handleSave} disabled={saving}><FaSave/> {saving?'Guardando...':'Guardar expediente'}</button>
    </Modal>;
};

// ─── Calendar Modal ────────────────────────────────────────────────────────────
const CalendarModal = ({appointments,pets,clients,services,onAddAppt,onStatusChange,onDeleteAppt,onOpenExp,onClose,currentUser,allUsers}) => {
    const now=new Date();
    const [viewDate,setViewDate]=useState(new Date(now.getFullYear(),now.getMonth(),1));
    const [calView,setCalView]=useState('week');
    const [dayDate,setDayDate]=useState(new Date(now));
    const [selAppt,setSelAppt]=useState(null);
    const [anchor,setAnchor]=useState(null);
    const [showForm,setShowForm]=useState(false);
    const [saving,setSaving]=useState(false);
    const [slotError,setSlotError]=useState('');
    const [newAppt,setNewAppt]=useState({petId:'',serviceId:'',date:todayStr(),time:'',status:'Pendiente',finalPrice:0});
    const empleados=(allUsers||[]).filter(u=>u.role==='empleado');

    const calcPrice=(base,w)=>{const weight=Number(w),p=Number(base);if(weight<=5)return p;if(weight<=12)return+(p*1.25).toFixed(2);if(weight<=25)return+(p*1.50).toFixed(2);return+(p*2).toFixed(2);};
    useEffect(()=>{if(newAppt.petId&&newAppt.serviceId){const pet=pets.find(p=>String(p.id)===String(newAppt.petId));const svc=services.find(s=>String(s.id)===String(newAppt.serviceId));if(pet&&svc)setNewAppt(f=>({...f,finalPrice:calcPrice(svc.price,pet.weight)}));}setSlotError('');},[newAppt.petId,newAppt.serviceId,newAppt.date,newAppt.time]);

    const apptsByDate=useMemo(()=>{const m={};appointments.forEach(a=>{if(!m[a.date])m[a.date]=[];m[a.date].push(a);});return m;},[appointments]);

    const goBack=()=>{if(calView==='month'){setViewDate(new Date(viewDate.getFullYear(),viewDate.getMonth()-1,1));}else{const d=new Date(dayDate);d.setDate(d.getDate()-(calView==='week'?7:1));setDayDate(d);}};
    const goNext=()=>{if(calView==='month'){setViewDate(new Date(viewDate.getFullYear(),viewDate.getMonth()+1,1));}else{const d=new Date(dayDate);d.setDate(d.getDate()+(calView==='week'?7:1));setDayDate(d);}};
    const goToday=()=>{setViewDate(new Date(now.getFullYear(),now.getMonth(),1));setDayDate(new Date(now));};
    const switchView=(v)=>{const c=new Date(viewDate.getFullYear(),viewDate.getMonth(),1);const isCur=viewDate.getFullYear()===now.getFullYear()&&viewDate.getMonth()===now.getMonth();if(v!=='month')setDayDate(isCur?new Date(now):c);setCalView(v);};
    const headerLabel=()=>{if(calView==='month')return`${MONTHS[viewDate.getMonth()]} ${viewDate.getFullYear()}`;if(calView==='day')return formatDateLong(dayDate.toISOString().split('T')[0]);const s=new Date(dayDate);s.setDate(s.getDate()-s.getDay());const e=new Date(s);e.setDate(e.getDate()+6);return`${s.getDate()} — ${e.getDate()} ${MONTHS[e.getMonth()]}`;};

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
            await onAddAppt({...newAppt,serviceName:svc?.title,petName:pet?.petName,assignedTo:currentUser?.id||''});
            setShowForm(false);
            setNewAppt({petId:'',serviceId:'',date:todayStr(),time:'',status:'Pendiente',finalPrice:0});
            setSlotError('');
        }finally{setSaving(false);}
    };

    const EventChip=({appt,style='chip'})=>{
        const sc=STATUS_COLORS[appt.status]||STATUS_COLORS['Pendiente'];
        if(style==='block')return<div className="cal-event-block" style={{background:sc.bg,borderLeft:`4px solid ${sc.border}`,color:sc.text}} onClick={ev=>openPopup(appt,ev)}><strong>{appt.time}</strong><span>{appt.petName}</span><span>{appt.serviceName}</span><span style={{fontSize:'0.65rem',opacity:0.8}}>{STATUS_EMOJI[appt.status]} {appt.status}</span></div>;
        return<div className="cal-event-chip" style={{background:sc.bg,borderLeft:`3px solid ${sc.border}`,color:sc.text}} onClick={ev=>openPopup(appt,ev)}>{appt.time} {appt.petName}<span style={{display:'inline-block',width:6,height:6,background:sc.dot,borderRadius:'50%',marginLeft:4}}/></div>;
    };

    const MonthView=()=>{
        const y=viewDate.getFullYear(),m=viewDate.getMonth();
        const first=new Date(y,m,1).getDay();
        const days=new Date(y,m+1,0).getDate();
        const cells=Array.from({length:first+days},(_,i)=>i<first?null:i-first+1);
        while(cells.length%7!==0)cells.push(null);
        return <div className="cal-month">
            <div className="cal-month-header">{DAYS_SHORT.map(d=><div key={d} className="cal-month-day-label">{d}</div>)}</div>
            <div className="cal-month-grid">
                {cells.map((day,i)=>{
                    if(!day)return<div key={i} className="cal-cell cal-cell--empty"/>;
                    const ds=`${y}-${String(m+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
                    const da=apptsByDate[ds]||[];
                    const isToday=day===now.getDate()&&m===now.getMonth()&&y===now.getFullYear();
                    return<div key={i} className={`cal-cell ${isToday?'cal-cell--today':''}`} onClick={()=>{setDayDate(new Date(y,m,day));switchView('day');}}>
                        <span className="cal-cell-num">{day}</span>
                        {da.slice(0,3).map(a=><EventChip key={a.id} appt={a} style='chip'/>)}
                        {da.length>3&&<div className="cal-more">+{da.length-3}</div>}
                    </div>;
                })}
            </div>
        </div>;
    };

    const WeekView=()=>{
        const s=new Date(dayDate);s.setDate(s.getDate()-s.getDay());
        const wd=Array.from({length:7},(_,i)=>{const d=new Date(s);d.setDate(s.getDate()+i);return d;});
        return <div className="cal-week">
            <div className="cal-week-header">
                <div className="cal-time-gutter"/>
                {wd.map((d,i)=>{const isToday=d.toDateString()===now.toDateString();return<div key={i} className={`cal-week-day-label ${isToday?'today':''}`} onClick={()=>{setDayDate(d);setCalView('day');}}>
                    <span className="wdl-name">{DAYS_SHORT[d.getDay()]}</span>
                    <span className={`wdl-num ${isToday?'today-circle':''}`}>{d.getDate()}</span>
                </div>;})}
            </div>
            <div className="cal-week-scroll">
                {HOURS.map(h=><div key={h} className="cal-hour-row">
                    <div className="cal-time-label">{h}:00</div>
                    {wd.map((d,di)=>{
                        const ds=d.toISOString().split('T')[0];
                        const slot=(apptsByDate[ds]||[]).filter(a=>{const min=parseTime(a.time);return min>=h*60&&min<(h+1)*60;});
                        return<div key={di} className="cal-hour-cell">{slot.map(a=><EventChip key={a.id} appt={a} style='block'/>)}</div>;
                    })}
                </div>)}
            </div>
        </div>;
    };

    const DayView=()=>{
        const ds=dayDate.toISOString().split('T')[0];
        const da=(apptsByDate[ds]||[]).sort((a,b)=>parseTime(a.time)-parseTime(b.time));
        return <div className="cal-day">
            <div className="cal-day-label">{formatDateLong(ds)}<span className="cal-day-count">{da.length} cita{da.length!==1?'s':''}</span></div>
            <div className="cal-day-scroll">
                {HOURS.map(h=>{
                    const slot=da.filter(a=>{const min=parseTime(a.time);return min>=h*60&&min<(h+1)*60;});
                    return<div key={h} className="cal-day-row">
                        <div className="cal-time-label">{h}:00</div>
                        <div className="cal-day-events">
                            {slot.map(a=>{
                                const sc=STATUS_COLORS[a.status]||STATUS_COLORS['Pendiente'];
                                const pet=pets.find(p=>String(p.id)===String(a.petId));
                                const owner=pet?clients.find(cl=>String(cl.id)===String(pet.ownerId)):null;
                                return<div key={a.id} className="cal-day-event" style={{background:sc.bg,borderLeft:`5px solid ${sc.border}`,color:sc.text}} onClick={ev=>openPopup(a,ev)}>
                                    <div className="cal-day-event-top"><strong>{a.time} — {a.petName}</strong><StatusBadge status={a.status}/></div>
                                    <span>{a.serviceName}</span>
                                    {owner&&<span className="cal-day-owner">{owner.name}</span>}
                                    <span className="cal-day-price">${a.finalPrice}</span>
                                </div>;
                            })}
                        </div>
                    </div>;
                })}
            </div>
        </div>;
    };

    return <>
        <Modal title={`Agenda — ${headerLabel()}`} onClose={onClose} full>
            <div className="cal-toolbar">
                <div className="cal-nav">
                    <button className="cal-nav-btn" onClick={goBack}><FaChevronLeft/></button>
                    <button className="cal-today-btn" onClick={goToday}>Hoy</button>
                    <button className="cal-nav-btn" onClick={goNext}><FaChevronRight/></button>
                    <span className="cal-period-label">{headerLabel()}</span>
                </div>
                <div className="cal-view-switcher">
                    {['month','week','day'].map(v=><button key={v} className={`cal-view-btn ${calView===v?'active':''}`} onClick={()=>switchView(v)}>{v==='month'?'Mes':v==='week'?'Semana':'Día'}</button>)}
                    <button className="emp-btn-primary sm" onClick={()=>setShowForm(v=>!v)} style={{marginLeft:8}}><FaPlus/> Nueva cita</button>
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
            {showForm&&<form className="cal-appt-form fade-in" onSubmit={handleCreate}>
                <div className="cal-form-grid">
                    <select value={newAppt.petId} onChange={e=>setNewAppt({...newAppt,petId:e.target.value})} required><option value="">Paciente...</option>{pets.map(p=><option key={p.id} value={p.id}>{p.petName}</option>)}</select>
                    <select value={newAppt.serviceId} onChange={e=>setNewAppt({...newAppt,serviceId:e.target.value})} required><option value="">Servicio...</option>{services.map(s=><option key={s.id} value={s.id}>{s.title}</option>)}</select>
                    <input type="date" value={newAppt.date} onChange={e=>setNewAppt({...newAppt,date:e.target.value})} required/>
                    <input type="time" value={newAppt.time} onChange={e=>setNewAppt({...newAppt,time:e.target.value})} required/>
                    {newAppt.finalPrice>0&&<div className="emp-price-preview" style={{gridColumn:'span 2'}}>Estimado: <strong>${newAppt.finalPrice}</strong></div>}
                </div>
                {slotError&&<div className="cal-slot-error"><FaExclamationTriangle/> {slotError}</div>}
                <div style={{display:'flex',gap:8,marginTop:8}}><button type="submit" className="emp-btn-primary sm" disabled={saving}>{saving?'Guardando...':'Confirmar'}</button><button type="button" className="emp-btn-ghost sm" onClick={()=>{setShowForm(false);setSlotError('');}}>Cancelar</button></div>
            </form>}
            <div className="cal-view-container">
                {calView==='month'&&<MonthView/>}
                {calView==='week'&&<WeekView/>}
                {calView==='day'&&<DayView/>}
            </div>
        </Modal>
        {selAppt&&anchor&&<ApptDetailPopup appt={selAppt} anchor={anchor} pets={pets} clients={clients}
            onStatusChange={(a,s)=>{onStatusChange(a,s);closePopup();}}
            onOpenExp={(pet)=>{onOpenExp(pet);closePopup();}}
            onDelete={(id)=>{onDeleteAppt(id);closePopup();}}
            onClose={closePopup}/>}
    </>;
};

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
const EmployeeDashboard = () => {
    const {products,pets,clients,services,addClient,updateClient,addPet,updatePet,addSale}=useData();
    const {logout,user}=useAuth();
    const {toasts,addToast,removeToast}=useToast();
    const {confirm,ConfirmNode}=useConfirm();

    const [tab,setTab]=useState('agenda');
    const [searchTerm,setSearchTerm]=useState('');

    const [showCalendar,setShowCalendar]=useState(false);
    const [medicalPet,setMedicalPet]=useState(null);
    const [clientModal,setClientModal]=useState(null);
    const [petModal,setPetModal]=useState(null);

    const [appointments,setAppointments]=useState([]);
    const [apptLoading,setApptLoading]=useState(false);
    const [selAppt,setSelAppt]=useState(null);
    const [agendaAnchor,setAgendaAnchor]=useState(null);

    // FIX: import estático de usersApi, no dinámico
    const [allUsers,setAllUsers]=useState([]);
    useEffect(()=>{
        usersApi.getAll().then(setAllUsers).catch(()=>{});
    },[]);
    const empleados=allUsers.filter(u=>u.role==='empleado');

    const loadAppointments=useCallback(async()=>{
        setApptLoading(true);
        try{setAppointments(await appointmentsApi.getAll());}
        catch{addToast('Error al cargar citas','error');}
        finally{setApptLoading(false);}
    },[addToast]);
    useEffect(()=>{
        loadAppointments();
        // Sincronizar citas con el server cada 30s — así el empleado ve
        // las citas nuevas que crea el admin sin necesidad de recargar
        const interval = setInterval(loadAppointments, 30000);
        return () => clearInterval(interval);
    },[loadAppointments]);

    const todayAppts=useMemo(()=>appointments.filter(a=>a.date===todayStr()).sort((a,b)=>(a.time||'').localeCompare(b.time||'')),[appointments]);
    const kpis=useMemo(()=>({
        total:todayAppts.length,
        confirmadas:todayAppts.filter(a=>a.status==='Confirmada').length,
        enProceso:todayAppts.filter(a=>a.status==='En proceso').length,
        finalizadas:todayAppts.filter(a=>a.status==='Finalizada').length,
        stockBajo:products.filter(p=>Number(p.stock)<5).length
    }),[todayAppts,products]);

    // FIX: handleStatusChange robusto — registra venta al finalizar
    const handleStatusChange=async(appt,newStatus)=>{
        if(!newStatus)return;
        try{
            const updated=await appointmentsApi.update(appt.id,{status:newStatus});
            setAppointments(p=>p.map(a=>a.id===appt.id?{...a,...updated}:a));
            if(selAppt?.id===appt.id)setSelAppt(prev=>({...prev,status:newStatus}));
            if(newStatus==='Finalizada'){
                const pet=pets.find(p=>String(p.id)===String(appt.petId));
                await addSale(
                    `Servicio: ${appt.serviceName} (${appt.petName})`,
                    Number(appt.finalPrice),
                    pet?.ownerId||null
                );
                if(pet)await updatePet(pet.id,{
                    ...pet,
                    history:[...(pet.history||[]),{
                        date:new Date().toLocaleDateString('es-MX'),
                        detail:`${appt.serviceName} finalizado — $${appt.finalPrice}`,
                        author:user?.name||'Empleado'
                    }]
                });
            }
            addToast(`Estado → ${newStatus}`,'success');
        }catch(err){addToast(`Error: ${err.message}`,'error');}
    };

    const handleAddAppt=async(form)=>{
        const check=validateSlot(appointments,form.date,form.time,empleados);
        if(!check.ok){addToast(check.message,'error');throw new Error(check.message);}
        // Derivar clientId de la mascota para que aparezca en el perfil del cliente
        const pet=pets.find(p=>String(p.id)===String(form.petId));
        const dataWithClient={...form, clientId: pet?.ownerId||form.clientId||null};
        try{const c=await appointmentsApi.create(dataWithClient);setAppointments(p=>[...p,c]);addToast('Cita agendada','success');}
        catch(err){addToast('Error al agendar','error');throw err;}
    };

    const handleDeleteAppt=async(id)=>{
        const ok=await confirm('¿Eliminar esta cita?');if(!ok)return;
        setAppointments(p=>p.filter(a=>a.id!==id));
        if(selAppt?.id===id){setSelAppt(null);setAgendaAnchor(null);}
        try{await appointmentsApi.delete(id);}catch{}
        addToast('Cita eliminada','info');
    };

    const handleSaveClient=async(form)=>{try{form.id?await updateClient(form.id,form):await addClient(form);addToast(form.id?'Actualizado':'Guardado','success');setClientModal(null);}catch(err){addToast(`Error: ${err.message}`,'error');throw err;}};
    const handleSavePet=async(form)=>{try{form.id?await updatePet(form.id,form):await addPet(form);addToast(form.id?'Actualizado':'Guardado','success');setPetModal(null);}catch(err){addToast(`Error: ${err.message}`,'error');throw err;}};
    const saveMedicalFile=async(updatedPet)=>{try{await updatePet(updatedPet.id,updatedPet);setMedicalPet(null);addToast('Expediente guardado','success');}catch(err){addToast(`Error: ${err.message}`,'error');throw err;}};

    const q=searchTerm.toLowerCase();
    const filteredClients=clients.filter(c=>c.name?.toLowerCase().includes(q)||c.phone?.includes(q));
    const filteredPets=pets.filter(p=>p.petName?.toLowerCase().includes(q)||p.breed?.toLowerCase().includes(q));
    const filteredProducts=products.filter(p=>p.name?.toLowerCase().includes(q)||p.category?.toLowerCase().includes(q));

    const selectedPet=selAppt?pets.find(p=>String(p.id)===String(selAppt.petId)):null;
    const selectedOwner=selectedPet?clients.find(c=>String(c.id)===String(selectedPet.ownerId)):null;

    const NAV=[{id:'agenda',icon:<FaCalendarAlt/>,label:'Agenda'},{id:'clientes',icon:<FaUsers/>,label:'Clientes'},{id:'pacientes',icon:<FaPaw/>,label:'Pacientes'},{id:'inventario',icon:<FaBoxOpen/>,label:'Inventario'}];

    return (
        <div className="emp-layout">
            <div className="emp-toast-container">{toasts.map(t=><Toast key={t.id} message={t.message} type={t.type} onClose={()=>removeToast(t.id)}/>)}</div>
            {ConfirmNode}

            {showCalendar&&<CalendarModal appointments={appointments} pets={pets} clients={clients} services={services} currentUser={user} allUsers={allUsers} onAddAppt={handleAddAppt} onStatusChange={handleStatusChange} onDeleteAppt={handleDeleteAppt} onOpenExp={p=>setMedicalPet(p)} onClose={()=>setShowCalendar(false)}/>}
            {medicalPet&&<MedicalModal pet={medicalPet} clients={clients} onSave={saveMedicalFile} onClose={()=>setMedicalPet(null)}/>}
            {clientModal!==null&&<ClientFormModal initial={clientModal||undefined} onSave={handleSaveClient} onClose={()=>setClientModal(null)}/>}
            {petModal!==null&&<PetFormModal initial={petModal||undefined} clients={clients} onSave={handleSavePet} onClose={()=>setPetModal(null)}/>}

            <header className="emp-topbar">
                <div className="emp-topbar-left">
                    <span className="emp-logo">perrucho<span>.</span></span>
                    <span className="emp-role-badge">Staff</span>
                    {tab!=='agenda'&&<div className="emp-search-bar">
                        <input type="text" placeholder="Buscar..." value={searchTerm} onChange={e=>setSearchTerm(e.target.value)}/>
                        {searchTerm&&<button onClick={()=>setSearchTerm('')}><FaTimes/></button>}
                    </div>}
                </div>
                <div className="emp-topbar-right">
                    <span className="emp-greeting"><FaUserTie/> Hola, <strong>{user?.name||'Empleado'}</strong></span>
                    <button className="emp-logout-btn" onClick={logout}><FaSignOutAlt/></button>
                </div>
            </header>

            <aside className="emp-sidebar">
                <nav className="emp-sidebar-nav">{NAV.map(item=><button key={item.id} className={`emp-nav-btn ${tab===item.id?'active':''}`} onClick={()=>{setTab(item.id);setSearchTerm('');}} title={item.label}>{item.icon}<span className="emp-nav-label">{item.label}</span></button>)}</nav>
                <button className="emp-sidebar-logout" onClick={logout}><FaSignOutAlt/></button>
            </aside>

            <main className="emp-main">

                {tab==='agenda'&&<div className="fade-in">
                    <div className="emp-page-header">
                        <div><h2>Agenda del día</h2><p>{formatDateLong(todayStr())}</p></div>
                        <div style={{display:'flex',gap:8}}>
                            <button className="emp-btn-secondary" style={{width:'auto',padding:'8px 14px'}} onClick={loadAppointments}><FaSync/></button>
                            <button className="emp-btn-primary" onClick={()=>setShowCalendar(true)}><FaCalendarAlt/> Ver calendario</button>
                        </div>
                    </div>
                    <div className="emp-kpi-row">
                        <div className="emp-kpi emp-kpi--lavender emp-kpi--clickable" onClick={()=>setShowCalendar(true)}>
                            <span className="emp-kpi-num">{kpis.total}</span><span className="emp-kpi-label">Citas hoy</span><span className="emp-kpi-hint">Ver calendario →</span>
                        </div>
                        <div className="emp-kpi emp-kpi--lavender">
                            <span className="emp-kpi-num">{kpis.confirmadas}</span><span className="emp-kpi-label">Confirmadas</span>
                        </div>
                        <div className="emp-kpi emp-kpi--amber">
                            <span className="emp-kpi-num">{kpis.enProceso}</span><span className="emp-kpi-label">En proceso</span>
                        </div>
                        <div className="emp-kpi emp-kpi--mint">
                            <span className="emp-kpi-num">{kpis.finalizadas}</span><span className="emp-kpi-label">Finalizadas</span>
                        </div>
                    </div>
                    <div className="emp-agenda-layout">
                        <div className="emp-agenda-list">
                            {apptLoading&&<p className="emp-empty">Cargando...</p>}
                            {!apptLoading&&todayAppts.length===0&&<div className="emp-empty-state"><FaCalendarAlt/><p>Sin citas para hoy</p><button className="emp-btn-primary sm" onClick={()=>setShowCalendar(true)}><FaPlus/> Agendar</button></div>}
                            {todayAppts.map(appo=>{
                                const sc=STATUS_COLORS[appo.status]||STATUS_COLORS['Pendiente'];
                                return<div key={appo.id} className={`emp-appt-card ${selAppt?.id===appo.id?'selected':''}`}
                                    style={{borderLeft:`4px solid ${sc.border}`}}
                                    onClick={e=>{if(selAppt?.id===appo.id){setSelAppt(null);setAgendaAnchor(null);}else{setAgendaAnchor(e.currentTarget.getBoundingClientRect());setSelAppt(appo);}}}>
                                    <div className="emp-appt-time"><FaClock/> {appo.time||'—'}</div>
                                    <div className="emp-appt-info"><strong>{appo.petName}</strong><span>{appo.serviceName}</span></div>
                                    <div className="emp-appt-right">
                                        <StatusBadge status={appo.status}/>
                                        <span className="emp-appt-price">${appo.finalPrice}</span>
                                    </div>
                                </div>;
                            })}
                        </div>
                        <aside className="emp-exp-panel">
                            {!selAppt?<div className="emp-exp-empty"><FaClipboardList/><p>Selecciona una cita</p></div>:(
                                <div className="emp-exp-content fade-in">
                                    <h4 className="emp-exp-title"><FaNotesMedical/> Expediente</h4>
                                    {selectedPet?<>
                                        <div className="emp-exp-pet-info">
                                            <div className="emp-exp-avatar" style={{background:`hsl(${hueFromId(selectedPet.id)},65%,60%)`}}>{selectedPet.petName?.[0]?.toUpperCase()}</div>
                                            <div><strong>{selectedPet.petName}</strong><span>{selectedPet.breed||'—'} · {selectedPet.weight} kg</span>{selectedOwner&&<span className="emp-exp-owner-info">{selectedOwner.name} · {selectedOwner.phone}</span>}</div>
                                        </div>
                                        {selectedPet.notes&&<div className="emp-notes-preview"><span className="emp-notes-label">Notas</span><p>{selectedPet.notes}</p></div>}
                                        {selectedPet.history?.length>0&&<div className="emp-last-visit"><span className="emp-notes-label">Última visita</span><p className="emp-last-visit-date">{selectedPet.history.at(-1).date}</p><p>{selectedPet.history.at(-1).detail}</p></div>}
                                        <div className="emp-exp-actions">
                                            <button className="emp-btn-secondary" onClick={()=>setMedicalPet(selectedPet)}><FaEdit/> Expediente completo</button>
                                            {STATUS_ACTION_LABEL.empleado[selAppt.status]&&<button
                                                className={`ds-btn ds-btn--${STATUS_ACTION_LABEL.empleado[selAppt.status].style}`}
                                                style={{width:'100%',justifyContent:'center'}}
                                                onClick={()=>handleStatusChange(selAppt,STATUS_TRANSITIONS.empleado[selAppt.status]?.[0])}>
                                                {STATUS_ACTION_LABEL.empleado[selAppt.status].icon} {STATUS_ACTION_LABEL.empleado[selAppt.status].label}
                                            </button>}
                                        </div>
                                    </>:<p className="emp-empty">Mascota no encontrada</p>}
                                </div>
                            )}
                        </aside>
                    </div>
                    {selAppt&&agendaAnchor&&<ApptDetailPopup appt={selAppt} anchor={agendaAnchor} pets={pets} clients={clients}
                        onStatusChange={async(a,s)=>{await handleStatusChange(a,s);}}
                        onOpenExp={p=>{setMedicalPet(p);setSelAppt(null);setAgendaAnchor(null);}}
                        onDelete={(id)=>{handleDeleteAppt(id);setSelAppt(null);setAgendaAnchor(null);}}
                        onClose={()=>{setSelAppt(null);setAgendaAnchor(null);}}/>}
                </div>}

                {tab==='clientes'&&<div className="fade-in">
                    <div className="ds-page-header"><div className="ds-page-header-left"><h2>Clientes</h2><p>{clients.length} registrados</p></div></div>
                    <div className="ds-cards-grid">
                        {filteredClients.length===0&&<p className="emp-empty-td">Sin resultados</p>}
                        {filteredClients.map(c=><ClientCard key={c.id} client={c}
                            petsCount={pets.filter(p=>String(p.ownerId)===String(c.id)).length}
                            onEdit={cl=>setClientModal(cl)}
                            onDelete={async(id,name)=>{const ok=await confirm(`¿Eliminar "${name}"?`);if(!ok)return;addToast('Solo el admin puede eliminar clientes','warning');}}/>)}
                    </div>
                    <FAB onClick={()=>setClientModal({})} title="Nuevo cliente"/>
                </div>}

                {tab==='pacientes'&&<div className="fade-in">
                    <div className="ds-page-header"><div className="ds-page-header-left"><h2>Pacientes</h2><p>{pets.length} mascotas</p></div></div>
                    <div className="ds-cards-grid">
                        {filteredPets.length===0&&<p className="emp-empty-td">Sin resultados</p>}
                        {filteredPets.map(p=><PetCard key={p.id} pet={p}
                            owner={clients.find(c=>String(c.id)===String(p.ownerId))}
                            onEdit={pet=>setPetModal(pet)}
                            onDelete={async(id,name)=>{const ok=await confirm(`¿Eliminar "${name}"?`);if(!ok)return;addToast('Solo el admin puede eliminar pacientes','warning');}}/>)}
                    </div>
                    <FAB onClick={()=>setPetModal({})} title="Nueva mascota"/>
                </div>}

                {tab==='inventario'&&<div className="fade-in">
                    <div className="ds-page-header"><div className="ds-page-header-left"><h2>Inventario</h2><p>Solo lectura</p></div></div>
                    {kpis.stockBajo>0&&<div className="emp-stock-alert"><FaExclamationTriangle/><span>{kpis.stockBajo} producto(s) con stock crítico</span></div>}
                    <div className="ds-cards-grid">
                        {filteredProducts.map(p=>{const isLow=Number(p.stock)<5&&Number(p.stock)>0;const isOut=Number(p.stock)===0;return<div key={p.id} className={`ds-card ${isOut?'ds-card--out':isLow?'ds-card--low':''}`}>
                            <div className="ds-product-icon">📦</div>
                            <div className="ds-card-body">
                                <div className="ds-card-name">{p.name}</div>
                                <div className="ds-card-meta"><span className="ds-tag ds-tag--blue">{p.category}</span><span className="ds-tag ds-tag--green">${p.price}</span></div>
                                <span className={`ds-stock-badge ${isOut?'out':isLow?'low':'ok'}`}>{isOut?'❌ Agotado':isLow?`⚠️ ${p.stock} unid.`:`✓ ${p.stock} unid.`}</span>
                            </div>
                        </div>;})}
                    </div>
                </div>}

            </main>
        </div>
    );
};

export default EmployeeDashboard;