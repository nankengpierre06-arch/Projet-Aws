import React, { useState, useEffect } from 'react';
import { 
  FileText, Plus, Users, Bell, Globe, Link2, 
  CheckCircle, Clock, ChevronRight, X, Sparkles, Folder, Share2, History, Award
} from 'lucide-react';

const DEFAULT_OWNED_DOCS = [
  {
    docId: 'doc-alice-campus',
    title: 'Enquête Campus : Logement & Mobilité Étudiante',
    currentVersion: 1,
    createdAt: new Date().toISOString()
  },
  {
    docId: 'doc-revue-42',
    title: 'Revue Étudiante n°42 — Innovations & Campus',
    currentVersion: 1,
    createdAt: new Date(Date.now() - 3600000).toISOString()
  }
];

const DEFAULT_SHARED_DOCS = [
  {
    docId: 'revue-principale',
    title: 'Revue Annuelle (Édition Collective)',
    ownerEmail: 'admin@etudiant.fr',
    currentVersion: 1
  },
  {
    docId: 'doc-bob-culture',
    title: 'Chronique Culturelle & Festivals Universitaires',
    ownerEmail: 'bob@etudiant.fr',
    currentVersion: 1
  }
];

const DEFAULT_NOTIFS = [
  {
    id: 'notif-1',
    type: 'INVITE',
    title: 'Nouvelle Collaboration',
    message: 'L\'Administrateur vous a invité sur "Revue Annuelle".',
    docId: 'revue-principale',
    createdAt: new Date(Date.now() - 3600000).toISOString(),
    read: false
  },
  {
    id: 'notif-2',
    type: 'INVITE',
    title: 'Nouvelle Collaboration',
    message: 'Bob Dupont vous a invité sur "Chronique Culturelle".',
    docId: 'doc-bob-culture',
    createdAt: new Date(Date.now() - 7200000).toISOString(),
    read: false
  },
  {
    id: 'notif-3',
    type: 'QUOTA',
    title: 'Crédit Quotidien',
    message: 'Crédit de 10 000 caractères prêt pour la rédaction.',
    createdAt: new Date(Date.now() - 10800000).toISOString(),
    read: true
  }
];

