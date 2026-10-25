import React, { useState, useEffect } from 'react';
import Editor from './components/Editor';
import DownloadView from './components/DownloadView';
import AdminDashboard from './components/AdminDashboard';
import { ShareModal, CreateLinkModal, VersionsModal } from './components/Modals';
import { Shield, User, FileText, PlusCircle, LogOut } from 'lucide-react';

export default function App() {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('journal_user');
    return saved ? JSON.parse(saved) : null;
  });

  const [docId, setDocId] = useState('revue-principale');
  const [downloadLinkId, setDownloadLinkId] = useState(null);

  // Modals state
  const [showShareModal, setShowShareModal] = useState(false);
  const [showCreateLinkModal, setShowCreateLinkModal] = useState(false);
  const [showVersionsModal, setShowVersionsModal] = useState(false);
  const [showAdminDashboard, setShowAdminDashboard] = useState(false);

  // Formulaire d'identification
  const [nameInput, setNameInput] = useState('');
  const [emailInput, setEmailInput] = useState('');

  // Détection d'accès visiteur via URL hash ou path : /download/:linkId ou #/download/:linkId
  useEffect(() => {
    const checkRoute = () => {
      const hash = window.location.hash;
      const path = window.location.pathname;

      if (hash.startsWith('#/download/')) {
        const link = hash.replace('#/download/', '').split('?')[0];
        setDownloadLinkId(link);
      } else if (path.startsWith('/download/')) {
        const link = path.replace('/download/', '').split('?')[0];
        setDownloadLinkId(link);
      } else {
        setDownloadLinkId(null);
      }
    };

    checkRoute();
    window.addEventListener('hashchange', checkRoute);
    return () => window.removeEventListener('hashchange', checkRoute);
  }, []);

  const handleLogin = (e) => {
    e.preventDefault();
    if (!nameInput || !emailInput) return;
    const userData = { name: nameInput, email: emailInput };
    setUser(userData);
    localStorage.setItem('journal_user', JSON.stringify(userData));
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('journal_user');
  };

  // 1. Vue Visiteur Anonyme de Téléchargement
  if (downloadLinkId) {
    return <DownloadView linkId={downloadLinkId} />;
  }

  // 2. Vue Identification Déclarative (Sujet §1)
  if (!user) {
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
          maxWidth: '420px',
          width: '100%',
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)',
          padding: '32px'
        }}>
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <div style={{
              width: '54px',
              height: '54px',
              borderRadius: '50%',
              backgroundColor: 'var(--primary-light)',
              color: 'var(--primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 12px'
            }}>
              <FileText size={28} />
            </div>
            <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: '#0f172a' }}>Espace Rédacteurs</h2>
            <p style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>
              Plateforme collaborative de la revue numérique
            </p>
          </div>

          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: '14px' }}>
              <label style={{ fontSize: '12px', fontWeight: '600', display: 'block', marginBottom: '4px' }}>
                Votre Nom et Prénom :
              </label>
              <input
                type="text"
                placeholder="Ex: Alice Dupont"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                style={{ width: '100%' }}
                required
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ fontSize: '12px', fontWeight: '600', display: 'block', marginBottom: '4px' }}>
                Votre Adresse E-mail :
              </label>
              <input
                type="email"
                placeholder="Ex: alice@etudiant.fr"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                style={{ width: '100%' }}
                required
              />
              <p style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>
                Sert à calculer votre quota journalier de 10 000 caractères (Contrainte C4).
              </p>
            </div>

            <button
              type="submit"
              style={{
                width: '100%',
                padding: '12px',
                backgroundColor: 'var(--primary)',
                color: '#ffffff',
                border: 'none',
                fontWeight: '600',
                fontSize: '14px'
              }}
            >
              Rejoindre la rédaction
            </button>
          </form>
        </div>
      </div>
    );
  }

  // 3. Espace Principal Rédacteur
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      {/* Barre de navigation globale */}
      <header style={{
        height: '52px',
        backgroundColor: '#ffffff',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 20px'
      }}>
        {/* Logo et Sélecteur de document */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold', fontSize: '15px', color: 'var(--primary)' }}>
            <FileText size={20} />
            <span>Revue Numérique</span>
          </div>

          <div style={{ height: '20px', width: '1px', backgroundColor: '#e2e8f0' }} />

          <select
            value={docId}
            onChange={(e) => setDocId(e.target.value)}
            style={{ fontSize: '12px', padding: '4px 8px', backgroundColor: '#f8fafc', border: '1px solid #cbd5e1' }}
          >
            <option value="revue-principale">Édition Principale (Revue 2026)</option>
            <option value="dossier-special">Dossier Spécial Campus</option>
            <option value="interview-doyen">Interview et Tribune Libre</option>
          </select>
        </div>

        {/* Profil et Accès Administration */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={() => setShowAdminDashboard(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 10px',
              backgroundColor: '#eff6ff',
              border: '1px solid #bfdbfe',
              color: '#1e40af',
              fontSize: '12px',
              fontWeight: '600'
            }}
          >
            <Shield size={14} /> Supervision Association
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#334155' }}>
            <User size={14} color="#64748b" />
            <span>{user.name}</span>
          </div>

          <button
            onClick={handleLogout}
            title="Se déconnecter"
            style={{
              padding: '6px',
              backgroundColor: 'transparent',
              border: 'none',
              color: '#94a3b8'
            }}
          >
            <LogOut size={16} />
          </button>
        </div>
      </header>

      {/* Surface principale : Éditeur Collaboratif */}
      <main style={{ flex: 1, overflow: 'hidden' }}>
        <Editor
          user={user}
          docId={docId}
          onOpenShare={() => setShowShareModal(true)}
          onOpenCreateLink={() => setShowCreateLinkModal(true)}
          onOpenVersions={() => setShowVersionsModal(true)}
        />
      </main>

      {/* Modales */}
      {showShareModal && (
        <ShareModal docId={docId} onClose={() => setShowShareModal(false)} />
      )}

      {showCreateLinkModal && (
        <CreateLinkModal
          docId={docId}
          userEmail={user.email}
          onClose={() => setShowCreateLinkModal(false)}
        />
      )}

      {showVersionsModal && (
        <VersionsModal
          docId={docId}
          userEmail={user.email}
          onClose={() => setShowVersionsModal(false)}
        />
      )}

      {showAdminDashboard && (
        <AdminDashboard onClose={() => setShowAdminDashboard(false)} />
      )}
    </div>
  );
}
