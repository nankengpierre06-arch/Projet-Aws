import React, { useState, useEffect } from 'react';
import { Download, CheckCircle, Clock, AlertOctagon, FileText, Lock, Calendar, ArrowLeft } from 'lucide-react';

export default function DownloadView({ linkId }) {
  // États : 'IDLE' | 'CHECKING' | 'WAITING_PDF' | 'READY' | 'EXHAUSTED' | 'NOT_YET_OPEN' | 'ERROR'
  const [state, setState] = useState('IDLE');
  const [tokenData, setTokenData] = useState(null);
  const [parutionInfo, setParutionInfo] = useState(null);
  const [errorInfo, setErrorInfo] = useState('');
  const [remainingPlaces, setRemainingPlaces] = useState(null);
  const [latency, setLatency] = useState(null);
  const [now, setNow] = useState(new Date());

  // Horloge locale
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Chargement des informations du lien au montage
  useEffect(() => {
    fetch(`/api/download/status/${linkId}`)
      .then(res => res.json())
      .then(data => {
        setParutionInfo(data);
        if (data.isUpcoming) {
          setState('NOT_YET_OPEN');
        } else if (data.isExhausted) {
          setState('EXHAUSTED');
          setErrorInfo('Le quota de 500 exemplaires a été atteint.');
        }
      })
      .catch(() => {});
  }, [linkId]);

  const startDownloadFlow = async () => {
    setState('CHECKING');
    setErrorInfo('');

    try {
      const res = await fetch(`/api/download/${linkId}`);
      const data = await res.json();
      setLatency(data.latencyMs);

      if (res.status === 410) {
        setState('EXHAUSTED');
        setErrorInfo(data.message || 'Le quota de 500 exemplaires a été atteint.');
        return;
      }

      if (res.status === 403 || data.error === 'PARUTION_NOT_YET_OPEN') {
        setState('NOT_YET_OPEN');
        setErrorInfo(data.message || 'Cette parution n\'est pas encore ouverte au téléchargement.');
        return;
      }

      if (!res.ok) {
        setState('ERROR');
        setErrorInfo(data.message || 'Lien invalide ou introuvable.');
        return;
      }

      // Admis !
      setTokenData(data);
      setRemainingPlaces(data.remaining);

      if (data.pdfStatus === 'READY') {
        setState('READY');
      } else {
        setState('WAITING_PDF');
        pollPdfStatus(data.token);
      }
    } catch (err) {
      setState('ERROR');
      setErrorInfo('Impossible de joindre le serveur. Vérifiez votre connexion.');
    }
  };

  const pollPdfStatus = async (token) => {
    let attempts = 0;
    const interval = setInterval(async () => {
      attempts += 1;
      try {
        const res = await fetch(`/api/download/status/${linkId}`);
        const data = await res.json();

        if (data.pdfStatus === 'READY' || attempts >= 10) {
          clearInterval(interval);
          setState('READY');
        }
      } catch {
        clearInterval(interval);
        setState('READY');
      }
    }, 1200);
  };

  const triggerDirectDownload = () => {
    if (!tokenData || !tokenData.token) return;
    window.location.href = `/api/download/file?token=${tokenData.token}`;
  };

  // Compte à rebours
  const getCountdown = () => {
    if (!parutionInfo || !parutionInfo.scheduledAt) return '';
    const diff = new Date(parutionInfo.scheduledAt).getTime() - now.getTime();
    if (diff <= 0) return 'Ouverture imminente';
    const h = Math.floor(diff / (1000 * 60 * 60));
    const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const s = Math.floor((diff % (1000 * 60)) / 1000);
    const pad = (n) => String(n).padStart(2, '0');
    return `${pad(h)}h ${pad(m)}m ${pad(s)}s`;
  };

  const scheduledDateObj = parutionInfo?.scheduledAt ? new Date(parutionInfo.scheduledAt) : null;

  return (
    <div style={{
      minHeight: '80vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#f8fafc',
      padding: '40px 20px'
    }}>
      <div style={{
        maxWidth: '540px',
        width: '100%',
        backgroundColor: '#ffffff',
        borderRadius: '12px',
        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)',
        padding: '36px',
        textAlign: 'center',
        border: '1px solid #e2e8f0'
      }}>
        {/* En-tête */}
        <div style={{
          width: '60px',
          height: '60px',
          borderRadius: '50%',
          backgroundColor: state === 'NOT_YET_OPEN' ? '#fef3c7' : 'var(--primary-light)',
          color: state === 'NOT_YET_OPEN' ? '#b45309' : 'var(--primary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 16px'
        }}>
          {state === 'NOT_YET_OPEN' ? <Lock size={30} /> : <FileText size={30} />}
        </div>

        <h1 style={{ fontSize: '22px', fontWeight: 'bold', marginBottom: '6px', color: '#0f172a' }}>
          {parutionInfo?.title || 'Revue Numérique Annuelle'}
        </h1>
        <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '24px' }}>
          Tirage limité à <b>500 exemplaires certifiés</b> • Rédaction universitaire
        </p>

        {/* ÉTAT : NOT_YET_OPEN (Parution Annoncée mais Date/Heure future) */}
        {state === 'NOT_YET_OPEN' && (
          <div>
            <div style={{
              padding: '18px',
              backgroundColor: '#fffbeb',
              border: '1px solid #fde68a',
              borderRadius: '8px',
              marginBottom: '20px',
              textAlign: 'left'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#b45309', fontWeight: 'bold', fontSize: '13px', marginBottom: '8px' }}>
                <Calendar size={16} />
                Parution programmée
              </div>
              <p style={{ fontSize: '13px', color: '#78350f', lineHeight: '1.5' }}>
                Cette parution a été annoncée pour une ouverture officielle le :
              </p>
              <div style={{ fontSize: '15px', fontWeight: '800', color: '#92400e', marginTop: '6px' }}>
                {scheduledDateObj ? scheduledDateObj.toLocaleDateString('fr-FR', {
                  weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
                }) : ''}
                {' à '}
                <span style={{ textDecoration: 'underline' }}>
                  {scheduledDateObj ? scheduledDateObj.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : ''}
                </span>
              </div>

              <div style={{ marginTop: '14px', paddingTop: '10px', borderTop: '1px dashed #fde68a', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px', color: '#b45309' }}>
                <span>Temps restant :</span>
                <span style={{ fontFamily: 'monospace', fontWeight: 'bold', fontSize: '15px' }}>
                  {getCountdown()}
                </span>
              </div>
            </div>

            <button
              disabled={true}
              style={{
                width: '100%',
                padding: '14px',
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
                cursor: 'not-allowed',
                marginBottom: '14px'
              }}
            >
              <Lock size={16} /> Téléchargement Inactif (Non encore ouvert)
            </button>

            <a
              href="#"
              onClick={(e) => { e.preventDefault(); window.location.hash = ''; window.location.reload(); }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '13px',
                color: '#4338ca',
                textDecoration: 'none',
                fontWeight: '600'
              }}
            >
              <ArrowLeft size={14} /> Retour au Kiosque d'Accueil
            </a>
          </div>
        )}

        {/* ÉTAT 1 : IDLE (Prêt pour téléchargement) */}
        {state === 'IDLE' && (
          <div>
            <div style={{
              padding: '16px',
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              marginBottom: '24px',
              fontSize: '13px',
              color: '#334155'
            }}>
              <b>Tirage ouvert :</b> Cliquez sur le bouton ci-dessous pour réserver votre place parmi les 500 exemplaires certifiés.
            </div>

            <button
              onClick={startDownloadFlow}
              style={{
                width: '100%',
                padding: '14px',
                backgroundColor: '#16a34a',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                fontSize: '15px',
                fontWeight: '700',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(22, 163, 74, 0.3)'
              }}
            >
              <Download size={18} /> Télécharger mon Exemplaire
            </button>
          </div>
        )}

        {/* ÉTAT 2 : CHECKING */}
        {state === 'CHECKING' && (
          <div style={{ padding: '30px 0' }}>
            <Clock size={36} color="var(--primary)" style={{ animation: 'spin 1.5s linear infinite', margin: '0 auto' }} />
            <h3 style={{ marginTop: '16px', fontSize: '16px', fontWeight: '600' }}>Vérification de votre place...</h3>
            <p style={{ fontSize: '12px', color: '#64748b', marginTop: '6px' }}>Arbitrage de votre téléchargement...</p>
          </div>
        )}

        {/* ÉTAT 3 : WAITING PDF COMPILATION */}
        {state === 'WAITING_PDF' && (
          <div style={{ padding: '24px 0' }}>
            <div style={{
              padding: '12px',
              backgroundColor: 'var(--success-bg)',
              color: 'var(--success)',
              borderRadius: '6px',
              fontWeight: '600',
              fontSize: '14px',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px'
            }}>
              <CheckCircle size={18} /> Place #{500 - (remainingPlaces || 0)} accordée avec succès !
            </div>
            <Clock size={30} color="var(--warning)" style={{ animation: 'pulse 1s ease-in-out infinite', margin: '0 auto' }} />
            <h4 style={{ marginTop: '12px', fontSize: '15px' }}>Génération du PDF...</h4>
            <p style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
              Le compilateur assemble le fichier certifié. Veuillez patienter un instant.
            </p>
          </div>
        )}

        {/* ÉTAT 4 : READY */}
        {state === 'READY' && (
          <div style={{ padding: '20px 0' }}>
            <div style={{
              width: '50px',
              height: '50px',
              borderRadius: '50%',
              backgroundColor: 'var(--success-bg)',
              color: 'var(--success)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 12px'
            }}>
              <CheckCircle size={28} />
            </div>

            <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--success)' }}>Votre exemplaire est prêt !</h3>
            <p style={{ fontSize: '13px', color: '#64748b', marginTop: '6px', marginBottom: '20px' }}>
              Votre jeton à usage unique est validé. Cliquez ci-dessous pour démarrer le transfert du PDF.
            </p>

            <button
              onClick={triggerDirectDownload}
              style={{
                width: '100%',
                padding: '14px',
                backgroundColor: 'var(--success)',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                fontSize: '15px',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                cursor: 'pointer'
              }}
            >
              <Download size={18} /> Récupérer le Fichier PDF
            </button>

            <p style={{ fontSize: '11px', color: '#94a3b8', marginTop: '12px' }}>
              Ce lien est strictement personnel et à usage unique.
            </p>
          </div>
        )}

        {/* ÉTAT 5 : EXHAUSTED (HTTP 410) */}
        {state === 'EXHAUSTED' && (
          <div style={{ padding: '20px 0' }}>
            <div style={{
              width: '50px',
              height: '50px',
              borderRadius: '50%',
              backgroundColor: 'var(--danger-bg)',
              color: 'var(--danger)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 12px'
            }}>
              <AlertOctagon size={28} />
            </div>

            <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--danger)' }}>Tirage de 500 Exemplaires Épuisé</h3>
            <p style={{ fontSize: '13px', color: '#64748b', marginTop: '8px', lineHeight: '1.4' }}>
              {errorInfo || 'Les 500 exemplaires certifiés de cette parution ont tous été attribués.'}
            </p>

            <div style={{
              marginTop: '20px',
              padding: '12px',
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '6px',
              fontSize: '12px',
              color: '#64748b'
            }}>
              La distribution pour ce numéro est désormais close.
            </div>
          </div>
        )}

        {/* ÉTAT 6 : ERROR */}
        {state === 'ERROR' && (
          <div style={{ padding: '20px 0' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 'bold', color: 'var(--danger)' }}>Information</h3>
            <p style={{ fontSize: '13px', color: '#64748b', marginTop: '8px' }}>{errorInfo}</p>
            <button
              onClick={() => setState('IDLE')}
              style={{
                marginTop: '16px',
                padding: '8px 16px',
                backgroundColor: '#e2e8f0',
                border: 'none',
                borderRadius: '6px',
                color: '#334155',
                fontSize: '13px',
                cursor: 'pointer'
              }}
            >
              Réessayer
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