export default function WriterSidebar({ 
  user, 
  activeDocId, 
  onSelectDoc, 
  onOpenCreateLink,
  onOpenVersions,
  refreshTrigger,
  quota = { used: 0, limit: 10000, remaining: 10000 }
}) {
  const [ownedDocs, setOwnedDocs] = useState(DEFAULT_OWNED_DOCS);
  const [sharedDocs, setSharedDocs] = useState(DEFAULT_SHARED_DOCS);
  const [notifications, setNotifications] = useState(DEFAULT_NOTIFS);
  const [showNewDocInput, setShowNewDocInput] = useState(false);
  const [newDocTitle, setNewDocTitle] = useState('');
  const [loadingNewDoc, setLoadingNewDoc] = useState(false);
  const [activeNav, setActiveNav] = useState('DOCS'); // 'DOCS' | 'NOTIFS'

  // Charger les documents réels depuis le backend
  const loadUserData = () => {
    if (!user || !user.email) return;

    fetch(`/api/documents/user/${encodeURIComponent(user.email)}`)
      .then(res => res.json())
      .then(data => {
        if (data.ownedDocs && data.ownedDocs.length > 0) setOwnedDocs(data.ownedDocs);
        if (data.sharedDocs && data.sharedDocs.length > 0) setSharedDocs(data.sharedDocs);
      })
      .catch(() => {});

    fetch(`/api/documents/notifications/${encodeURIComponent(user.email)}`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) setNotifications(data);
      })
      .catch(() => {});
  };

  useEffect(() => {
    loadUserData();
    const interval = setInterval(loadUserData, 6000);
    return () => clearInterval(interval);
  }, [user?.email, refreshTrigger]);

  const handleCreateDocument = async (e) => {
    e.preventDefault();
    if (!newDocTitle.trim()) return;
    setLoadingNewDoc(true);

    try {
      const res = await fetch('/api/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newDocTitle.trim(),
          ownerEmail: user.email
        })
      });

      const data = await res.json();
      const newDocId = data.docId || `doc-${Date.now()}`;
      
      const newDocObj = {
        docId: newDocId,
        title: newDocTitle.trim(),
        ownerEmail: user.email,
        currentVersion: 1,
        createdAt: new Date().toISOString()
      };

      setOwnedDocs(prev => [newDocObj, ...prev]);
      setNewDocTitle('');
      setShowNewDocInput(false);
      onSelectDoc(newDocId);
    } catch {
      // Fallback local immédiat
      const fallbackId = `doc-${Date.now().toString(36)}`;
      const fallbackDoc = {
        docId: fallbackId,
        title: newDocTitle.trim(),
        ownerEmail: user.email,
        currentVersion: 1,
        createdAt: new Date().toISOString()
      };
      setOwnedDocs(prev => [fallbackDoc, ...prev]);
      setNewDocTitle('');
      setShowNewDocInput(false);
      onSelectDoc(fallbackId);
    } finally {
      setLoadingNewDoc(false);
    }
  };

  const handleMarkNotifsRead = () => {
    fetch(`/api/documents/notifications/${encodeURIComponent(user.email)}/read`, { method: 'POST' }).catch(() => {});
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const unreadCount = notifications.filter(n => !n.read).length;
  const isOwnerOfActive = ownedDocs.some(d => d.docId === activeDocId);
  const quotaPercent = Math.min(100, Math.round((quota.used / quota.limit) * 100));

  return (
    <aside style={{
      width: '280px',
      backgroundColor: '#ffffff',
      borderRight: '1px solid #e2e8f0',
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      userSelect: 'none'
    }}>
      {/* 1. Profil & Switcher */}
      <div style={{
        padding: '16px 18px',
        borderBottom: '1px solid #f1f5f9',
        backgroundColor: '#ffffff'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '11px' }}>
          <div style={{
            width: '38px',
            height: '38px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #6b21a8 0%, #4338ca 100%)',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: '700',
            fontSize: '15px',
            boxShadow: '0 3px 8px rgba(107, 33, 168, 0.25)'
          }}>
            {user?.name ? user.name.charAt(0).toUpperCase() : 'R'}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '13.5px', fontWeight: '700', color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {user?.name || 'Rédacteur'}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginTop: '1px' }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#22c55e' }} />
              <span style={{ fontSize: '11px', color: '#64748b' }}>Rédactrice en ligne</span>
            </div>
          </div>
        </div>

        {/* Navigation Segments (Documents / Notifications) */}
        <div style={{
          display: 'flex',
          backgroundColor: '#f1f5f9',
          borderRadius: '8px',
          padding: '3px',
          marginTop: '14px'
        }}>
          <button
            onClick={() => setActiveNav('DOCS')}
            style={{
              flex: 1,
              padding: '6px 10px',
              borderRadius: '6px',
              border: 'none',
              backgroundColor: activeNav === 'DOCS' ? '#ffffff' : 'transparent',
              color: activeNav === 'DOCS' ? '#6b21a8' : '#64748b',
              fontWeight: activeNav === 'DOCS' ? '700' : '600',
              fontSize: '12px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              boxShadow: activeNav === 'DOCS' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
              transition: 'all 0.15s ease'
            }}
          >
            <Folder size={14} /> Documents
          </button>

          <button
            onClick={() => {
              setActiveNav('NOTIFS');
              handleMarkNotifsRead();
            }}
            style={{
              flex: 1,
              padding: '6px 10px',
              borderRadius: '6px',
              border: 'none',
              backgroundColor: activeNav === 'NOTIFS' ? '#ffffff' : 'transparent',
              color: activeNav === 'NOTIFS' ? '#6b21a8' : '#64748b',
              fontWeight: activeNav === 'NOTIFS' ? '700' : '600',
              fontSize: '12px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              boxShadow: activeNav === 'NOTIFS' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
              transition: 'all 0.15s ease',
              position: 'relative'
            }}
          >
            <Bell size={14} /> Alertes
            {unreadCount > 0 && (
              <span style={{
                backgroundColor: '#ef4444',
                color: '#fff',
                fontSize: '10px',
                fontWeight: 'bold',
                padding: '1px 5px',
                borderRadius: '10px',
                lineHeight: '1'
              }}>
                {unreadCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* 2. Actions de Création */}
      <div style={{ padding: '14px 18px', borderBottom: '1px solid #f1f5f9' }}>
        <button
          onClick={() => setShowNewDocInput(true)}
          style={{
            width: '100%',
            padding: '9px 14px',
            backgroundColor: '#7c3aed',
            color: '#ffffff',
            border: 'none',
            borderRadius: '8px',
            fontSize: '13px',
            fontWeight: '600',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            cursor: 'pointer',
            boxShadow: '0 2px 6px rgba(124, 58, 237, 0.25)',
            transition: 'background-color 0.15s ease'
          }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#6d28d9'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#7c3aed'}
        >
          <Plus size={16} /> Nouveau Document
        </button>

        <button
          onClick={() => onOpenCreateLink(activeDocId)}
          style={{
            width: '100%',
            marginTop: '8px',
            padding: '8px 14px',
            backgroundColor: '#ffffff',
            color: '#6b21a8',
            border: '1px solid #d8b4fe',
            borderRadius: '8px',
            fontSize: '12.5px',
            fontWeight: '600',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '7px',
            cursor: 'pointer',
            transition: 'all 0.15s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#faf5ff';
            e.currentTarget.style.borderColor = '#c084fc';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#ffffff';
            e.currentTarget.style.borderColor = '#d8b4fe';
          }}
        >
          <Link2 size={15} /> Créer un Lien de Parution
        </button>

        {showNewDocInput && (
          <form onSubmit={handleCreateDocument} style={{
            marginTop: '10px',
            padding: '10px',
            backgroundColor: '#faf5ff',
            border: '1px solid #e9d5ff',
            borderRadius: '8px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#6b21a8' }}>Titre de l'article :</span>
              <button
                type="button"
                onClick={() => setShowNewDocInput(false)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
              >
                <X size={14} />
              </button>
            </div>
            <input
              type="text"
              placeholder="ex: Dossier Innovations 2026"
              value={newDocTitle}
              onChange={(e) => setNewDocTitle(e.target.value)}
              autoFocus
              style={{
                width: '100%',
                padding: '6px 8px',
                fontSize: '12px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                marginBottom: '8px'
              }}
              required
            />
            <button
              type="submit"
              disabled={loadingNewDoc}
              style={{
                width: '100%',
                padding: '6px',
                backgroundColor: '#6b21a8',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              {loadingNewDoc ? 'Création...' : 'Créer le document'}
            </button>
          </form>
        )}
      </div>

      {/* 3. Liste des Documents & Notifications */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '14px 14px' }}>
        {activeNav === 'DOCS' && (
          <div>
            {/* Section : Mes Documents (Propriétaire) */}
            <div style={{ marginBottom: '22px' }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '4px 6px',
                marginBottom: '6px'
              }}>
                <span style={{ fontSize: '11px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                  Mes Documents
                </span>
                <span style={{ fontSize: '10px', fontWeight: '700', color: '#6b21a8', backgroundColor: '#f3e8ff', padding: '1px 6px', borderRadius: '10px' }}>
                  {ownedDocs.length}
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                {ownedDocs.map(doc => {
                  const isActive = doc.docId === activeDocId;
                  return (
                    <div
                      key={doc.docId}
                      onClick={() => onSelectDoc(doc.docId)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '8px 10px',
                        borderRadius: '8px',
                        backgroundColor: isActive ? '#f3e8ff' : 'transparent',
                        color: isActive ? '#581c87' : '#334155',
                        cursor: 'pointer',
                        fontWeight: isActive ? '700' : '500',
                        fontSize: '13px',
                        transition: 'all 0.15s ease',
                        borderLeft: isActive ? '3px solid #6b21a8' : '3px solid transparent'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                        <FileText size={15} color={isActive ? '#6b21a8' : '#94a3b8'} style={{ flexShrink: 0 }} />
                        <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {doc.title}
                        </span>
                      </div>

                      {/* Actions rapides pour le propriétaire */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '2px', flexShrink: 0 }}>
                        <button
                          title="Consulter l'historique et restaurer les versions (T1)"
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectDoc(doc.docId);
                            if (onOpenVersions) onOpenVersions(doc.docId);
                          }}
                          style={{
                            background: 'none',
                            border: 'none',
                            padding: '4px',
                            color: isActive ? '#6b21a8' : '#94a3b8',
                            cursor: 'pointer',
                            borderRadius: '4px',
                            display: 'flex'
                          }}
                        >
                          <History size={14} />
                        </button>

                        <button
                          title="Créer un lien de parution"
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenCreateLink(doc.docId);
                          }}
                          style={{
                            background: 'none',
                            border: 'none',
                            padding: '4px',
                            color: isActive ? '#6b21a8' : '#94a3b8',
                            cursor: 'pointer',
                            borderRadius: '4px',
                            display: 'flex'
                          }}
                        >
                          <Link2 size={14} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Section : Partagés avec moi (Collaborations) */}
            <div>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '4px 6px',
                marginBottom: '6px'
              }}>
                <span style={{ fontSize: '11px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                  Partagés avec moi
                </span>
                <span style={{ fontSize: '10px', fontWeight: '700', color: '#2563eb', backgroundColor: '#eff6ff', padding: '1px 6px', borderRadius: '10px' }}>
                  {sharedDocs.length}
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                {sharedDocs.map(doc => {
                  const isActive = doc.docId === activeDocId;
                  return (
                    <div
                      key={doc.docId}
                      onClick={() => onSelectDoc(doc.docId)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '8px 10px',
                        borderRadius: '8px',
                        backgroundColor: isActive ? '#f3e8ff' : 'transparent',
                        color: isActive ? '#581c87' : '#334155',
                        cursor: 'pointer',
                        fontWeight: isActive ? '700' : '500',
                        fontSize: '13px',
                        transition: 'all 0.15s ease',
                        borderLeft: isActive ? '3px solid #6b21a8' : '3px solid transparent'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                        <Users size={15} color={isActive ? '#6b21a8' : '#94a3b8'} style={{ flexShrink: 0 }} />
                        <div style={{ minWidth: 0 }}>
                          <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {doc.title}
                          </div>
                          <div style={{ fontSize: '10px', color: '#94a3b8' }}>
                            par {doc.ownerEmail?.split('@')[0]}
                          </div>
                        </div>
                      </div>

                      {isActive && <ChevronRight size={14} color="#6b21a8" />}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ONGLET NOTIFICATIONS */}
        {activeNav === 'NOTIFS' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {notifications.map(n => (
              <div
                key={n.id}
                onClick={() => { if (n.docId) onSelectDoc(n.docId); }}
                style={{
                  padding: '10px 12px',
                  borderRadius: '8px',
                  backgroundColor: n.read ? '#f8fafc' : '#faf5ff',
                  border: '1px solid',
                  borderColor: n.read ? '#e2e8f0' : '#d8b4fe',
                  cursor: n.docId ? 'pointer' : 'default'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <span style={{ fontSize: '12px', fontWeight: '700', color: n.read ? '#334155' : '#6b21a8' }}>
                    {n.title}
                  </span>
                  {!n.read && <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#6b21a8' }} />}
                </div>
                <p style={{ fontSize: '12px', color: '#64748b', lineHeight: '1.4', margin: 0 }}>
                  {n.message}
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '10px', color: '#94a3b8', marginTop: '6px' }}>
                  <Clock size={11} />
                  {new Date(n.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 4. Bas de Sidebar : Jauge Quota Quotidien (10k caractères C4) */}
      <div style={{
        padding: '14px 18px',
        borderTop: '1px solid #f1f5f9',
        backgroundColor: '#fafafa'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
          <span style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>
            Crédit d'écriture (C4)
          </span>
          <span style={{ fontSize: '11px', fontWeight: '800', color: quotaPercent >= 90 ? '#ef4444' : '#6b21a8' }}>
            {quota.used.toLocaleString()} / 10 000
          </span>
        </div>

        <div style={{ width: '100%', height: '6px', backgroundColor: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
          <div style={{
            width: `${quotaPercent}%`,
            height: '100%',
            backgroundColor: quotaPercent >= 90 ? '#ef4444' : (quotaPercent >= 70 ? '#f59e0b' : '#6b21a8'),
            transition: 'width 0.3s ease'
          }} />
        </div>
      </div>
    </aside>
  );
}
