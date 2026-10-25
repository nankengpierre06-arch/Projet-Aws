import React, { useState, useEffect } from 'react';
import { 
  Download, Clock, Calendar, Lock, CheckCircle, 
  ArrowRight, Shield, BookOpen, Sparkles, AlertCircle, FileText,
  Loader2, Check
} from 'lucide-react';

export default function HomePage({ onGoDownload, onOpenAuth, user, onGoEditor, onGoAdmin }) {
  const [publications, setPublications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(new Date());
  const [filter, setFilter] = useState('ALL'); // 'ALL' | 'OPEN' | 'UPCOMING'
  const [downloadingId, setDownloadingId] = useState(null);
  const [downloadFeedback, setDownloadFeedback] = useState({}); // linkId -> { type: 'SUCCESS' | 'ERROR' | 'INFO', message: string }

  // Téléchargement direct et automatique du PDF sur l'appareil de l'utilisateur
  const handleDirectDownload = async (pub) => {
    if (downloadingId) return;
    setDownloadingId(pub.linkId);
    setDownloadFeedback(prev => ({
      ...prev,
      [pub.linkId]: { type: 'INFO', message: 'Attribution de votre exemplaire...' }
    }));

    try {
      const res = await fetch(`/api/download/${encodeURIComponent(pub.linkId)}`);
      const data = await res.json();

      if (res.status === 410) {
        setPublications(prev => prev.map(p => p.linkId === pub.linkId ? { ...p, places_restantes: 0 } : p));
        setDownloadFeedback(prev => ({
          ...prev,
          [pub.linkId]: { type: 'ERROR', message: 'Tirage épuisé : le quota de 500 exemplaires a été atteint.' }
        }));
        return;
      }

      if (res.status === 403 || data.error === 'PARUTION_NOT_YET_OPEN') {
        setDownloadFeedback(prev => ({
          ...prev,
          [pub.linkId]: { type: 'ERROR', message: data.message || 'Cette parution n\'est pas encore ouverte.' }
        }));
        return;
      }

      if (!res.ok || !data.token) {
        setDownloadFeedback(prev => ({
          ...prev,
          [pub.linkId]: { type: 'ERROR', message: data.message || 'Impossible d\'obtenir l\'exemplaire.' }
        }));
        return;
      }

      // Admis ! Mettre à jour les exemplaires restants
      if (typeof data.remaining === 'number') {
        setPublications(prev => prev.map(p => p.linkId === pub.linkId ? { ...p, places_restantes: data.remaining } : p));
      }

      setDownloadFeedback(prev => ({
        ...prev,
        [pub.linkId]: { type: 'INFO', message: 'Téléchargement du fichier PDF en cours...' }
      }));

      // Déclencher le téléchargement automatique du fichier PDF sur l'appareil de l'utilisateur
      const fileUrl = `/api/download/file?token=${encodeURIComponent(data.token)}`;
      const safeTitle = (pub.title || 'Revue_Numerique')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9_-]/g, '_');
      const safeFilename = `${safeTitle}.pdf`;

      const link = document.createElement('a');
      link.href = fileUrl;
      link.setAttribute('download', safeFilename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setDownloadFeedback(prev => ({
        ...prev,
        [pub.linkId]: { type: 'SUCCESS', message: '✓ Exemplaire PDF téléchargé sur votre appareil !' }
      }));

      setTimeout(() => {
        setDownloadFeedback(prev => {
          const next = { ...prev };
          delete next[pub.linkId];
          return next;
        });
      }, 5000);

    } catch (err) {
      setDownloadFeedback(prev => ({
        ...prev,
        [pub.linkId]: { type: 'ERROR', message: 'Erreur réseau lors du téléchargement.' }
      }));
    } finally {
      setDownloadingId(null);
    }
  };

  // 1. Horloge temps réel (rafraîchissement chaque seconde pour bascule automatique des boutons)
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // 2. Synchronisation dynamique des parutions en production depuis l'API
  const fetchPublications = () => {
    fetch('/api/publications')
      .then(res => {
        if (!res.ok) throw new Error('API indisponible');
        return res.json();
      })
      .then(data => {
        if (Array.isArray(data)) {
          setPublications(data);
        }
      })
      .catch(err => {
        console.warn('[HomePage] Impossible de charger les parutions :', err.message);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchPublications();
    const pollInterval = setInterval(fetchPublications, 8000);
    return () => clearInterval(pollInterval);
  }, []);

  // Calcul du temps restant avant ouverture
  const getCountdownString = (scheduledDateStr) => {
    if (!scheduledDateStr) return '';
    const target = new Date(scheduledDateStr).getTime();
    const diff = target - now.getTime();
    if (diff <= 0) return 'Ouverture imminente';

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    const pad = (n) => String(n).padStart(2, '0');
    return `${pad(hours)}h ${pad(minutes)}m ${pad(seconds)}s`;
  };

  // Filtrage des parutions
  const filteredPubs = publications.filter(pub => {
    const hasSchedule = Boolean(pub.scheduledAt);
    const scheduledTime = hasSchedule ? new Date(pub.scheduledAt).getTime() : null;
    const isUpcoming = hasSchedule ? scheduledTime > now.getTime() : true;
    const isExhausted = pub.places_restantes <= 0;
    const isOpen = hasSchedule && !isUpcoming && !isExhausted;

    if (filter === 'OPEN') return isOpen;
    if (filter === 'UPCOMING') return isUpcoming;
    return true;
  });

  return (
    <div style={{ backgroundColor: '#f8fafc', minHeight: '100vh' }}>
      {/* 1. HERO SECTION (VIOLET ROYAL HISTORIQUE) */}
      <section style={{
        background: 'linear-gradient(135deg, #2e1065 0%, #581c87 50%, #3b0764 100%)',
        color: '#ffffff',
        padding: '75px 24px 65px',
        textAlign: 'center',
        position: 'relative'
      }}>
        <div style={{ maxWidth: '880px', margin: '0 auto', position: 'relative', zIndex: 2 }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '6px 18px',
            borderRadius: '20px',
            backgroundColor: 'rgba(255, 255, 255, 0.12)',
            backdropFilter: 'blur(8px)',
            fontSize: '12px',
            fontWeight: '600',
            letterSpacing: '0.5px',
            marginBottom: '20px',
            border: '1px solid rgba(255, 255, 255, 0.2)'
          }}>
            <Sparkles size={15} color="#facc15" />
            ÉDITION OFFICIELLE • PARUTIONS À DATE ET HEURE PRÉCISES
          </div>

          <h1 style={{
            fontSize: '44px',
            fontWeight: '800',
            lineHeight: '1.15',
            letterSpacing: '-1px',
            marginBottom: '16px'
          }}>
            La Revue Numérique Annuelle
          </h1>

          <p style={{
            fontSize: '18px',
            color: '#e9d5ff',
            lineHeight: '1.6',
            maxWidth: '720px',
            margin: '0 auto 32px'
          }}>
            Chaque numéro est préparé par la rédaction étudiante et programmé pour une publication à une date et une heure précises.
            Le tirage est limité à <b>500 exemplaires certifiés</b> par parution.
          </p>

          {/* Boutons d'Action Rapides */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: '14px', flexWrap: 'wrap' }}>
            <a
              href="#parutions"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '13px 26px',
                backgroundColor: '#ffffff',
                color: '#581c87',
                borderRadius: '8px',
                fontSize: '15px',
                fontWeight: '700',
                textDecoration: 'none',
                boxShadow: '0 10px 20px -5px rgba(0, 0, 0, 0.25)'
              }}
            >
              <BookOpen size={18} /> Consulter les Numéros
            </a>

            {!user ? (
              <button
                onClick={onOpenAuth}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '13px 24px',
                  backgroundColor: 'rgba(255, 255, 255, 0.15)',
                  color: '#ffffff',
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                  borderRadius: '8px',
                  fontSize: '15px',
                  fontWeight: '600',
                  backdropFilter: 'blur(8px)',
                  cursor: 'pointer'
                }}
              >
                Espace Rédaction (Connexion) <ArrowRight size={16} />
              </button>
            ) : user.role === 'ADMIN' ? (
              <button
                onClick={onGoAdmin}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '13px 24px',
                  backgroundColor: '#facc15',
                  color: '#713f12',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '15px',
                  fontWeight: '700',
                  cursor: 'pointer'
                }}
              >
                <Shield size={18} /> Console d'Administration
              </button>
            ) : (
              <button
                onClick={onGoEditor}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '13px 24px',
                  backgroundColor: '#ffffff',
                  color: '#6b21a8',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '15px',
                  fontWeight: '700',
                  cursor: 'pointer'
                }}
              >
                Accéder à l'Éditeur <ArrowRight size={16} />
              </button>
            )}
          </div>
        </div>
      </section>

      {/* 2. SECTION DES DOCUMENTS EN PRODUCTION (ANNONCÉS ET EN COURS) */}
      <section id="parutions" style={{ maxWidth: '1100px', margin: '0 auto', padding: '50px 24px 80px' }}>
        
        {/* En-tête de section avec horloge officielle */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          flexWrap: 'wrap',
          gap: '20px',
          marginBottom: '32px',
          paddingBottom: '16px',
          borderBottom: '2px solid #e2e8f0'
        }}>
          <div>
            <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#7e22ce', textTransform: 'uppercase', letterSpacing: '1px' }}>
              Kiosque de la Rédaction
            </span>
            <h2 style={{ fontSize: '30px', fontWeight: '800', color: '#0f172a', marginTop: '4px' }}>
              Documents & Parutions en Production
            </h2>
            <p style={{ fontSize: '14px', color: '#64748b', marginTop: '4px' }}>
              Téléchargez votre exemplaire certifié pour les parutions ouvertes, ou consultez les tirages programmés.
            </p>
          </div>

          {/* Horloge officielle de référence */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            backgroundColor: '#ffffff',
            padding: '10px 18px',
            borderRadius: '8px',
            border: '1px solid #d8b4fe',
            boxShadow: '0 2px 4px rgba(107, 33, 168, 0.05)'
          }}>
            <Clock size={18} color="#6b21a8" />
            <div>
              <div style={{ fontSize: '10px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>
                Heure Officielle
              </div>
              <div style={{ fontSize: '14px', fontWeight: '800', color: '#0f172a', fontFamily: 'monospace' }}>
                {now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </div>
            </div>
          </div>
        </div>

        {/* Filtres de sélection */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '28px', flexWrap: 'wrap' }}>
          {[
            { id: 'ALL', label: 'Toutes les parutions' },
            { id: 'OPEN', label: 'Tirage Ouvert (Actif)' },
            { id: 'UPCOMING', label: 'À paraître (Annoncé)' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id)}
              style={{
                padding: '8px 16px',
                borderRadius: '6px',
                border: '1px solid',
                borderColor: filter === tab.id ? '#6b21a8' : '#cbd5e1',
                backgroundColor: filter === tab.id ? '#6b21a8' : '#ffffff',
                color: filter === tab.id ? '#ffffff' : '#334155',
                fontSize: '13px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Grille des Parutions */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(330px, 1fr))', gap: '24px' }}>
          {filteredPubs.map(pub => {
            const hasSchedule = Boolean(pub.scheduledAt);
            const scheduledDateObj = hasSchedule ? new Date(pub.scheduledAt) : null;
            const isUpcoming = hasSchedule ? scheduledDateObj.getTime() > now.getTime() : false;
            const isPendingSchedule = !hasSchedule;
            const isExhausted = pub.places_restantes <= 0;
            const isOpen = hasSchedule && !isUpcoming && !isExhausted;

            return (
              <div
                key={pub.linkId}
                style={{
                  backgroundColor: '#ffffff',
                  borderRadius: '12px',
                  border: isOpen ? '2px solid #86efac' : (isPendingSchedule ? '2px dashed #fde68a' : '1px solid #e2e8f0'),
                  boxShadow: isOpen 
                    ? '0 10px 25px -5px rgba(22, 163, 74, 0.15)' 
                    : '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
                  display: 'flex',
                  flexDirection: 'column',
                  overflow: 'hidden',
                  transition: 'transform 0.2s ease, box-shadow 0.2s ease'
                }}
              >
                {/* Bandeau d'état */}
                <div style={{
                  padding: '12px 18px',
                  backgroundColor: isPendingSchedule ? '#fffbeb' : (isOpen ? '#f0fdf4' : (isUpcoming ? '#f5f3ff' : '#f1f5f9')),
                  borderBottom: '1px solid #e2e8f0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}>
                  {/* Statut Badge */}
                  {isPendingSchedule && (
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      fontSize: '11.5px',
                      fontWeight: '700',
                      color: '#b45309'
                    }}>
                      <Clock size={14} color="#b45309" />
                      EN ATTENTE DE PROGRAMMATION (ADMIN)
                    </span>
                  )}

                  {isOpen && (
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      fontSize: '12px',
                      fontWeight: '700',
                      color: '#16a34a'
                    }}>
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#16a34a', display: 'inline-block' }} />
                      TIRAGE OUVERT
                    </span>
                  )}

                  {isUpcoming && (
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      fontSize: '12px',
                      fontWeight: '700',
                      color: '#6d28d9'
                    }}>
                      <Clock size={14} color="#6d28d9" />
                      À PARAÎTRE (ANNONCÉ)
                    </span>
                  )}

                  {isExhausted && (
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      fontSize: '12px',
                      fontWeight: '700',
                      color: '#64748b'
                    }}>
                      <AlertCircle size={14} color="#64748b" />
                      TIRAGE ÉPUISÉ
                    </span>
                  )}

                  {/* Format / Version */}
                  <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '600' }}>
                    Édition v{pub.versionSeq || 1}
                  </span>
                </div>

                {/* Contenu de la Carte */}
                <div style={{ padding: '22px 20px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', marginBottom: '8px', lineHeight: '1.3' }}>
                    {pub.title}
                  </h3>

                  <p style={{ fontSize: '13px', color: '#475569', lineHeight: '1.5', marginBottom: '18px', flex: 1 }}>
                    {pub.description}
                  </p>

                  {/* Bloc Date et Heure Annoncées */}
                  <div style={{
                    backgroundColor: isPendingSchedule ? '#fffbeb' : (isUpcoming ? '#fef3c7' : '#faf5ff'),
                    padding: '12px 14px',
                    borderRadius: '8px',
                    border: '1px solid',
                    borderColor: isPendingSchedule ? '#fde68a' : (isUpcoming ? '#fde68a' : '#f3e8ff'),
                    marginBottom: '18px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: '700', color: isPendingSchedule ? '#b45309' : (isUpcoming ? '#b45309' : '#6b21a8'), textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      <Calendar size={13} />
                      Date et heure annoncées :
                    </div>

                    <div style={{ fontSize: '13px', fontWeight: '700', color: isPendingSchedule ? '#b45309' : '#1e293b', marginTop: '4px' }}>
                      {isPendingSchedule ? (
                        "En attente de fixation par l'administrateur"
                      ) : (
                        <>
                          {scheduledDateObj.toLocaleDateString('fr-FR', {
                            weekday: 'long',
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric'
                          })}
                          {' à '}
                          <span style={{ color: isUpcoming ? '#b45309' : '#6b21a8', fontWeight: '800' }}>
                            {scheduledDateObj.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </>
                      )}
                    </div>

                    {/* Si À venir : Compte à rebours temps réel */}
                    {isUpcoming && scheduledDateObj && (
                      <div style={{
                        marginTop: '8px',
                        paddingTop: '8px',
                        borderTop: '1px dashed #fde68a',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        fontSize: '12px',
                        color: '#b45309'
                      }}>
                        <span>Ouverture du tirage dans :</span>
                        <span style={{ fontWeight: '800', fontFamily: 'monospace', fontSize: '13px' }}>
                          {getCountdownString(pub.scheduledAt)}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Jauge des Exemplaires Restants */}
                  <div style={{ marginBottom: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', marginBottom: '6px' }}>
                      <span style={{ color: '#64748b', fontWeight: '600' }}>Exemplaires certifiés :</span>
                      <span style={{ fontWeight: '800', color: isExhausted ? '#ef4444' : '#0f172a' }}>
                        {pub.places_restantes} <span style={{ color: '#64748b', fontWeight: 'normal' }}>/ {pub.maxPlaces || 500}</span>
                      </span>
                    </div>
                    <div style={{ width: '100%', height: '7px', backgroundColor: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{
                        width: `${Math.max(0, Math.min(100, (pub.places_restantes / (pub.maxPlaces || 500)) * 100))}%`,
                        height: '100%',
                        backgroundColor: isExhausted ? '#ef4444' : (pub.places_restantes < 50 ? '#f59e0b' : '#22c55e'),
                        transition: 'width 0.4s ease'
                      }} />
                    </div>
                  </div>

                  {/* ======================================================== */}
                  {/* BOUTON DE TÉLÉCHARGEMENT DYNAMIQUE                       */}
                  {/* - Inactif si en attente de programmation (Admin)         */}
                  {/* - Inactif si la date/heure n'est pas encore arrivée      */}
                  {/* - Actif si la date/heure est passée et quota > 0        */}
                  {/* ======================================================== */}
                  {isPendingSchedule ? (
                    <div>
                      <button
                        disabled={true}
                        style={{
                          width: '100%',
                          padding: '12px 16px',
                          backgroundColor: '#f8fafc',
                          color: '#94a3b8',
                          border: '1px solid #cbd5e1',
                          borderRadius: '8px',
                          fontSize: '13px',
                          fontWeight: '600',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '8px',
                          cursor: 'not-allowed'
                        }}
                      >
                        <Lock size={16} /> En attente de programmation (Admin)
                      </button>
                      <p style={{ fontSize: '11px', color: '#94a3b8', textAlign: 'center', marginTop: '6px' }}>
                        L'administrateur fixera la date et l'heure officielles d'ouverture.
                      </p>
                    </div>
                  ) : isUpcoming ? (
                    <div>
                      <button
                        disabled={true}
                        style={{
                          width: '100%',
                          padding: '12px 16px',
                          backgroundColor: '#f1f5f9',
                          color: '#94a3b8',
                          border: '1px solid #cbd5e1',
                          borderRadius: '8px',
                          fontSize: '14px',
                          fontWeight: '600',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '8px',
                          cursor: 'not-allowed'
                        }}
                      >
                        <Lock size={16} /> Téléchargement inactif (Ouverture à {scheduledDateObj?.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })})
                      </button>
                      <p style={{ fontSize: '11px', color: '#94a3b8', textAlign: 'center', marginTop: '6px' }}>
                        Le lien s'activera automatiquement à l'heure précise.
                      </p>
                    </div>
                  ) : isOpen ? (
                    <div>
                      <button
                        onClick={() => handleDirectDownload(pub)}
                        disabled={downloadingId === pub.linkId}
                        style={{
                          width: '100%',
                          padding: '12px 16px',
                          backgroundColor: downloadingId === pub.linkId ? '#15803d' : '#16a34a',
                          color: '#ffffff',
                          border: 'none',
                          borderRadius: '8px',
                          fontSize: '14px',
                          fontWeight: '700',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '8px',
                          boxShadow: '0 4px 12px rgba(22, 163, 74, 0.3)',
                          cursor: downloadingId === pub.linkId ? 'wait' : 'pointer',
                          transition: 'all 0.2s ease',
                          opacity: downloadingId === pub.linkId ? 0.85 : 1
                        }}
                      >
                        {downloadingId === pub.linkId ? (
                          <>
                            <Loader2 size={17} style={{ animation: 'spin 1s linear infinite' }} />
                            Téléchargement du PDF en cours...
                          </>
                        ) : (
                          <>
                            <Download size={17} /> Télécharger le PDF ({pub.places_restantes} restants)
                          </>
                        )}
                      </button>

                      {downloadFeedback[pub.linkId] ? (
                        <div style={{
                          marginTop: '8px',
                          padding: '8px 12px',
                          borderRadius: '6px',
                          fontSize: '12px',
                          fontWeight: '600',
                          textAlign: 'center',
                          backgroundColor: downloadFeedback[pub.linkId].type === 'SUCCESS' ? '#dcfce7' : downloadFeedback[pub.linkId].type === 'ERROR' ? '#fee2e2' : '#eff6ff',
                          color: downloadFeedback[pub.linkId].type === 'SUCCESS' ? '#15803d' : downloadFeedback[pub.linkId].type === 'ERROR' ? '#dc2626' : '#1d4ed8',
                          border: '1px solid',
                          borderColor: downloadFeedback[pub.linkId].type === 'SUCCESS' ? '#bbf7d0' : downloadFeedback[pub.linkId].type === 'ERROR' ? '#fecaca' : '#bfdbfe'
                        }}>
                          {downloadFeedback[pub.linkId].message}
                        </div>
                      ) : (
                        <p style={{ fontSize: '11px', color: '#16a34a', textAlign: 'center', marginTop: '6px', fontWeight: '500' }}>
                          ✓ Tirage ouvert • Téléchargement automatique sur votre appareil
                        </p>
                      )}

                      <div style={{ textAlign: 'center', marginTop: '6px' }}>
                        <button
                          onClick={() => onGoDownload && onGoDownload(pub.linkId)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#94a3b8',
                            fontSize: '11px',
                            cursor: 'pointer',
                            textDecoration: 'underline',
                            padding: '2px 4px'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.color = '#64748b'}
                          onMouseLeave={(e) => e.currentTarget.style.color = '#94a3b8'}
                        >
                          Voir la page dédiée du tirage #{pub.linkId}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <button
                        disabled={true}
                        style={{
                          width: '100%',
                          padding: '12px 16px',
                          backgroundColor: '#f8fafc',
                          color: '#94a3b8',
                          border: '1px solid #e2e8f0',
                          borderRadius: '8px',
                          fontSize: '14px',
                          fontWeight: '600',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '8px',
                          cursor: 'not-allowed'
                        }}
                      >
                        <AlertCircle size={16} /> Tirage Épuisé (500 ex. distribués)
                      </button>
                      <p style={{ fontSize: '11px', color: '#94a3b8', textAlign: 'center', marginTop: '6px' }}>
                        Ce tirage a atteint sa limite maximale.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 3. SECTION ÉDITORIALE & VIE DE LA REVUE */}
      <section style={{ backgroundColor: '#ffffff', borderTop: '1px solid #e2e8f0', padding: '60px 24px' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto', textAlign: 'center' }}>
          <div style={{ display: 'inline-flex', padding: '10px', borderRadius: '50%', backgroundColor: '#f3e8ff', color: '#6b21a8', marginBottom: '14px' }}>
            <BookOpen size={24} />
          </div>
          <h2 style={{ fontSize: '24px', fontWeight: '800', color: '#0f172a', marginBottom: '12px' }}>
            Comment Participer à la Revue Étudiante ?
          </h2>
          <p style={{ fontSize: '15px', color: '#64748b', lineHeight: '1.6', maxWidth: '700px', margin: '0 auto 28px' }}>
            Tous les étudiants de l'université peuvent proposer des articles, des tribunes libres ou des dossiers scientifiques.
            L'administrateur de l'association valide les candidatures et habilite les comptes rédacteurs pour l'espace collaboratif.
          </p>

          {!user && (
            <button
              onClick={onOpenAuth}
              style={{
                padding: '12px 24px',
                backgroundColor: '#6b21a8',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(107, 33, 168, 0.25)'
              }}
            >
              Vous êtes rédacteur ? Identifiez-vous ici
            </button>
          )}
        </div>
      </section>
    </div>
  );
}
