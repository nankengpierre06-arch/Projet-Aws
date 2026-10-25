import React, { useState } from 'react';
import { X, LogIn, Shield, User, AlertCircle, Info } from 'lucide-react';

export default function AuthModal({ onClose, onLoginSuccess }) {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    setErrorMsg('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), name: name.trim() })
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.message || 'Erreur d\'authentification');
        setLoading(false);
        return;
      }

      onLoginSuccess(data.user);
    } catch {
      // Secours autonome si le serveur backend (port 8000) n'a pas encore été démarré dans le terminal
      const cleanEmail = email.trim().toLowerCase();
      if (cleanEmail === 'admin@etudiant.fr' || cleanEmail === 'admin') {
        onLoginSuccess({
          email: 'admin@etudiant.fr',
          name: name.trim() || 'Administrateur Association',
          role: 'ADMIN'
        });
        return;
      }
      if (cleanEmail === 'alice@etudiant.fr') {
        onLoginSuccess({
          email: 'alice@etudiant.fr',
          name: name.trim() || 'Alice Martin',
          role: 'WRITER'
        });
        return;
      }
      if (cleanEmail === 'bob@etudiant.fr') {
        onLoginSuccess({
          email: 'bob@etudiant.fr',
          name: name.trim() || 'Bob Dupont',
          role: 'WRITER'
        });
        return;
      }

      setErrorMsg('Impossible de joindre le serveur API (port 8000). Veuillez démarrer le backend avec "npm run dev" dans le dossier backend.');
      setLoading(false);
    }
  };

  const setQuickUser = (quickEmail, quickName) => {
    setEmail(quickEmail);
    setName(quickName);
    setErrorMsg('');
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(15, 23, 42, 0.6)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '20px'
    }}>
      <div style={{
        maxWidth: '440px',
        width: '100%',
        backgroundColor: '#ffffff',
        borderRadius: '12px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{
          padding: '18px 24px',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: '#f8fafc'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <LogIn size={20} color="var(--primary)" />
            <h3 style={{ fontSize: '16px', fontWeight: 'bold', color: '#0f172a' }}>
              Authentification
            </h3>
          </div>
          <button
            onClick={onClose}
            style={{ backgroundColor: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Formulaire */}
        <form onSubmit={handleSubmit} style={{ padding: '24px' }}>
          {errorMsg && (
            <div style={{
              padding: '12px',
              backgroundColor: 'var(--danger-bg)',
              color: 'var(--danger)',
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: '500',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '8px',
              lineHeight: '1.4'
            }}>
              <AlertCircle size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>{errorMsg}</div>
            </div>
          )}

          <div style={{ marginBottom: '14px' }}>
            <label style={{ fontSize: '12px', fontWeight: '600', display: 'block', marginBottom: '4px', color: '#334155' }}>
              Adresse E-mail Universitaire :
            </label>
            <input
              type="email"
              placeholder="ex: alice@etudiant.fr"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{ width: '100%', fontSize: '13px' }}
              required
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ fontSize: '12px', fontWeight: '600', display: 'block', marginBottom: '4px', color: '#334155' }}>
              Votre Nom & Prénom :
            </label>
            <input
              type="text"
              placeholder="ex: Alice Martin"
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={{ width: '100%', fontSize: '13px' }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '12px',
              backgroundColor: 'var(--primary)',
              color: '#ffffff',
              border: 'none',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            {loading ? 'Connexion en cours...' : 'Se connecter'}
          </button>

          {/* Raccourcis pour tester rapidement */}
          <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid var(--border)' }}>
            <span style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Comptes de test pré-configurés :
            </span>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '8px' }}>
              <button
                type="button"
                onClick={() => setQuickUser('admin@etudiant.fr', 'Administrateur Association')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 12px',
                  backgroundColor: '#fef3c7',
                  border: '1px solid #fde68a',
                  borderRadius: '6px',
                  color: '#92400e',
                  fontSize: '11px',
                  textAlign: 'left'
                }}
              >
                <span><b>Administrateur</b> (crée les rédacteurs) : <code>admin@etudiant.fr</code></span>
                <Shield size={14} />
              </button>

              <button
                type="button"
                onClick={() => setQuickUser('alice@etudiant.fr', 'Alice Martin')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 12px',
                  backgroundColor: '#f3e8ff',
                  border: '1px solid #e9d5ff',
                  borderRadius: '6px',
                  color: '#6b21a8',
                  fontSize: '11px',
                  textAlign: 'left'
                }}
              >
                <span><b>Rédactrice</b> (autorisée) : <code>alice@etudiant.fr</code></span>
                <User size={14} />
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

