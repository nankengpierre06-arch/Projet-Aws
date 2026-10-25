import React, { useEffect, useRef, useState } from 'react';
import Quill from 'quill';
import * as Y from 'yjs';
import { QuillBinding } from 'y-quill';
import { WebsocketProvider } from 'y-websocket';
import { 
  Users, Share2, Download, History, ShieldAlert, CheckCircle, 
  Clock, RotateCcw, AlertTriangle, FileText 
} from 'lucide-react';

const COLORS = ['#663399', '#2563eb', '#16a34a', '#d97706', '#dc2626', '#db2777', '#0891b2'];

export default function Editor({ user, docId, onOpenShare, onOpenCreateLink, onOpenVersions }) {
  const editorRef = useRef(null);
  const quillInstance = useRef(null);
  const providerRef = useRef(null);
  const ydocRef = useRef(null);

  const [activeUsers, setActiveUsers] = useState([]);
  const [quota, setQuota] = useState({ used: 0, limit: 10000, remaining: 10000 });
  const [errorMsg, setErrorMsg] = useState('');
  const [isBlocked, setIsBlocked] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');

  useEffect(() => {
    if (!editorRef.current) return;

    // 1. Initialiser Quill
    const quill = new Quill(editorRef.current, {
      theme: 'snow',
      placeholder: 'Commencez à rédiger la revue ici...',
      modules: {
        toolbar: [
          [{ header: [1, 2, 3, false] }],
          ['bold', 'italic', 'underline', 'strike'],
          [{ list: 'ordered' }, { list: 'bullet' }],
          ['blockquote', 'code-block'],
          ['clean']
        ]
      }
    });
    quillInstance.current = quill;

    // 2. Initialiser Yjs
    const ydoc = new Y.Doc();
    ydocRef.current = ydoc;
    const ytext = ydoc.getText('content');

    // Déterminer l'URL WebSocket
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${wsProtocol}//${window.location.hostname}:1234/ws/${docId}?email=${encodeURIComponent(user.email)}&name=${encodeURIComponent(user.name)}`;

    const provider = new WebsocketProvider(
      `${wsProtocol}//${window.location.hostname}:1234`,
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

    // 3. Configurer l'Awareness (curseurs et présences)
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

    // 5. Écouter les messages personnalisés du serveur (Quotas et Blocages)
    const handleWsMessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'QUOTA_STATUS' || msg.type === 'QUOTA_UPDATE') {
          setQuota({
            used: msg.used,
            limit: msg.limit || 10000,
            remaining: msg.remaining
          });
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
      binding.destroy();
      provider.destroy();
      ydoc.destroy();
    };
  }, [docId, user]);

  const quotaPercent = Math.min(100, Math.round((quota.used / quota.limit) * 100));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Barre d'outils supérieure */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '12px 20px',
        backgroundColor: '#ffffff',
        borderBottom: '1px solid var(--border)',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        {/* Titre et collaborateurs présents */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <FileText size={20} color="var(--primary)" />
            <span style={{ fontWeight: '600', fontSize: '15px' }}>Revue Annuelle ({docId})</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-muted)' }}>
            <Users size={16} />
            <span><b>{activeUsers.length}</b> rédacteur(s) en ligne :</span>
            <div style={{ display: 'flex', gap: '4px' }}>
              {activeUsers.slice(0, 5).map((u, i) => (
                <span
                  key={i}
                  title={`${u.name} (${u.email})`}
                  style={{
                    backgroundColor: u.color || '#663399',
                    color: '#fff',
                    borderRadius: '50%',
                    width: '24px',
                    height: '24px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '11px',
                    fontWeight: 'bold'
                  }}
                >
                  {u.name.charAt(0).toUpperCase()}
                </span>
              ))}
              {activeUsers.length > 5 && <span>+{activeUsers.length - 5}</span>}
            </div>
          </div>
        </div>

        {/* Actions : Partager, Lien public, Versions */}
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={onOpenShare}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              backgroundColor: '#f1f5f9',
              border: '1px solid #cbd5e1',
              color: '#334155',
              fontSize: '13px'
            }}
          >
            <Share2 size={15} /> Partager
          </button>

          <button
            onClick={onOpenVersions}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              backgroundColor: '#f1f5f9',
              border: '1px solid #cbd5e1',
              color: '#334155',
              fontSize: '13px'
            }}
          >
            <History size={15} /> Versions (C3)
          </button>

          <button
            onClick={onOpenCreateLink}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 14px',
              backgroundColor: 'var(--primary)',
              color: '#ffffff',
              border: 'none',
              fontSize: '13px',
              fontWeight: '600'
            }}
          >
            <Download size={15} /> Publier le Lien (500 ex.)
          </button>
        </div>
      </div>

      {/* Jauge de Quota Journalier (Contrainte C4) */}
      <div style={{
        padding: '8px 20px',
        backgroundColor: quotaPercent > 90 ? 'var(--danger-bg)' : '#ffffff',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        fontSize: '12px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span><b>Crédit d'écriture quotidien (C4) :</b> {quota.used.toLocaleString()} / {quota.limit.toLocaleString()} caractères</span>
          <div style={{
            width: '180px',
            height: '8px',
            backgroundColor: '#e2e8f0',
            borderRadius: '4px',
            overflow: 'hidden'
          }}>
            <div style={{
              width: `${quotaPercent}%`,
              height: '100%',
              backgroundColor: quotaPercent > 90 ? 'var(--danger)' : quotaPercent > 70 ? 'var(--warning)' : 'var(--primary)'
            }} />
          </div>
          <span>({quota.remaining.toLocaleString()} car. restants aujourd'hui)</span>
        </div>

        {errorMsg && (
          <span style={{ color: 'var(--danger)', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <AlertTriangle size={14} /> {errorMsg}
          </span>
        )}

        {statusMsg && (
          <span style={{ color: 'var(--success)', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <CheckCircle size={14} /> {statusMsg}
          </span>
        )}
      </div>

      {/* Alerte si bloqué pour acharnement */}
      {isBlocked && (
        <div style={{
          padding: '12px 20px',
          backgroundColor: '#991b1b',
          color: '#ffffff',
          fontWeight: 'bold',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          fontSize: '13px'
        }}>
          <ShieldAlert size={18} />
          Vous êtes temporairement bloqué pour acharnement au-delà de votre quota quotidien. Vos modifications sont rejetées.
        </div>
      )}

      {/* Surface de saisie Quill */}
      <div style={{ flex: 1, backgroundColor: '#ffffff', overflowY: 'auto' }}>
        <div ref={editorRef} style={{ minHeight: '100%', border: 'none', fontSize: '15px' }} />
      </div>
    </div>
  );
}
