// src/Chatbot.jsx  ← si está aquí, usa ./contexts/
// src/components/Chatbot/Chatbot.jsx ← si está aquí, usa ../../contexts/
//
// Este archivo tiene las rutas para src/Chatbot.jsx
// Si lo mueves a src/components/Chatbot/, cambia las 2 primeras líneas de import.

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData }     from '../../contexts/DataContext';
import { useAuth }     from '../../contexts/AuthContext';
import './Chatbot.css';

// ─── Íconos SVG ───────────────────────────────────────────────────────────────
const ChatIcon = () => (
    <svg viewBox="0 0 24 24" width="26" height="26" fill="currentColor">
        <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"/>
    </svg>
);

const CloseIcon = () => (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
        <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
    </svg>
);

const SendIcon = () => (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
        <path d="M2 21l21-9L2 3v7l15 2-15 2z"/>
    </svg>
);

// ─── Quick replies iniciales ──────────────────────────────────────────────────
const INITIAL_REPLIES = [
    { label: '🛁 Ver servicios',  action: 'servicios' },
    { label: '🛍️ Ver productos', action: 'productos' },
    { label: '📅 Agendar cita',  action: 'agendar'   },
    { label: '📍 Ubicación',     action: 'ubicacion' },
    { label: '📞 Contacto',      action: 'contacto'  },
];

