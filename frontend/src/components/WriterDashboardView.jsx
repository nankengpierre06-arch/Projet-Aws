import React, { useState } from 'react';
import { 
  FileText, Plus, Archive, Trash2, Edit3, Clock, Users, 
  CheckCircle, AlertCircle, Folder, Share2, History, Download, 
  Search, ArrowRight, RotateCcw, Bell, Check, Sparkles
} from 'lucide-react';

export default function WriterDashboardView({
  activeTab = 'DOCS', // 'DOCS' | 'SHARED' | 'NOTIFS'
  user,
  ownedDocs = [],
  sharedDocs = [],
  notifications = [],
  onOpenDoc,
  onCreateDoc,
  onArchiveDoc,
  onDeleteDoc,
  onOpenCreateLink,
  onOpenVersions,
  onMarkNotifsRead
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterArchive, setFilterArchive] = useState('ALL'); // 'ALL' | 'ACTIVE' | 'ARCHIVED'
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [creating, setCreating] = useState(false);

  // Filtrage des documents créés par le rédacteur
  const filteredOwnedDocs = ownedDocs.filter(doc => {
    const matchesSearch = (doc.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (doc.docId || '').toLowerCase().includes(searchTerm.toLowerCase());
    if (!matchesSearch) return false;
    if (filterArchive === 'ACTIVE') return !doc.archived;
    if (filterArchive === 'ARCHIVED') return !!doc.archived;
    return true;
  });

  const activeCount = ownedDocs.filter(d => !d.archived).length;
  const archivedCount = ownedDocs.filter(d => !!d.archived).length;

  // Filtrage des documents partagés
  const filteredSharedDocs = sharedDocs.filter(doc => {
    return (doc.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
           (doc.ownerEmail || '').toLowerCase().includes(searchTerm.toLowerCase());
  });

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    setCreating(true);
    try {
      await onCreateDoc(newTitle.trim());
      setNewTitle('');
      setShowCreateModal(false);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div style={{
      flex: 1,
      height: '100%',
      overflowY: 'auto',
      backgroundColor: '#f8fafc',
      padding: '32px 40px',
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* ===================================================================== */}
      {/* 1. VUE : MES DOCUMENTS (PROPRIÉTAIRE)                                 */}
      {/* ===================================================================== */}
      {activeTab === 'DOCS' && (
        <div style={{ maxWidth: '1100px', width: '100%', margin: '0 auto' }}>
          {/* En-tête de section */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            marginBottom: '28px',
            flexWrap: 'wrap',
            gap: '16px'
          }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                <span style={{
                  fontSize: '11px',
                  fontWeight: '700',
                  color: '#7c3aed',
                  backgroundColor: '#f5f3ff',
                  border: '1px solid #ddd6fe',
                  padding: '3px 9px',
                  borderRadius: '6px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em'
                }}>
                  Espace Rédacteur
                </span>
                <span style={{ fontSize: '13px', color: '#64748b' }}>• {user?.email}</span>
              </div>
              <h1 style={{ fontSize: '26px', fontWeight: '800', color: '#0f172a', letterSpacing: '-0.02em' }}>
                Mes Documents de Rédaction
              </h1>
              <p style={{ fontSize: '14px', color: '#64748b', marginTop: '4px' }}>
                Consultez, modifiez, archivez ou publiez vos articles pour la revue étudiante.
              </p>
            </div>

            {/* Bouton Créer un Document */}
            <button
              onClick={() => setShowCreateModal(true)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 20px',
                backgroundColor: '#7c3aed',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                fontSize: '13.5px',
                fontWeight: '600',
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(124, 58, 237, 0.25)',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#6d28d9'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#7c3aed'}
            >
              <Plus size={18} /> Créer un Document
            </button>
          </div>

          {/* Barre d'Outils & Filtres */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            backgroundColor: '#ffffff',
            padding: '12px 18px',
            borderRadius: '12px',
            border: '1px solid #e2e8f0',
            marginBottom: '24px',
            flexWrap: 'wrap',
            gap: '12px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
          }}>
            {/* Recherche */}
            <div style={{ position: 'relative', width: '280px' }}>
              <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '10px' }} />
              <input
                type="text"
                placeholder="Rechercher par titre ou identifiant..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  width: '100%',
                  paddingLeft: '36px',
                  paddingRight: '12px',
                  paddingTop: '7px',
                  paddingBottom: '7px',
                  fontSize: '13px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1'
                }}
              />
            </div>

            {/* Filtres Tous / Actifs / Archivés */}
            <div style={{ display: 'flex', backgroundColor: '#f1f5f9', padding: '3px', borderRadius: '8px', gap: '2px' }}>
              <button
                onClick={() => setFilterArchive('ALL')}
                style={{
                  padding: '6px 14px',
                  fontSize: '12px',
                  fontWeight: filterArchive === 'ALL' ? '700' : '500',
                  color: filterArchive === 'ALL' ? '#7c3aed' : '#64748b',
                  backgroundColor: filterArchive === 'ALL' ? '#ffffff' : 'transparent',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  boxShadow: filterArchive === 'ALL' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none'
                }}
              >
                Tous ({ownedDocs.length})
              </button>
              <button
                onClick={() => setFilterArchive('ACTIVE')}
                style={{
                  padding: '6px 14px',
                  fontSize: '12px',
                  fontWeight: filterArchive === 'ACTIVE' ? '700' : '500',
                  color: filterArchive === 'ACTIVE' ? '#16a34a' : '#64748b',
                  backgroundColor: filterArchive === 'ACTIVE' ? '#ffffff' : 'transparent',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  boxShadow: filterArchive === 'ACTIVE' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none'
                }}
              >
                Actifs ({activeCount})
              </button>
              <button
                onClick={() => setFilterArchive('ARCHIVED')}
                style={{
                  padding: '6px 14px',
                  fontSize: '12px',
                  fontWeight: filterArchive === 'ARCHIVED' ? '700' : '500',
                  color: filterArchive === 'ARCHIVED' ? '#d97706' : '#64748b',
                  backgroundColor: filterArchive === 'ARCHIVED' ? '#ffffff' : 'transparent',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  boxShadow: filterArchive === 'ARCHIVED' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none'
                }}
              >
                Archivés ({archivedCount})
              </button>
            </div>
          </div>

          {/* Grille des Documents */}
          {filteredOwnedDocs.length === 0 ? (
            <div style={{
              backgroundColor: '#ffffff',
              borderRadius: '12px',
              border: '1px dashed #cbd5e1',
              padding: '60px 20px',
              textAlign: 'center'
            }}>
              <Folder size={44} color="#94a3b8" style={{ margin: '0 auto 12px auto' }} />
              <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#334155' }}>Aucun document trouvé</h3>
              <p style={{ fontSize: '13px', color: '#64748b', marginTop: '4px', marginBottom: '18px' }}>
                {searchTerm ? 'Aucun document ne correspond à votre recherche.' : 'Commencez dès maintenant en créant votre premier article.'}
              </p>
              <button
                onClick={() => setShowCreateModal(true)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '9px 18px',
                  backgroundColor: '#7c3aed',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: '600'
                }}
              >
                <Plus size={16} /> Créer un Document
              </button>
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(330px, 1fr))',
              gap: '20px'
            }}>
              {filteredOwnedDocs.map(doc => {
                const isArchived = !!doc.archived;
                return (
                  <div
                    key={doc.docId}
                    style={{
                      backgroundColor: isArchived ? '#fbfcfe' : '#ffffff',
                      borderRadius: '12px',
                      border: '1px solid',
                      borderColor: isArchived ? '#e2e8f0' : '#e2e8f0',
                      padding: '22px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      boxShadow: '0 2px 8px rgba(15, 23, 42, 0.04)',
                      transition: 'all 0.15s ease',
                      position: 'relative'
                    }}
                  >
                    <div>
                      {/* Ligne d'en-tête de la carte */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          fontSize: '11px',
                          fontWeight: '700',
                          padding: '2px 8px',
                          borderRadius: '6px',
                          backgroundColor: isArchived ? '#fef3c7' : '#dcfce7',
                          color: isArchived ? '#b45309' : '#15803d'
                        }}>
                          {isArchived ? (
                            <><Archive size={12} /> Archivé</>
                          ) : (
                            <><CheckCircle size={12} /> Actif</>
                          )}
                        </span>

                        <span style={{
                          fontSize: '11px',
                          fontWeight: '700',
                          color: '#6b21a8',
                          backgroundColor: '#f3e8ff',
                          padding: '2px 7px',
                          borderRadius: '4px'
                        }}>
                          v{doc.currentVersion || 1}
                        </span>
                      </div>

                      {/* Titre du document */}
                      <h3 style={{
                        fontSize: '16px',
                        fontWeight: '700',
                        color: isArchived ? '#64748b' : '#0f172a',
                        lineHeight: '1.4',
                        marginBottom: '8px'
                      }}>
                        {doc.title}
                      </h3>

                      {/* Métadonnées */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '11.5px', color: '#64748b', marginBottom: '18px' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <Clock size={12} />
                          {doc.updatedAt ? `Modifié le ${new Date(doc.updatedAt).toLocaleDateString('fr-FR')}` : 'Création récente'}
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <Users size={12} />
                          {(doc.authorizedWriters || []).length || 1} collaborateur(s)
                        </span>
                        <span style={{ fontSize: '10.5px', color: '#94a3b8' }}>
                          ID : #{doc.docId}
                        </span>
                      </div>
                    </div>

                    {/* Actions de la carte */}
                    <div style={{
                      borderTop: '1px solid #f1f5f9',
                      paddingTop: '16px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px'
                    }}>
                      {/* Bouton principal : Ouvrir dans l'éditeur */}
                      <button
                        onClick={() => onOpenDoc(doc.docId)}
                        style={{
                          width: '100%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '8px',
                          padding: '8px 14px',
                          backgroundColor: isArchived ? '#64748b' : '#7c3aed',
                          color: '#ffffff',
                          border: 'none',
                          borderRadius: '8px',
                          fontSize: '13px',
                          fontWeight: '600',
                          cursor: 'pointer',
                          transition: 'background-color 0.15s ease'
                        }}
                      >
                        <Edit3 size={15} /> Ouvrir dans l'Éditeur
                      </button>

                      {/* Actions secondaires : Archiver, Supprimer, Versions, Parution */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                        {/* Bouton Archiver / Désarchiver */}
                        <button
                          onClick={() => onArchiveDoc(doc.docId, !isArchived)}
                          title={isArchived ? "Désarchiver et rendre à nouveau actif" : "Archiver ce document"}
                          style={{
                            flex: 1,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '4px',
                            padding: '6px 8px',
                            backgroundColor: '#ffffff',
                            border: '1px solid #cbd5e1',
                            borderRadius: '6px',
                            fontSize: '11px',
                            color: '#475569',
                            fontWeight: '600',
                            cursor: 'pointer'
                          }}
                        >
                          <Archive size={13} color={isArchived ? '#d97706' : '#64748b'} />
                          {isArchived ? 'Restaurer' : 'Archiver'}
                        </button>

                        {/* Bouton Versions */}
                        <button
                          onClick={() => onOpenVersions(doc.docId)}
                          title="Historique des versions et snapshots T1 (C3)"
                          style={{
                            padding: '6px 9px',
                            backgroundColor: '#ffffff',
                            border: '1px solid #cbd5e1',
                            borderRadius: '6px',
                            color: '#475569',
                            cursor: 'pointer'
                          }}
                        >
                          <History size={14} />
                        </button>

                        {/* Bouton Parution */}
                        <button
                          onClick={() => onOpenCreateLink(doc.docId)}
                          title="Générer un lien de parution (500 exemplaires)"
                          style={{
                            padding: '6px 9px',
                            backgroundColor: '#ffffff',
                            border: '1px solid #cbd5e1',
                            borderRadius: '6px',
                            color: '#475569',
                            cursor: 'pointer'
                          }}
                        >
                          <Download size={14} />
                        </button>

                        {/* Bouton Supprimer */}
                        <button
                          onClick={() => onDeleteDoc(doc.docId, doc.title)}
                          title="Supprimer définitivement ce document"
                          style={{
                            padding: '6px 9px',
                            backgroundColor: '#ffffff',
                            border: '1px solid #fecaca',
                            borderRadius: '6px',
                            color: '#dc2626',
                            cursor: 'pointer'
                          }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ===================================================================== */}
      {/* 2. VUE : DOCUMENTS PARTAGÉS AVEC MOI (COLLABORATIONS)                 */}
      {/* ===================================================================== */}
      {activeTab === 'SHARED' && (
        <div style={{ maxWidth: '1100px', width: '100%', margin: '0 auto' }}>
          <div style={{ marginBottom: '28px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <span style={{
                fontSize: '11px',
                fontWeight: '700',
                color: '#2563eb',
                backgroundColor: '#eff6ff',
                border: '1px solid #bfdbfe',
                padding: '3px 9px',
                borderRadius: '6px',
                textTransform: 'uppercase',
                letterSpacing: '0.05em'
              }}>
                Collaborations
              </span>
            </div>
            <h1 style={{ fontSize: '26px', fontWeight: '800', color: '#0f172a', letterSpacing: '-0.02em' }}>
              Documents Partagés avec Moi
            </h1>
            <p style={{ fontSize: '14px', color: '#64748b', marginTop: '4px' }}>
              Articles et revues créés par d'autres membres où vos droits de co-rédaction sont actifs.
            </p>
          </div>

          {filteredSharedDocs.length === 0 ? (
            <div style={{
              backgroundColor: '#ffffff',
              borderRadius: '12px',
              border: '1px dashed #cbd5e1',
              padding: '60px 20px',
              textAlign: 'center'
            }}>
              <Users size={44} color="#94a3b8" style={{ margin: '0 auto 12px auto' }} />
              <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#334155' }}>Aucun document partagé</h3>
              <p style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>
                Vous n'avez pas encore été invité à collaborer sur des revues tierces.
              </p>
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(330px, 1fr))',
              gap: '20px'
            }}>
              {filteredSharedDocs.map(doc => (
                <div
                  key={doc.docId}
                  style={{
                    backgroundColor: '#ffffff',
                    borderRadius: '12px',
                    border: '1px solid #e2e8f0',
                    padding: '22px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    boxShadow: '0 2px 8px rgba(15, 23, 42, 0.04)'
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                      <span style={{
                        fontSize: '11px',
                        fontWeight: '700',
                        color: '#2563eb',
                        backgroundColor: '#eff6ff',
                        padding: '2px 8px',
                        borderRadius: '6px'
                      }}>
                        Partagé par {doc.ownerEmail?.split('@')[0]}
                      </span>

                      <span style={{
                        fontSize: '11px',
                        fontWeight: '700',
                        color: '#6b21a8',
                        backgroundColor: '#f3e8ff',
                        padding: '2px 7px',
                        borderRadius: '4px'
                      }}>
                        v{doc.currentVersion || 1}
                      </span>
                    </div>

                    <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#0f172a', marginBottom: '8px' }}>
                      {doc.title}
                    </h3>

                    <p style={{ fontSize: '12px', color: '#64748b', marginBottom: '16px' }}>
                      Propriétaire légal : <b>{doc.ownerEmail}</b>
                    </p>
                  </div>

                  <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '16px', display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => onOpenDoc(doc.docId)}
                      style={{
                        flex: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        padding: '8px 14px',
                        backgroundColor: '#2563eb',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: '13px',
                        fontWeight: '600',
                        cursor: 'pointer'
                      }}
                    >
                      <Edit3 size={15} /> Co-rédiger (Éditeur)
                    </button>

                    <button
                      onClick={() => onOpenVersions(doc.docId)}
                      title="Consulter l'historique des versions (C3)"
                      style={{
                        padding: '8px 12px',
                        backgroundColor: '#ffffff',
                        border: '1px solid #cbd5e1',
                        borderRadius: '8px',
                        color: '#475569',
                        cursor: 'pointer'
                      }}
                    >
                      <History size={15} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ===================================================================== */}
      {/* 3. VUE : CENTRE DE NOTIFICATIONS & ALERTES                            */}
      {/* ===================================================================== */}
      {activeTab === 'NOTIFS' && (
        <div style={{ maxWidth: '800px', width: '100%', margin: '0 auto' }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            marginBottom: '28px',
            flexWrap: 'wrap',
            gap: '12px'
          }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                <span style={{
                  fontSize: '11px',
                  fontWeight: '700',
                  color: '#7c3aed',
                  backgroundColor: '#f5f3ff',
                  border: '1px solid #ddd6fe',
                  padding: '3px 9px',
                  borderRadius: '6px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em'
                }}>
                  Centre d'Alertes
                </span>
              </div>
              <h1 style={{ fontSize: '26px', fontWeight: '800', color: '#0f172a', letterSpacing: '-0.02em' }}>
                Notifications & Invitations
              </h1>
              <p style={{ fontSize: '14px', color: '#64748b', marginTop: '4px' }}>
                Retrouvez l'historique des invitations à collaborer et des alertes de gestion.
              </p>
            </div>

            <button
              onClick={onMarkNotifsRead}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 14px',
                backgroundColor: '#ffffff',
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                fontSize: '12.5px',
                fontWeight: '600',
                color: '#475569',
                cursor: 'pointer'
              }}
            >
              <Check size={14} /> Tout marquer comme lu
            </button>
          </div>

          {notifications.length === 0 ? (
            <div style={{
              backgroundColor: '#ffffff',
              borderRadius: '12px',
              border: '1px dashed #cbd5e1',
              padding: '60px 20px',
              textAlign: 'center'
            }}>
              <Bell size={40} color="#94a3b8" style={{ margin: '0 auto 12px auto' }} />
              <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#334155' }}>Aucune notification</h3>
              <p style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>
                Vous êtes à jour, aucune nouvelle alerte pour le moment.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {notifications.map(n => (
                <div
                  key={n.id}
                  style={{
                    backgroundColor: n.read ? '#ffffff' : '#faf5ff',
                    border: '1px solid',
                    borderColor: n.read ? '#e2e8f0' : '#d8b4fe',
                    borderRadius: '10px',
                    padding: '16px 20px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '16px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', minWidth: 0 }}>
                    <div style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '8px',
                      backgroundColor: n.read ? '#f1f5f9' : '#f3e8ff',
                      color: n.read ? '#64748b' : '#7c3aed',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      <Bell size={18} />
                    </div>

                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
                        <span style={{ fontSize: '14px', fontWeight: '700', color: n.read ? '#334155' : '#581c87' }}>
                          {n.title}
                        </span>
                        {!n.read && (
                          <span style={{
                            fontSize: '10px',
                            fontWeight: '700',
                            backgroundColor: '#7c3aed',
                            color: '#fff',
                            padding: '1px 6px',
                            borderRadius: '10px'
                          }}>
                            NOUVEAU
                          </span>
                        )}
                      </div>
                      <p style={{ fontSize: '13px', color: '#475569', margin: '0 0 6px 0', lineHeight: '1.4' }}>
                        {n.message}
                      </p>
                      <span style={{ fontSize: '11px', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Clock size={11} />
                        {new Date(n.createdAt).toLocaleString('fr-FR')}
                      </span>
                    </div>
                  </div>

                  {/* Si l'alerte concerne un document, bouton direct vers l'éditeur */}
                  {n.docId && (
                    <button
                      onClick={() => onOpenDoc(n.docId)}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '8px 14px',
                        backgroundColor: '#7c3aed',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        flexShrink: 0
                      }}
                    >
                      <Edit3 size={13} /> Ouvrir
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODALE DE CRÉATION DE DOCUMENT                                        */}
      {/* ===================================================================== */}
      {showCreateModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.4)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            width: '90%',
            maxWidth: '460px',
            padding: '24px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
          }}>
            <h2 style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', marginBottom: '8px' }}>
              Créer un Nouveau Document
            </h2>
            <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '18px' }}>
              Indiquez le titre de votre nouvel article ou numéro de la revue. Vous pourrez ensuite inviter des collaborateurs et publier le tirage.
            </p>

            <form onSubmit={handleCreateSubmit}>
              <div style={{ marginBottom: '18px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                  Titre du document :
                </label>
                <input
                  type="text"
                  placeholder="ex: Enquête sur la Vie Étudiante 2026"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  autoFocus
                  required
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    fontSize: '13px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1'
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: '#f1f5f9',
                    border: '1px solid #cbd5e1',
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontWeight: '600',
                    color: '#475569'
                  }}
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={creating || !newTitle.trim()}
                  style={{
                    padding: '8px 18px',
                    backgroundColor: '#7c3aed',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  {creating ? 'Création en cours...' : 'Créer & Ouvrir'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
