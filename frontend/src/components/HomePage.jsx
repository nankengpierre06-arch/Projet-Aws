import React, { useState, useEffect } from 'react';
import { 
  Download, Clock, Calendar, Lock, CheckCircle, 
  ArrowRight, Shield, BookOpen, Sparkles, AlertCircle, FileText
} from 'lucide-react';

export default function HomePage({ onGoDownload, onOpenAuth, user, onGoEditor, onGoAdmin }) {
  const [publications, setPublications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(new Date());
  const [filter, setFilter] = useState('ALL'); // 'ALL' | 'OPEN' | 'UPCOMING'

  // 1. Horloge temps réel (rafraîchissement chaque seconde pour bascule automatique des boutons)
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // 2. Chargement des parutions en production depuis l'API
  const fetchPublications = () => {
    fetch('/api/publications')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setPublications(data);
        }
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchPublications();
    // Rafraîchir les parutions toutes les 8 secondes pour suivre les quotas en direct
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
    const scheduledTime = pub.scheduledAt ? new Date(pub.scheduledAt).getTime() : 0;
    const isUpcoming = scheduledTime > now.getTime();
    const isExhausted = pub.places_restantes <= 0;
    const isOpen = !isUpcoming && !isExhausted;

    if (filter === 'OPEN') return isOpen;
    if (filter === 'UPCOMING') return isUpcoming;
    return true;
  });

  return (
    <div style={{ backgroundColor: '#f8fafc', minHeight: '100vh' }}>
      {/* 1. HERO SECTION */}
      <section style={{
        background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 40%, #4338ca 100%)',
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
            JOURNAL ÉTUDIANT OFFICIEL • PARUTIONS À DATE ET HEURE PRÉCISES
          </div>

          <h1 style={{
            fontSize: '44px',
            fontWeight: '800',
            lineHeight: '1.15',
            letterSpacing: '-1px',
            marginBottom: '16px'
          }}>
            La Revue Numérique du Campus
          </h1>

          <p style={{
            fontSize: '18px',
            color: '#e0e7ff',
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
                color: '#312e81',
                borderRadius: '8px',
                fontSize: '15px',
                fontWeight: '700',
                textDecoration: 'none',
                boxShadow: '0 10px 20px -5px rgba(0, 0, 0, 0.2)'
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
                  color: '#4338ca',
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
            <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#6366f1', textTransform: 'uppercase', letterSpacing: '1px' }}>
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
            border: '1px solid #cbd5e1',
            boxShadow: '0 2px 4px rgba(0,0,0,0.04)'
          }}>
            <Clock size={18} color="#4338ca" />
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
                borderColor: filter === tab.id ? '#4338ca' : '#cbd5e1',
                backgroundColor: filter === tab.id ? '#4338ca' : '#ffffff',
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
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#64748b' }}>
            <Clock size={32} style={{ animation: 'spin 1.5s linear infinite', margin: '0 auto 12px' }} />
            <p>Chargement des documents en production...</p>
          </div>
        ) : filteredPubs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', backgroundColor: '#ffffff', borderRadius: '12px', border: '1px dashed #cbd5e1' }}>
            <FileText size={40} color="#94a3b8" style={{ margin: '0 auto 12px' }} />
            <h3 style={{ fontSize: '16px', fontWeight: 'bold', color: '#1e293b' }}>Aucune parution dans cette catégorie</h3>
            <p style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>Modifiez votre filtre pour afficher l'ensemble des numéros disponibles.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(330px, 1fr))', gap: '24px' }}>
            {filteredPubs.map(pub => {
              const scheduledTime = pub.scheduledAt ? new Date(pub.scheduledAt).getTime() : 0;
              const isUpcoming = scheduledTime > now.getTime();
              const isExhausted = pub.places_restantes <= 0;
              const isOpen = !isUpcoming && !isExhausted;
              const scheduledDateObj = pub.scheduledAt ? new Date(pub.scheduledAt) : null;

              return (
                <div
                  key={pub.linkId}
                  style={{
                    backgroundColor: '#ffffff',
                    borderRadius: '12px',
                    border: isOpen ? '2px solid #a5b4fc' : '1px solid #e2e8f0',
                    boxShadow: isOpen 
                      ? '0 10px 25px -5px rgba(99, 102, 241, 0.15), 0 8px 10px -6px rgba(99, 102, 241, 0.1)' 
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
                    backgroundColor: isOpen ? '#eef2ff' : (isUpcoming ? '#fef3c7' : '#f1f5f9'),
                    borderBottom: '1px solid #e2e8f0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}>
                    {/* Statut Badge */}
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
                        color: '#b45309'
                      }}>
                        <Clock size={14} color="#b45309" />
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
                      backgroundColor: isUpcoming ? '#fffbeb' : '#f8fafc',
                      padding: '12px 14px',
                      borderRadius: '8px',
                      border: '1px solid',
                      borderColor: isUpcoming ? '#fde68a' : '#e2e8f0',
                      marginBottom: '18px'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: '700', color: isUpcoming ? '#b45309' : '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        <Calendar size={13} />
                        Date et heure annoncées :
                      </div>

                      <div style={{ fontSize: '13px', fontWeight: '700', color: '#1e293b', marginTop: '4px' }}>
                        {scheduledDateObj ? scheduledDateObj.toLocaleDateString('fr-FR', {
                          weekday: 'long',
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric'
                        }) : 'Disponible'}
                        {' à '}
                        <span style={{ color: isUpcoming ? '#b45309' : '#4338ca', fontWeight: '800' }}>
                          {scheduledDateObj ? scheduledDateObj.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '14:00'}
                        </span>
                      </div>

                      {/* Si À venir : Compte à rebours temps réel */}
                      {isUpcoming && (
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
                    {/* - Inactif si la date/heure n'est pas encore arrivée      */}
                    {/* - Actif si la date/heure est passée et quota > 0        */}
                    {/* ======================================================== */}
                    {isUpcoming ? (
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
                          onClick={() => onGoDownload(pub.linkId)}
                          style={{
                            width: '100%',
                            padding: '12px 16px',
                            backgroundColor: '#16a34a',
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
                            cursor: 'pointer',
                            transition: 'all 0.2s ease'
                          }}
                        >
                          <Download size={17} /> Obtenir mon Exemplaire ({pub.places_restantes} restants)
                        </button>
                        <p style={{ fontSize: '11px', color: '#16a34a', textAlign: 'center', marginTop: '6px', fontWeight: '500' }}>
                          ✓ Tirage ouvert • Téléchargement immédiat
                        </p>
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
        )}
      </section>

      {/* 3. SECTION ÉDITORIALE & VIE DE LA REVUE */}
      <section style={{ backgroundColor: '#ffffff', borderTop: '1px solid #e2e8f0', padding: '60px 24px' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto', textAlign: 'center' }}>
          <div style={{ display: 'inline-flex', padding: '8px', borderRadius: '50%', backgroundColor: '#eef2ff', color: '#4338ca', marginBottom: '14px' }}>
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
                backgroundColor: '#4338ca',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer'
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
