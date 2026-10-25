import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import HomePage from './components/HomePage';
import Editor from './components/Editor';
import WriterSidebar from './components/WriterSidebar';
import WriterDashboardView from './components/WriterDashboardView';
import DownloadView from './components/DownloadView';
import AdminDashboard from './components/AdminDashboard';
import AuthModal from './components/AuthModal';
import { ShareModal, CreateLinkModal, VersionsModal } from './components/Modals';

const DEFAULT_OWNED_DOCS = [
  {
    docId: 'doc-alice-campus',
    title: 'Enquête Campus : Logement & Mobilité Étudiante',
    currentVersion: 1,
    archived: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    docId: 'doc-revue-42',
    title: 'Revue Étudiante n°42 — Innovations & Vie Universitaire',
    currentVersion: 1,
    archived: false,
    createdAt: new Date(Date.now() - 3600000).toISOString(),
    updatedAt: new Date(Date.now() - 3600000).toISOString()
  }
];

const DEFAULT_SHARED_DOCS = [
  {
    docId: 'revue-principale',
    title: 'Revue Annuelle (Édition Collective)',
    ownerEmail: 'admin@etudiant.fr',
    currentVersion: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    docId: 'doc-bob-culture',
    title: 'Chronique Culturelle & Festivals Universitaires',
    ownerEmail: 'bob@etudiant.fr',
    currentVersion: 1,
    createdAt: new Date(Date.now() - 7200000).toISOString(),
    updatedAt: new Date(Date.now() - 7200000).toISOString()
  }
];