// ─── Motor de respuestas ──────────────────────────────────────────────────────
const buildEngine = (services, products, isLoggedIn) => {

    const formatService = (s) => {
        const base    = Number(s.price) || 0;
        const chico   = s.priceChico   ?? base;
        const mediano = s.priceMediano ?? +(base * 1.25).toFixed(0);
        const grande  = s.priceGrande  ?? +(base * 1.50).toFixed(0);
        return `${s.icon || '🐾'} *${s.title}*\n• Chico: $${chico}\n• Mediano: $${mediano}\n• Grande: $${grande}\n⏱ ${s.duration || '—'}`;
    };

    const formatProduct = (p) => {
        const stockMsg = Number(p.stock) <= 0
            ? '❌ Agotado'
            : Number(p.stock) <= 5
                ? `⚠️ Pocas piezas (${p.stock} disponibles)`
                : `✅ ${p.stock} disponibles`;
        return `🎁 *${p.name}*\n💰 $${p.price}\n${stockMsg}`;
    };

    const rules = [
        {
            keys: ['servicio', 'servicios', 'que ofrecen', 'qué ofrecen', 'catálogo', 'catalogo'],
            reply: () => {
                if (!services.length) return { text: 'Aún no tenemos servicios configurados. Vuelve pronto 🙏', replies: INITIAL_REPLIES };
                return {
                    text: `Estos son nuestros servicios:\n\n${services.map(formatService).join('\n\n')}`,
                    replies: [{ label: '📅 Reservar cita', action: 'agendar' }, { label: '🔙 Menú', action: 'menu' }]
                };
            }
        },
        {
            keys: ['precio', 'precios', 'cuesta', 'cuánto', 'cuanto', 'costo', 'tarifa', 'cobran'],
            reply: () => {
                if (!services.length) return { text: 'No hay servicios configurados aún.', replies: INITIAL_REPLIES };
                return {
                    text: `💰 Precios según tamaño de tu mascota:\n\n${services.map(formatService).join('\n\n')}\n\n_Chico ≤5kg · Mediano ≤12kg · Grande ≤25kg_`,
                    replies: [{ label: '📅 Reservar cita', action: 'agendar' }, { label: '🔙 Menú', action: 'menu' }]
                };
            }
        },
        {
            keys: ['baño', 'bano', 'bañar', 'banar'],
            reply: () => {
                const s = services.find(sv => sv.title?.toLowerCase().includes('baño') || sv.title?.toLowerCase().includes('bano'));
                if (!s) return { text: 'No encontré el servicio de baño. Llámanos al +52 228 123 4567.', replies: INITIAL_REPLIES };
                return { text: formatService(s), replies: [{ label: '📅 Reservar', action: 'agendar' }, { label: '🔙 Menú', action: 'menu' }] };
            }
        },
        {
            keys: ['corte', 'cortar', 'pelo', 'cabello', 'grooming'],
            reply: () => {
                const s = services.find(sv => sv.title?.toLowerCase().includes('corte'));
                if (!s) return { text: 'No encontré el servicio de corte. Llámanos para más info.', replies: INITIAL_REPLIES };
                return { text: formatService(s), replies: [{ label: '📅 Reservar', action: 'agendar' }, { label: '🔙 Menú', action: 'menu' }] };
            }
        },
        {
            keys: ['uña', 'unas', 'uñas', 'nail', 'garras'],
            reply: () => {
                const s = services.find(sv => sv.title?.toLowerCase().includes('uña') || sv.title?.toLowerCase().includes('una'));
                if (!s) return { text: 'No encontré el servicio de uñas. Llámanos para más info.', replies: INITIAL_REPLIES };
                return { text: formatService(s), replies: [{ label: '📅 Reservar', action: 'agendar' }, { label: '🔙 Menú', action: 'menu' }] };
            }
        },
        {
            keys: ['producto', 'productos', 'tienda', 'shop', 'comprar', 'venden', 'shampoo', 'alimento', 'collar', 'accesorio'],
            reply: () => {
                if (!products.length) return { text: 'No hay productos disponibles aún.', replies: INITIAL_REPLIES };
                return {
                    text: `🛍️ Nuestros productos:\n\n${products.map(formatProduct).join('\n\n')}`,
                    replies: [{ label: '🛒 Ir a la tienda', action: 'ir_tienda' }, { label: '🔙 Menú', action: 'menu' }]
                };
            }
        },
        {
            keys: ['disponible', 'disponibilidad', 'stock', 'hay', 'tienen', 'existe'],
            reply: () => {
                const available = products.filter(p => Number(p.stock) > 0);
                const out       = products.filter(p => Number(p.stock) <= 0);
                let text = available.length
                    ? `✅ Disponibles (${available.length}):\n${available.map(p => `• ${p.name} — $${p.price} (${p.stock} uds.)`).join('\n')}`
                    : 'No hay productos disponibles en este momento.';
                if (out.length) text += `\n\n❌ Agotados:\n${out.map(p => `• ${p.name}`).join('\n')}`;
                return { text, replies: [{ label: '🛒 Ir a la tienda', action: 'ir_tienda' }, { label: '🔙 Menú', action: 'menu' }] };
            }
        },
        {
            keys: ['cita', 'citas', 'agendar', 'reservar', 'reserva', 'appointment', 'turno'],
            reply: () => ({
                text: isLoggedIn
                    ? '📅 ¡Perfecto! Puedes reservar desde nuestra página de servicios. ¿Te llevo?'
                    : '📅 Para agendar necesitas iniciar sesión. ¿Quieres ir al login?',
                replies: isLoggedIn
                    ? [{ label: '📅 Ir a servicios', action: 'ir_servicios' }, { label: '🔙 Menú', action: 'menu' }]
                    : [{ label: '🔐 Iniciar sesión', action: 'ir_login' }, { label: '📝 Crear cuenta', action: 'ir_registro' }, { label: '🔙 Menú', action: 'menu' }]
            })
        },
        {
            keys: ['horario', 'horarios', 'abren', 'cierran', 'atienden', 'cuando'],
            reply: () => ({
                text: '🕐 Horarios de atención:\n\n📅 Lunes a Viernes: 9:00 AM – 7:00 PM\n📅 Sábado: 9:00 AM – 5:00 PM\n📅 Domingo: 10:00 AM – 3:00 PM',
                replies: [{ label: '📅 Agendar cita', action: 'agendar' }, { label: '🔙 Menú', action: 'menu' }]
            })
        },
        {
            keys: ['ubicacion', 'ubicación', 'donde', 'dónde', 'dirección', 'direccion', 'mapa', 'sucursal', 'llegar'],
            reply: () => ({
                text: '📍 Nuestras sucursales:\n\n🏪 *Sucursal Central*\nCalle Principal #123, Coatepec\n\n🏪 *Sucursal Norte*\nAv. Araucarias #456, Xalapa',
                replies: [{ label: '📍 Ver en Contacto', action: 'ir_contacto' }, { label: '🔙 Menú', action: 'menu' }]
            })
        },
        {
            keys: ['contacto', 'telefono', 'teléfono', 'llamar', 'whatsapp', 'número', 'numero', 'email', 'correo'],
            reply: () => ({
                text: '📞 Contáctanos:\n\n📱 Tel: +52 228 123 4567\n💬 WhatsApp: +52 228 123 4567\n📧 contacto@perrucho.mx',
                replies: [{ label: '💬 WhatsApp', action: 'whatsapp' }, { label: '📍 Ver Contacto', action: 'ir_contacto' }, { label: '🔙 Menú', action: 'menu' }]
            })
        },
        {
            keys: ['hola', 'buenos', 'buenas', 'hey', 'hi', 'hello', 'saludos'],
            reply: () => ({
                text: '¡Hola! 👋 Soy el asistente de *Perrucho*. ¿En qué te puedo ayudar?',
                replies: INITIAL_REPLIES
            })
        },
        {
            keys: ['gracias', 'thanks', 'perfecto', 'genial', 'excelente', 'ok', 'listo'],
            reply: () => ({
                text: '¡De nada! 😊 ¿Hay algo más en lo que te pueda ayudar?',
                replies: INITIAL_REPLIES
            })
        },
    ];

    const getResponse = (input) => {
        const normalized = input.toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '');

        for (const rule of rules) {
            if (rule.keys.some(k => normalized.includes(k))) return rule.reply();
        }

        return {
            text: `Hmm, no estoy seguro 🤔\n\nPuedo ayudarte con:\n• Servicios y precios\n• Productos disponibles\n• Agendar citas\n• Horarios y ubicación`,
            replies: INITIAL_REPLIES
        };
    };

    const getActionResponse = (action) => {
        const map = {
            servicios:    () => getResponse('servicios'),
            productos:    () => getResponse('productos'),
            agendar:      () => getResponse('agendar cita'),
            ubicacion:    () => getResponse('ubicación'),
            contacto:     () => getResponse('contacto'),
            menu:         () => ({ text: '¿En qué más te puedo ayudar?', replies: INITIAL_REPLIES }),
            whatsapp:     () => ({ text: '💬 Abriendo WhatsApp...', replies: INITIAL_REPLIES, redirect: 'https://wa.me/522281234567' }),
            ir_servicios: () => ({ text: '¡Te llevo a servicios! 🐾', replies: [], navigate: '/servicios' }),
            ir_tienda:    () => ({ text: '¡Te llevo a la tienda! 🛍️', replies: [], navigate: '/tienda' }),
            ir_login:     () => ({ text: '¡Vamos al login! 🔐', replies: [], navigate: '/acceso' }),
            ir_registro:  () => ({ text: '¡Vamos a crear tu cuenta! 📝', replies: [], navigate: '/registro' }),
            ir_contacto:  () => ({ text: '¡Te llevo a contacto! 📍', replies: [], navigate: '/contacto' }),
        };
        return (map[action] || map.menu)();
    };

    return { getResponse, getActionResponse };
};

