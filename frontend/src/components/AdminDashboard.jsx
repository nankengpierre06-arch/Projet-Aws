import React, { useState, useEffect } from 'react';
import { 
  Shield, UserPlus, Users, Link as LinkIcon, FileText, 
  AlertTriangle, RefreshCw, Trash2, CheckCircle, Unlock, ArrowLeft,
  Calendar, Clock, ExternalLink, Bell, Check, X, Sparkles, AlertCircle
} from 'lucide-react';

export default function AdminDashboard({ user, onBackToHome, onGoEditor }) {
  const [activeTab, setActiveTab] = useState('publications'); // 'publications' | 'writers' | 'supervision'

  // Données Rédacteurs
  const [writers, setWriters] = useState([]);
  const [newWriterName, setNewWriterName] = useState('');
  const [newWriterEmail, setNewWriterEmail] = useState('');
  const [createMsg, setCreateMsg] = useState({ text: '', type: '' });

  // Données Parutions & Programmation
  const [publications, setPublications] = useState([]);
  const [pubFilter, setPubFilter] = useState('ALL'); // 'ALL' | 'PENDING' | 'SCHEDULED' | 'OPEN' | 'EXHAUSTED'
  const [schedulingLink, setSchedulingLink] = useState(null);
  const [scheduleType, setScheduleType] = useState('immediate'); // 'immediate' | 'custom'
  const [customDateTime, setCustomDateTime] = useState('');
  const [scheduleMsg, setScheduleMsg] = useState({ text: '', type: '' });
  const [isSavingSchedule, setIsSavingSchedule] = useState(false);

  // Données Supervision
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchWriters = async () => {
    try {
      const res = await fetch('/api/admin/writers');
      const data = await res.json();
      setWriters(data.writers || []);
    } catch {}
  };

  const fetchPublications = async () => {
    try {
      const res = await fetch('/api/links');
      const data = await res.json();
      if (Array.isArray(data)) {
        setPublications(data);
      }
    } catch {}
  };

  const fetchDashboard = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/dashboard');
      const data = await res.json();
      setDashboard(data);
    } catch {}
    setLoading(false);
  };

  useEffect(() => {
    fetchWriters();
    fetchPublications();
    fetchDashboard();
    const interval = setInterval(() => {
      fetchPublications();
      fetchDashboard();
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const handleCreateWriter = async (e) => {
    e.preventDefault();
    if (!newWriterName || !newWriterEmail) return;

    try {
      const res = await fetch('/api/admin/writers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newWriterName, email: newWriterEmail })
      });
      const data = await res.json();

      if (!res.ok) {
        setCreateMsg({ text: data.message || 'Erreur lors de la création.', type: 'error' });
        return;
      }

      setCreateMsg({ text: `Compte rédacteur créé avec succès pour ${newWriterName} !`, type: 'success' });
      setNewWriterName('');
      setNewWriterEmail('');
      fetchWriters();
      setTimeout(() => setCreateMsg({ text: '', type: '' }), 5000);
    } catch {
      setCreateMsg({ text: 'Erreur réseau.', type: 'error' });
    }
  };

  const handleDeleteWriter = async (email) => {
    if (!window.confirm(`Supprimer le compte de ${email} ?`)) return;
    try {
      await fetch(`/api/admin/writers/${encodeURIComponent(email)}`, { method: 'DELETE' });
      fetchWriters();
    } catch {}
  };

  const handleUnblock = async (email) => {
    try {
      await fetch('/api/admin/unblock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      fetchDashboard();
      fetchWriters();
    } catch {}
  };

  const handleOpenScheduleModal = (link) => {
    setSchedulingLink(link);
    if (link.scheduledAt) {
      setScheduleType('custom');
      const d = new Date(link.scheduledAt);
      const isoLocal = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
      setCustomDateTime(isoLocal);
    } else {
      setScheduleType('immediate');
      const inTwoHours = new Date(Date.now() + 2 * 3600 * 1000);
      const isoLocal = new Date(inTwoHours.getTime() - inTwoHours.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
      setCustomDateTime(isoLocal);
    }
  };

  const handleSaveSchedule = async (e) => {
    e.preventDefault();
    if (!schedulingLink) return;

    let targetIso;
    if (scheduleType === 'immediate') {
      targetIso = new Date().toISOString();
    } else {
      if (!customDateTime) {
        setScheduleMsg({ text: 'Veuillez sélectionner une date et une heure valides.', type: 'error' });
        return;
      }
      targetIso = new Date(customDateTime).toISOString();
    }

    setIsSavingSchedule(true);
    try {
      const res = await fetch(`/api/links/${schedulingLink.linkId}/schedule`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scheduledAt: targetIso,
          adminEmail: user?.email || 'admin@etudiant.fr'
        })
      });

      const data = await res.json();
      if (!res.ok) {
        setScheduleMsg({ text: data.message || 'Erreur lors de la programmation.', type: 'error' });
        setIsSavingSchedule(false);
        return;
      }

      const formattedDate = scheduleType === 'immediate'
        ? "Ouverture immédiate"
        : new Date(targetIso).toLocaleString('fr-FR');

      setScheduleMsg({
        text: `Date d'annonce validée pour « ${schedulingLink.title || schedulingLink.linkId} » (${formattedDate}). Le rédacteur ${schedulingLink.creatorEmail || ''} a été alerté par notification !`,
        type: 'success'
      });
      setSchedulingLink(null);
      await fetchPublications();
      await fetchDashboard();
      setTimeout(() => setScheduleMsg({ text: '', type: '' }), 7000);
    } catch {
      setScheduleMsg({ text: 'Erreur réseau lors de la programmation.', type: 'error' });
    }
    setIsSavingSchedule(false);
  };

  const now = Date.now();
  const pendingCount = publications.filter(p => !p.scheduledAt).length;
  const upcomingCount = publications.filter(p => p.scheduledAt && new Date(p.scheduledAt).getTime() > now).length;
  const openCount = publications.filter(p => p.scheduledAt && new Date(p.scheduledAt).getTime() <= now && p.places_restantes > 0).length;
  const exhaustedCount = publications.filter(p => p.places_restantes <= 0).length;

  const filteredPublications = publications.filter(p => {
    if (pubFilter === 'PENDING') return !p.scheduledAt;
    if (pubFilter === 'SCHEDULED') return p.scheduledAt && new Date(p.scheduledAt).getTime() > now;
    if (pubFilter === 'OPEN') return p.scheduledAt && new Date(p.scheduledAt).getTime() <= now && p.places_restantes > 0;
    if (pubFilter === 'EXHAUSTED') return p.places_restantes <= 0;
    return true;
  });

  return (
    <div style={{ maxWidth: '1200px', margin: '30px auto', padding: '0 24px' }}>
      {/* Barre supérieure */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '24px',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: '10px',
            backgroundColor: '#fef3c7',
            color: '#b45309',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Shield size={24} />
          </div>
          <div>
            <h1 style={{ fontSize: '22px', fontWeight: '800', color: '#0f172a' }}>
              Console d'Administration de l'Association
            </h1>
            <p style={{ fontSize: '13px', color: '#64748b' }}>
              Gouvernance des parutions, gestion des rédacteurs et supervision en direct
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={onBackToHome}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              backgroundColor: '#f1f5f9',
              border: '1px solid #cbd5e1',
              borderRadius: '6px',
              fontSize: '13px',
              color: '#334155',
              cursor: 'pointer'
            }}
          >
            <ArrowLeft size={16} /> Accueil
          </button>

          <button
            onClick={onGoEditor}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              backgroundColor: 'var(--primary)',
              color: '#ffffff',
              border: 'none',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            Accéder à l'Éditeur
          </button>
        </div>
      </div>

      {/* Onglets */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border)', marginBottom: '24px' }}>
        <button
          onClick={() => setActiveTab('publications')}
          style={{
            padding: '10px 18px',
            border: 'none',
            borderBottom: activeTab === 'publications' ? '2px solid var(--primary)' : '2px solid transparent',
            backgroundColor: 'transparent',
            color: activeTab === 'publications' ? 'var(--primary)' : '#64748b',
            fontWeight: activeTab === 'publications' ? '700' : '500',
            fontSize: '14px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            cursor: 'pointer'
          }}
        >
          <Calendar size={16} /> Liens & Programmation des Parutions
          {pendingCount > 0 && (
            <span style={{
              backgroundColor: '#f59e0b',
              color: '#ffffff',
              fontSize: '11px',
              fontWeight: '700',
              padding: '2px 8px',
              borderRadius: '12px'
            }}>
              {pendingCount} à programmer
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('writers')}
          style={{
            padding: '10px 18px',
            border: 'none',
            borderBottom: activeTab === 'writers' ? '2px solid var(--primary)' : '2px solid transparent',
            backgroundColor: 'transparent',
            color: activeTab === 'writers' ? 'var(--primary)' : '#64748b',
            fontWeight: activeTab === 'writers' ? '700' : '500',
            fontSize: '14px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            cursor: 'pointer'
          }}
        >
          <UserPlus size={16} /> Gestion des Rédacteurs (Comptes)
        </button>

        <button
          onClick={() => setActiveTab('supervision')}
          style={{
            padding: '10px 18px',
            border: 'none',
            borderBottom: activeTab === 'supervision' ? '2px solid var(--primary)' : '2px solid transparent',
            backgroundColor: 'transparent',
            color: activeTab === 'supervision' ? 'var(--primary)' : '#64748b',
            fontWeight: activeTab === 'supervision' ? '700' : '500',
            fontSize: '14px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            cursor: 'pointer'
          }}
        >
          <Shield size={16} /> Supervision Temps Réel (Sujet §1)
        </button>
      </div>

      {/* ===================================================================== */}
      {/* ONGLET 1 : LIENS & PROGRAMMATION DES PARUTIONS                        */}
      {/* ===================================================================== */}
      {activeTab === 'publications' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Message de confirmation / erreur */}
          {scheduleMsg.text && (
            <div style={{
              padding: '12px 16px',
              borderRadius: '8px',
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: scheduleMsg.type === 'success' ? '#dcfce7' : '#fee2e2',
              color: scheduleMsg.type === 'success' ? '#166534' : '#991b1b',
              border: `1px solid ${scheduleMsg.type === 'success' ? '#bbf7d0' : '#fecaca'}`
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {scheduleMsg.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
                <span>{scheduleMsg.text}</span>
              </div>
              <button
                onClick={() => setScheduleMsg({ text: '', type: '' })}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}
              >
                <X size={16} />
              </button>
            </div>
          )}

          {/* Encart explicatif sur le rôle exclusif de l'admin */}
          <div style={{
            backgroundColor: '#f8fafc',
            border: '1px solid #cbd5e1',
            borderRadius: '10px',
            padding: '18px 22px',
            display: 'flex',
            gap: '16px',
            alignItems: 'flex-start'
          }}>
            <div style={{
              backgroundColor: '#6366f1',
              color: '#ffffff',
              borderRadius: '8px',
              width: '36px',
              height: '36px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              <Calendar size={20} />
            </div>
            <div style={{ fontSize: '13px', color: '#1e293b', lineHeight: '1.5' }}>
              <div style={{ fontWeight: '700', fontSize: '14px', marginBottom: '4px', color: '#0f172a' }}>
                Règle de Parution Universitaire — Seul l'Administrateur fixe la date et l'heure d'annonce
              </div>
              <div>
                Les rédacteurs créent les liens de parution pour leurs documents, mais ils ne peuvent pas définir la date d'ouverture. 
                Le tirage des 500 exemplaires certifiés reste <b>verrouillé</b> jusqu'à ce que l'administrateur valide la date et l'heure officielles d'annonce.
                Dès que vous validez la programmation, une <b>notification automatique SNS / SES</b> est immédiatement transmise au rédacteur créateur.
              </div>
            </div>
          </div>

          {/* Statistiques rapides */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
            <div style={{ padding: '16px', backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid var(--border)' }}>
              <span style={{ fontSize: '11px', fontWeight: '700', color: '#64748b' }}>TOTAL PARUTIONS CRÉÉES</span>
              <div style={{ fontSize: '26px', fontWeight: '800', color: '#0f172a', marginTop: '4px' }}>
                {publications.length}
              </div>
            </div>

            <div style={{
              padding: '16px',
              backgroundColor: pendingCount > 0 ? '#fffbeb' : '#ffffff',
              borderRadius: '8px',
              border: pendingCount > 0 ? '1px solid #fde68a' : '1px solid var(--border)'
            }}>
              <span style={{ fontSize: '11px', fontWeight: '700', color: '#b45309' }}>EN ATTENTE DE PROGRAMMATION</span>
              <div style={{ fontSize: '26px', fontWeight: '800', color: '#b45309', marginTop: '4px' }}>
                {pendingCount}
              </div>
            </div>

            <div style={{ padding: '16px', backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid var(--border)' }}>
              <span style={{ fontSize: '11px', fontWeight: '700', color: '#6366f1' }}>PROGRAMMÉES À VENIR</span>
              <div style={{ fontSize: '26px', fontWeight: '800', color: '#4338ca', marginTop: '4px' }}>
                {upcomingCount}
              </div>
            </div>

            <div style={{ padding: '16px', backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid var(--border)' }}>
              <span style={{ fontSize: '11px', fontWeight: '700', color: '#15803d' }}>TIRAGES OUVERTS (EN COURS)</span>
              <div style={{ fontSize: '26px', fontWeight: '800', color: '#15803d', marginTop: '4px' }}>
                {openCount}
              </div>
            </div>
          </div>

          {/* Filtres */}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {[
              { id: 'ALL', label: `Toutes (${publications.length})` },
              { id: 'PENDING', label: `⏳ En attente de l'Admin (${pendingCount})` },
              { id: 'SCHEDULED', label: `📅 Programmées à venir (${upcomingCount})` },
              { id: 'OPEN', label: `🟢 Tirages ouverts (${openCount})` },
              { id: 'EXHAUSTED', label: `🔴 Épuisées (${exhaustedCount})` }
            ].map(f => (
              <button
                key={f.id}
                onClick={() => setPubFilter(f.id)}
                style={{
                  padding: '6px 12px',
                  borderRadius: '20px',
                  fontSize: '12px',
                  fontWeight: pubFilter === f.id ? '700' : '500',
                  border: '1px solid',
                  borderColor: pubFilter === f.id ? 'var(--primary)' : '#cbd5e1',
                  backgroundColor: pubFilter === f.id ? '#ede9fe' : '#ffffff',
                  color: pubFilter === f.id ? 'var(--primary)' : '#475569',
                  cursor: 'pointer'
                }}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Table des parutions */}
          <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid var(--border)', overflow: 'hidden' }}>
            {filteredPublications.length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>
                Aucune parution trouvée pour ce filtre.
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid var(--border)' }}>
                    <th style={{ padding: '12px 16px' }}>Revue / Parution</th>
                    <th style={{ padding: '12px 16px' }}>Rédacteur (Créateur)</th>
                    <th style={{ padding: '12px 16px' }}>Quota C1</th>
                    <th style={{ padding: '12px 16px' }}>Date et Heure d'Annonce</th>
                    <th style={{ padding: '12px 16px' }}>Statut Tirage</th>
                    <th style={{ padding: '12px 16px', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPublications.map(link => {
                    const hasSchedule = Boolean(link.scheduledAt);
                    const scheduledTime = hasSchedule ? new Date(link.scheduledAt).getTime() : null;
                    const isPending = !hasSchedule;
                    const isUpcoming = hasSchedule && scheduledTime > now;
                    const isExhausted = link.places_restantes <= 0;
                    const isOpen = hasSchedule && !isUpcoming && !isExhausted;

                    return (
                      <tr key={link.linkId} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ fontWeight: '700', color: '#0f172a', fontSize: '13px' }}>
                            {link.title || `Revue ${link.linkId}`}
                          </div>
                          <div style={{ fontSize: '11px', color: '#64748b', fontFamily: 'monospace', marginTop: '2px' }}>
                            Lien ID : {link.linkId}
                          </div>
                        </td>

                        <td style={{ padding: '12px 16px' }}>
                          <span style={{
                            display: 'inline-block',
                            padding: '3px 8px',
                            backgroundColor: '#f1f5f9',
                            borderRadius: '4px',
                            color: '#334155',
                            fontWeight: '600'
                          }}>
                            {link.creatorEmail || 'auteur@etudiant.fr'}
                          </span>
                        </td>

                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontWeight: '700', color: isExhausted ? '#dc2626' : '#059669' }}>
                              {link.places_restantes} / {link.maxPlaces}
                            </span>
                            <div style={{ width: '60px', height: '6px', backgroundColor: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
                              <div style={{
                                width: `${Math.min(100, Math.round(((link.maxPlaces - link.places_restantes) / link.maxPlaces) * 100))}%`,
                                height: '100%',
                                backgroundColor: isExhausted ? '#dc2626' : '#059669'
                              }} />
                            </div>
                          </div>
                        </td>

                        <td style={{ padding: '12px 16px' }}>
                          {isPending ? (
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '5px',
                              color: '#b45309',
                              fontWeight: '700',
                              backgroundColor: '#fffbeb',
                              padding: '3px 8px',
                              borderRadius: '4px',
                              border: '1px solid #fde68a'
                            }}>
                              <Clock size={12} /> Non fixée (En attente)
                            </span>
                          ) : (
                            <div>
                              <div style={{ fontWeight: '600', color: '#1e293b' }}>
                                {new Date(link.scheduledAt).toLocaleString('fr-FR')}
                              </div>
                              {link.scheduledBy && (
                                <div style={{ fontSize: '10px', color: '#64748b' }}>
                                  Programmé par {link.scheduledBy}
                                </div>
                              )}
                            </div>
                          )}
                        </td>

                        <td style={{ padding: '12px 16px' }}>
                          {isPending ? (
                            <span style={{
                              fontSize: '11px',
                              fontWeight: '700',
                              padding: '2px 8px',
                              borderRadius: '6px',
                              backgroundColor: '#fef3c7',
                              color: '#b45309'
                            }}>
                              VERROUILLÉ
                            </span>
                          ) : isUpcoming ? (
                            <span style={{
                              fontSize: '11px',
                              fontWeight: '700',
                              padding: '2px 8px',
                              borderRadius: '6px',
                              backgroundColor: '#ede9fe',
                              color: '#6d28d9'
                            }}>
                              À PARAÎTRE
                            </span>
                          ) : isExhausted ? (
                            <span style={{
                              fontSize: '11px',
                              fontWeight: '700',
                              padding: '2px 8px',
                              borderRadius: '6px',
                              backgroundColor: '#fee2e2',
                              color: '#b91c1c'
                            }}>
                              ÉPUISÉ
                            </span>
                          ) : (
                            <span style={{
                              fontSize: '11px',
                              fontWeight: '700',
                              padding: '2px 8px',
                              borderRadius: '6px',
                              backgroundColor: '#dcfce7',
                              color: '#15803d'
                            }}>
                              OUVERT
                            </span>
                          )}
                        </td>

                        <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', gap: '8px', alignItems: 'center' }}>
                            <button
                              onClick={() => handleOpenScheduleModal(link)}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '5px',
                                padding: '6px 12px',
                                backgroundColor: isPending ? '#f59e0b' : '#f1f5f9',
                                color: isPending ? '#ffffff' : '#334155',
                                border: isPending ? 'none' : '1px solid #cbd5e1',
                                borderRadius: '6px',
                                fontSize: '11px',
                                fontWeight: '700',
                                cursor: 'pointer'
                              }}
                            >
                              <Calendar size={13} />
                              {isPending ? "Fixer la date & heure" : "Modifier la date"}
                            </button>

                            <a
                              href={`/download/${link.linkId}`}
                              target="_blank"
                              rel="noreferrer"
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                padding: '6px 10px',
                                backgroundColor: '#ffffff',
                                border: '1px solid #e2e8f0',
                                borderRadius: '6px',
                                fontSize: '11px',
                                color: '#64748b',
                                textDecoration: 'none'
                              }}
                              title="Voir la page de parution publique"
                            >
                              <ExternalLink size={12} />
                            </a>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* Modale de Programmation par l'Administrateur */}
          {schedulingLink && (
            <div style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(15, 23, 42, 0.6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000,
              padding: '20px'
            }}>
              <div style={{
                backgroundColor: '#ffffff',
                borderRadius: '12px',
                maxWidth: '520px',
                width: '100%',
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
                border: '1px solid #e2e8f0',
                overflow: 'hidden'
              }}>
                {/* Header de la modale */}
                <div style={{
                  padding: '18px 24px',
                  backgroundColor: '#f8fafc',
                  borderBottom: '1px solid #e2e8f0',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{
                      backgroundColor: '#ede9fe',
                      color: 'var(--primary)',
                      padding: '8px',
                      borderRadius: '8px'
                    }}>
                      <Calendar size={18} />
                    </div>
                    <div>
                      <h3 style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a', margin: 0 }}>
                        Fixer la Date & Heure d'Annonce
                      </h3>
                      <p style={{ fontSize: '12px', color: '#64748b', margin: 0 }}>
                        Réservé à l'administrateur
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setSchedulingLink(null)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}
                  >
                    <X size={18} />
                  </button>
                </div>

                {/* Formulaire */}
                <form onSubmit={handleSaveSchedule} style={{ padding: '24px' }}>
                  {/* Résumé de la parution */}
                  <div style={{
                    backgroundColor: '#f1f5f9',
                    borderRadius: '8px',
                    padding: '12px 14px',
                    marginBottom: '18px',
                    fontSize: '12px'
                  }}>
                    <div style={{ fontWeight: '700', color: '#0f172a', marginBottom: '2px' }}>
                      {schedulingLink.title || `Parution ${schedulingLink.linkId}`}
                    </div>
                    <div style={{ color: '#475569' }}>
                      Rédacteur créateur : <b>{schedulingLink.creatorEmail || 'auteur@etudiant.fr'}</b>
                    </div>
                    <div style={{ color: '#64748b', marginTop: '2px' }}>
                      Lien ID : <code style={{ fontFamily: 'monospace' }}>{schedulingLink.linkId}</code> • Quota : 500 exemplaires
                    </div>
                  </div>

                  {/* Choix du type de programmation */}
                  <div style={{ marginBottom: '18px' }}>
                    <label style={{ fontSize: '13px', fontWeight: '700', display: 'block', marginBottom: '10px', color: '#0f172a' }}>
                      Modalité d'ouverture du tirage :
                    </label>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <label style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '10px',
                        padding: '12px',
                        borderRadius: '8px',
                        border: `1.5px solid ${scheduleType === 'immediate' ? 'var(--primary)' : '#e2e8f0'}`,
                        backgroundColor: scheduleType === 'immediate' ? '#f5f3ff' : '#ffffff',
                        cursor: 'pointer'
                      }}>
                        <input
                          type="radio"
                          name="scheduleType"
                          value="immediate"
                          checked={scheduleType === 'immediate'}
                          onChange={() => setScheduleType('immediate')}
                          style={{ marginTop: '2px' }}
                        />
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: '700', color: '#0f172a' }}>
                            🟢 Immédiate (Tirage ouvert dès maintenant)
                          </div>
                          <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                            Les 500 exemplaires certifiés deviennent immédiatement téléchargeables sur la page d'accueil et le lien public.
                          </div>
                        </div>
                      </label>

                      <label style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '10px',
                        padding: '12px',
                        borderRadius: '8px',
                        border: `1.5px solid ${scheduleType === 'custom' ? 'var(--primary)' : '#e2e8f0'}`,
                        backgroundColor: scheduleType === 'custom' ? '#f5f3ff' : '#ffffff',
                        cursor: 'pointer'
                      }}>
                        <input
                          type="radio"
                          name="scheduleType"
                          value="custom"
                          checked={scheduleType === 'custom'}
                          onChange={() => setScheduleType('custom')}
                          style={{ marginTop: '2px' }}
                        />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '13px', fontWeight: '700', color: '#0f172a' }}>
                            📅 Programmée (Date et heure précises)
                          </div>
                          <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                            Un compte à rebours s'affiche et le tirage s'activera automatiquement à la date et heure fixées.
                          </div>

                          {scheduleType === 'custom' && (
                            <div style={{ marginTop: '10px' }}>
                              <input
                                type="datetime-local"
                                value={customDateTime}
                                onChange={(e) => setCustomDateTime(e.target.value)}
                                style={{
                                  width: '100%',
                                  padding: '8px 12px',
                                  borderRadius: '6px',
                                  border: '1px solid #cbd5e1',
                                  fontSize: '13px',
                                  backgroundColor: '#ffffff'
                                }}
                                required={scheduleType === 'custom'}
                              />
                            </div>
                          )}
                        </div>
                      </label>
                    </div>
                  </div>

                  {/* Note notification SNS */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '10px 12px',
                    borderRadius: '6px',
                    backgroundColor: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    fontSize: '11px',
                    color: '#64748b',
                    marginBottom: '20px'
                  }}>
                    <Bell size={14} color="#6366f1" />
                    <span>
                      Le rédacteur (<b>{schedulingLink.creatorEmail || 'auteur'}</b>) recevra automatiquement une alerte SNS / email confirmant cette programmation.
                    </span>
                  </div>

                  {/* Boutons d'action */}
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                    <button
                      type="button"
                      onClick={() => setSchedulingLink(null)}
                      style={{
                        padding: '9px 16px',
                        backgroundColor: '#f1f5f9',
                        border: '1px solid #cbd5e1',
                        borderRadius: '6px',
                        fontSize: '13px',
                        fontWeight: '600',
                        color: '#475569',
                        cursor: 'pointer'
                      }}
                    >
                      Annuler
                    </button>

                    <button
                      type="submit"
                      disabled={isSavingSchedule}
                      style={{
                        padding: '9px 18px',
                        backgroundColor: 'var(--primary)',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '13px',
                        fontWeight: '700',
                        color: '#ffffff',
                        cursor: isSavingSchedule ? 'not-allowed' : 'pointer',
                        opacity: isSavingSchedule ? 0.7 : 1,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      <Check size={16} />
                      {isSavingSchedule ? 'Enregistrement...' : 'Enregistrer la Date d\'Annonce'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ===================================================================== */}
      {/* ONGLET 2 : GESTION DES RÉDACTEURS                                     */}
      {/* ===================================================================== */}
      {activeTab === 'writers' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '24px' }}>
          {/* Formulaire de création */}
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '10px',
            border: '1px solid var(--border)',
            padding: '24px',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)'
          }}>
            <h3 style={{ fontSize: '15px', fontWeight: '700', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <UserPlus size={18} color="var(--primary)" /> Créer un Compte Rédacteur
            </h3>

            <p style={{ fontSize: '12px', color: '#64748b', marginBottom: '16px', lineHeight: '1.5' }}>
              L'administrateur est chargé de créer les comptes des rédacteurs autorisés. Chaque rédacteur reçoit automatiquement un crédit quotidien de 10 000 caractères (Contrainte C4).
            </p>

            <form onSubmit={handleCreateWriter}>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ fontSize: '12px', fontWeight: '600', display: 'block', marginBottom: '4px' }}>
                  Nom complet :
                </label>
                <input
                  type="text"
                  placeholder="ex: Marc Dubois"
                  value={newWriterName}
                  onChange={(e) => setNewWriterName(e.target.value)}
                  style={{ width: '100%', fontSize: '13px' }}
                  required
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ fontSize: '12px', fontWeight: '600', display: 'block', marginBottom: '4px' }}>
                  Adresse e-mail universitaire :
                </label>
                <input
                  type="email"
                  placeholder="ex: marc@etudiant.fr"
                  value={newWriterEmail}
                  onChange={(e) => setNewWriterEmail(e.target.value)}
                  style={{ width: '100%', fontSize: '13px' }}
                  required
                />
              </div>

              {createMsg.text && (
                <div style={{
                  padding: '10px',
                  borderRadius: '6px',
                  marginBottom: '16px',
                  fontSize: '12px',
                  backgroundColor: createMsg.type === 'success' ? '#dcfce7' : '#fee2e2',
                  color: createMsg.type === 'success' ? '#166534' : '#991b1b',
                  border: `1px solid ${createMsg.type === 'success' ? '#bbf7d0' : '#fecaca'}`
                }}>
                  {createMsg.text}
                </div>
              )}

              <button
                type="submit"
                style={{
                  width: '100%',
                  padding: '10px',
                  backgroundColor: 'var(--primary)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '6px',
                  fontWeight: '600',
                  fontSize: '13px',
                  cursor: 'pointer'
                }}
              >
                Créer le Compte Rédacteur
              </button>
            </form>
          </div>

          {/* Liste des rédacteurs */}
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '10px',
            border: '1px solid var(--border)',
            padding: '24px',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)'
          }}>
            <h3 style={{ fontSize: '15px', fontWeight: '700', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Users size={18} color="var(--primary)" /> Rédacteurs Enregistrés ({writers.length})
            </h3>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)', color: '#64748b' }}>
                    <th style={{ padding: '8px 12px' }}>Rédacteur</th>
                    <th style={{ padding: '8px 12px' }}>Crédit Quotidien (C4)</th>
                    <th style={{ padding: '8px 12px' }}>Statut</th>
                    <th style={{ padding: '8px 12px', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {writers.map((w) => (
                    <tr key={w.email} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '12px' }}>
                        <div style={{ fontWeight: '600', color: '#0f172a' }}>{w.name}</div>
                        <div style={{ fontSize: '12px', color: '#64748b' }}>{w.email}</div>
                      </td>
                      <td style={{ padding: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontWeight: '700', color: w.remainingChars < 1000 ? 'var(--danger)' : 'var(--primary)' }}>
                            {w.remainingChars.toLocaleString()}
                          </span>
                          <span style={{ fontSize: '11px', color: '#64748b' }}>/ {w.dailyLimit.toLocaleString()} restants</span>
                        </div>
                      </td>
                      <td style={{ padding: '12px' }}>
                        {w.isBlocked ? (
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '3px 8px',
                            backgroundColor: '#fee2e2',
                            color: '#b91c1c',
                            borderRadius: '12px',
                            fontSize: '11px',
                            fontWeight: '600'
                          }}>
                            <AlertTriangle size={12} /> Bloqué
                          </span>
                        ) : (
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '3px 8px',
                            backgroundColor: '#dcfce7',
                            color: '#15803d',
                            borderRadius: '12px',
                            fontSize: '11px',
                            fontWeight: '600'
                          }}>
                            <CheckCircle size={12} /> Actif
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '12px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                          {w.isBlocked && (
                            <button
                              onClick={() => handleUnblock(w.email)}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                padding: '4px 8px',
                                backgroundColor: '#f1f5f9',
                                border: '1px solid #cbd5e1',
                                borderRadius: '4px',
                                fontSize: '11px',
                                cursor: 'pointer',
                                color: '#334155'
                              }}
                            >
                              <Unlock size={12} /> Débloquer
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteWriter(w.email)}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              padding: '4px 8px',
                              backgroundColor: '#fff',
                              border: '1px solid #fee2e2',
                              borderRadius: '4px',
                              color: '#dc2626',
                              fontSize: '11px',
                              cursor: 'pointer'
                            }}
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* ONGLET 3 : SUPERVISION EN DIRECT                                      */}
      {/* ===================================================================== */}
      {activeTab === 'supervision' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Cartes métriques */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
            <div style={{ padding: '16px', backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid var(--border)' }}>
              <span style={{ fontSize: '11px', fontWeight: '700', color: '#15803d' }}>DOCUMENTS OUVERTS</span>
              <div style={{ fontSize: '26px', fontWeight: '800', color: '#0f172a', marginTop: '4px' }}>
                {dashboard?.summary?.totalOpenDocuments || 0}
              </div>
            </div>

            <div style={{ padding: '16px', backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid var(--border)' }}>
              <span style={{ fontSize: '11px', fontWeight: '700', color: '#1d4ed8' }}>LIENS ACTIFS (QUOTA 500 EX.)</span>
              <div style={{ fontSize: '26px', fontWeight: '800', color: '#0f172a', marginTop: '4px' }}>
                {dashboard?.summary?.totalActiveLinks || 0}
              </div>
            </div>

            <div style={{ padding: '16px', backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid var(--border)' }}>
              <span style={{ fontSize: '11px', fontWeight: '700', color: '#b91c1c' }}>PERSONNES BLOQUÉES (ANTI-ABUS)</span>
              <div style={{ fontSize: '26px', fontWeight: '800', color: '#b91c1c', marginTop: '4px' }}>
                {dashboard?.summary?.totalBlockedUsers || 0}
              </div>
            </div>
          </div>

          {/* Tableau Liens Actifs */}
          <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid var(--border)', padding: '20px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: '700', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <LinkIcon size={16} /> Liens de téléchargement actifs et décompte des places (Contrainte C1)
            </h3>

            {dashboard?.activeLinks?.length === 0 ? (
              <p style={{ fontSize: '12px', color: '#64748b' }}>Aucun lien de téléchargement actif.</p>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid var(--border)' }}>
                    <th style={{ padding: '8px' }}>Lien ID</th>
                    <th style={{ padding: '8px' }}>Places restantes</th>
                    <th style={{ padding: '8px' }}>Rendu PDF</th>
                    <th style={{ padding: '8px' }}>Créateur (Notifié C6)</th>
                    <th style={{ padding: '8px', textAlign: 'right' }}>Programmation</th>
                  </tr>
                </thead>
                <tbody>
                  {dashboard?.activeLinks?.map((l) => (
                    <tr key={l.linkId} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '8px', fontFamily: 'monospace' }}>{l.linkId}</td>
                      <td style={{ padding: '8px' }}>
                        <b style={{ color: l.isExhausted ? 'var(--danger)' : 'var(--success)' }}>
                          {l.places_restantes} / {l.maxPlaces}
                        </b> {l.isExhausted && '(Épuisé)'}
                      </td>
                      <td style={{ padding: '8px' }}>{l.pdfStatus}</td>
                      <td style={{ padding: '8px', color: '#64748b' }}>{l.creatorEmail}</td>
                      <td style={{ padding: '8px', textAlign: 'right' }}>
                        <button
                          onClick={() => {
                            const found = publications.find(p => p.linkId === l.linkId) || l;
                            handleOpenScheduleModal(found);
                          }}
                          style={{
                            padding: '4px 8px',
                            backgroundColor: '#f1f5f9',
                            border: '1px solid #cbd5e1',
                            borderRadius: '4px',
                            fontSize: '11px',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          <Calendar size={12} /> Programmer
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Tableau Personnes Bloquées */}
          <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid var(--border)', padding: '20px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: '700', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--danger)' }}>
              <AlertTriangle size={16} /> Personnes Bloquées Temporairement pour Acharnement
            </h3>

            {dashboard?.blockedUsers?.length === 0 ? (
              <p style={{ fontSize: '12px', color: '#16a34a' }}>Aucune personne bloquée actuellement. Le comportement des rédacteurs est normal.</p>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
                <thead>
                  <tr style={{ backgroundColor: '#fef2f2', borderBottom: '1px solid #fecaca' }}>
                    <th style={{ padding: '8px' }}>Email</th>
                    <th style={{ padding: '8px' }}>Motif</th>
                    <th style={{ padding: '8px' }}>Temps restant</th>
                    <th style={{ padding: '8px', textAlign: 'center' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {dashboard?.blockedUsers?.map((b) => (
                    <tr key={b.email} style={{ borderBottom: '1px solid #fee2e2' }}>
                      <td style={{ padding: '8px', fontWeight: '600' }}>{b.email}</td>
                      <td style={{ padding: '8px', color: '#991b1b' }}>{b.reason}</td>
                      <td style={{ padding: '8px', fontWeight: 'bold' }}>{b.minutesRemaining} min</td>
                      <td style={{ padding: '8px', textAlign: 'center' }}>
                        <button
                          onClick={() => handleUnblock(b.email)}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '4px 8px',
                            backgroundColor: '#ffffff',
                            border: '1px solid #cbd5e1',
                            borderRadius: '4px',
                            fontSize: '11px',
                            cursor: 'pointer'
                          }}
                        >
                          <Unlock size={12} /> Débloquer
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
