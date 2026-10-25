import React, { useState } from 'react';
import { 
  FileText, Plus, Users, Bell, Globe, Link2, 
  CheckCircle, Clock, ChevronRight, X, Sparkles, Folder, 
  Share2, History, Archive, Trash2, Edit3
} from 'lucide-react';

export default function WriterSidebar({ 
  user, 
  activeTab = 'DOCS', // 'DOCS' | 'SHARED' | 'NOTIFS' | 'EDITOR'
  activeDocId, 
  ownedDocs = [],
  sharedDocs = [],
  notifications = [],
  onSelectTab,
  onOpenDoc,
  onCreateDoc,
  onArchiveDoc,
  onDeleteDoc,
  onOpenCreateLink,
  onOpenVersions,
  onMarkNotifsRead,
  quota = { used: 0, limit: 10000, remaining: 10000 }
}) {
  const [showNewDocInput, setShowNewDocInput] = useState(false);
  const [newDocTitle, setNewDocTitle] = useState('');
  const [loadingNewDoc, setLoadingNewDoc] = useState(false);

  const unreadCount = notifications.filter(n => !n.read).length;
  const quotaPercent = Math.min(100, Math.round((quota.used / quota.limit) * 100));

  const handleCreateDocument = async (e) => {
    e.preventDefault();
    if (!newDocTitle.trim()) return;
    setLoadingNewDoc(true);
    try {
      if (onCreateDoc) {
        await onCreateDoc(newDocTitle.trim());
      }
      setNewDocTitle('');
      setShowNewDocInput(false);
    } finally {
      setLoadingNewDoc(false);
    }
  };

  const currentTab = activeTab === 'EDITOR' ? 'DOCS' : activeTab;

  return (
    <aside style={{
      width: '280px',
      minWidth: '280px',
      height: '100%',
      minHeight: '100%',
      backgroundColor: '#ffffff',
      borderRight: '1px solid #e2e8f0',
      display: 'flex',
      flexDirection: 'column',
      flexShrink: 0,
      userSelect: 'none',
      boxSizing: 'border-box'
    }}>
      {/* 1. Profil Utilisateur & En-tête de la Sidebar */}
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
            background: 'linear-gradient(135deg, #7c3aed 0%, #4338ca 100%)',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: '700',
            fontSize: '15px',
            boxShadow: '0 3px 8px rgba(124, 58, 237, 0.25)'
          }}>
            {user?.name ? user.name.charAt(0).toUpperCase() : 'R'}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontSize: '13.5px',
              fontWeight: '700',
              color: '#0f172a',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}>
              {user?.name || 'Rédacteur'}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginTop: '1px' }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#22c55e' }} />
              <span style={{ fontSize: '11px', color: '#64748b' }}>
                {user?.role === 'ADMIN' ? 'Admin Association' : 'Rédactrice en ligne'}
              </span>
            </div>
          </div>
        </div>

        {/* 3 Toggles de Navigation : Documents | Partagés | Alertes */}
        <div style={{
          display: 'flex',
          backgroundColor: '#f1f5f9',
          borderRadius: '8px',
          padding: '3px',
          marginTop: '14px',
          gap: '2px'
        }}>
          {/* Toggle Documents */}
          <button
            onClick={() => onSelectTab && onSelectTab('DOCS')}
            title="Afficher la liste de mes documents"
            style={{
              flex: 1,
              padding: '6px 4px',
              borderRadius: '6px',
              border: 'none',
              backgroundColor: currentTab === 'DOCS' ? '#ffffff' : 'transparent',
              color: currentTab === 'DOCS' ? '#7c3aed' : '#64748b',
              fontWeight: currentTab === 'DOCS' ? '700' : '600',
              fontSize: '11.5px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px',
              boxShadow: currentTab === 'DOCS' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
              transition: 'all 0.15s ease'
            }}
          >
            <Folder size={13} /> Docs
          </button>

          {/* Toggle Partagés */}
          <button
            onClick={() => onSelectTab && onSelectTab('SHARED')}
            title="Afficher les documents partagés avec moi"
            style={{
              flex: 1,
              padding: '6px 4px',
              borderRadius: '6px',
              border: 'none',
              backgroundColor: currentTab === 'SHARED' ? '#ffffff' : 'transparent',
              color: currentTab === 'SHARED' ? '#2563eb' : '#64748b',
              fontWeight: currentTab === 'SHARED' ? '700' : '600',
              fontSize: '11.5px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px',
              boxShadow: currentTab === 'SHARED' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
              transition: 'all 0.15s ease'
            }}
          >
            <Users size={13} /> Partagés
          </button>

          {/* Toggle Alertes */}
          <button
            onClick={() => {
              if (onSelectTab) onSelectTab('NOTIFS');
              if (onMarkNotifsRead) onMarkNotifsRead();
            }}
            title="Afficher le centre de notifications"
            style={{
              flex: 1,
              padding: '6px 4px',
              borderRadius: '6px',
              border: 'none',
              backgroundColor: currentTab === 'NOTIFS' ? '#ffffff' : 'transparent',
              color: currentTab === 'NOTIFS' ? '#7c3aed' : '#64748b',
              fontWeight: currentTab === 'NOTIFS' ? '700' : '600',
              fontSize: '11.5px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px',
              boxShadow: currentTab === 'NOTIFS' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
              transition: 'all 0.15s ease',
              position: 'relative'
            }}
          >
            <Bell size={13} /> Alertes
            {unreadCount > 0 && (
              <span style={{
                backgroundColor: '#ef4444',
                color: '#fff',
                fontSize: '9px',
                fontWeight: 'bold',
                padding: '1px 4px',
                borderRadius: '8px',
                lineHeight: '1'
              }}>
                {unreadCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* 2. Boutons d'Action Rapide */}
      <div style={{ padding: '12px 16px', borderBottom: '1px solid #f1f5f9' }}>
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
          onClick={() => onOpenCreateLink && onOpenCreateLink(activeDocId)}
          style={{
            width: '100%',
            marginTop: '8px',
            padding: '8px 14px',
            backgroundColor: '#ffffff',
            color: '#7c3aed',
            border: '1px solid #ddd6fe',
            borderRadius: '8px',
            fontSize: '12px',
            fontWeight: '600',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            cursor: 'pointer',
            transition: 'all 0.15s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#f5f3ff';
            e.currentTarget.style.borderColor = '#c084fc';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#ffffff';
            e.currentTarget.style.borderColor = '#ddd6fe';
          }}
        >
          <Link2 size={14} /> Créer un Lien de Parution
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
              <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#7c3aed' }}>Titre de l'article :</span>
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
              placeholder="ex: Dossier Numérique 2026"
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
                backgroundColor: '#7c3aed',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              {loadingNewDoc ? 'Création...' : 'Créer & Ouvrir'}
            </button>
          </form>
        )}
      </div>

      {/* 3. Contenu de la Liste Selon le Toggle Actif */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px' }}>
        {/* LISTE : MES DOCUMENTS */}
        {currentTab === 'DOCS' && (
          <div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '4px 6px',
              marginBottom: '6px'
            }}>
              <span style={{ fontSize: '11px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                Mes Documents ({ownedDocs.length})
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
              {ownedDocs.map(doc => {
                const isActive = activeTab === 'EDITOR' && doc.docId === activeDocId;
                const isArchived = !!doc.archived;
                return (
                  <div
                    key={doc.docId}
                    onClick={() => onOpenDoc && onOpenDoc(doc.docId)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 10px',
                      borderRadius: '8px',
                      backgroundColor: isActive ? '#f5f3ff' : 'transparent',
                      color: isActive ? '#581c87' : (isArchived ? '#94a3b8' : '#334155'),
                      cursor: 'pointer',
                      fontWeight: isActive ? '700' : '500',
                      fontSize: '12.5px',
                      transition: 'all 0.15s ease',
                      borderLeft: isActive ? '3px solid #7c3aed' : '3px solid transparent'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                      <FileText size={15} color={isActive ? '#7c3aed' : (isArchived ? '#94a3b8' : '#64748b')} style={{ flexShrink: 0 }} />
                      <span style={{
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        textDecoration: isArchived ? 'line-through' : 'none'
                      }}>
                        {doc.title}
                      </span>
                    </div>

                    {/* Actions au survol/clic */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '2px', flexShrink: 0 }}>
                      {/* Versions */}
                      <button
                        title="Versions (T1/C3)"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onOpenVersions) onOpenVersions(doc.docId);
                        }}
                        style={{
                          background: 'none',
                          border: 'none',
                          padding: '3px',
                          color: '#94a3b8',
                          cursor: 'pointer',
                          borderRadius: '4px'
                        }}
                      >
                        <History size={13} />
                      </button>

                      {/* Archiver / Désarchiver */}
                      <button
                        title={isArchived ? "Restaurer le document" : "Archiver le document"}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onArchiveDoc) onArchiveDoc(doc.docId, !isArchived);
                        }}
                        style={{
                          background: 'none',
                          border: 'none',
                          padding: '3px',
                          color: isArchived ? '#d97706' : '#94a3b8',
                          cursor: 'pointer',
                          borderRadius: '4px'
                        }}
                      >
                        <Archive size={13} />
                      </button>

                      {/* Supprimer */}
                      <button
                        title="Supprimer définitivement"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onDeleteDoc) onDeleteDoc(doc.docId, doc.title);
                        }}
                        style={{
                          background: 'none',
                          border: 'none',
                          padding: '3px',
                          color: '#ef4444',
                          cursor: 'pointer',
                          borderRadius: '4px'
                        }}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* LISTE : PARTAGÉS AVEC MOI */}
        {currentTab === 'SHARED' && (
          <div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '4px 6px',
              marginBottom: '6px'
            }}>
              <span style={{ fontSize: '11px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                Partagés avec moi ({sharedDocs.length})
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
              {sharedDocs.map(doc => {
                const isActive = activeTab === 'EDITOR' && doc.docId === activeDocId;
                return (
                  <div
                    key={doc.docId}
                    onClick={() => onOpenDoc && onOpenDoc(doc.docId)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 10px',
                      borderRadius: '8px',
                      backgroundColor: isActive ? '#eff6ff' : 'transparent',
                      color: isActive ? '#1e40af' : '#334155',
                      cursor: 'pointer',
                      fontWeight: isActive ? '700' : '500',
                      fontSize: '12.5px',
                      transition: 'all 0.15s ease',
                      borderLeft: isActive ? '3px solid #2563eb' : '3px solid transparent'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                      <Users size={15} color={isActive ? '#2563eb' : '#94a3b8'} style={{ flexShrink: 0 }} />
                      <div style={{ minWidth: 0 }}>
                        <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {doc.title}
                        </div>
                        <div style={{ fontSize: '10px', color: '#94a3b8' }}>
                          par {doc.ownerEmail?.split('@')[0]}
                        </div>
                      </div>
                    </div>

                    <ChevronRight size={14} color="#94a3b8" />
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* LISTE : ALERTES / NOTIFICATIONS */}
        {currentTab === 'NOTIFS' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '4px 6px',
              marginBottom: '2px'
            }}>
              <span style={{ fontSize: '11px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                Alertes récentes ({notifications.length})
              </span>
            </div>

            {notifications.map(n => (
              <div
                key={n.id}
                onClick={() => { if (n.docId && onOpenDoc) onOpenDoc(n.docId); }}
                style={{
                  padding: '10px 12px',
                  borderRadius: '8px',
                  backgroundColor: n.read ? '#f8fafc' : '#faf5ff',
                  border: '1px solid',
                  borderColor: n.read ? '#e2e8f0' : '#ddd6fe',
                  cursor: n.docId ? 'pointer' : 'default'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <span style={{ fontSize: '12px', fontWeight: '700', color: n.read ? '#334155' : '#7c3aed' }}>
                    {n.title}
                  </span>
                  {!n.read && <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#7c3aed' }} />}
                </div>
                <p style={{ fontSize: '11.5px', color: '#64748b', lineHeight: '1.4', margin: 0 }}>
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
        backgroundColor: '#fafafa',
        marginTop: 'auto'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
          <span style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>
            Crédit d'écriture (C4)
          </span>
          <span style={{ fontSize: '11px', fontWeight: '800', color: quotaPercent >= 90 ? '#ef4444' : '#7c3aed' }}>
            {quota.used.toLocaleString()} / 10 000
          </span>
        </div>

        <div style={{ width: '100%', height: '6px', backgroundColor: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
          <div style={{
            width: `${quotaPercent}%`,
            height: '100%',
            backgroundColor: quotaPercent >= 90 ? '#ef4444' : (quotaPercent >= 70 ? '#f59e0b' : '#7c3aed'),
            transition: 'width 0.3s ease'
          }} />
        </div>
      </div>
    </aside>
  );
}
