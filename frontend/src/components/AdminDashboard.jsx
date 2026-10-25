import React, { useState, useEffect } from 'react';
import { 
  Shield, UserPlus, Users, Link as LinkIcon, FileText, 
  AlertTriangle, RefreshCw, Trash2, CheckCircle, Unlock, ArrowLeft 
} from 'lucide-react';

export default function AdminDashboard({ onBackToHome, onGoEditor }) {
  const [activeTab, setActiveTab] = useState('writers'); // 'writers' | 'supervision'

  // Données Rédacteurs
  const [writers, setWriters] = useState([]);
  const [newWriterName, setNewWriterName] = useState('');
  const [newWriterEmail, setNewWriterEmail] = useState('');
  const [createMsg, setCreateMsg] = useState({ text: '', type: '' });

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
    fetchDashboard();
    const interval = setInterval(fetchDashboard, 4000);
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

  return (
    <div style={{ maxWidth: '1100px', margin: '30px auto', padding: '0 24px' }}>
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
              Gestion des comptes rédacteurs et supervision en direct du système
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
              color: '#334155'
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
              fontWeight: '600'
            }}
          >
            Accéder à l'Éditeur
          </button>
        </div>
      </div>

      {/* Onglets */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border)', marginBottom: '24px' }}>
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

      {/* ONGLET 1 : GESTION DES RÉDACTEURS */}
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
                  padding: '10px 12px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: '500',
                  marginBottom: '14px',
                  backgroundColor: createMsg.type === 'success' ? 'var(--success-bg)' : 'var(--danger-bg)',
                  color: createMsg.type === 'success' ? 'var(--success)' : 'var(--danger)'
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
                  fontSize: '13px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                Créer et activer le rédacteur
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
              <Users size={18} color="var(--primary)" /> Rédacteurs Actifs ({writers.length})
            </h3>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid var(--border)' }}>
                    <th style={{ padding: '10px' }}>Nom</th>
                    <th style={{ padding: '10px' }}>Email</th>
                    <th style={{ padding: '10px' }}>Crédit aujourd'hui</th>
                    <th style={{ padding: '10px' }}>Statut</th>
                    <th style={{ padding: '10px', textAlign: 'center' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {writers.map((w) => (
                    <tr key={w.email} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '10px', fontWeight: '600' }}>{w.name}</td>
                      <td style={{ padding: '10px', color: '#64748b' }}>{w.email}</td>
                      <td style={{ padding: '10px' }}>
                        <span>{w.charCountToday.toLocaleString()} / {w.maxQuota.toLocaleString()} car.</span>
                        <div style={{ width: '80px', height: '4px', backgroundColor: '#e2e8f0', borderRadius: '2px', marginTop: '4px' }}>
                          <div style={{
                            width: `${Math.min(100, (w.charCountToday / w.maxQuota) * 100)}%`,
                            height: '100%',
                            backgroundColor: w.charCountToday >= 10000 ? 'var(--danger)' : 'var(--primary)'
                          }} />
                        </div>
                      </td>
                      <td style={{ padding: '10px' }}>
                        {w.isBlocked ? (
                          <span style={{ padding: '2px 6px', borderRadius: '4px', backgroundColor: '#fee2e2', color: '#dc2626', fontWeight: '700', fontSize: '11px' }}>
                            Bloqué
                          </span>
                        ) : (
                          <span style={{ padding: '2px 6px', borderRadius: '4px', backgroundColor: '#dcfce7', color: '#16a34a', fontWeight: '600', fontSize: '11px' }}>
                            Actif
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '10px', textAlign: 'center' }}>
                        {w.email !== 'admin@etudiant.fr' && (
                          <button
                            onClick={() => handleDeleteWriter(w.email)}
                            title="Supprimer ce rédacteur"
                            style={{ backgroundColor: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
                          >
                            <Trash2 size={15} />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ONGLET 2 : SUPERVISION EN DIRECT */}
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
