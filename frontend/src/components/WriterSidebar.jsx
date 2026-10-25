import React, { useState, useEffect } from 'react';
import { 
  FileText, Plus, Users, Bell, Globe, Link2, 
  CheckCircle, Clock, ChevronRight, X, Sparkles, Folder, Share2, History
} from 'lucide-react';

export default function WriterSidebar({ 
  user, 
  activeDocId, 
  onSelectDoc, 
  onOpenCreateLink,
  onOpenVersions,
  refreshTrigger 
}) {
  const [ownedDocs, setOwnedDocs] = useState([]);
  const [sharedDocs, setSharedDocs] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [showNewDocInput, setShowNewDocInput] = useState(false);
  const [newDocTitle, setNewDocTitle] = useState('');
  const [loadingNewDoc, setLoadingNewDoc] = useState(false);
  const [activeNav, setActiveNav] = useState('DOCS'); // 'DOCS' | 'NOTIFS'

  // 1. Charger les documents et notifications du rédacteur
  const loadUserData = () => {
    if (!user || !user.email) return;

    // Documents
    fetch(`/api/documents/user/${encodeURIComponent(user.email)}`)
      .then(res => res.json())
      .then(data => {
        if (data.ownedDocs) setOwnedDocs(data.ownedDocs);
        if (data.sharedDocs) setSharedDocs(data.sharedDocs);
      })
      .catch(() => {});

    // Notifications
    fetch(`/api/documents/notifications/${encodeURIComponent(user.email)}`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setNotifications(data);
      })
      .catch(() => {});
  };

  useEffect(() => {
    loadUserData();
    const interval = setInterval(loadUserData, 6000);
    return () => clearInterval(interval);
  }, [user?.email, refreshTrigger]);

  // 2. Créer un nouveau document
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
      if (res.ok && data.docId) {
        setNewDocTitle('');
        setShowNewDocInput(false);
        loadUserData();
        // Basculer immédiatement l'éditeur sur ce nouveau document
        onSelectDoc(data.docId);
      }
    } catch (err) {
      alert('Erreur lors de la création du document');
    } finally {
      setLoadingNewDoc(false);
    }
  };

  // 3. Marquer les notifications comme lues
  const handleMarkNotifsRead = async () => {
    try {
      await fetch(`/api/documents/notifications/${encodeURIComponent(user.email)}/read`, {
        method: 'POST'
      });
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch {}
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <aside style={{
      width: '290px',
      backgroundColor: '#ffffff',
      borderRight: '1px solid var(--border)',
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      boxShadow: '1px 0 3px rgba(0, 0, 0, 0.02)'
    }}>
      {/* 1. Entête Utilisateur */}
      <div style={{
        padding: '16px 18px',
        borderBottom: '1px solid var(--border)',
        backgroundColor: '#faf5ff'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            backgroundColor: '#6b21a8',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 'bold',
            fontSize: '14px',
            boxShadow: '0 2px 6px rgba(107, 33, 168, 0.25)'
          }}>
            {user?.name ? user.name.charAt(0).toUpperCase() : 'R'}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '13px', fontWeight: '700', color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {user?.name || 'Rédacteur'}
            </div>
            <div style={{ fontSize: '11px', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {user?.email}
            </div>
          </div>
        </div>

        {/* Boutons d'onglets : Documents vs Notifications */}
        <div style={{ display: 'flex', gap: '6px', marginTop: '14px' }}>
          <button
            onClick={() => setActiveNav('DOCS')}
            style={{
              flex: 1,
              padding: '6px 10px',
              borderRadius: '6px',
              border: 'none',
              backgroundColor: activeNav === 'DOCS' ? '#6b21a8' : 'transparent',
              color: activeNav === 'DOCS' ? '#ffffff' : '#475569',
              fontSize: '12px',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px'
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
              backgroundColor: activeNav === 'NOTIFS' ? '#6b21a8' : 'transparent',
              color: activeNav === 'NOTIFS' ? '#ffffff' : '#475569',
              fontSize: '12px',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              position: 'relative'
            }}
          >
            <Bell size={14} /> Notifications
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

      {/* 2. Actions Rapides : Nouveau Document & Publier Parution */}
      <div style={{ padding: '14px 18px', borderBottom: '1px solid #f1f5f9' }}>
        <button
          onClick={() => setShowNewDocInput(true)}
          style={{
            width: '100%',
            padding: '10px 14px',
            backgroundColor: '#6b21a8',
            color: '#ffffff',
            border: 'none',
            borderRadius: '6px',
            fontSize: '13px',
            fontWeight: '600',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(107, 33, 168, 0.25)',
            marginBottom: '8px'
          }}
        >
          <Plus size={16} /> Nouveau Document
        </button>

        <button
          onClick={() => onOpenCreateLink(activeDocId)}
          style={{
            width: '100%',
            padding: '8px 12px',
            backgroundColor: '#f8fafc',
            color: '#334155',
            border: '1px solid #cbd5e1',
            borderRadius: '6px',
            fontSize: '12px',
            fontWeight: '600',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            cursor: 'pointer'
          }}
        >
          <Globe size={14} color="#6b21a8" /> Créer un Lien de Parution
        </button>

        {/* Bouton pour accéder aux versions si l'utilisateur est propriétaire du document actif */}
        {ownedDocs.some(d => d.docId === activeDocId) && (
          <button
            onClick={() => onOpenVersions && onOpenVersions(activeDocId)}
            style={{
              width: '100%',
              padding: '8px 12px',
              backgroundColor: '#faf5ff',
              color: '#6b21a8',
              border: '1px solid #d8b4fe',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              cursor: 'pointer',
              marginTop: '6px'
            }}
          >
            <History size={14} color="#6b21a8" /> Versions & Instantanés (T1)
          </button>
        )}

        {/* Formulaire Modal/Inline d'ajout de document */}
        {showNewDocInput && (
          <form onSubmit={handleCreateDocument} style={{
            marginTop: '12px',
            padding: '12px',
            backgroundColor: '#faf5ff',
            border: '1px solid #e9d5ff',
            borderRadius: '8px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#6b21a8' }}>Titre du document :</span>
              <button
                type="button"
                onClick={() => setShowNewDocInput(false)}
                style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}
              >
                <X size={14} />
              </button>
            </div>
            <input
              type="text"
              placeholder="ex: Dossier Économie & Campus"
              value={newDocTitle}
              onChange={(e) => setNewDocTitle(e.target.value)}
              autoFocus
              style={{
                width: '100%',
                padding: '6px 8px',
                fontSize: '12px',
                borderRadius: '4px',
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
                borderRadius: '4px',
                fontSize: '12px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              {loadingNewDoc ? 'Création...' : 'Valider'}
            </button>
          </form>
        )}
      </div>

      {/* 3. Contenu de la Sidebar selon l'onglet actif */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '14px 12px' }}>
        
        {/* ONGLET 1 : DOCUMENTS */}
        {activeNav === 'DOCS' && (
          <div>
            {/* Section A : Mes Documents (Propriétaire) */}
            <div style={{ marginBottom: '22px' }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '4px 6px',
                fontSize: '11px',
                fontWeight: 'bold',
                color: '#64748b',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                <span>Mes Documents ({ownedDocs.length})</span>
                <Folder size={13} />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', marginTop: '6px' }}>
                {ownedDocs.length === 0 ? (
                  <div style={{ padding: '8px 10px', fontSize: '12px', color: '#94a3b8', fontStyle: 'italic' }}>
                    Aucun document créé pour le moment.
                  </div>
                ) : (
                  ownedDocs.map(doc => {
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
                          borderRadius: '6px',
                          backgroundColor: isActive ? '#f3e8ff' : 'transparent',
                          color: isActive ? '#6b21a8' : '#334155',
                          cursor: 'pointer',
                          fontWeight: isActive ? '700' : '500',
                          fontSize: '13px',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                          <FileText size={15} color={isActive ? '#6b21a8' : '#64748b'} />
                          <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {doc.title}
                          </span>
                        </div>

                        {/* Actions pour le propriétaire : Versions + Lien de parution */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                          <button
                            title="Historique des versions et restauration (T1)"
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectDoc(doc.docId);
                              if (onOpenVersions) onOpenVersions(doc.docId);
                            }}
                            style={{
                              background: 'none',
                              border: 'none',
                              padding: '4px',
                              color: isActive ? '#6b21a8' : '#64748b',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              borderRadius: '4px'
                            }}
                          >
                            <History size={14} />
                          </button>

                          <button
                            title="Créer un lien de parution pour ce document"
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
                              display: 'flex',
                              alignItems: 'center',
                              borderRadius: '4px'
                            }}
                          >
                            <Link2 size={14} />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Section B : Documents Partagés (Collaborations où il n'est pas le propriétaire) */}
            <div>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '4px 6px',
                fontSize: '11px',
                fontWeight: 'bold',
                color: '#64748b',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                <span>Partagés avec moi ({sharedDocs.length})</span>
                <Users size={13} />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', marginTop: '6px' }}>
                {sharedDocs.length === 0 ? (
                  <div style={{ padding: '8px 10px', fontSize: '12px', color: '#94a3b8', fontStyle: 'italic' }}>
                    Aucun document partagé pour l'instant.
                  </div>
                ) : (
                  sharedDocs.map(doc => {
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
                          borderRadius: '6px',
                          backgroundColor: isActive ? '#f3e8ff' : 'transparent',
                          color: isActive ? '#6b21a8' : '#334155',
                          cursor: 'pointer',
                          fontWeight: isActive ? '700' : '500',
                          fontSize: '13px',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                          <Share2 size={15} color={isActive ? '#6b21a8' : '#64748b'} />
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
                  })
                )}
              </div>
            </div>
          </div>
        )}

        {/* ONGLET 2 : NOTIFICATIONS */}
        {activeNav === 'NOTIFS' && (
          <div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '10px',
              padding: '0 4px'
            }}>
              <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#0f172a' }}>
                Centre de Notifications
              </span>
              <span style={{ fontSize: '11px', color: '#64748b' }}>
                {notifications.length} message(s)
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {notifications.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '30px 10px', color: '#94a3b8', fontSize: '12px' }}>
                  Aucune notification pour le moment.
                </div>
              ) : (
                notifications.map(n => (
                  <div
                    key={n.id}
                    onClick={() => {
                      if (n.docId) onSelectDoc(n.docId);
                    }}
                    style={{
                      padding: '10px 12px',
                      borderRadius: '8px',
                      backgroundColor: n.read ? '#f8fafc' : '#faf5ff',
                      border: '1px solid',
                      borderColor: n.read ? '#e2e8f0' : '#d8b4fe',
                      cursor: n.docId ? 'pointer' : 'default',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ fontSize: '12px', fontWeight: '700', color: n.read ? '#334155' : '#6b21a8' }}>
                        {n.title}
                      </span>
                      {!n.read && (
                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#6b21a8' }} />
                      )}
                    </div>
                    <p style={{ fontSize: '12px', color: '#64748b', lineHeight: '1.4', margin: 0 }}>
                      {n.message}
                    </p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '10px', color: '#94a3b8', marginTop: '6px' }}>
                      <Clock size={11} />
                      {new Date(n.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

      </div>
    </aside>
  );
}

