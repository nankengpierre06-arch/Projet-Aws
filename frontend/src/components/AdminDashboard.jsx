import React, { useState, useEffect } from 'react';
import { Shield, FileText, Link as LinkIcon, AlertTriangle, RefreshCw, X, Check } from 'lucide-react';

export default function AdminDashboard({ onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchDashboard = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/dashboard');
      const json = await res.json();
      setData(json);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
    const interval = setInterval(fetchDashboard, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
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
        maxWidth: '750px',
        width: '100%',
        maxHeight: '90vh',
        backgroundColor: '#ffffff',
        borderRadius: '12px',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: '#f8fafc'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Shield size={20} color="var(--primary)" />
            <h3 style={{ fontSize: '16px', fontWeight: 'bold' }}>Supervision de l'Association (Temps Réel)</h3>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={fetchDashboard}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '4px 8px',
                backgroundColor: '#ffffff',
                border: '1px solid var(--border)',
                fontSize: '12px'
              }}
            >
              <RefreshCw size={12} className={loading ? 'spin' : ''} /> Actualiser
            </button>
            <button
              onClick={onClose}
              style={{
                padding: '4px',
                backgroundColor: 'transparent',
                border: 'none',
                color: '#64748b'
              }}
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div style={{ padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Résumé 3 blocs */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
            <div style={{ padding: '12px', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px' }}>
              <span style={{ fontSize: '11px', color: '#166534', fontWeight: 'bold' }}>DOCUMENTS OUVERTS</span>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#15803d', marginTop: '4px' }}>
                {data?.summary?.totalOpenDocuments || 0}
              </div>
            </div>

            <div style={{ padding: '12px', backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '8px' }}>
              <span style={{ fontSize: '11px', color: '#1e40af', fontWeight: 'bold' }}>LIENS ACTIFS (500 EX.)</span>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#1d4ed8', marginTop: '4px' }}>
                {data?.summary?.totalActiveLinks || 0}
              </div>
            </div>

            <div style={{ padding: '12px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px' }}>
              <span style={{ fontSize: '11px', color: '#991b1b', fontWeight: 'bold' }}>PERSONNES BLOQUÉES</span>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#b91c1c', marginTop: '4px' }}>
                {data?.summary?.totalBlockedUsers || 0}
              </div>
            </div>
          </div>

          {/* Section 1: Documents ouverts */}
          <div>
            <h4 style={{ fontSize: '13px', fontWeight: 'bold', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <FileText size={16} /> Documents en cours d'édition
            </h4>
            {data?.openDocuments?.length === 0 ? (
              <p style={{ fontSize: '12px', color: '#64748b' }}>Aucun document actif actuellement.</p>
            ) : (
              <div style={{ border: '1px solid var(--border)', borderRadius: '6px', overflow: 'hidden' }}>
                <table style={{ width: '100%', fontSize: '12px', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid var(--border)' }}>
                    <tr>
                      <th style={{ padding: '8px 12px' }}>ID Document</th>
                      <th style={{ padding: '8px 12px' }}>Rédacteurs connectés</th>
                      <th style={{ padding: '8px 12px' }}>Caractères</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data?.openDocuments?.map((d, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '8px 12px', fontFamily: 'monospace' }}>{d.docId}</td>
                        <td style={{ padding: '8px 12px' }}><b>{d.connectedWriters}</b> en ligne</td>
                        <td style={{ padding: '8px 12px' }}>{d.textLength} car.</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Section 2: Liens actifs et quotas */}
          <div>
            <h4 style={{ fontSize: '13px', fontWeight: 'bold', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <LinkIcon size={16} /> Liens de téléchargement et quotas restants (Contrainte C1)
            </h4>
            {data?.activeLinks?.length === 0 ? (
              <p style={{ fontSize: '12px', color: '#64748b' }}>Aucun lien de téléchargement créé pour le moment.</p>
            ) : (
              <div style={{ border: '1px solid var(--border)', borderRadius: '6px', overflow: 'hidden' }}>
                <table style={{ width: '100%', fontSize: '12px', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid var(--border)' }}>
                    <tr>
                      <th style={{ padding: '8px 12px' }}>Identifiant du lien</th>
                      <th style={{ padding: '8px 12px' }}>Places restantes</th>
                      <th style={{ padding: '8px 12px' }}>Statut PDF</th>
                      <th style={{ padding: '8px 12px' }}>Auteur prévenu si épuisé</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data?.activeLinks?.map((l, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '8px 12px', fontFamily: 'monospace' }}>{l.linkId}</td>
                        <td style={{ padding: '8px 12px' }}>
                          <span style={{
                            fontWeight: 'bold',
                            color: l.isExhausted ? 'var(--danger)' : 'var(--success)'
                          }}>
                            {l.places_restantes} / {l.maxPlaces}
                          </span> {l.isExhausted && '(Épuisé)'}
                        </td>
                        <td style={{ padding: '8px 12px' }}>
                          <span style={{
                            padding: '2px 6px',
                            borderRadius: '4px',
                            fontSize: '11px',
                            backgroundColor: l.pdfStatus === 'READY' ? 'var(--success-bg)' : 'var(--warning-bg)',
                            color: l.pdfStatus === 'READY' ? 'var(--success)' : 'var(--warning)'
                          }}>
                            {l.pdfStatus}
                          </span>
                        </td>
                        <td style={{ padding: '8px 12px', color: '#64748b' }}>{l.creatorEmail}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Section 3: Personnes bloquées */}
          <div>
            <h4 style={{ fontSize: '13px', fontWeight: 'bold', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--danger)' }}>
              <AlertTriangle size={16} /> Personnes temporairement bloquées pour acharnement (Anti-Abus)
            </h4>
            {data?.blockedUsers?.length === 0 ? (
              <p style={{ fontSize: '12px', color: '#16a34a' }}>Aucun utilisateur bloqué actuellement. Tout est calme.</p>
            ) : (
              <div style={{ border: '1px solid var(--border)', borderRadius: '6px', overflow: 'hidden' }}>
                <table style={{ width: '100%', fontSize: '12px', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead style={{ backgroundColor: '#fef2f2', borderBottom: '1px solid #fecaca' }}>
                    <tr>
                      <th style={{ padding: '8px 12px' }}>Email du rédacteur</th>
                      <th style={{ padding: '8px 12px' }}>Motif du blocage</th>
                      <th style={{ padding: '8px 12px' }}>Temps restant</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data?.blockedUsers?.map((b, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid #fee2e2' }}>
                        <td style={{ padding: '8px 12px', fontWeight: '600' }}>{b.email}</td>
                        <td style={{ padding: '8px 12px', color: '#991b1b' }}>{b.reason}</td>
                        <td style={{ padding: '8px 12px', color: '#991b1b', fontWeight: 'bold' }}>{b.minutesRemaining} min</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
