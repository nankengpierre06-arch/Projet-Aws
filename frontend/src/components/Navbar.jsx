import React from 'react';
import { FileText, LogIn, LogOut, Shield, Edit3, Home, Download } from 'lucide-react';

export default function Navbar({ user, currentView, onViewChange, onOpenAuth, onLogout }) {
  return (
    <header style={{
      height: '64px',
      backgroundColor: '#ffffff',
      borderBottom: '1px solid var(--border)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 24px',
      position: 'sticky',
      top: 0,
      zIndex: 100,
      boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)'
    }}>
      {/* Logo & Marque */}
      <div 
        onClick={() => onViewChange('home')}
        style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}
      >
        <div style={{
          width: '36px',
          height: '36px',
          borderRadius: '8px',
          backgroundColor: 'var(--primary)',
          color: '#ffffff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <FileText size={20} />
        </div>
        <div>
          <span style={{ fontWeight: '700', fontSize: '16px', color: '#0f172a', letterSpacing: '-0.3px' }}>
            Revue Numérique
          </span>
          <span style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', lineHeight: '1' }}>
            Association Étudiante
          </span>
        </div>
      </div>

      {/* Navigation Centrale */}
      <nav style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <button
          onClick={() => onViewChange('home')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 14px',
            backgroundColor: currentView === 'home' ? 'var(--primary-light)' : 'transparent',
            color: currentView === 'home' ? 'var(--primary)' : 'var(--text)',
            border: 'none',
            fontSize: '13px',
            fontWeight: currentView === 'home' ? '600' : '500'
          }}
        >
          <Home size={15} /> Accueil
        </button>

        <button
          onClick={() => onViewChange('download')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 14px',
            backgroundColor: currentView === 'download' ? 'var(--primary-light)' : 'transparent',
            color: currentView === 'download' ? 'var(--primary)' : 'var(--text)',
            border: 'none',
            fontSize: '13px',
            fontWeight: currentView === 'download' ? '600' : '500'
          }}
        >
          <Download size={15} /> Téléchargement Public (500 ex.)
        </button>

        {user && (
          <button
            onClick={() => onViewChange('editor')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              backgroundColor: currentView === 'editor' ? 'var(--primary-light)' : 'transparent',
              color: currentView === 'editor' ? 'var(--primary)' : 'var(--text)',
              border: 'none',
              fontSize: '13px',
              fontWeight: currentView === 'editor' ? '600' : '500'
            }}
          >
            <Edit3 size={15} /> Espace Rédaction
          </button>
        )}

        {user && user.role === 'ADMIN' && (
          <button
            onClick={() => onViewChange('admin')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              backgroundColor: currentView === 'admin' ? '#eff6ff' : 'transparent',
              color: currentView === 'admin' ? '#1d4ed8' : '#1e40af',
              border: '1px solid #bfdbfe',
              fontSize: '13px',
              fontWeight: '600'
            }}
          >
            <Shield size={15} /> Console Administration
          </button>
        )}
      </nav>

      {/* Profil / Authentification */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {!user ? (
          <button
            onClick={onOpenAuth}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 18px',
              backgroundColor: 'var(--primary)',
              color: '#ffffff',
              border: 'none',
              fontSize: '13px',
              fontWeight: '600',
              boxShadow: '0 2px 4px rgba(102, 51, 153, 0.2)'
            }}
          >
            <LogIn size={16} /> S'authentifier
          </button>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ textAlign: 'right' }}>
              <span style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#0f172a' }}>
                {user.name}
              </span>
              <span style={{
                display: 'inline-block',
                fontSize: '10px',
                fontWeight: '700',
                padding: '1px 6px',
                borderRadius: '4px',
                backgroundColor: user.role === 'ADMIN' ? '#fef3c7' : 'var(--primary-light)',
                color: user.role === 'ADMIN' ? '#b45309' : 'var(--primary)'
              }}>
                {user.role === 'ADMIN' ? 'ADMINISTRATEUR' : 'RÉDACTEUR'}
              </span>
            </div>

            <button
              onClick={onLogout}
              title="Se déconnecter"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '8px 12px',
                backgroundColor: '#f1f5f9',
                border: '1px solid #cbd5e1',
                color: '#475569',
                fontSize: '12px'
              }}
            >
              <LogOut size={14} /> Déconnexion
            </button>
          </div>
        )}
      </div>
    </header>
  );
}

