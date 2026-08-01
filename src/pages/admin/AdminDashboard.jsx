// src/pages/admin/AdminDashboard.jsx
// Fix backend PostgreSQL + Prisma:
// - addSale ahora recibe objeto { items, total, clientId, type, paymentMethod, status }
// - Las respuestas de appointments incluyen objetos anidados (pet, service, client, employee)
// - Helpers para extraer petName/serviceName de objetos anidados
//
// CAMBIO (feedback cliente — solo día, groomer asigna hora):
// - Citas creadas por el cliente llegan con status 'Pendiente' y time:'' (ver ServiceModal.jsx).
// - Mientras no tengan hora, deben permanecer en Pendiente — no se puede "Confirmar"
//   directamente. El admin debe primero asignar un horario disponible (AssignTimePicker),
//   y solo entonces la cita pasa a 'Confirmada' con esa hora ya fija.

import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useData }   from '../../contexts/DataContext';
import { useAuth }   from '../../contexts/AuthContext';
import { appointmentsApi, usersApi } from '../../api/apiClient';
import { OnboardingTour, OnboardingHelpButton, useOnboarding } from '../../components/shared/OnboardingTour';
import ThemeToggle from '../../components/shared/ThemeToggle';
import * as XLSX from 'xlsx';
import {
    FaCut, FaPaw, FaSignOutAlt, FaUserShield, FaUsers,
    FaFileExcel, FaCalendarAlt, FaClock, FaCashRegister,
    FaSearch, FaBoxOpen, FaCartPlus, FaReceipt, FaTrashAlt,
    FaTachometerAlt, FaUserCog, FaTimes, FaChartBar,
    FaExclamationTriangle, FaDollarSign, FaSync,
    FaNotesMedical, FaChevronLeft, FaChevronRight,
    FaUserTie, FaExternalLinkAlt, FaPlus, FaPalette, FaWhatsapp, FaEnvelope
} from 'react-icons/fa';
import {
    FAB, DSModal, StatusBadge, StatusSelector,
    ClientCard, ClientFormModal,
    PetCard, PetFormModal,
    ServiceCard as DSServiceCard, ServiceFormModal,
    ProductCard, ProductFormModal,
    UserCard, UserFormModal,
    PersonalizacionSection
} from '../../components/shared/DashboardShared';
import { useNotify } from '../../components/shared/NotifyDialog';
import '../../components/shared/DashboardShared.css';
import '../../components/shared/NotifyDialog.css';
import { STATUS_COLORS, STATUS_EMOJI, STATUS_TRANSITIONS, STATUS_ACTION_LABEL, validateSlot } from '../../utils/apptStatus';
import { calcServicePrice } from '../../utils/pricingRules';
import { ExtrasPanel } from '../../components/shared/ExtrasPanel';
import '../../components/shared/ExtrasPanel.css';
import AssignTimePicker from '../../components/shared/AssignTimePicker';
import '../../components/shared/AssignTimePicker.css';
import { shopToClientOnConfirmation, shopToClientOnFinished, openWhatsApp } from '../../utils/whatsappNotify';
import { shopToClientOnConfirmation as emailOnConfirmation, shopToClientOnFinished as emailOnFinished, openEmail } from '../../utils/emailNotify';
import './AdminDashboard.css';

// ─── Helpers ──────────────────────────────────────────────────────────────────
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
const buildGCalLink = (a) => { const ds=(a.date||todayISO()).replace(/-/g,'');const ts=(getApptTime(a)).replace(':','');const s=`${ds}T${ts}00`;const eh=String(Number((getApptTime(a)).split(':')[0])+1).padStart(2,'0');const e=`${ds}T${eh}${(getApptTime(a)).split(':')[1]}00`;return`https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(`Cita: ${getApptPetName(a)} — ${getApptServiceName(a)}`)}&dates=${s}/${e}&details=${encodeURIComponent(`Servicio: ${getApptServiceName(a)}\nMascota: ${getApptPetName(a)}\nImporte: $${a.finalPrice}`)}`; };

// Helpers para objetos anidados del nuevo backend
const getApptPetName     = (a) => a.pet?.petName     || a.petName     || 'Mascota';
const getApptServiceName = (a) => a.service?.title   || a.serviceName || 'Servicio';
const getApptClientName  = (a) => a.client?.name     || a.guestName  || '';
const getApptClientPhone = (a) => a.client?.phone    || a.guestPhone || '';
const getApptEmpName     = (a) => a.employee?.name   || '';
const getApptTime        = (a) => a.time || '10:15';
const getApptPetId       = (a) => a.petId   || a.pet?.id;
const getApptClientId    = (a) => a.clientId || a.client?.id;

// Helper para ventas — nuevo formato con items[]
const getSaleLabel  = (s) => s.items?.[0]?.name || s.item || 'Venta';
const getSaleAmount = (s) => s.total || s.price || 0;

