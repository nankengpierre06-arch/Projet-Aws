import React, { useState, useEffect } from 'react';
import { Download, CheckCircle, Clock, AlertOctagon, FileText, ArrowRight } from 'lucide-react';

export default function DownloadView({ linkId }) {
  // États : 'IDLE' | 'CHECKING' | 'WAITING_PDF' | 'READY' | 'EXHAUSTED' | 'ERROR'
  const [state, setState] = useState('IDLE');
  const [tokenData, setTokenData] = useState(null);
  const [errorInfo, setErrorInfo] = useState('');
  const [remainingPlaces, setRemainingPlaces] = useState(null);
  const [latency, setLatency] = useState(null);

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

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#f1f5f9',
      padding: '20px'
    }}>
      <div style={{
        maxWidth: '520px',
        width: '100%',
        backgroundColor: '#ffffff',
        borderRadius: '12px',
        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)',
        padding: '36px',
        textAlign: 'center'
      }}>
        <div style={{
          width: '60px',
          height: '60px',
          borderRadius: '50%',
          backgroundColor: 'var(--primary-light)',
          color: 'var(--primary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 16px'
        }}>
          <FileText size={32} />
        </div>

        <h1 style={{ fontSize: '22px', fontWeight: 'bold', marginBottom: '8px', color: '#0f172a' }}>
          Revue Numérique Annuelle
        </h1>
        <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '24px' }}>
          Édition officielle certifiée par les étudiants • Tirage strictement limité à <b>500 exemplaires</b>
        </p>

        {/* ÉTAT 1 : IDLE */}
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
              <b>Règle de parution :</b> Les exemplaires sont délivrés au fil de l'eau. Seules les 500 premières personnes obtiennent leur fichier PDF certifié.
            </div>

            <button
              onClick={startDownloadFlow}
              style={{
                width: '100%',
                padding: '14px',
                backgroundColor: 'var(--primary)',
                color: '#ffffff',
                border: 'none',
                fontSize: '15px',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              <Download size={18} /> Télécharger mon Exemplaire
            </button>
          </div>
        )}

        {/* ÉTAT 2 : CHECKING */}
        {state === 'CHECKING' && (
          <div style={{ padding: '30px 0' }}>
            <Clock size={36} color="var(--primary)" style={{ animation: 'spin 1.5s linear infinite' }} />
            <h3 style={{ marginTop: '16px', fontSize: '16px', fontWeight: '600' }}>Vérification de votre place...</h3>
            <p style={{ fontSize: '12px', color: '#64748b', marginTop: '6px' }}>Arbitrage atomique en cours sur la base NoSQL...</p>
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
              <CheckCircle size={18} /> Place #{500 - (remainingPlaces || 0)} réservée avec succès !
            </div>
            <Clock size={30} color="var(--warning)" style={{ animation: 'pulse 1s ease-in-out infinite' }} />
            <h4 style={{ marginTop: '12px', fontSize: '15px' }}>Génération du PDF par Typst...</h4>
            <p style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
              Le compilateur assemble le texte le plus récent à l'instant T1. Veuillez patienter quelques secondes.
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
                fontSize: '15px',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              <Download size={18} /> Récupérer le Fichier PDF
            </button>

            <p style={{ fontSize: '11px', color: '#94a3b8', marginTop: '12px' }}>
              Ce lien est strictement personnel et à usage unique (Contrainte C1).
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

            <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--danger)' }}>Quota de 500 Exemplaires Épuisé</h3>
            <p style={{ fontSize: '13px', color: '#64748b', marginTop: '8px', lineHeight: '1.4' }}>
              {errorInfo}
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
              L'application a clôturé la distribution conformément à la contrainte C1 du projet. L'auteur a été notifié par e-mail automatique.
            </div>
          </div>
        )}

        {/* ÉTAT 6 : ERROR */}
        {state === 'ERROR' && (
          <div style={{ padding: '20px 0' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 'bold', color: 'var(--danger)' }}>Erreur</h3>
            <p style={{ fontSize: '13px', color: '#64748b', marginTop: '8px' }}>{errorInfo}</p>
            <button
              onClick={() => setState('IDLE')}
              style={{
                marginTop: '16px',
                padding: '8px 16px',
                backgroundColor: '#e2e8f0',
                border: 'none',
                color: '#334155',
                fontSize: '13px'
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