const DEFAULT_NOTIFS = [
  {
    id: 'notif-1',
    title: 'Nouvelle Collaboration',
    message: 'L\'Administrateur vous a invité sur "Revue Annuelle".',
    docId: 'revue-principale',
    createdAt: new Date(Date.now() - 3600000).toISOString(),
    read: false
  },
  {
    id: 'notif-2',
    title: 'Nouvelle Collaboration',
    message: 'Bob Dupont vous a invité sur "Chronique Culturelle".',
    docId: 'doc-bob-culture',
    createdAt: new Date(Date.now() - 7200000).toISOString(),
    read: false
  },
  {
    id: 'notif-3',
    title: 'Crédit Quotidien',
    message: 'Crédit de 10 000 caractères prêt pour la rédaction.',
    createdAt: new Date(Date.now() - 10800000).toISOString(),
    read: true
  }
];

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

  // 2. Vue active globale : 'home' | 'editor' | 'admin' | 'download'
  const [currentView, setCurrentView] = useState('home');

  // 3. Navigation dans l'Espace Rédacteur : 'DOCS' | 'SHARED' | 'NOTIFS' | 'EDITOR'
  const [writerTab, setWriterTab] = useState('DOCS');

  // 4. Documents et Données de Rédaction
  const [docId, setDocId] = useState('doc-revue-42');
  const [ownedDocs, setOwnedDocs] = useState(DEFAULT_OWNED_DOCS);
  const [sharedDocs, setSharedDocs] = useState(DEFAULT_SHARED_DOCS);
  const [notifications, setNotifications] = useState(DEFAULT_NOTIFS);
  const [publications, setPublications] = useState([]);
  const [downloadLinkId, setDownloadLinkId] = useState('revue-edition-42');
  const [sidebarRefreshKey, setSidebarRefreshKey] = useState(0);
  const [dailyQuota, setDailyQuota] = useState({ used: 0, limit: 10000, remaining: 10000 });

  // 5. Modales
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showCreateLinkModal, setShowCreateLinkModal] = useState(false);
  const [showVersionsModal, setShowVersionsModal] = useState(false);

  // Synchronisation des documents, notifications et publications avec le backend
  const loadUserDocuments = () => {
    if (!user || !user.email) return;

    fetch(`/api/documents/user/${encodeURIComponent(user.email)}`)
      .then(res => res.json())
      .then(data => {
        if (data.ownedDocs && data.ownedDocs.length > 0) setOwnedDocs(data.ownedDocs);
        if (data.sharedDocs && data.sharedDocs.length > 0) setSharedDocs(data.sharedDocs);
      })
      .catch(() => {});

    fetch(`/api/documents/notifications/${encodeURIComponent(user.email)}`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) setNotifications(data);
      })
      .catch(() => {});

    fetch('/api/links')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) setPublications(data);
      })
      .catch(() => {});
  };

  useEffect(() => {
    loadUserDocuments();
    const interval = setInterval(loadUserDocuments, 5000);
    return () => clearInterval(interval);
  }, [user?.email, sidebarRefreshKey]);

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
      setWriterTab('DOCS');
    }
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('journal_user');
    setCurrentView('home');
  };

  // Actions Métier Rédacteur : Ouvrir, Créer, Archiver, Supprimer
  const handleOpenDoc = (targetDocId) => {
    setDocId(targetDocId);
    setWriterTab('EDITOR');
  };

  const handleCreateDoc = async (title) => {
    try {
      const res = await fetch('/api/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          ownerEmail: user.email
        })
      });

      const data = await res.json();
      const newDocId = data.docId || `doc-${Date.now()}`;
      const newDocObj = {
        docId: newDocId,
        title: title,
        ownerEmail: user.email,
        authorizedWriters: [user.email],
        currentVersion: 1,
        archived: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      setOwnedDocs(prev => [newDocObj, ...prev]);
      setDocId(newDocId);
      setWriterTab('EDITOR');
    } catch {
      const fallbackId = `doc-${Date.now().toString(36)}`;
      const fallbackDoc = {
        docId: fallbackId,
        title: title,
        ownerEmail: user.email,
        authorizedWriters: [user.email],
        currentVersion: 1,
        archived: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      setOwnedDocs(prev => [fallbackDoc, ...prev]);
      setDocId(fallbackId);
      setWriterTab('EDITOR');
    }
  };

  const handleArchiveDoc = async (targetDocId, archived) => {
    // Mise à jour optimiste locale immédiate
    setOwnedDocs(prev => prev.map(d => d.docId === targetDocId ? { ...d, archived } : d));

    try {
      await fetch(`/api/documents/${targetDocId}/archive`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ archived, userEmail: user.email })
      });
    } catch {}
  };

  const handleDeleteDoc = async (targetDocId, title) => {
    const confirmed = window.confirm(`Êtes-vous sûr de vouloir supprimer définitivement "${title || targetDocId}" ? Cette action est irréversible.`);
    if (!confirmed) return;

    setOwnedDocs(prev => prev.filter(d => d.docId !== targetDocId));
    if (docId === targetDocId) {
      setWriterTab('DOCS');
    }

    try {
      await fetch(`/api/documents/${targetDocId}?userEmail=${encodeURIComponent(user.email)}`, {
        method: 'DELETE'
      });
    } catch {}
  };

  const handleMarkNotifsRead = async () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    try {
      await fetch(`/api/documents/notifications/${encodeURIComponent(user.email)}/read`, { method: 'POST' });
    } catch {}
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#f8fafc' }}>
      {/* HEADER GLOBAL AVEC BOUTON D'AUTHENTIFICATION */}
      <Navbar
        user={user}
        currentView={currentView}
        onViewChange={(view) => {
          if (view === 'editor') setWriterTab('DOCS');
          handleViewChange(view);
        }}
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
            onGoEditor={() => {
              setWriterTab('DOCS');
              handleViewChange('editor');
            }}
            onGoAdmin={() => handleViewChange('admin')}
          />
        )}

        {/* 2. Espace Téléchargement Public Visiteur (Accessible par clic sur une parution) */}
        {currentView === 'download' && (
          <div style={{ flex: 1 }}>
            <DownloadView linkId={downloadLinkId || 'revue-edition-42'} />
          </div>
        )}

        {/* 3. Espace Rédacteur avec Sidebar Persistante allant jusqu'en bas de page */}
        {currentView === 'editor' && user && (
          <div style={{ flex: 1, display: 'flex', height: 'calc(100vh - 64px)', minHeight: 'calc(100vh - 64px)', overflow: 'hidden' }}>
            {/* Sidebar persistante à gauche */}
            <WriterSidebar
              user={user}
              activeTab={writerTab}
              activeDocId={docId}
              activeDocTitle={ownedDocs.find(d => d.docId === docId)?.title || sharedDocs.find(d => d.docId === docId)?.title || docId}
              ownedDocsCount={ownedDocs.length}
              sharedDocsCount={sharedDocs.length}
              unreadNotifsCount={notifications.filter(n => !n.read).length}
              linksCount={publications.length}
              onSelectTab={(tab) => setWriterTab(tab)}
              quota={dailyQuota}
            />

            {/* Zone Principale à droite : Éditeur ou Dashboard selon le toggle actif */}
            {writerTab === 'EDITOR' ? (
              <div style={{ flex: 1, height: '100%', overflow: 'hidden' }}>
                <Editor
                  user={user}
                  docId={docId}
                  onOpenShare={() => setShowShareModal(true)}
                  onOpenCreateLink={() => setShowCreateLinkModal(true)}
                  onOpenVersions={() => setShowVersionsModal(true)}
                  onQuotaUpdate={setDailyQuota}
                  onBackToDocs={() => setWriterTab('DOCS')}
                />
              </div>
            ) : (
              <WriterDashboardView
                activeTab={writerTab}
                user={user}
                ownedDocs={ownedDocs}
                sharedDocs={sharedDocs}
                notifications={notifications}
                links={publications}
                onOpenDoc={handleOpenDoc}
                onCreateDoc={handleCreateDoc}
                onArchiveDoc={handleArchiveDoc}
                onDeleteDoc={handleDeleteDoc}
                onOpenCreateLink={(targetDocId) => {
                  if (targetDocId) setDocId(targetDocId);
                  setShowCreateLinkModal(true);
                }}
                onOpenVersions={(targetDocId) => {
                  if (targetDocId) setDocId(targetDocId);
                  setShowVersionsModal(true);
                }}
                onMarkNotifsRead={handleMarkNotifsRead}
              />
            )}
          </div>
        )}

        {/* 4. Console d'Administration (PROTÉGÉE : Rôle ADMIN uniquement) */}
        {currentView === 'admin' && user && user.role === 'ADMIN' && (
          <div style={{ flex: 1 }}>
            <AdminDashboard
              onBackToHome={() => setCurrentView('home')}
              onGoEditor={() => {
                setWriterTab('DOCS');
                setCurrentView('editor');
              }}
            />
          </div>
        )}
      </main>

      {/* FOOTER GLOBAL (Affiché uniquement sur Accueil et Téléchargement) */}
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