const MONTH_NAMES=['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const MONTH_SHORT=['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
const DAYS_SHORT=['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];
const HOURS=Array.from({length:9},(_,i)=>i+9);

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
const ApptDetailPopup = ({appt,anchor,pets,clients,users,role,onStatusChange,onFinalize,onDelete,onClose,services=[],onAddExtra,onRemoveExtra,allAppointments=[],employees=[],onAssignTime}) => {
    const ref=useRef(null);
    const [pos,setPos]=useState({top:0,left:0});
    const petId = getApptPetId(appt);
    const pet=pets.find(p=>String(p.id)===String(petId));
    const owner=pet?clients.find(c=>String(c.id)===String(pet.ownerId)):null;
    const empName = getApptEmpName(appt) || users.find(u=>String(u.id)===String(appt.employeeId||appt.assignedTo))?.name;
    const sc=STATUS_COLORS[appt.status]||STATUS_COLORS['Pendiente'];
    const transitions=STATUS_TRANSITIONS[role]||STATUS_TRANSITIONS.admin;
    const actionDef=(STATUS_ACTION_LABEL[role]||STATUS_ACTION_LABEL.admin)[appt.status];
    // Cita Pendiente sin hora: el cliente solo sugirió el día — hay que asignar horario antes de poder confirmar.
    const needsTimeAssignment = appt.status==='Pendiente' && !appt.time && !!onAssignTime;

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
                <div className="appt-popup-avatar" style={{background:`hsl(${hueFromId(petId)},65%,60%)`}}>{pet?.petName?.[0]?.toUpperCase()||getApptPetName(appt)?.[0]?.toUpperCase()||'?'}</div>
                <div className="appt-popup-title">
                    <strong>{getApptPetName(appt)}</strong>
                    <span>{pet?.breed||'—'} · {pet?.weight ? `~${pet.weight} kg` : 'peso por verificar'}</span>
                    {(owner||getApptClientName(appt))&&<span className="appt-popup-owner">{owner?.name||getApptClientName(appt)}{(owner?.phone||getApptClientPhone(appt))?` · ${owner?.phone||getApptClientPhone(appt)}`:''}</span>}
                    {empName&&<span className="appt-popup-assigned"><FaUserTie/> {empName}</span>}
                </div>
                <button className="appt-popup-close" onClick={onClose}><FaTimes/></button>
            </div>
            <div className="adp-body">
                <div className="adp-row"><FaClock className="adp-icon"/><span>{appt.time ? `${getApptTime(appt)} · ${appt.date}` : `${appt.date} · sin hora asignada`}</span></div>
                <div className="adp-row"><FaNotesMedical className="adp-icon"/><span>{getApptServiceName(appt)}</span><strong className="adp-price">~${appt.finalPrice||0}</strong></div>
                {!needsTimeAssignment&&<div className="adp-row">
                    <StatusSelector current={appt.status||'Pendiente'} transitions={transitions}
                        onSelect={(newStatus)=>{onStatusChange(appt,newStatus);onClose();}}/>
                </div>}
                {needsTimeAssignment&&(
                    <AssignTimePicker
                        appt={appt}
                        allAppointments={allAppointments}
                        employees={employees}
                        isUpdating={false}
                        onAssign={(time)=>{onAssignTime(appt,time);onClose();}}
                    />
                )}
                {pet?.notes&&<div className="appt-popup-notes"><span className="appt-popup-notes-label">Notas</span><p>{pet.notes}</p></div>}
                {onAddExtra&&onRemoveExtra&&(
                    <ExtrasPanel
                        appt={appt}
                        services={services}
                        pets={pets}
                        onAdd={onAddExtra}
                        onRemove={onRemoveExtra}
                    />
                )}
            </div>
            <div className="adp-footer">
                {!needsTimeAssignment&&actionDef&&<button className={`ds-btn ds-btn--${actionDef.style} adp-action-btn`} onClick={handleAction}>
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
    const cats=useMemo(()=>{const now=new Date(),map={};sales.forEach(s=>{if(!isSameMonth(s.date||s.createdAt,now.getFullYear(),now.getMonth()))return;const label=getSaleLabel(s);const svc=services.find(sv=>String(label).toLowerCase().includes(sv.title?.toLowerCase()));map[svc?.category||'Otros']=(map[svc?.category||'Otros']||0)+Number(getSaleAmount(s));});return Object.entries(map).sort((a,b)=>b[1]-a[1]);},[sales,services]);
    const max=Math.max(...cats.map(c=>c[1]),1);
    const COLORS=['#74b9ff','#a29bfe','#55efc4','#fdcb6e','#ff7675'];
    return <div className="service-chart">{cats.length===0?<p className="empty-chart">Sin datos este mes</p>:cats.map(([cat,total],i)=><div key={cat} className="svc-bar-row"><span className="svc-bar-label">{cat}</span><div className="svc-bar-track"><div className="svc-bar-fill" style={{width:`${(total/max)*100}%`,background:COLORS[i%5]}}/></div><span className="svc-bar-val">${total.toLocaleString()}</span></div>)}</div>;
};
const WeeklyChart = ({sales}) => {
    const tod=new Date().getDay();
    const totals=useMemo(()=>{const m=[0,0,0,0,0,0,0],now=new Date();sales.forEach(s=>{const d=parseDate(s.date||s.createdAt);if(!d||isNaN(d))return;const diff=Math.floor((now-d)/86400000);if(diff>=0&&diff<7)m[d.getDay()]+=Number(getSaleAmount(s))||0;});return m;},[sales]);
    const max=Math.max(...totals,1);
    const DAYS=['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];
    return <div className="weekly-chart-wrap"><div className="chart-bars">{totals.map((v,i)=><div key={i} className="chart-col"><span className="chart-val">{v>0?`$${v}`:''}</span><div className={`chart-bar ${i===tod?'today':''}`} style={{height:`${Math.max((v/max)*80,4)}px`}}/><span className="chart-day">{DAYS[i]}</span></div>)}</div></div>;
};

// ─── ANALÍTICOS (extendido) ────────────────────────────────────────────────────
// Todo calculado en el cliente sobre sales/expenses/appointments/clients que
// ya carga DataContext — sin endpoints nuevos. Rango configurable (7/30/90 días).
const RANGE_OPTIONS = [{ days: 7, label: '7 días' }, { days: 30, label: '30 días' }, { days: 90, label: '90 días' }];

const IncomeExpenseChart = ({ sales, expenses, days }) => {
    const data = useMemo(() => {
        const now = new Date();
        const buckets = Array.from({ length: days }, (_, i) => {
            const d = new Date(now); d.setDate(d.getDate() - (days - 1 - i));
            return { date: d, income: 0, expense: 0 };
        });
        const idx = (d) => Math.floor((d - buckets[0].date) / 86400000);
        sales.forEach(s => { const d = parseDate(s.date || s.createdAt); if (!d || isNaN(d)) return; const i = idx(d); if (i >= 0 && i < days) buckets[i].income += Number(getSaleAmount(s)) || 0; });
        expenses.forEach(e => { const d = parseDate(e.date); if (!d || isNaN(d)) return; const i = idx(d); if (i >= 0 && i < days) buckets[i].expense += Number(e.amount) || 0; });
        return buckets;
    }, [sales, expenses, days]);
    const max = Math.max(...data.map(d => Math.max(d.income, d.expense)), 1);
    const totalIncome = data.reduce((a, d) => a + d.income, 0);
    const totalExpense = data.reduce((a, d) => a + d.expense, 0);
    const showLabels = days <= 30;
    return (
        <div>
            <div className="analytics-legend">
                <span><i style={{ background: '#00b894' }} /> Ingresos: <strong>${totalIncome.toLocaleString()}</strong></span>
                <span><i style={{ background: '#e63946' }} /> Egresos: <strong>${totalExpense.toLocaleString()}</strong></span>
                <span>Neto: <strong style={{ color: totalIncome - totalExpense >= 0 ? '#00b894' : '#e63946' }}>${(totalIncome - totalExpense).toLocaleString()}</strong></span>
            </div>
            <div className="ie-chart">
                {data.map((d, i) => (
                    <div key={i} className="ie-chart-col" title={`${d.date.toLocaleDateString('es-MX')} — Ingresos: $${d.income} / Egresos: $${d.expense}`}>
                        <div className="ie-chart-bars">
                            <div className="ie-bar ie-bar--income" style={{ height: `${(d.income / max) * 100}px` }} />
                            <div className="ie-bar ie-bar--expense" style={{ height: `${(d.expense / max) * 100}px` }} />
                        </div>
                        {showLabels && days <= 14 && <span className="ie-chart-day">{d.date.getDate()}</span>}
                    </div>
                ))}
            </div>
        </div>
    );
};

const TopItemsRanking = ({ sales }) => {
    const items = useMemo(() => {
        const map = {};
        sales.forEach(s => (s.items || [{ name: getSaleLabel(s), quantity: 1, price: getSaleAmount(s) }]).forEach(it => {
            const name = it.name || it.product?.name || 'Otro';
            if (!map[name]) map[name] = { qty: 0, total: 0 };
            map[name].qty += Number(it.quantity) || 1;
            map[name].total += Number(it.price) * (Number(it.quantity) || 1);
        }));
        return Object.entries(map).sort((a, b) => b[1].total - a[1].total).slice(0, 5);
    }, [sales]);
    const max = Math.max(...items.map(i => i[1].total), 1);
    return (
        <div className="service-chart">
            {items.length === 0 ? <p className="empty-chart">Sin ventas todavía</p> : items.map(([name, v], i) => (
                <div key={name} className="svc-bar-row">
                    <span className="svc-bar-label">{i + 1}. {name}</span>
                    <div className="svc-bar-track"><div className="svc-bar-fill" style={{ width: `${(v.total / max) * 100}%`, background: ['#74b9ff', '#a29bfe', '#55efc4', '#fdcb6e', '#ff7675'][i % 5] }} /></div>
                    <span className="svc-bar-val">${v.total.toLocaleString()} <small className="muted-text">({v.qty}x)</small></span>
                </div>
            ))}
        </div>
    );
};

const AnalyticsSection = ({ sales, expenses, appointments, clients, services }) => {
    const [days, setDays] = useState(30);

    const kpis = useMemo(() => {
        const now = new Date();
        const inRange = (d) => { const p = parseDate(d); return p && !isNaN(p) && (now - p) / 86400000 <= days; };
        const rangeSales = sales.filter(s => inRange(s.date || s.createdAt));
        const rangeAppts = appointments.filter(a => inRange(a.date));
        const avgTicket = rangeSales.length ? rangeSales.reduce((a, s) => a + Number(getSaleAmount(s)), 0) / rangeSales.length : 0;
        const canceled = rangeAppts.filter(a => a.status === 'Cancelada').length;
        const cancelRate = rangeAppts.length ? (canceled / rangeAppts.length) * 100 : 0;
        const newClients = clients.filter(c => inRange(c.createdAt)).length;
        return { avgTicket, cancelRate, newClients, totalAppts: rangeAppts.length, totalClients: clients.length };
    }, [sales, appointments, clients, days]);

    return (
        <div className="fade-in">
            <div className="page-header"><h2>Analíticos</h2><p>Ingresos, egresos y desempeño del negocio</p></div>
            <div className="modal-filters" style={{ marginBottom: 20 }}>
                {RANGE_OPTIONS.map(r => <button key={r.days} className={`pill-btn ${days === r.days ? 'active' : ''}`} onClick={() => setDays(r.days)}>{r.label}</button>)}
            </div>
            <div className="stats-grid">
                <div className="stat-card stat-card--blue"><span className="stat-label">Ticket promedio</span><span className="stat-value">${kpis.avgTicket.toFixed(0)}</span></div>
                <div className="stat-card stat-card--red"><span className="stat-label">Tasa de cancelación</span><span className="stat-value">{kpis.cancelRate.toFixed(0)}%</span></div>
                <div className="stat-card stat-card--purple"><span className="stat-label">Clientes nuevos</span><span className="stat-value">{kpis.newClients}</span></div>
                <div className="stat-card stat-card--teal"><span className="stat-label">Citas en el rango</span><span className="stat-value">{kpis.totalAppts}</span></div>
            </div>
            <div className="control-lower-grid">
                <div className="panel-card" style={{ gridColumn: '1 / -1' }}>
                    <div className="panel-card-header"><h4><FaDollarSign/> Ingresos vs egresos ({RANGE_OPTIONS.find(r => r.days === days).label})</h4></div>
                    <IncomeExpenseChart sales={sales} expenses={expenses} days={days} />
                </div>
                <div className="panel-card">
                    <div className="panel-card-header"><h4><FaChartBar/> Más vendidos</h4></div>
                    <TopItemsRanking sales={sales.filter(s => { const now = new Date(); const p = parseDate(s.date || s.createdAt); return p && !isNaN(p) && (now - p) / 86400000 <= days; })} />
                </div>
                <div className="panel-card">
                    <div className="panel-card-header"><h4><FaChartBar/> Servicios por categoría</h4></div>
                    <ServiceChart sales={sales} services={services} />
                </div>
            </div>
        </div>
    );
};

// ─── Calendar Modal ───────────────────────────────────────────────────────────
const CalendarModal = ({appointments,pets,clients,services,users,role,onClose,onRefresh,onAddAppointment,onStatusChange,onAssignTime,onFinalize,onDeleteAppt,onAddExtra,onRemoveExtra}) => {
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

    useEffect(()=>{
        if(newAppt.petId && newAppt.serviceId){
            const pet = pets.find(p=>String(p.id)===String(newAppt.petId));
            const svc = services.find(s=>String(s.id)===String(newAppt.serviceId));
            if(pet && svc){ setNewAppt(f=>({...f, finalPrice: calcServicePrice(svc, pet.weight)})); }
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
            await onAddAppointment({...newAppt,serviceName:svc?.title,petName:pet?.petName,clientId:pet?.ownerId||null});
            setShowForm(false);
            setNewAppt({petId:'',serviceId:'',assignedTo:'',date:todayISO(),time:'',status:'Pendiente',finalPrice:0});
            setSlotError('');
        }finally{setSaving(false);}
    };

    const EventChip=({appt,style='chip'})=>{
        const sc=STATUS_COLORS[appt.status]||STATUS_COLORS['Pendiente'];
        const cls=style==='block'?'admin-cal-event-block':'admin-cal-event-chip';
        return <div className={cls} style={{background:sc.bg,borderLeft:`3px solid ${sc.border}`,color:sc.text}} onClick={ev=>openPopup(appt,ev)} title={`${getApptPetName(appt)} · ${getApptServiceName(appt)} · ${STATUS_EMOJI[appt.status]} ${appt.status}`}>
            {style==='block'&&<><strong>{getApptTime(appt)}</strong><span>{getApptPetName(appt)}</span><span>{getApptServiceName(appt)}</span></>}
            {style==='chip'&&<>{getApptTime(appt)} {getApptPetName(appt)}</>}
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
                        const ds=toLocalISO(d);
                        const slot=(apptsByDate[ds]||[]).filter(a=>{const min=parseTime(getApptTime(a));return min>=h*60&&min<(h+1)*60;});
                        return <div key={di} className="admin-cal-hour-cell">{slot.map(a=><EventChip key={a.id} appt={a} style='block'/>)}</div>;
                    })}
                </div>)}
            </div>
        </div>;
    };

    const DayView=()=>{
        const ds=toLocalISO(dayDate);
        const da=(apptsByDate[ds]||[]).sort((a,b)=>parseTime(getApptTime(a))-parseTime(getApptTime(b)));
        return <div className="admin-cal-day">
            <div className="admin-cal-day-label">{formatDateLong(ds)}<span className="admin-cal-day-count">{da.length} cita{da.length!==1?'s':''}</span></div>
            <div className="admin-cal-day-scroll">
                {HOURS.map(h=>{
                    const slot=da.filter(a=>{const min=parseTime(getApptTime(a));return min>=h*60&&min<(h+1)*60;});
                    return <div key={h} className="admin-cal-day-row">
                        <div className="admin-cal-time-label">{h}:00</div>
                        <div className="admin-cal-day-events">
                            {slot.map(a=>{
                                const sc=STATUS_COLORS[a.status]||STATUS_COLORS['Pendiente'];
                                const petId=getApptPetId(a);
                                const pet=pets.find(p=>String(p.id)===String(petId));
                                const owner=pet?clients.find(cl=>String(cl.id)===String(pet.ownerId)):null;
                                const empName=getApptEmpName(a)||users.find(u=>String(u.id)===String(a.employeeId||a.assignedTo))?.name;
                                return <div key={a.id} className="admin-cal-day-event" style={{background:sc.bg,borderLeft:`5px solid ${sc.border}`,color:sc.text}} onClick={ev=>openPopup(a,ev)}>
                                    <div className="admin-cal-day-event-top"><strong>{getApptTime(a)} — {getApptPetName(a)}</strong><StatusBadge status={a.status}/></div>
                                    <span>{getApptServiceName(a)}</span>
                                    {(owner||getApptClientName(a))&&<span className="admin-cal-owner">{owner?.name||getApptClientName(a)}</span>}
                                    {empName&&<span className="admin-cal-emp"><FaUserTie/> {empName}</span>}
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
        {selAppt&&anchor&&<ApptDetailPopup appt={selAppt} anchor={anchor} pets={pets} clients={clients} users={users} role={role||'admin'} services={services}
            onStatusChange={(a,s)=>{onStatusChange(a,s);closePopup();}}
            onFinalize={(a)=>{onFinalize(a);closePopup();}}
            onDelete={(id)=>{onDeleteAppt(id);closePopup();}}
            onAddExtra={onAddExtra} onRemoveExtra={onRemoveExtra}
            allAppointments={appointments} employees={empleados} onAssignTime={onAssignTime}
            onClose={closePopup}/>}
    </>;
};

// ─── Modales de reporte ───────────────────────────────────────────────────────
const SalesModal = ({sales,onClose,onShowReceipt}) => {
    const now=new Date();
    const months=Array.from({length:4},(_,i)=>{const d=new Date(now.getFullYear(),now.getMonth()-i,1);return{label:`${MONTH_SHORT[d.getMonth()]} ${d.getFullYear()}`,year:d.getFullYear(),month:d.getMonth()};});
    const [sel,setSel]=useState(0);
    const {year,month}=months[sel];
    const filtered=sales.filter(s=>isSameMonth(s.date||s.createdAt,year,month));
    const total=filtered.reduce((a,s)=>a+Number(getSaleAmount(s)),0);
    const exportExcel=()=>{const ws=XLSX.utils.json_to_sheet(filtered.map(s=>({Fecha:s.date,Descripción:getSaleLabel(s),Monto:getSaleAmount(s),Método:s.paymentMethod||'—',Estado:s.status||'—'})));const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,'Ventas');XLSX.writeFile(wb,`Ventas_${months[sel].label}.xlsx`);};
    return <Modal title="Ventas del mes" onClose={onClose} wide>
        <div className="modal-filters">{months.map((m,i)=><button key={i} className={`pill-btn ${sel===i?'active':''}`} onClick={()=>setSel(i)}>{m.label}</button>)}<button className="pill-btn export-btn" onClick={exportExcel}><FaFileExcel/> Exportar</button></div>
        <div className="modal-summary-row"><span>Total</span><span className="modal-total">${total.toLocaleString()}</span></div>
        <table className="modal-table"><thead><tr><th>Fecha</th><th>Descripción</th><th>Método</th><th>Estado</th><th>Monto</th><th></th></tr></thead>
        <tbody>{filtered.length===0?<tr><td colSpan="6" className="empty-td">Sin ventas</td></tr>:filtered.slice().reverse().map(s=><tr key={s.id}><td>{s.date}</td><td>{getSaleLabel(s)}</td><td>{s.paymentMethod||'efectivo'}</td><td>{s.status||'pagado'}</td><td className="td-amount">${Number(getSaleAmount(s)).toLocaleString()}</td><td><button type="button" className="ds-btn-icon" title="Ver recibo" onClick={()=>onShowReceipt(s)}><FaReceipt/></button></td></tr>)}</tbody></table>
    </Modal>;
};

// ─── NOTA DE VENTA (recibo digital) — punto 9 del feedback del cliente ────────
// Se imprime/guarda como PDF con Ctrl+P (window.print), sin depender de
// ninguna librería nueva. #receipt-print-area es lo único visible al imprimir
// (ver regla @media print en AdminDashboard.css).
const ReceiptModal = ({sale,settings,client,onClose}) => {
    const items=sale.items?.length?sale.items:[{name:getSaleLabel(sale),quantity:1,price:getSaleAmount(sale)}];
    const total=getSaleAmount(sale);
    const dateObj=new Date(sale.date||sale.createdAt||Date.now());
    const clientName=client?.name||sale.client?.name||'Cliente mostrador';
    const clientPhone=client?.phone||sale.client?.phone;
    const clientEmail=client?.email||sale.client?.email;

    const handleWhatsApp=()=>{
        const lines=items.map(i=>`• ${i.quantity}x ${i.name} — $${Number(i.price*i.quantity).toLocaleString()}`).join('\n');
        const msg=`🧾 *Nota de venta — ${settings?.businessName||"Taylor's Pet Services"}*\n\n${lines}\n\n*Total: $${Number(total).toLocaleString()}*\nFecha: ${dateObj.toLocaleDateString('es-MX')}\nMétodo de pago: ${sale.paymentMethod||'efectivo'}\n\n¡Gracias por tu preferencia! 🐾`;
        const phone=(clientPhone||'').replace(/\D/g,'');
        window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`,'_blank');
    };

    // mailto: — abre el cliente de correo que ya tenga configurado el
    // empleado/admin en su equipo (el que use el sistema operativo), no un
    // correo fijo del sistema. El propio empleado revisa y presiona enviar.
    const handleEmail=()=>{
        const lines=items.map(i=>`• ${i.quantity}x ${i.name} — $${Number(i.price*i.quantity).toLocaleString()}`).join('\n');
        const subject=`Nota de venta — ${settings?.businessName||"Taylor's Pet Services"} #${sale.id}`;
        const body=`Hola ${clientName},\n\nAquí tienes tu nota de venta:\n\n${lines}\n\nTotal: $${Number(total).toLocaleString()}\nFecha: ${dateObj.toLocaleDateString('es-MX')}\nMétodo de pago: ${sale.paymentMethod||'efectivo'}\n\n¡Gracias por tu preferencia! 🐾\n— ${settings?.businessName||"Taylor's Pet Services"}`;
        window.location.href=`mailto:${encodeURIComponent(clientEmail)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    };

    return <Modal title="🧾 Nota de venta" onClose={onClose}>
        <div id="receipt-print-area" className="receipt-sheet">
            <div className="receipt-header">
                {settings?.logoUrl && <img src={settings.logoUrl} alt="" className="receipt-logo"/>}
                <h3>{settings?.businessName||"Taylor's Pet Services"}</h3>
                <p className="muted-text">{settings?.businessAddress}</p>
                <p className="muted-text">{settings?.whatsappNumber}</p>
            </div>
            <div className="receipt-meta">
                <span>Folio #{sale.id}</span>
                <span>{dateObj.toLocaleDateString('es-MX',{year:'numeric',month:'long',day:'numeric'})}</span>
            </div>
            <div className="receipt-meta">
                <span>Cliente: {clientName}</span>
                <span>Pago: {sale.paymentMethod||'efectivo'}</span>
            </div>
            <table className="modal-table receipt-items">
                <thead><tr><th>Concepto</th><th>Cant.</th><th>Precio</th></tr></thead>
                <tbody>{items.map((i,idx)=><tr key={idx}><td>{i.name||i.product?.name}</td><td>{i.quantity}</td><td className="td-amount">${Number(i.price*i.quantity).toLocaleString()}</td></tr>)}</tbody>
            </table>
            <div className="receipt-total-row"><span>TOTAL</span><strong>${Number(total).toLocaleString()}</strong></div>
            <p className="receipt-footer">¡Gracias por confiar en nosotros! 🐾</p>
        </div>
        <div className="form-actions form-actions--end" style={{marginTop:16}}>
            {clientPhone && <button className="btn-secondary" onClick={handleWhatsApp}><FaWhatsapp/> Enviar por WhatsApp</button>}
            {clientEmail && <button className="btn-secondary" onClick={handleEmail}><FaEnvelope/> Enviar por correo</button>}
            <button className="btn-primary" onClick={()=>window.print()}><FaReceipt/> Imprimir / Guardar PDF</button>
        </div>
    </Modal>;
};

const ADMIN_ONBOARDING_STEPS=[
    {icon:'👋',title:'¡Bienvenido a Taylor\'s!',description:'Este es tu panel de administrador. Te mostramos rápido cómo moverte por el sistema.'},
    {icon:'📊',title:'Panel de control',description:'Aquí ves tus ventas, egresos, citas del día y clientes de un vistazo. Toca cada tarjeta para ver el detalle.'},
    {icon:'🧾',title:'Punto de venta',description:'Desde "Venta" registras cobros de productos y servicios, y generas la nota de venta (recibo digital) al terminar.'},
    {icon:'🐾',title:'Clientes, Pacientes y Agenda',description:'Administra clientes y mascotas, y desde "Citas hoy" abres la agenda para asignar horarios.'},
    {icon:'✂️',title:'Servicios e Inventario',description:'Da de alta tus servicios (con precio por tamaño o personalizado) y productos con su stock.'},
    {icon:'🎨',title:'Personalización',description:'En "Sitio" puedes cambiar el logo, colores, textos del inicio y más — sin tocar código.'},
];
const EXPENSE_CATEGORIES=['Renta','Servicios','Insumos','Nómina','Mantenimiento','Otro'];
const ExpensesModal = ({expenses,onClose,onAdd,onDelete}) => {
    const now=new Date();
    const months=Array.from({length:4},(_,i)=>{const d=new Date(now.getFullYear(),now.getMonth()-i,1);return{label:`${MONTH_SHORT[d.getMonth()]} ${d.getFullYear()}`,year:d.getFullYear(),month:d.getMonth()};});
    const [sel,setSel]=useState(0);
    const {year,month}=months[sel];
    const filtered=expenses.filter(e=>isSameMonth(e.date,year,month));
    const total=filtered.reduce((a,e)=>a+Number(e.amount),0);

    const [form,setForm]=useState({concept:'',amount:'',category:'Otro'});
    const [saving,setSaving]=useState(false);
    const handleAdd=async(e)=>{
        e.preventDefault();
        if(!form.concept||!form.amount)return;
        setSaving(true);
        try{await onAdd({...form,amount:Number(form.amount)});setForm({concept:'',amount:'',category:'Otro'});}
        finally{setSaving(false);}
    };

    return <Modal title="Egresos / gastos" onClose={onClose} wide>
        <form onSubmit={handleAdd} className="modal-filters" style={{flexWrap:'wrap',gap:8,marginBottom:12}}>
            <input placeholder="Concepto (ej. Renta local)" value={form.concept} onChange={e=>setForm({...form,concept:e.target.value})} style={{flex:2,minWidth:160}} className="date-input" required/>
            <input type="number" placeholder="Monto" value={form.amount} onChange={e=>setForm({...form,amount:e.target.value})} style={{flex:1,minWidth:100}} className="date-input" required/>
            <select value={form.category} onChange={e=>setForm({...form,category:e.target.value})} className="date-input" style={{flex:1,minWidth:120}}>
                {EXPENSE_CATEGORIES.map(c=><option key={c} value={c}>{c}</option>)}
            </select>
            <button type="submit" className="pill-btn export-btn" disabled={saving}>{saving?'Guardando...':'+ Agregar'}</button>
        </form>
        <div className="modal-filters">{months.map((m,i)=><button key={i} className={`pill-btn ${sel===i?'active':''}`} onClick={()=>setSel(i)}>{m.label}</button>)}</div>
        <div className="modal-summary-row"><span>Total</span><span className="modal-total" style={{color:'#e63946'}}>${total.toLocaleString()}</span></div>
        <table className="modal-table"><thead><tr><th>Fecha</th><th>Concepto</th><th>Categoría</th><th>Monto</th><th></th></tr></thead>
        <tbody>{filtered.length===0?<tr><td colSpan="5" className="empty-td">Sin egresos este mes</td></tr>:filtered.map(e=>
            <tr key={e.id}>
                <td>{new Date(e.date).toLocaleDateString('es-MX')}</td>
                <td>{e.concept}</td>
                <td>{e.category}</td>
                <td className="td-amount">${Number(e.amount).toLocaleString()}</td>
                <td><button type="button" className="ds-btn-icon ds-btn-icon--del" onClick={()=>onDelete(e.id)}><FaTrashAlt/></button></td>
            </tr>
        )}</tbody></table>
    </Modal>;
};

const ClientsReportModal = ({sales,clients,onClose}) => {
    const [date,setDate]=useState(todayISO());
    const dObj=new Date(date+'T12:00:00');
    const daySales=sales.filter(s=>isSameDay(s.date||s.createdAt,dObj));
    const total=daySales.reduce((a,s)=>a+Number(getSaleAmount(s)),0);
    const byC=daySales.reduce((acc,s)=>{const k=s.clientId||'__';if(!acc[k])acc[k]=[];acc[k].push(s);return acc;},{});
    return <Modal title="Reporte por día" onClose={onClose} wide>
        <div className="modal-filters"><input type="date" value={date} onChange={e=>setDate(e.target.value)} className="date-input"/></div>
        <div className="modal-summary-row"><span>Total del día</span><span className="modal-total">${total.toLocaleString()}</span></div>
        {Object.keys(byC).length===0?<p className="empty-td">Sin ventas</p>:Object.entries(byC).map(([cid,cs])=>{const c=clients.find(cl=>String(cl.id)===String(cid));const sub=cs.reduce((a,s)=>a+Number(getSaleAmount(s)),0);return<div key={cid} className="client-report-block"><div className="client-report-header"><div className="pet-avatar-sm" style={{background:'#eef2ff',color:'#3730a3'}}>{c?.name?.[0]?.toUpperCase()||'?'}</div><strong>{c?.name||'Sin cliente'}</strong><span className="td-amount">${sub.toLocaleString()}</span></div><div className="client-report-items">{cs.map(s=><div key={s.id} className="client-report-item"><span>{getSaleLabel(s)}</span><span className="muted-text">${Number(getSaleAmount(s)).toLocaleString()}</span></div>)}</div></div>;})}
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
    const {services,products,pets,clients,sales,expenses,settings,addService,updateService,deleteService,addProduct,updateProduct,deleteProduct,addClient,updateClient,deleteClient,addPet,updatePet,deletePet,addSale,addExpense,deleteExpense,addAppointmentExtra,removeAppointmentExtra,updateSettings}=useData();
    const {logout,user}=useAuth();
    const {toasts,addToast,removeToast}=useToast();
    const {notify, NotifyNode} = useNotify();
    const {show:showOnboarding,dismiss:dismissOnboarding,reopen:reopenOnboarding}=useOnboarding('admin',user?.id);

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
    const [posPaymentMethod,setPosPaymentMethod]=useState('efectivo');
    const [posSaleStatus,setPosSaleStatus]=useState('pagado');
    const [showCheckout,setShowCheckout]=useState(false);
    const [receiptSale,setReceiptSale]=useState(null);

    const now=new Date(),todayStr_=todayISO();
    const stats=useMemo(()=>{
        const ms=sales.filter(s=>isSameMonth(s.date||s.createdAt,now.getFullYear(),now.getMonth()));
        const me=expenses.filter(e=>isSameMonth(e.date,now.getFullYear(),now.getMonth()));
        const ta=appointments.filter(a=>a.date===todayStr_);
        return{
            monthSales:ms.reduce((a,s)=>a+Number(getSaleAmount(s)),0),
            monthExpenses:me.reduce((a,e)=>a+Number(e.amount),0),
            appointmentsCount:ta.length,
            totalClients:clients.length,
            lowStock:products.filter(p=>Number(p.stock)<5).length
        };
    },[sales,expenses,appointments,clients,products,todayStr_]);

    // ── POS con nuevo formato de addSale ──────────────────────────────────────
    // item.variantName distingue líneas de carrito de un mismo producto con
    // distinta variante (ej. "Shampoo - 500ml" vs "Shampoo - 1L").
    const addToCart=(item,type)=>{
        if(type==='product'&&item.stock<=0){addToast('Sin stock','error');return;}
        const ex=cart.find(c=>c.id===item.id&&c.type===type&&c.variantName===item.variantName);
        if(ex)setCart(cart.map(c=>c===ex?{...c,qty:c.qty+1}:c));
        else setCart([...cart,{...item,qty:1,type}]);
    };
    const [posVariantPicker,setPosVariantPicker]=useState(null); // producto con variantes pendiente de elegir
    const addProductToCart=(product)=>{
        if((product.variants||[]).length>0){setPosVariantPicker(product);return;}
        addToCart(product,'product');
    };
    const pickVariant=(product,variant)=>{
        addToCart({...product,price:variant.price,stock:variant.stock,variantName:variant.name,name:`${product.name} — ${variant.name}`},'product');
        setPosVariantPicker(null);
    };
    const removeFromCart=(id,type,variantName)=>setCart(cart.filter(c=>!(c.id===id&&c.type===type&&c.variantName===variantName)));
    const cartTotal=cart.reduce((a,i)=>a+i.price*i.qty,0);

    // FIX: addSale con nuevo formato { items, total, clientId, type, paymentMethod, status }
    const processCheckout=async()=>{
        if(!cart.length)return;
        try{
            const allProducts = cart.every(i=>i.type==='product');
            const allServices = cart.every(i=>i.type==='service');
            const savedSale = await addSale({
                items: cart.map(i=>({
                    name:      i.name||i.title,
                    price:     i.price,
                    quantity:  i.qty,
                    productId: i.type==='product' ? i.id : undefined,
                })),
                total:         +cartTotal.toFixed(2),
                // FIX: <select> siempre da string — Prisma exige Int para
                // clientId y tronaba con "Error del servidor" cada vez que
                // se elegía un cliente en el checkout del POS.
                clientId:      posClientId?Number(posClientId):null,
                type:          allProducts?'product':allServices?'service':'mixed',
                paymentMethod: posPaymentMethod,
                status:        posSaleStatus,
            });
            // Descontar stock — de la variante elegida si aplica, si no del stock base.
            for(const item of cart){
                if(item.type==='product'){
                    const o=products.find(p=>p.id===item.id);
                    if(!o)continue;
                    if(item.variantName){
                        const nextVariants=(o.variants||[]).map(v=>v.name===item.variantName?{...v,stock:Math.max(0,v.stock-item.qty)}:v);
                        await updateProduct(item.id,{...o,variants:nextVariants});
                    }else{
                        await updateProduct(item.id,{...o,stock:o.stock-item.qty});
                    }
                }
            }
            setCart([]);setPosClientId('');setShowCheckout(false);
            addToast('¡Venta procesada!','success');
            setReceiptSale(savedSale);
        }catch(err){addToast(`Error al procesar: ${err.message}`,'error');}
    };

    // ── CRUD ─────────────────────────────────────────────────────────────────
    const handleSaveClient=async(form)=>{try{form.id?await updateClient(form.id,form):await addClient(form);addToast(form.id?'Cliente actualizado':'Cliente guardado','success');setClientModal(null);}catch(err){addToast(`Error: ${err.message}`,'error');throw err;}};
    const handleSavePet=async(form)=>{try{form.id?await updatePet(form.id,form):await addPet(form);addToast(form.id?'Paciente actualizado':'Paciente registrado','success');setPetModal(null);}catch(err){addToast(`Error: ${err.message}`,'error');throw err;}};
    const handleTogglePetStatus=async(pet,newStatus)=>{try{await updatePet(pet.id,{...pet,status:newStatus});addToast(newStatus==='activo'?'Paciente marcado como activo':'Paciente marcado como inactivo','info');}catch(err){addToast(`Error: ${err.message}`,'error');}};
    const handleSaveService=async(form)=>{try{form.id?await updateService(form.id,form):await addService(form);addToast(form.id?'Servicio actualizado':'Servicio guardado','success');setServiceModal(null);}catch(err){addToast(`Error: ${err.message}`,'error');throw err;}};
    const handleSaveProduct=async(form)=>{try{form.id?await updateProduct(form.id,form):await addProduct(form);addToast(form.id?'Producto actualizado':'Producto guardado','success');setProductModal(null);}catch(err){addToast(`Error: ${err.message}`,'error');throw err;}};
    const handleSaveUser=async(form)=>{try{const payload={...form};if(form.id&&!form.password)delete payload.password;if(form.id){const s=await usersApi.update(form.id,payload);setUsers(p=>p.map(u=>u.id===form.id?s:u));}else{const c=await usersApi.create(payload);setUsers(p=>[...p,c]);}addToast(form.id?'Usuario actualizado':'Usuario creado','success');setUserModal(null);}catch(err){addToast(`Error: ${err.message}`,'error');throw err;}};
    const handleSaveSettings=async(form)=>{try{const {id,...data}=form;await updateSettings(data);addToast('Configuración guardada','success');}catch(err){addToast(`Error: ${err.message}`,'error');throw err;}};

    const handleAddExpense=async(data)=>{try{await addExpense(data);addToast('Egreso agregado','success');}catch(err){addToast(`Error: ${err.message}`,'error');throw err;}};
    const handleDeleteExpense=async(id)=>{
        const ok=await notify({type:'confirm',icon:'🗑️',accent:'red',title:'¿Eliminar este egreso?',message:'Esta acción no se puede deshacer.',confirmLabel:'Sí, eliminar',cancelLabel:'Cancelar'});
        if(!ok)return;
        try{await deleteExpense(id);addToast('Egreso eliminado','info');}catch(err){addToast(`Error: ${err.message}`,'error');}
    };

    const handleDelete=async(type,id,label)=>{
        const ok=await notify({type:'confirm',icon:'🗑️',accent:'red',title:`¿Eliminar "${label}"?`,message:'Esta acción no se puede deshacer.',confirmLabel:'Sí, eliminar',cancelLabel:'Cancelar'});
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

    // ── Appointments ──────────────────────────────────────────────────────────
    const handleAddAppointment=useCallback(async(formData)=>{
        const check=validateSlot(appointments,formData.date,formData.time,empleados);
        if(!check.ok){addToast(check.message,'error');throw new Error(check.message);}
        const pet=pets.find(p=>String(p.id)===String(formData.petId));
        const dataWithClient={...formData,clientId:pet?.ownerId||formData.clientId||null};
        try{
            const c=await appointmentsApi.create(dataWithClient);
            setAppointments(p=>[...p,c]);
            addToast('Cita agendada','success');
        }catch(err){addToast(`Error al agendar: ${err.message}`,'error');throw err;}
    },[appointments,empleados,pets,addToast]);

    // Notificación automática e inmediata al confirmar/finalizar — sin diálogo
    // de confirmación intermedio (ver feedback del cliente). Abre WhatsApp
    // (si hay teléfono) Y el cliente de correo del sistema operativo (si hay
    // email) — nunca un correo fijo del servidor: cada empleado/admin envía
    // desde su propia cuenta, la que tenga configurada en su equipo.
    const notifyClientByWhatsApp = useCallback((appt,newStatus)=>{
        if(newStatus!=='Confirmada'&&newStatus!=='Completada'&&newStatus!=='Finalizada')return;
        const petId=getApptPetId(appt);
        const pet=pets.find(p=>String(p.id)===String(petId));
        const owner=pet?clients.find(c=>String(c.id)===String(pet.ownerId)):null;
        const clientPhone=owner?.phone||getApptClientPhone(appt);
        const clientEmail=owner?.email;
        if(!clientPhone&&!clientEmail){addToast('No se notificó: el cliente no tiene teléfono ni correo registrado','info');return;}
        const baseInfo={
            clientName:  owner?.name||getApptClientName(appt)||'Cliente',
            clientPhone: clientPhone,
            petName:     getApptPetName(appt),
            serviceName: getApptServiceName(appt),
            date:        appt.date,
            time:        getApptTime(appt),
        };
        let opened=false;
        if(clientPhone){
            const url=(newStatus==='Confirmada')?shopToClientOnConfirmation(baseInfo):shopToClientOnFinished(baseInfo);
            opened=openWhatsApp(url)||opened;
        }
        if(clientEmail){
            const mailUrl=(newStatus==='Confirmada')?emailOnConfirmation({...baseInfo,clientEmail}):emailOnFinished({...baseInfo,clientEmail});
            opened=openEmail(mailUrl)||opened;
        }
        addToast(opened?'Se abrió WhatsApp/correo para notificar al cliente':'No se pudo generar la notificación',opened?'info':'error');
    },[pets,clients,addToast]);

    // FIX: addSale con nuevo formato al finalizar cita
    const handleStatusChange=useCallback(async(appt,newStatus)=>{
        if(!newStatus)return;
        try{
            const updated=await appointmentsApi.update(appt.id,{status:newStatus});
            setAppointments(p=>p.map(a=>a.id===appt.id?{...a,...updated}:a));
            if(newStatus==='Finalizada'||newStatus==='Completada'){
                const petId=getApptPetId(appt);
                const pet=pets.find(p=>String(p.id)===String(petId));
                await addSale({
                    items:[{name:`Servicio: ${getApptServiceName(appt)} (${getApptPetName(appt)})`,price:Number(appt.finalPrice),quantity:1}],
                    total:Number(appt.finalPrice),
                    clientId:pet?.ownerId||getApptClientId(appt)||null,
                    appointmentId:appt.id,
                    type:'service',
                    paymentMethod:'efectivo',
                    status:'pagado',
                });
                if(pet)await updatePet(pet.id,{...pet,history:[...(Array.isArray(pet.history)?pet.history:[]),{date:todayStr_,detail:`${getApptServiceName(appt)} finalizado — $${appt.finalPrice}`,author:user?.name||'Admin'}]});
            }
            addToast(`Estado → ${newStatus}`,'success');
            notifyClientByWhatsApp(appt,newStatus);
        }catch(err){addToast(`Error: ${err.message}`,'error');}
    },[addToast,pets,addSale,updatePet,todayStr_,user,notifyClientByWhatsApp]);

    // Asigna hora a una cita Pendiente sin horario (el cliente solo sugirió el día)
    // y la pasa a Confirmada en un solo update — separa "elegir hora" de "confirmar".
    const handleAssignTime=useCallback(async(appt,time)=>{
        const check=validateSlot(appointments,appt.date,time,empleados,appt.id);
        if(!check.ok){addToast(check.message,'error');return;}
        try{
            const updated=await appointmentsApi.update(appt.id,{time,status:'Confirmada'});
            setAppointments(p=>p.map(a=>a.id===appt.id?{...a,...updated}:a));
            addToast('Horario asignado — cita confirmada','success');
            notifyClientByWhatsApp({...appt,time},'Confirmada');
        }catch(err){addToast(`No se pudo asignar el horario: ${err.message}`,'error');}
    },[appointments,empleados,addToast,notifyClientByWhatsApp]);

    const handleFinalize=useCallback(async(appo)=>{
        const ok=await notify({type:'confirm',icon:'🏁',accent:'mint',title:'¿Finalizar y cobrar?',message:`"${getApptServiceName(appo)}" de ${getApptPetName(appo)} — $${appo.finalPrice}`,confirmLabel:`Cobrar $${appo.finalPrice}`,cancelLabel:'Cancelar'});
        if(!ok)return;
        try{
            const petId=getApptPetId(appo);
            const pet=pets.find(p=>String(p.id)===String(petId));
            // FIX: addSale con nuevo formato
            await addSale({
                items:[{name:`Servicio: ${getApptServiceName(appo)} (${getApptPetName(appo)})`,price:Number(appo.finalPrice),quantity:1}],
                total:Number(appo.finalPrice),
                clientId:pet?.ownerId||getApptClientId(appo)||null,
                appointmentId:appo.id,
                type:'service',
                paymentMethod:'efectivo',
                status:'pagado',
            });
            if(pet)await updatePet(pet.id,{...pet,history:[...(Array.isArray(pet.history)?pet.history:[]),{date:todayStr_,detail:`${getApptServiceName(appo)} finalizado — $${appo.finalPrice}`}]});
            const upd=await appointmentsApi.update(appo.id,{status:'Completada'});
            setAppointments(p=>p.map(a=>a.id===appo.id?{...a,...upd}:a));
            addToast('Servicio finalizado y cobrado','success');
        }catch(err){addToast(`Error: ${err.message}`,'error');}
    },[notify,pets,addSale,updatePet,todayStr_,addToast]);

    const handleDeleteAppt=useCallback(async(id)=>{
        const ok=await notify({type:'confirm',icon:'🗑️',accent:'red',title:'¿Eliminar esta cita?',message:'Esta acción no se puede deshacer.',confirmLabel:'Sí, eliminar',cancelLabel:'Mantener'});
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

    const NAV=[
        {id:'control',icon:<FaTachometerAlt/>,label:'Panel'},
        {id:'analiticos',icon:<FaChartBar/>,label:'Analíticos'},
        {id:'pos',icon:<FaCashRegister/>,label:'Venta'},
        {id:'clientes',icon:<FaUsers/>,label:'Clientes'},
        ...(settings?.enablePets!==false ? [{id:'pacientes',icon:<FaPaw/>,label:'Pacientes'}] : []),
        {id:'servicios',icon:<FaCut/>,label:'Servicios'},
        {id:'productos',icon:<FaBoxOpen/>,label:'Inventario'},
        {id:'usuarios',icon:<FaUserCog/>,label:'Usuarios'},
        {id:'personalizacion',icon:<FaPalette/>,label:'Sitio'},
    ];

    return (
        <div className="admin-layout">
            <div className="toast-container">{toasts.map(t=><Toast key={t.id} message={t.message} type={t.type} onClose={()=>removeToast(t.id)}/>)}</div>
            {NotifyNode}

            {activeModal==='ventas'   &&<SalesModal sales={sales} onClose={()=>setActiveModal(null)} onShowReceipt={setReceiptSale}/>}
            {receiptSale &&<ReceiptModal sale={receiptSale} settings={settings} client={clients.find(c=>String(c.id)===String(receiptSale.clientId))} onClose={()=>setReceiptSale(null)}/>}
            {activeModal==='egresos'  &&<ExpensesModal expenses={expenses} onClose={()=>setActiveModal(null)} onAdd={handleAddExpense} onDelete={handleDeleteExpense}/>}
            {activeModal==='clientes' &&<ClientsReportModal sales={sales} clients={clients} onClose={()=>setActiveModal(null)}/>}
            {activeModal==='stock'    &&<StockModal products={products} onClose={()=>setActiveModal(null)}/>}

            {showCalendar&&<CalendarModal appointments={appointments} pets={pets} clients={clients} services={services} users={users} role="admin"
                onClose={()=>setShowCalendar(false)} onRefresh={loadAppointments}
                onAddAppointment={handleAddAppointment} onStatusChange={handleStatusChange}
                onAssignTime={handleAssignTime}
                onFinalize={handleFinalize} onDeleteAppt={handleDeleteAppt}
                onAddExtra={addAppointmentExtra} onRemoveExtra={removeAppointmentExtra}/>}

            {clientModal!==null&&<ClientFormModal initial={clientModal||undefined} onSave={handleSaveClient} onClose={()=>setClientModal(null)} extraFields={settings?.clientExtraFields||[]}/>}
            {petModal!==null&&<PetFormModal initial={petModal||undefined} clients={clients} onSave={handleSavePet} onClose={()=>setPetModal(null)}/>}
            {serviceModal!==null&&<ServiceFormModal initial={serviceModal||undefined} onSave={handleSaveService} onClose={()=>setServiceModal(null)}/>}
            {productModal!==null&&<ProductFormModal initial={productModal||undefined} onSave={handleSaveProduct} onClose={()=>setProductModal(null)}/>}
            {userModal!==null&&<UserFormModal initial={userModal||undefined} onSave={handleSaveUser} onClose={()=>setUserModal(null)}/>}

            {posVariantPicker&&<Modal title={`Elige una opción — ${posVariantPicker.name}`} onClose={()=>setPosVariantPicker(null)}>
                <div className="ds-price-table">
                    {(posVariantPicker.variants||[]).map((v,i)=>(
                        <button key={i} type="button" className="ds-step-row pos-variant-option" disabled={v.stock<=0}
                            onClick={()=>pickVariant(posVariantPicker,v)}
                            style={{width:'100%',textAlign:'left',background:'#f8fafc',border:'1.5px solid #e0e4ea',borderRadius:12,padding:'10px 14px',cursor:v.stock<=0?'not-allowed':'pointer',opacity:v.stock<=0?0.5:1}}>
                            <span style={{flex:1,fontWeight:700}}>{v.name}</span>
                            <span style={{fontWeight:800,color:'#00b894'}}>${v.price}</span>
                            <span style={{fontSize:'0.78rem',color:'#94a3b8',marginLeft:8}}>{v.stock<=0?'Sin stock':`Stock: ${v.stock}`}</span>
                        </button>
                    ))}
                </div>
            </Modal>}

            {showCheckout&&<Modal title="Confirmar venta" onClose={()=>setShowCheckout(false)}>
                <p className="checkout-modal-note">Configura los detalles de la venta.</p>
                <select value={posClientId} onChange={e=>setPosClientId(e.target.value)} className="checkout-client-select">
                    <option value="">Sin cliente</option>
                    {clients.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                {/* Forma de pago */}
                <div className="checkout-payment-row" style={{display:'flex',gap:8,margin:'12px 0'}}>
                    {['efectivo','tarjeta','transferencia'].map(m=>(
                        <button key={m} className={`checkout-pay-btn ${posPaymentMethod===m?'active':''}`}
                            onClick={()=>setPosPaymentMethod(m)} style={{flex:1,padding:'8px',borderRadius:10,border:'1.5px solid',cursor:'pointer',fontWeight:700,borderColor:posPaymentMethod===m?'#74b9ff':'#e2e8f0',background:posPaymentMethod===m?'#e0f2fe':'white',color:posPaymentMethod===m?'#185FA5':'#64748b'}}>
                            {m==='efectivo'?'💵 Efectivo':m==='tarjeta'?'💳 Tarjeta':'🏦 Transferencia'}
                        </button>
                    ))}
                </div>
                {/* Estado de venta */}
                <div style={{display:'flex',gap:8,marginBottom:12}}>
                    {['pagado','pendiente'].map(s=>(
                        <button key={s} className={`checkout-pay-btn ${posSaleStatus===s?'active':''}`}
                            onClick={()=>setPosSaleStatus(s)} style={{flex:1,padding:'8px',borderRadius:10,border:'1.5px solid',cursor:'pointer',fontWeight:700,borderColor:posSaleStatus===s?'#55efc4':'#e2e8f0',background:posSaleStatus===s?'#d1fae5':'white',color:posSaleStatus===s?'#065f46':'#64748b'}}>
                            {s==='pagado'?'✅ Pagado':'⏳ Pendiente'}
                        </button>
                    ))}
                </div>
                <div className="checkout-items-preview">
                    {cart.map((i,idx)=><div key={idx} className="checkout-item-row"><span>{i.qty}x {i.name||i.title}</span><span>${(i.price*i.qty).toFixed(2)}</span></div>)}
                </div>
                <div className="checkout-total-row"><span>Total</span><strong>${cartTotal.toFixed(2)}</strong></div>
                <div className="form-actions form-actions--end" style={{marginTop:16}}>
                    <button className="btn-secondary" onClick={()=>setShowCheckout(false)}>Cancelar</button>
                    <button className="btn-primary" onClick={processCheckout}><FaReceipt/> Confirmar</button>
                </div>
            </Modal>}

            <header className="admin-top-bar">
                <div className="topbar-left">
                    <span className="admin-logo">Taylor's<span>.</span></span>
                    {tab!=='pos'&&<div className="search-bar-wrapper" ref={searchRef}>
                        <div className={`search-bar-global ${showSearchPanel?'focused':''}`}>
                            <FaSearch/><input type="text" placeholder="Buscar en todo el sistema..." value={searchTerm} onChange={e=>setSearchTerm(e.target.value)} onFocus={()=>setSearchFocus(true)}/>
                            {searchTerm&&<button style={{background:'none',border:'none',cursor:'pointer',color:'var(--text-muted)',padding:0}} onClick={()=>{setSearchTerm('');setSearchFocus(false);}}><FaTimes/></button>}
                        </div>
                        {showSearchPanel&&<GlobalSearchPanel query={searchTerm} clients={clients} pets={pets} services={services} products={products} onNavigate={(t)=>{setTab(t);setSearchFocus(false);}} onClose={()=>{setSearchFocus(false);setSearchTerm('');}}/>}
                    </div>}
                </div>
                <div className="topbar-right">
                    <ThemeToggle/>
                    <OnboardingHelpButton onClick={reopenOnboarding}/>
                    <div className="user-pill"><FaUserShield/><span>{user?.name}</span></div>
                    <button className="logout-pill" onClick={logout}><FaSignOutAlt/></button>
                </div>
            </header>

            {showOnboarding && <OnboardingTour steps={ADMIN_ONBOARDING_STEPS} onClose={dismissOnboarding}/>}

            <aside className="admin-sidebar">
                <nav className="sidebar-nav">{NAV.map(item=><button key={item.id} className={`nav-btn ${tab===item.id?'active':''}`} onClick={()=>{setTab(item.id);setSearchTerm('');setSearchFocus(false);}} title={item.label}>{item.icon}<span className="nav-label">{item.label}</span></button>)}</nav>
                <button className="sidebar-logout" onClick={logout}><FaSignOutAlt/></button>
            </aside>

            <main className="admin-main-panel">

                {tab==='control'&&<div className="fade-in">
                    <div className="page-header"><h2>Panel de control</h2><p>{MONTH_NAMES[now.getMonth()]} {now.getFullYear()}</p></div>
                    <div className="stats-grid">
                        <div className="stat-card stat-card--blue clickable" onClick={()=>setActiveModal('ventas')}><span className="stat-label">Ventas del mes</span><span className="stat-value">${stats.monthSales.toLocaleString()}</span><span className="stat-hint">Ver detalle →</span></div>
                        <div className="stat-card stat-card--red clickable" onClick={()=>setActiveModal('egresos')}><span className="stat-label">Egresos del mes</span><span className="stat-value">${stats.monthExpenses.toLocaleString()}</span><span className="stat-hint">Ver detalle →</span></div>
                        <div className="stat-card stat-card--teal clickable" onClick={()=>setShowCalendar(true)}><span className="stat-label">Citas hoy</span><span className="stat-value">{stats.appointmentsCount}</span><span className="stat-hint">Ver agenda →</span></div>
                        <div className="stat-card stat-card--purple clickable" onClick={()=>setActiveModal('clientes')}><span className="stat-label">Clientes</span><span className="stat-value">{stats.totalClients}</span><span className="stat-hint">Reporte →</span></div>
                        <div className="stat-card stat-card--red clickable" onClick={()=>setActiveModal('stock')}><span className="stat-label">Stock crítico</span><span className="stat-value">{stats.lowStock}</span><span className="stat-hint">Ver →</span></div>
                    </div>
                    <div className="control-lower-grid">
                        <div className="panel-card"><div className="panel-card-header"><h4><FaChartBar/> Servicios por categoría</h4></div><ServiceChart sales={sales} services={services}/></div>
                        <div className="panel-card"><div className="panel-card-header"><h4><FaDollarSign/> Ventas esta semana</h4></div><WeeklyChart sales={sales}/></div>
                    </div>
                </div>}

                {tab==='analiticos'&&<AnalyticsSection sales={sales} expenses={expenses} appointments={appointments} clients={clients} services={services}/>}

                {tab==='pos'&&<div className="fade-in">
                    <div className="page-header"><h2>Punto de venta</h2></div>
                    <div className="pos-container">
                        <div className="pos-catalog">
                            <div className="pos-search-row">
                                <div className="search-input-wrapper"><FaSearch/><input type="text" placeholder="Buscar..." value={posSearch} onChange={e=>setPosSearch(e.target.value)}/></div>
                                <div className="pos-filters">{['Todos','Productos','Servicios'].map(cat=><button key={cat} className={posCategory===cat?'active':''} onClick={()=>setPosCategory(cat)}>{cat}</button>)}</div>
                            </div>
                            {services.length===0&&products.length===0&&(
                                <div style={{textAlign:'center',padding:'60px 20px',color:'#94a3b8'}}>
                                    <p style={{fontSize:'2rem',marginBottom:8}}>🛍️</p>
                                    <p>Aún no hay servicios ni productos en catálogo.</p>
                                    <p style={{fontSize:'0.85rem',marginTop:4}}>Agrégalos desde las pestañas <strong>Servicios</strong> e <strong>Inventario</strong>.</p>
                                </div>
                            )}
                            <div className="pos-grid">
                                {(posCategory==='Todos'||posCategory==='Productos')&&posProducts.map(p=><div key={p.id} className={`pos-card ${p.stock<=0?'pos-card--disabled':''}`} onClick={()=>addProductToCart(p)}>{p.imageUrl?<img src={p.imageUrl} alt="" className="pos-card-photo"/>:<div className="pos-card-icon product-icon"><FaBoxOpen/></div>}<h5>{p.name}</h5><p className="pos-price">{(p.variants||[]).length>0?'Ver opciones':`$${p.price}`}</p><span className={p.stock<5?'low-stock':'in-stock'}>{(p.variants||[]).length>0?`${p.variants.length} variantes`:p.stock<=0?'Sin stock':`Stock: ${p.stock}`}</span></div>)}
                                {(posCategory==='Todos'||posCategory==='Servicios')&&posServices.map(s=><div key={s.id} className="pos-card pos-card--service" onClick={()=>addToCart(s,'service')}>{s.imageUrl?<img src={s.imageUrl} alt="" className="pos-card-photo"/>:<div className="pos-card-icon service-icon"><FaCut/></div>}<h5>{s.title}</h5><p className="pos-price">${s.price} base*</p><span className="in-stock">Precio según talla</span></div>)}
                            </div>
                        </div>
                        <aside className="pos-cart">
                            <div className="pos-cart-header"><h4><FaCartPlus/> Carrito</h4><button className="clear-cart-btn" onClick={()=>setCart([])}>Vaciar</button></div>
                            <div className="pos-cart-items">{cart.length===0&&<p className="empty-cart">Vacío</p>}{cart.map((item,i)=><div key={`${item.id}-${item.variantName||''}-${i}`} className="cart-item"><div><span className="cart-item-name">{item.qty}x {item.name||item.title}</span><span className="cart-item-price">${(item.price*item.qty).toFixed(2)}</span></div><button onClick={()=>removeFromCart(item.id,item.type,item.variantName)}><FaTrashAlt/></button></div>)}</div>
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
                    <div className="ds-cards-grid">{filteredPets.length===0&&<p className="empty-td">Sin resultados</p>}{filteredPets.map(p=><PetCard key={p.id} pet={p} owner={clients.find(c=>String(c.id)===String(p.ownerId))} onEdit={pet=>setPetModal(pet)} onDelete={(id,name)=>handleDelete('pet',id,name)} onToggleStatus={handleTogglePetStatus}/>)}</div>
                    <FAB onClick={()=>setPetModal({})} title="Nueva mascota"/>
                </div>}

                {tab==='servicios'&&<div className="fade-in">
                    <div className="ds-page-header"><div className="ds-page-header-left"><h2>Servicios</h2><p>{services.length} en catálogo</p></div></div>
                    {services.length===0&&<div style={{textAlign:'center',padding:'60px 20px',color:'#94a3b8',background:'white',borderRadius:20,border:'2px dashed #e2e8f0'}}>
                        <p style={{fontSize:'2.5rem',marginBottom:8}}>✂️</p>
                        <p style={{fontWeight:700,marginBottom:4}}>Sin servicios todavía</p>
                        <p style={{fontSize:'0.9rem'}}>Usa el botón + para agregar el primer servicio al catálogo.</p>
                    </div>}
                    <div className="ds-cards-grid">{filteredServices.map(s=><DSServiceCard key={s.id} service={s} onEdit={svc=>setServiceModal(svc)} onDelete={(id,name)=>handleDelete('service',id,name)}/>)}</div>
                    <FAB onClick={()=>setServiceModal({})} title="Nuevo servicio" color="#a29bfe"/>
                </div>}

                {tab==='productos'&&<div className="fade-in">
                    <div className="ds-page-header"><div className="ds-page-header-left"><h2>Inventario</h2><p>{products.length} productos</p></div></div>
                    {products.length===0&&<div style={{textAlign:'center',padding:'60px 20px',color:'#94a3b8',background:'white',borderRadius:20,border:'2px dashed #e2e8f0'}}>
                        <p style={{fontSize:'2.5rem',marginBottom:8}}>📦</p>
                        <p style={{fontWeight:700,marginBottom:4}}>Sin productos todavía</p>
                        <p style={{fontSize:'0.9rem'}}>Usa el botón + para agregar productos al inventario.</p>
                    </div>}
                    <div className="ds-cards-grid">{filteredProducts.map(p=><ProductCard key={p.id} product={p} onEdit={prod=>setProductModal(prod)} onDelete={(id,name)=>handleDelete('product',id,name)}/>)}</div>
                    <FAB onClick={()=>setProductModal({})} title="Nuevo producto" color="#55efc4"/>
                </div>}

                {tab==='usuarios'&&<div className="fade-in">
                    <div className="ds-page-header"><div className="ds-page-header-left"><h2>Usuarios</h2><p>{users.length} registrados</p></div></div>
                    <div className="ds-cards-grid ds-cards-grid--compact">{filteredUsers.length===0&&<p className="empty-td">Sin resultados</p>}{filteredUsers.map(u=><UserCard key={u.id} user={u} currentUserId={user?.id} onEdit={usr=>setUserModal(usr)} onDelete={(id,name)=>handleDelete('user',id,name)}/>)}</div>
                    <FAB onClick={()=>setUserModal({})} title="Nuevo usuario" color="#636e72"/>
                </div>}

                {tab==='personalizacion'&&<div className="fade-in">
                    <div className="ds-page-header"><div className="ds-page-header-left"><h2>Personalización del sitio</h2><p>Marca, contenido público y configuración del negocio</p></div></div>
                    <PersonalizacionSection settings={settings} onSave={handleSaveSettings}/>
                </div>}

            </main>
        </div>
    );
};

export default AdminDashboard;
