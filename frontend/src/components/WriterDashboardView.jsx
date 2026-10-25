import React, { useState, useEffect } from 'react';
import { 
  FileText, Plus, Archive, Trash2, Edit3, Clock, Users, 
  CheckCircle, AlertCircle, Folder, Share2, History, Download, 
  Search, ArrowRight, RotateCcw, Bell, Check, Sparkles, Link2, 
  Copy, Calendar, ShieldCheck, Lock, ExternalLink, X
} from 'lucide-react';

export default function WriterDashboardView({
  activeTab = 'DOCS', // 'DOCS' | 'SHARED' | 'VERSIONS' | 'LINKS' | 'NOTIFS'
  user,
  ownedDocs = [],
  sharedDocs = [],
  pendingDocs = [],
  notifications = [],
  links = [],
  onOpenDoc,
  onCreateDoc,
  onArchiveDoc,
  onDeleteDoc,
  onOpenCreateLink,
  onOpenVersions,
  onMarkNotifsRead,
  onApproveCollab,
  onRejectCollab,
  onSelectTab
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterArchive, setFilterArchive] = useState('ALL'); // 'ALL' | 'ACTIVE' | 'ARCHIVED'
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [creating, setCreating] = useState(false);

  // État spécifique pour la vue VERSIONS
  const [selectedVersionDocId, setSelectedVersionDocId] = useState(() => {
    return ownedDocs.length > 0 ? ownedDocs[0].docId : '';
  });
  const [docVersions, setDocVersions] = useState([]);
  const [loadingVersions, setLoadingVersions] = useState(false);
  const [versionFeedback, setVersionFeedback] = useState('');

  // État spécifique pour la vue LIENS DE PARUTION
  const [copiedLinkId, setCopiedLinkId] = useState(null);

  // Mettre à jour le docId sélectionné pour les versions si ownedDocs change
  useEffect(() => {
    if (!selectedVersionDocId && ownedDocs.length > 0) {
      setSelectedVersionDocId(ownedDocs[0].docId);
    }
  }, [ownedDocs, selectedVersionDocId]);

  // Charger les versions du document sélectionné
  const loadDocVersions = (targetDocId) => {
    if (!targetDocId) return;
    setLoadingVersions(true);
    fetch(`/api/documents/${encodeURIComponent(targetDocId)}/versions`)
      .then(res => res.json())
      .then(data => {
        if (data && Array.isArray(data.versions)) {
          setDocVersions(data.versions);
        } else {
          setDocVersions([]);
        }
      })
      .catch(() => setDocVersions([]))
      .finally(() => setLoadingVersions(false));
  };

  useEffect(() => {
    if (activeTab === 'VERSIONS' && selectedVersionDocId) {
      loadDocVersions(selectedVersionDocId);
    }
  }, [activeTab, selectedVersionDocId]);

  const handleCreateSnapshot = async () => {
    if (!selectedVersionDocId) return;
    const label = window.prompt("Nom / libellé de l'instantané figé T1 :", `Relecture du ${new Date().toLocaleDateString('fr-FR')}`);
    if (!label) return;

    try {
      const res = await fetch(`/api/documents/${encodeURIComponent(selectedVersionDocId)}/versions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label, authorEmail: user.email })
      });
      const data = await res.json();
      setVersionFeedback(`✓ Instantané #${data.versionSeq} créé avec succès !`);
      setTimeout(() => setVersionFeedback(''), 4000);
      loadDocVersions(selectedVersionDocId);
    } catch {
      alert("Erreur lors de la création de l'instantané.");
    }
  };

  const handleRestoreVersion = async (versionSeq) => {
    const confirmed = window.confirm(`Voulez-vous restaurer le document à la version #${versionSeq} ? Le texte actuel sera remplacé et synchronisé sur tous les postes.`);
    if (!confirmed) return;

    try {
      const res = await fetch(`/api/documents/${encodeURIComponent(selectedVersionDocId)}/restore/${versionSeq}`, {
        method: 'POST'
      });
      const data = await res.json();
      setVersionFeedback(`✓ Version #${versionSeq} restaurée dans l'éditeur !`);
      setTimeout(() => setVersionFeedback(''), 4000);
    } catch {
      alert("Erreur lors de la restauration.");
    }
  };

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

  // Filtrage des invitations en attente
  const filteredPendingDocs = pendingDocs.filter(doc => {
    return (doc.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
           (doc.ownerEmail || '').toLowerCase().includes(searchTerm.toLowerCase());
  });

  const pendingInvitesCount = notifications.filter(n => n.type === 'INVITE' && (n.status === 'PENDING' || !n.status)).length || pendingDocs.length;

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

  const copyLink = (linkId) => {
    const url = `${window.location.origin}/#/download/${linkId}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopiedLinkId(linkId);
      setTimeout(() => setCopiedLinkId(null), 2500);
    });
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
                Gérez vos articles, ouvrez-les dans l'éditeur, archivez-les ou supprimez-les.
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
                      transition: 'all 0.15s ease'
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
                          {(doc.authorizedWriters || []).length || 1} rédacteur(s)
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
                          title={isArchived ? "Désarchiver et rendre actif" : "Archiver ce document"}
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
                          title="Historique des versions et instantanés figés"
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
                          title="Générer un lien de parution (500 exemplaires certifiés)"
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
      {/* 2. VUE : DOCUMENTS PARTAGÉS AVEC MOI (COLLABORATIONS APPROUVÉES)      */}
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
              Articles et revues créés par d'autres membres pour lesquels vous avez approuvé la collaboration.
            </p>
          </div>

          {/* Bannière d'information si des invitations sont en attente de réponse */}
          {pendingInvitesCount > 0 && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '14px 18px',
              backgroundColor: '#fffbeb',
              border: '1px solid #fde68a',
              borderRadius: '10px',
              marginBottom: '24px',
              fontSize: '13px',
              color: '#92400e',
              flexWrap: 'wrap',
              gap: '12px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Bell size={18} color="#d97706" />
                <span>
                  Vous avez <b>{pendingInvitesCount} invitation(s) de collaboration en attente</b>. Conformément à la gouvernance, vous pouvez les approuver ou les rejeter exclusivement dans la page <b>Notifications</b>.
                </span>
              </div>
              <button
                onClick={() => onSelectTab && onSelectTab('NOTIFS')}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '7px 14px',
                  backgroundColor: '#f59e0b',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: '700',
                  cursor: 'pointer'
                }}
              >
                Gérer dans Notifications <ArrowRight size={14} />
              </button>
            </div>
          )}

          {/* SECTION UNIQUE : COLLABORATIONS APPROUVÉES */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '17px', fontWeight: '800', color: '#0f172a' }}>
                Collaborations Approuvées
              </h2>
              <span style={{
                fontSize: '11.5px',
                fontWeight: '700',
                backgroundColor: '#eff6ff',
                color: '#2563eb',
                border: '1px solid #bfdbfe',
                padding: '2px 8px',
                borderRadius: '10px'
              }}>
                {filteredSharedDocs.length}
              </span>
            </div>

            {filteredSharedDocs.length === 0 ? (
              <div style={{
                backgroundColor: '#ffffff',
                borderRadius: '12px',
                border: '1px dashed #cbd5e1',
                padding: '50px 20px',
                textAlign: 'center'
              }}>
                <Users size={40} color="#94a3b8" style={{ margin: '0 auto 12px auto' }} />
                <h3 style={{ fontSize: '15px', fontWeight: '700', color: '#334155' }}>
                  Aucune collaboration approuvée
                </h3>
                <p style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>
                  {pendingInvitesCount > 0 
                    ? "Rendez-vous dans la page Notifications pour approuver vos invitations en attente." 
                    : "Vous n'avez pas encore de document partagé approuvé."}
                </p>
                {pendingInvitesCount > 0 && (
                  <button
                    onClick={() => onSelectTab && onSelectTab('NOTIFS')}
                    style={{
                      marginTop: '16px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '8px 16px',
                      backgroundColor: 'var(--primary)',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '12.5px',
                      fontWeight: '600',
                      cursor: 'pointer'
                    }}
                  >
                    Ouvrir les Notifications
                  </button>
                )}
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
                          color: '#16a34a',
                          backgroundColor: '#dcfce7',
                          border: '1px solid #bbf7d0',
                          padding: '2px 7px',
                          borderRadius: '4px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '3px'
                        }}>
                          <Check size={11} /> Approuvé
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
                        title="Consulter l'historique des versions"
                        style={{
                          padding: '8px 12px',
                          backgroundColor: '#f8fafc',
                          border: '1px solid #e2e8f0',
                          borderRadius: '8px',
                          color: '#64748b',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
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
        </div>
      )}

      {/* ===================================================================== */}
      {/* 3. VUE : VERSIONS & INSTANTANÉS T1 (CONTRAINTE C3)                     */}
      {/* ===================================================================== */}
      {activeTab === 'VERSIONS' && (
        <div style={{ maxWidth: '1000px', width: '100%', margin: '0 auto' }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            marginBottom: '24px',
            flexWrap: 'wrap',
            gap: '16px'
          }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                <span style={{
                  fontSize: '11px',
                  fontWeight: '700',
                  color: '#0891b2',
                  backgroundColor: '#ecfeff',
                  border: '1px solid #a5f3fc',
                  padding: '3px 9px',
                  borderRadius: '6px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em'
                }}>
                  Historique & Sauvegardes Figées
                </span>
              </div>
              <h1 style={{ fontSize: '26px', fontWeight: '800', color: '#0f172a', letterSpacing: '-0.02em' }}>
                Historique des Versions & Instantanés T1
              </h1>
              <p style={{ fontSize: '14px', color: '#64748b', marginTop: '4px' }}>
                Gérez les instantanés figés et restaurez les versions des documents dont vous êtes le propriétaire.
              </p>
            </div>

            <button
              onClick={handleCreateSnapshot}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '9px 18px',
                backgroundColor: '#0891b2',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: '600',
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(8, 145, 178, 0.25)'
              }}
            >
              <Plus size={16} /> Créer un Instantané T1 Figé
            </button>
          </div>

          {/* Sélecteur de document propriétaire */}
          <div style={{
            backgroundColor: '#ffffff',
            padding: '16px 20px',
            borderRadius: '12px',
            border: '1px solid #e2e8f0',
            marginBottom: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '13px', fontWeight: '700', color: '#334155' }}>
                Document sélectionné :
              </span>
              <select
                value={selectedVersionDocId}
                onChange={(e) => setSelectedVersionDocId(e.target.value)}
                style={{
                  padding: '6px 12px',
                  fontSize: '13px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  backgroundColor: '#ffffff',
                  fontWeight: '600',
                  color: '#0f172a'
                }}
              >
                {ownedDocs.map(d => (
                  <option key={d.docId} value={d.docId}>
                    {d.title} (#{d.docId})
                  </option>
                ))}
              </select>
            </div>

            {selectedVersionDocId && (
              <button
                onClick={() => onOpenDoc(selectedVersionDocId)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 14px',
                  backgroundColor: '#f1f5f9',
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: '600',
                  color: '#475569',
                  cursor: 'pointer'
                }}
              >
                <Edit3 size={14} /> Ouvrir ce document dans l'Éditeur
              </button>
            )}
          </div>

          {versionFeedback && (
            <div style={{
              padding: '10px 16px',
              backgroundColor: '#dcfce7',
              color: '#15803d',
              borderRadius: '8px',
              marginBottom: '20px',
              fontSize: '13px',
              fontWeight: '600'
            }}>
              {versionFeedback}
            </div>
          )}

          {/* Liste des versions */}
          {loadingVersions ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
              Chargement des instantanés T1...
            </div>
          ) : docVersions.length === 0 ? (
            <div style={{
              backgroundColor: '#ffffff',
              borderRadius: '12px',
              border: '1px dashed #cbd5e1',
              padding: '40px',
              textAlign: 'center'
            }}>
              <History size={36} color="#94a3b8" style={{ margin: '0 auto 10px auto' }} />
              <h3 style={{ fontSize: '15px', fontWeight: '700', color: '#334155' }}>Aucun instantané figé</h3>
              <p style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>
                Cliquez sur « Créer un Instantané T1 Figé » pour capturer l'état actuel de ce document.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {docVersions.map(ver => (
                <div
                  key={ver.versionSeq}
                  style={{
                    backgroundColor: '#ffffff',
                    borderRadius: '10px',
                    border: '1px solid #e2e8f0',
                    padding: '16px 20px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '16px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                      <span style={{
                        fontSize: '12px',
                        fontWeight: '800',
                        color: '#0891b2',
                        backgroundColor: '#ecfeff',
                        padding: '2px 8px',
                        borderRadius: '4px'
                      }}>
                        Version #{ver.versionSeq}
                      </span>
                      <span style={{ fontSize: '14px', fontWeight: '700', color: '#0f172a' }}>
                        {ver.label || `Instantané v${ver.versionSeq}`}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '12px', color: '#64748b' }}>
                      <span>Auteur : <b>{ver.authorEmail}</b></span>
                      <span>•</span>
                      <span>Taille : {ver.charLength || 0} caractères</span>
                      <span>•</span>
                      <span>Date : {new Date(ver.createdAt).toLocaleString('fr-FR')}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleRestoreVersion(ver.versionSeq)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '7px 14px',
                      backgroundColor: '#ffffff',
                      border: '1px solid #0891b2',
                      color: '#0891b2',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: '600',
                      cursor: 'pointer'
                    }}
                  >
                    <RotateCcw size={13} /> Restaurer cette Version
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ===================================================================== */}
      {/* 4. VUE : LIENS DE PARUTION PUBLIQUE (CONTRAINTE C1 - 500 EX.)          */}
      {/* ===================================================================== */}
      {activeTab === 'LINKS' && (
        <div style={{ maxWidth: '1100px', width: '100%', margin: '0 auto' }}>
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
                  color: '#059669',
                  backgroundColor: '#ecfdf5',
                  border: '1px solid #a7f3d0',
                  padding: '3px 9px',
                  borderRadius: '6px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em'
                }}>
                  Tirages & Parutions Publiques
                </span>
              </div>
              <h1 style={{ fontSize: '26px', fontWeight: '800', color: '#0f172a', letterSpacing: '-0.02em' }}>
                Liens de Parution Publique
              </h1>
              <p style={{ fontSize: '14px', color: '#64748b', marginTop: '4px' }}>
                Publications certifiées soumises au quota strict de 500 exemplaires et à la programmation horaire.
              </p>
            </div>

            <button
              onClick={() => onOpenCreateLink(ownedDocs[0]?.docId)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '9px 18px',
                backgroundColor: '#059669',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: '600',
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(5, 150, 105, 0.25)'
              }}
            >
              <Plus size={16} /> Créer un Lien de Parution
            </button>
          </div>

          {links.length === 0 ? (
            <div style={{
              backgroundColor: '#ffffff',
              borderRadius: '12px',
              border: '1px dashed #cbd5e1',
              padding: '60px 20px',
              textAlign: 'center'
            }}>
              <Link2 size={44} color="#94a3b8" style={{ margin: '0 auto 12px auto' }} />
              <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#334155' }}>Aucune parution enregistrée</h3>
              <p style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>
                Générez un lien de parution pour rendre un document téléchargeable par les visiteurs (500 exemplaires max).
              </p>
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(330px, 1fr))',
              gap: '20px'
            }}>
              {links.map(l => {
                const now = Date.now();
                const hasSchedule = Boolean(l.scheduledAt);
                const scheduledTime = hasSchedule ? new Date(l.scheduledAt).getTime() : null;
                const isPendingSchedule = !hasSchedule;
                const isUpcoming = hasSchedule && scheduledTime > now;
                const isExhausted = l.places_restantes <= 0;

                return (
                  <div
                    key={l.linkId}
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
                      {/* Statut de parution */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          fontSize: '11px',
                          fontWeight: '700',
                          padding: '2px 8px',
                          borderRadius: '6px',
                          backgroundColor: isPendingSchedule ? '#fef3c7' : (isUpcoming ? '#f5f3ff' : (isExhausted ? '#fee2e2' : '#dcfce7')),
                          color: isPendingSchedule ? '#b45309' : (isUpcoming ? '#6d28d9' : (isExhausted ? '#b91c1c' : '#15803d'))
                        }}>
                          {isPendingSchedule ? (
                            <><Clock size={12} /> En attente de programmation (Admin)</>
                          ) : isUpcoming ? (
                            <><Lock size={12} /> À paraître</>
                          ) : isExhausted ? (
                            <><AlertCircle size={12} /> Tirage Épuisé</>
                          ) : (
                            <><CheckCircle size={12} /> Tirage Ouvert</>
                          )}
                        </span>

                        <span style={{ fontSize: '11px', color: '#64748b' }}>
                          Doc #{l.docId}
                        </span>
                      </div>

                      <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#0f172a', marginBottom: '6px' }}>
                        {l.title || `Parution ${l.linkId}`}
                      </h3>

                      <p style={{ fontSize: '12.5px', color: '#64748b', lineHeight: '1.4', marginBottom: '14px' }}>
                        {l.description || 'Édition certifiée préparée pour les étudiants du campus.'}
                      </p>

                      {/* Quota bar */}
                      <div style={{ marginBottom: '14px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11.5px', marginBottom: '4px' }}>
                          <span style={{ fontWeight: '600', color: '#334155' }}>Places restantes :</span>
                          <span style={{ fontWeight: '700', color: isExhausted ? '#dc2626' : '#059669' }}>
                            {l.places_restantes} / {l.maxPlaces || 500}
                          </span>
                        </div>
                        <div style={{ width: '100%', height: '6px', backgroundColor: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
                          <div style={{
                            width: `${Math.min(100, Math.round(((l.maxPlaces - l.places_restantes) / l.maxPlaces) * 100))}%`,
                            height: '100%',
                            backgroundColor: isExhausted ? '#dc2626' : '#059669'
                          }} />
                        </div>
                      </div>

                      <div style={{ fontSize: '11px', color: isPendingSchedule ? '#b45309' : '#94a3b8', display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <Clock size={12} />
                        {isPendingSchedule ? (
                          <b>Date d'annonce : Non fixée (En attente de l'administrateur)</b>
                        ) : (
                          <span>Annoncé pour : {new Date(l.scheduledAt).toLocaleString('fr-FR')}</span>
                        )}
                      </div>
                    </div>

                    <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '16px', marginTop: '16px' }}>
                      <button
                        onClick={() => copyLink(l.linkId)}
                        style={{
                          width: '100%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                          padding: '8px 12px',
                          backgroundColor: copiedLinkId === l.linkId ? '#dcfce7' : '#f1f5f9',
                          border: '1px solid',
                          borderColor: copiedLinkId === l.linkId ? '#86efac' : '#cbd5e1',
                          color: copiedLinkId === l.linkId ? '#15803d' : '#334155',
                          borderRadius: '6px',
                          fontSize: '12px',
                          fontWeight: '600',
                          cursor: 'pointer'
                        }}
                      >
                        {copiedLinkId === l.linkId ? (
                          <><Check size={14} /> Lien Copié dans le Presse-Papier !</>
                        ) : (
                          <><Copy size={14} /> Copier le Lien Visiteur Public</>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ===================================================================== */}
      {/* 5. VUE : CENTRE DE NOTIFICATIONS & ALERTES                            */}
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
                  color: '#d97706',
                  backgroundColor: '#fffbeb',
                  border: '1px solid #fde68a',
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
              {notifications.map(n => {
                const isInvite = n.type === 'INVITE';
                const isPending = isInvite && (n.status === 'PENDING' || !n.status);
                const isAccepted = isInvite && n.status === 'ACCEPTED';
                const isRejected = isInvite && n.status === 'REJECTED';

                return (
                  <div
                    key={n.id}
                    style={{
                      backgroundColor: n.read ? '#ffffff' : '#faf5ff',
                      border: '1px solid',
                      borderColor: isPending ? '#c084fc' : (n.read ? '#e2e8f0' : '#d8b4fe'),
                      borderRadius: '12px',
                      padding: '18px 22px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: '16px',
                      boxShadow: isPending ? '0 4px 12px rgba(124, 58, 237, 0.08)' : '0 1px 3px rgba(0,0,0,0.03)',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', minWidth: 0 }}>
                      <div style={{
                        width: '38px',
                        height: '38px',
                        borderRadius: '10px',
                        backgroundColor: isPending ? '#ede9fe' : (n.read ? '#f1f5f9' : '#f3e8ff'),
                        color: isPending ? '#7c3aed' : (n.read ? '#64748b' : '#7c3aed'),
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}>
                        {isInvite ? <Users size={18} /> : <Bell size={18} />}
                      </div>

                      <div style={{ minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '14px', fontWeight: '700', color: n.read ? '#334155' : '#581c87' }}>
                            {n.title}
                          </span>

                          {isPending && (
                            <span style={{
                              fontSize: '11px',
                              fontWeight: '700',
                              backgroundColor: '#fef3c7',
                              color: '#b45309',
                              border: '1px solid #fde68a',
                              padding: '2px 8px',
                              borderRadius: '6px'
                            }}>
                              En attente d'approbation
                            </span>
                          )}

                          {isAccepted && (
                            <span style={{
                              fontSize: '11px',
                              fontWeight: '700',
                              backgroundColor: '#dcfce7',
                              color: '#15803d',
                              border: '1px solid #bbf7d0',
                              padding: '2px 8px',
                              borderRadius: '6px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}>
                              <Check size={12} /> Acceptée
                            </span>
                          )}

                          {isRejected && (
                            <span style={{
                              fontSize: '11px',
                              fontWeight: '700',
                              backgroundColor: '#fee2e2',
                              color: '#b91c1c',
                              border: '1px solid #fecaca',
                              padding: '2px 8px',
                              borderRadius: '6px'
                            }}>
                              ✕ Refusée
                            </span>
                          )}

                          {!n.read && !isPending && (
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

                    {/* Actions de la notification */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                      {isInvite && isPending ? (
                        <>
                          <button
                            onClick={() => onApproveCollab && onApproveCollab(n.docId)}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              padding: '8px 14px',
                              backgroundColor: '#16a34a',
                              color: '#ffffff',
                              border: 'none',
                              borderRadius: '8px',
                              fontSize: '12.5px',
                              fontWeight: '600',
                              cursor: 'pointer',
                              boxShadow: '0 2px 6px rgba(22, 163, 74, 0.25)',
                              transition: 'background-color 0.15s ease'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#15803d'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#16a34a'}
                          >
                            <Check size={14} /> Approuver
                          </button>

                          <button
                            onClick={() => onRejectCollab && onRejectCollab(n.docId)}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              padding: '8px 14px',
                              backgroundColor: '#fff1f2',
                              border: '1px solid #fecdd3',
                              color: '#e11d48',
                              borderRadius: '8px',
                              fontSize: '12.5px',
                              fontWeight: '600',
                              cursor: 'pointer',
                              transition: 'background-color 0.15s ease'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#ffe4e6'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#fff1f2'}
                          >
                            <X size={14} /> Rejeter
                          </button>
                        </>
                      ) : (
                        n.docId && !isRejected && (
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
                              borderRadius: '8px',
                              fontSize: '12.5px',
                              fontWeight: '600',
                              cursor: 'pointer',
                              boxShadow: '0 2px 6px rgba(124, 58, 237, 0.2)'
                            }}
                          >
                            <Edit3 size={13} /> Ouvrir
                          </button>
                        )
                      )}
                    </div>
                  </div>
                );
              })}
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
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
          }}>
            <h2 style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', marginBottom: '8px' }}>
              Créer un Nouveau Document
            </h2>
            <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '18px' }}>
              Indiquez le titre de votre nouvel article. Il s'ouvrira immédiatement dans l'éditeur collaboratif.
            </p>

            <form onSubmit={handleCreateSubmit}>
              <div style={{ marginBottom: '18px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                  Titre du document :
                </label>
                <input
                  type="text"
                  placeholder="ex: Enquête sur la Mobilité Étudiante"
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
                  {creating ? 'Création...' : 'Créer & Ouvrir dans l\'Éditeur'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
