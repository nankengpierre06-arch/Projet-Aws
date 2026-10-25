import React, { useEffect, useRef, useState } from 'react';
import Quill from 'quill';
import * as Y from 'yjs';
import { QuillBinding } from 'y-quill';
import { WebsocketProvider } from 'y-websocket';
import { 
  Users, Share2, Download, History, ShieldAlert, CheckCircle, 
  Clock, AlertTriangle, FileText, UserPlus, Sparkles, Check, ChevronLeft
} from 'lucide-react';

const COLORS = ['#7c3aed', '#2563eb', '#16a34a', '#d97706', '#dc2626', '#db2777', '#0891b2', '#4f46e5'];

const DOC_METADATA_FALLBACK = {
  'revue-principale': {
    title: 'Revue Annuelle (Édition Collective)',
    category: 'ÉDITION COLLECTIVE OFFICIELLE',
    subtitle: 'Revue numérique préparée collectivement par les rédacteurs de l\'association étudiante.'
  },
  'doc-alice-campus': {
    title: 'Enquête Campus : Logement & Mobilité Étudiante',
    category: 'ENQUÊTE & INVESTIGATION',
    subtitle: 'Étude d\'impact et témoignages sur les conditions de vie étudiante.'
  },
  'doc-revue-42': {
    title: 'Revue Étudiante n°42 — Innovations & Vie Universitaire',
    category: 'PARUTION OFFICIELLE',
    subtitle: 'Numéro spécial consacré aux initiatives de recherche et aux projets associatifs.'
  },
  'doc-bob-culture': {
    title: 'Chronique Culturelle & Festivals Universitaires',
    category: 'CHRONIQUE & CULTURE',
    subtitle: 'Panorama des événements artistiques, du théâtre et de la création musicale sur le campus.'
  }
};

