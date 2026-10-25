import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import HomePage from './components/HomePage';
import Editor from './components/Editor';
import WriterSidebar from './components/WriterSidebar';
import DownloadView from './components/DownloadView';
import AdminDashboard from './components/AdminDashboard';
import AuthModal from './components/AuthModal';
import { ShareModal, CreateLinkModal, VersionsModal } from './components/Modals';

export default function App() {
  // 1. Session Utilisateur (stockée dans localStorage)
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('journal_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // 2. Vue active : 'home' | 'editor' | 'admin' | 'download'
  const [currentView, setCurrentView] = useState('home');

  // 3. Document et Liens
  const [docId, setDocId] = useState('revue-principale');
  const [downloadLinkId, setDownloadLinkId] = useState('revue-edition-42');
  const [sidebarRefreshKey, setSidebarRefreshKey] = useState(0);

  // 4. Modales
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showCreateLinkModal, setShowCreateLinkModal] = useState(false);
  const [showVersionsModal, setShowVersionsModal] = useState(false);

  // Détection d'accès direct par lien visiteur : #/download/:linkId ou /download/:linkId
  useEffect(() => {
    const handleUrl = () => {
      const hash = window.location.hash;
      const path = window.location.pathname;

      if (hash.startsWith('#/download/')) {
        const link = hash.replace('#/download/', '').split('?')[0];
        setDownloadLinkId(link);
        setCurrentView('download');
      } else if (path.startsWith('/download/')) {
        const link = path.replace('/download/', '').split('?')[0];
        setDownloadLinkId(link);
        setCurrentView('download');
      }
    };

    handleUrl();
    window.addEventListener('hashchange', handleUrl);
    return () => window.removeEventListener('hashchange', handleUrl);
  }, []);

  // Gestion du changement de vue avec PROTECTION DES ROUTES
  const handleViewChange = (view) => {
    if (view === 'editor') {
      if (!user) {
        setShowAuthModal(true);
        return;
      }
    } else if (view === 'admin') {
      if (!user) {
        setShowAuthModal(true);
        return;
      }
      if (user.role !== 'ADMIN') {
        alert("Accès refusé : la console d'administration est strictement réservée à l'administrateur de l'association.");
        return;
      }
    }

    setCurrentView(view);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleLoginSuccess = (userData) => {
    setUser(userData);
    localStorage.setItem('journal_user', JSON.stringify(userData));
    setShowAuthModal(false);

    // Redirection automatique selon les droits
    if (userData.role === 'ADMIN') {
      setCurrentView('admin');
    } else {
      setCurrentView('editor');
    }
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('journal_user');
    setCurrentView('home');
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#f8fafc' }}>
      {/* HEADER GLOBAL AVEC BOUTON D'AUTHENTIFICATION */}
      <Navbar
        user={user}
        currentView={currentView}
        onViewChange={handleViewChange}
        onOpenAuth={() => setShowAuthModal(true)}
        onLogout={handleLogout}
      />

      {/* CONTENU PRINCIPAL SELON LA VUE */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* 1. Page d'accueil publique (Visible par tous dès le lancement) */}
        {currentView === 'home' && (
          <HomePage
            user={user}
            onGoDownload={(targetLinkId) => {
              if (targetLinkId) {
                setDownloadLinkId(targetLinkId);
              }
              setCurrentView('download');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onOpenAuth={() => setShowAuthModal(true)}
            onGoEditor={() => handleViewChange('editor')}
            onGoAdmin={() => handleViewChange('admin')}
          />
        )}

        {/* 2. Espace Téléchargement Public Visiteur (Accessible par clic sur une parution) */}
        {currentView === 'download' && (
          <div style={{ flex: 1 }}>
            <DownloadView linkId={downloadLinkId || 'revue-edition-42'} />
          </div>
        )}

        {/* 3. Espace Rédacteur (PROTÉGÉ : Rôle WRITER ou ADMIN) avec Sidebar */}
        {currentView === 'editor' && user && (
          <div style={{ flex: 1, display: 'flex', height: 'calc(100vh - 64px)', overflow: 'hidden' }}>
            <WriterSidebar
              user={user}
              activeDocId={docId}
              onSelectDoc={(newDocId) => setDocId(newDocId)}
              onOpenCreateLink={(targetDocId) => {
                if (targetDocId) setDocId(targetDocId);
                setShowCreateLinkModal(true);
              }}
              refreshTrigger={sidebarRefreshKey}
            />
            <div style={{ flex: 1, height: '100%', overflow: 'hidden' }}>
              <Editor
                user={user}
                docId={docId}
                onOpenShare={() => setShowShareModal(true)}
                onOpenCreateLink={() => setShowCreateLinkModal(true)}
                onOpenVersions={() => setShowVersionsModal(true)}
              />
            </div>
          </div>
        )}

        {/* 4. Console d'Administration (PROTÉGÉE : Rôle ADMIN uniquement) */}
        {currentView === 'admin' && user && user.role === 'ADMIN' && (
          <div style={{ flex: 1 }}>
            <AdminDashboard
              onBackToHome={() => setCurrentView('home')}
              onGoEditor={() => setCurrentView('editor')}
            />
          </div>
        )}
      </main>

      {/* FOOTER GLOBAL (Affiché sur Accueil et Téléchargement) */}
      {(currentView === 'home' || currentView === 'download') && <Footer />}

      {/* MODALE D'AUTHENTIFICATION */}
      {showAuthModal && (
        <AuthModal
          onClose={() => setShowAuthModal(false)}
          onLoginSuccess={handleLoginSuccess}
        />
      )}

      {/* MODALES MÉTIER DE L'ÉDITEUR */}
      {showShareModal && (
        <ShareModal
          docId={docId}
          userEmail={user?.email}
          onClose={() => setShowShareModal(false)}
          onCollaboratorAdded={() => setSidebarRefreshKey(k => k + 1)}
        />
      )}

      {showCreateLinkModal && (
        <CreateLinkModal
          docId={docId}
          userEmail={user?.email}
          onClose={() => setShowCreateLinkModal(false)}
          onLinkCreated={(link) => {
            setDownloadLinkId(link.linkId);
            setSidebarRefreshKey(k => k + 1);
          }}
        />
      )}

      {showVersionsModal && (
        <VersionsModal
          docId={docId}
          userEmail={user?.email}
          onClose={() => setShowVersionsModal(false)}
        />
      )}
    </div>
  );
}