// ─── Texto con *negrita* ──────────────────────────────────────────────────────
const FormattedText = ({ text }) => {
    const parts = text.split(/(\*[^*]+\*)/g);
    return (
        <span>
            {parts.map((part, i) =>
                part.startsWith('*') && part.endsWith('*')
                    ? <strong key={i}>{part.slice(1, -1)}</strong>
                    : <span key={i} style={{ whiteSpace: 'pre-line' }}>{part}</span>
            )}
        </span>
    );
};

// ─── Componente principal ─────────────────────────────────────────────────────
const Chatbot = () => {
    const { services, products } = useData();
    const { isLoggedIn }         = useAuth();
    const navigate               = useNavigate();

    const [isOpen,   setIsOpen]   = useState(false);
    const [messages, setMessages] = useState([]);
    const [input,    setInput]    = useState('');
    const [typing,   setTyping]   = useState(false);
    const [unread,   setUnread]   = useState(0);
    const bottomRef              = useRef(null);

    const engine = useCallback(
        () => buildEngine(services, products, isLoggedIn),
        [services, products, isLoggedIn]
    );

    // Bienvenida al abrir
    useEffect(() => {
        if (isOpen && messages.length === 0) {
            setMessages([{
                id:      Date.now(),
                from:    'bot',
                text:    '¡Hola! 👋 Soy el asistente de *Perrucho*. ¿En qué puedo ayudarte?',
                replies: INITIAL_REPLIES,
            }]);
        }
        if (isOpen) setUnread(0);
    }, [isOpen]);

    // Scroll al fondo
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, typing]);

    // Badge de bienvenida a los 5s
    useEffect(() => {
        const t = setTimeout(() => { if (!isOpen) setUnread(1); }, 5000);
        return () => clearTimeout(t);
    }, []);

    const addBotMessage = useCallback((response) => {
        setTyping(true);
        setTimeout(() => {
            setTyping(false);
            setMessages(prev => [...prev, {
                id:      Date.now(),
                from:    'bot',
                text:    response.text,
                replies: response.replies || [],
            }]);
            if (response.navigate) {
                setTimeout(() => { navigate(response.navigate); setIsOpen(false); }, 800);
            }
            if (response.redirect) {
                setTimeout(() => window.open(response.redirect, '_blank'), 800);
            }
        }, 900);
    }, [navigate]);

    const handleSend = () => {
        const text = input.trim();
        if (!text) return;
        setMessages(prev => [...prev, { id: Date.now(), from: 'user', text }]);
        setInput('');
        addBotMessage(engine().getResponse(text));
    };

    const handleQuickReply = (action, label) => {
        setMessages(prev => [...prev, { id: Date.now(), from: 'user', text: label }]);
        addBotMessage(engine().getActionResponse(action));
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
    };

    const lastBotReplies = [...messages].reverse().find(m => m.from === 'bot')?.replies || [];

    return (
        <>
            {isOpen && (
                <div className="chatbot-window">
                    <div className="chatbot-header">
                        <div className="chatbot-header-avatar">🐾</div>
                        <div className="chatbot-header-info">
                            <span className="chatbot-header-name">Perrucho Asistente</span>
                            <span className="chatbot-header-status">● En línea</span>
                        </div>
                        <button className="chatbot-close-btn" onClick={() => setIsOpen(false)}>
                            <CloseIcon />
                        </button>
                    </div>

                    <div className="chatbot-messages">
                        {messages.map(msg => (
                            <div key={msg.id} className={`chatbot-msg-wrap chatbot-msg-wrap--${msg.from}`}>
                                {msg.from === 'bot' && <div className="chatbot-bot-avatar">🐾</div>}
                                <div className={`chatbot-bubble chatbot-bubble--${msg.from}`}>
                                    <FormattedText text={msg.text} />
                                </div>
                            </div>
                        ))}

                        {lastBotReplies.length > 0 && !typing && (
                            <div className="chatbot-quick-replies">
                                {lastBotReplies.map((r, i) => (
                                    <button key={i} className="chatbot-qr-btn"
                                        onClick={() => handleQuickReply(r.action, r.label)}>
                                        {r.label}
                                    </button>
                                ))}
                            </div>
                        )}

                        {typing && (
                            <div className="chatbot-msg-wrap chatbot-msg-wrap--bot">
                                <div className="chatbot-bot-avatar">🐾</div>
                                <div className="chatbot-typing">
                                    <span /><span /><span />
                                </div>
                            </div>
                        )}
                        <div ref={bottomRef} />
                    </div>

                    <div className="chatbot-input-area">
                        <input
                            type="text"
                            className="chatbot-input"
                            placeholder="Escribe tu pregunta..."
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            maxLength={200}
                        />
                        <button className="chatbot-send-btn" onClick={handleSend} disabled={!input.trim()}>
                            <SendIcon />
                        </button>
                    </div>
                </div>
            )}

            <button
                className={`chatbot-fab ${isOpen ? 'chatbot-fab--open' : ''}`}
                onClick={() => setIsOpen(v => !v)}
                aria-label="Abrir asistente"
            >
                {isOpen ? <CloseIcon /> : <ChatIcon />}
                {!isOpen && unread > 0 && (
                    <span className="chatbot-unread-badge">{unread}</span>
                )}
            </button>
        </>
    );
};

export default Chatbot;