export default function Editor({ 
  user, 
  docId, 
  onOpenShare, 
  onOpenCreateLink, 
  onOpenVersions,
  onQuotaUpdate,
  onBackToDocs
}) {
  const editorRef = useRef(null);
  const quillInstance = useRef(null);
  const providerRef = useRef(null);
  const ydocRef = useRef(null);
  const bindingRef = useRef(null);

  const [docMeta, setDocMeta] = useState(() => {
    return DOC_METADATA_FALLBACK[docId] || {
      title: `Document (${docId})`,
      category: 'REVUE UNIVERSITAIRE',
      subtitle: 'Espace de rédaction collaborative pour la revue étudiante.'
    };
  });

  const [activeUsers, setActiveUsers] = useState([]);
  const [quota, setQuota] = useState({ used: 0, limit: 10000, remaining: 10000 });
  const [wordCount, setWordCount] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');
  const [isBlocked, setIsBlocked] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');
  const [wsConnected, setWsConnected] = useState(false);

  // Charger les métadonnées du document actuel
  useEffect(() => {
    const fallback = DOC_METADATA_FALLBACK[docId] || {
      title: `Document ${docId}`,
      category: 'REVUE COLLABORATIVE',
      subtitle: 'Espace de rédaction partagé de l\'association étudiante.'
    };
    setDocMeta(fallback);

    fetch(`/api/documents/${encodeURIComponent(docId)}`)
      .then(res => res.json())
      .then(data => {
        if (data && data.title) {
          setDocMeta(prev => ({
            ...prev,
            title: data.title,
            category: data.ownerEmail === user?.email ? 'MON DOCUMENT (PROPRIÉTAIRE)' : 'DOCUMENT PARTAGÉ'
          }));
        }
      })
      .catch(() => {});
  }, [docId, user?.email]);

  // Initialisation de Quill et du relais WebSocket Yjs
  useEffect(() => {
    const container = editorRef.current;
    if (!container) return;

    // Nettoyage préalable pour éviter toute duplication
    if (quillInstance.current) {
      try {
        if (bindingRef.current) bindingRef.current.destroy();
        if (providerRef.current) providerRef.current.destroy();
        if (ydocRef.current) ydocRef.current.destroy();
      } catch {}
    }
    container.innerHTML = '';

    // 1. Initialiser Quill avec la barre d'outils dédiée
    const quill = new Quill(container, {
      theme: 'snow',
      placeholder: 'Commencez à rédiger votre article pour la revue universitaire...',
      modules: {
        toolbar: '#quill-toolbar-container'
      }
    });
    quillInstance.current = quill;

    // Décompte de caractères et mots en direct
    const updateStats = () => {
      const text = quill.getText();
      const currentLen = Math.max(0, text.length - 1);
      const words = text.trim() ? text.trim().split(/\s+/).filter(Boolean).length : 0;
      setWordCount(words);
      setQuota(prev => {
        const next = {
          ...prev,
          used: currentLen,
          remaining: Math.max(0, prev.limit - currentLen)
        };
        if (onQuotaUpdate) onQuotaUpdate(next);
        return next;
      });
    };

    quill.on('text-change', updateStats);

    // 2. Initialiser Yjs
    const ydoc = new Y.Doc();
    ydocRef.current = ydoc;
    const ytext = ydoc.getText('content');

    // Déterminer l'URL WebSocket du relais Yjs
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsHost = `${wsProtocol}//${window.location.hostname}:1234`;

    const provider = new WebsocketProvider(
      wsHost,
      `ws/${docId}`,
      ydoc,
      {
        params: {
          email: user.email,
          name: user.name
        }
      }
    );
    providerRef.current = provider;

    provider.on('status', (event) => {
      setWsConnected(event.status === 'connected');
    });

    // 3. Configurer l'Awareness (Curseurs & Présences)
    const userColor = COLORS[Math.floor(Math.random() * COLORS.length)];
    provider.awareness.setLocalStateField('user', {
      name: user.name,
      email: user.email,
      color: userColor
    });

    provider.awareness.on('change', () => {
      const states = Array.from(provider.awareness.getStates().values());
      const users = states.filter(s => s.user).map(s => s.user);
      setActiveUsers(users);
    });

    // 4. Lier Quill et Yjs
    const binding = new QuillBinding(ytext, quill, provider.awareness);
    bindingRef.current = binding;

    // 5. Écouter les messages du serveur (Quotas et Blocages C4)
    const handleWsMessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'QUOTA_STATUS' || msg.type === 'QUOTA_UPDATE') {
          const nextQuota = {
            used: msg.used,
            limit: msg.limit || 10000,
            remaining: msg.remaining
          };
          setQuota(nextQuota);
          if (onQuotaUpdate) onQuotaUpdate(nextQuota);
          setErrorMsg('');
        } else if (msg.type === 'ERROR_QUOTA_EXCEEDED') {
          setErrorMsg(msg.message);
        } else if (msg.type === 'ERROR_BLOCKED') {
          setIsBlocked(true);
          setErrorMsg(msg.message);
        } else if (msg.type === 'VERSION_RESTORED') {
          setStatusMsg(msg.message);
          setTimeout(() => setStatusMsg(''), 5000);
        }
      } catch {}
    };

    if (provider.ws) {
      provider.ws.addEventListener('message', handleWsMessage);
    }

    return () => {
      try {
        binding.destroy();
        provider.destroy();
        ydoc.destroy();
      } catch {}
    };
  }, [docId, user]);

  const quotaPercent = Math.min(100, Math.round((quota.used / quota.limit) * 100));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: '#f8fafc', overflow: 'hidden' }}>
      {/* 1. Barre Supérieure de l'Éditeur */}
      <header style={{
        height: '60px',
        backgroundColor: '#ffffff',
        borderBottom: '1px solid #e2e8f0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 24px',
        zIndex: 20,
        boxShadow: '0 1px 2px rgba(0, 0, 0, 0.03)'
      }}>
        {/* Titre et statut de synchronisation */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
          {onBackToDocs && (
            <button
              onClick={onBackToDocs}
              title="Retourner à la liste de mes documents"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '6px 10px',
                backgroundColor: '#f1f5f9',
                border: '1px solid #cbd5e1',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: '600',
                color: '#334155',
                cursor: 'pointer',
                flexShrink: 0
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#e2e8f0'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#f1f5f9'}
            >
              <ChevronLeft size={16} /> Documents
            </button>
          )}

          <div style={{
            width: '34px',
            height: '34px',
            borderRadius: '8px',
            backgroundColor: '#f5f3ff',
            color: '#7c3aed',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <FileText size={18} />
          </div>

          <div style={{ minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{
                fontSize: '14.5px',
                fontWeight: '700',
                color: '#0f172a',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                maxWidth: '320px'
              }}>
                {docMeta.title}
              </span>
              <span style={{
                fontSize: '10px',
                fontWeight: '700',
                color: '#6b21a8',
                backgroundColor: '#f3e8ff',
                padding: '1px 6px',
                borderRadius: '4px',
                flexShrink: 0
              }}>
                #{docId}
              </span>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '2px' }}>
              {/* Badge Synchronisé Yjs */}
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                fontSize: '11px',
                fontWeight: '600',
                color: wsConnected ? '#15803d' : '#b45309',
                backgroundColor: wsConnected ? '#dcfce7' : '#fef3c7',
                padding: '1px 7px',
                borderRadius: '10px'
              }}>
                <span style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  backgroundColor: wsConnected ? '#16a34a' : '#f59e0b',
                  animation: wsConnected ? 'none' : 'pulse 1.5s infinite'
                }} />
                {wsConnected ? 'Synchronisé (Temps Réel)' : 'En attente serveur ws:1234'}
              </span>

              {/* Rédacteurs en direct */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#64748b' }}>
                <Users size={12} />
                <span>{activeUsers.length} en ligne</span>
                <div style={{ display: 'flex', marginLeft: '4px' }}>
                  {activeUsers.slice(0, 4).map((u, i) => (
                    <span
                      key={i}
                      title={`${u.name} (${u.email})`}
                      style={{
                        backgroundColor: u.color || '#7c3aed',
                        color: '#fff',
                        borderRadius: '50%',
                        width: '20px',
                        height: '20px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '10px',
                        fontWeight: 'bold',
                        border: '2px solid #ffffff',
                        marginLeft: i > 0 ? '-6px' : '0'
                      }}
                    >
                      {u.name.charAt(0).toUpperCase()}
                    </span>
                  ))}
                  {activeUsers.length > 4 && (
                    <span style={{
                      backgroundColor: '#e2e8f0',
                      color: '#475569',
                      borderRadius: '50%',
                      width: '20px',
                      height: '20px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '9px',
                      fontWeight: 'bold',
                      border: '2px solid #ffffff',
                      marginLeft: '-6px'
                    }}>
                      +{activeUsers.length - 4}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Boutons d'Action Métier */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={onOpenShare}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '7px 14px',
              backgroundColor: '#7c3aed',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              fontSize: '12.5px',
              fontWeight: '600',
              cursor: 'pointer',
              boxShadow: '0 2px 6px rgba(124, 58, 237, 0.25)',
              transition: 'background-color 0.15s ease'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#6d28d9'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#7c3aed'}
          >
            <UserPlus size={15} /> Inviter des Collaborateurs
          </button>

          <button
            onClick={onOpenVersions}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '7px 12px',
              backgroundColor: '#ffffff',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              color: '#334155',
              fontSize: '12.5px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'background-color 0.15s ease'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#ffffff'}
          >
            <History size={15} /> Versions
          </button>

          <button
            onClick={onOpenCreateLink}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '7px 14px',
              backgroundColor: '#4338ca',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              fontSize: '12.5px',
              fontWeight: '600',
              cursor: 'pointer',
              boxShadow: '0 2px 6px rgba(67, 56, 202, 0.25)',
              transition: 'background-color 0.15s ease'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#3730a3'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#4338ca'}
          >
            <Download size={15} /> Publier la Parution
          </button>
        </div>
      </header>

      {/* 2. Barre d'outils Quill Moderne (Sticky Dock) */}
      <div className="quill-toolbar-dock">
        <div id="quill-toolbar-container" style={{ maxWidth: '880px', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span className="ql-formats">
            <select className="ql-header" defaultValue="">
              <option value="1">Titre 1</option>
              <option value="2">Titre 2</option>
              <option value="3">Titre 3</option>
              <option value="">Normal</option>
            </select>
          </span>

          <span className="ql-formats">
            <button className="ql-bold" title="Gras" />
            <button className="ql-italic" title="Italique" />
            <button className="ql-underline" title="Souligné" />
            <button className="ql-strike" title="Barré" />
          </span>

          <span className="ql-formats">
            <button className="ql-list" value="ordered" title="Liste numérotée" />
            <button className="ql-list" value="bullet" title="Liste à puces" />
          </span>

          <span className="ql-formats">
            <button className="ql-blockquote" title="Citation" />
            <button className="ql-code-block" title="Bloc de code" />
          </span>

          <span className="ql-formats">
            <button className="ql-clean" title="Effacer le formatage" />
          </span>
        </div>
      </div>

      {/* Alerte si bloqué pour acharnement (Contrainte C4) */}
      {isBlocked && (
        <div style={{
          padding: '10px 24px',
          backgroundColor: '#991b1b',
          color: '#ffffff',
          fontWeight: '600',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          fontSize: '13px'
        }}>
          <ShieldAlert size={18} />
          Vous avez dépassé votre quota d'écriture quotidien (10 000 caractères). Vos frappes sont temporairement rejetées par le serveur pour préserver l'équité.
        </div>
      )}

      {/* Notification de restauration de version */}
      {statusMsg && (
        <div style={{
          padding: '8px 24px',
          backgroundColor: '#dcfce7',
          color: '#15803d',
          fontWeight: '600',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '12.5px'
        }}>
          <CheckCircle size={16} /> {statusMsg}
        </div>
      )}

      {/* 3. Surface de Saisie Centrée (Feuille de Papier Moderne Style Notion / Google Docs) */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px' }}>
        <article className="editor-paper-sheet">
          {/* En-tête décoratif de publication de la revue */}
          <div className="editorial-badge">
            <Sparkles size={12} />
            {docMeta.category}
          </div>

          <h1 className="editorial-title">{docMeta.title}</h1>
          
          <div className="editorial-meta">
            <span>✍️ Rédacteur actif : <b>{user.name}</b></span>
            <span>•</span>
            <span>🛡️ Synchronisation collaborative sans conflit</span>
            <span>•</span>
            <span>🔒 Tirage certifié 500 exemplaires</span>
          </div>

          <div className="editorial-divider" />

          {/* Conteneur Quill directement intégré dans la feuille de papier */}
          <div ref={editorRef} />
        </article>
      </div>

      {/* 4. Barre d'État Inférieure (Footer Métier Style IDE / Google Docs) */}
      <footer style={{
        height: '36px',
        backgroundColor: '#ffffff',
        borderTop: '1px solid #e2e8f0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 24px',
        fontSize: '12px',
        color: '#64748b',
        zIndex: 20
      }}>
        {/* Statistiques textuelles */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span><b>{wordCount}</b> mots</span>
          <span>•</span>
          <span><b>{quota.used.toLocaleString()}</b> caractères rédigés</span>
          {errorMsg && (
            <span style={{ color: '#dc2626', fontWeight: 'bold', display: 'inline-flex', alignItems: 'center', gap: '4px', marginLeft: '10px' }}>
              <AlertTriangle size={13} /> {errorMsg}
            </span>
          )}
        </div>

        {/* Jauge Quota Quotidien d'écriture */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '11px', fontWeight: '600', color: '#475569' }}>
            Crédit d'écriture : <b>{quota.used.toLocaleString()}</b> / {quota.limit.toLocaleString()}
          </span>
          <div style={{
            width: '80px',
            height: '6px',
            backgroundColor: '#e2e8f0',
            borderRadius: '3px',
            overflow: 'hidden'
          }}>
            <div style={{
              width: `${quotaPercent}%`,
              height: '100%',
              backgroundColor: quotaPercent >= 90 ? '#ef4444' : (quotaPercent >= 70 ? '#f59e0b' : '#7c3aed'),
              transition: 'width 0.2s ease'
            }} />
          </div>
          <span style={{ fontSize: '11px', color: '#94a3b8' }}>
            ({quota.remaining.toLocaleString()} car. restants)
          </span>
        </div>

        {/* Protection et garantie de sauvegarde */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#64748b' }}>
          <Check size={13} color="#16a34a" />
          <span>Sauvegarde continue & Instantanés figés</span>
        </div>
      </footer>
    </div>
  );
}
