import React, { useState, useEffect } from 'react';
import { X, Share2, Download, History, RotateCcw, Check, Copy, Calendar, Clock, Lock } from 'lucide-react';

export function ShareModal({ docId, userEmail, onClose, onCollaboratorAdded }) {
  const [email, setEmail] = useState('');
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const handleShare = async (e) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/documents/${docId}/shares`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase(), inviterEmail: userEmail })
      });
      const data = await res.json();
      if (!res.ok) {
        setMsg(data.message || 'Erreur lors de l\'invitation.');
      } else {
        setMsg(`✓ Invitation transmise à ${email} ! Il pourra approuver ou rejeter la collaboration.`);
        setEmail('');
        if (onCollaboratorAdded) onCollaboratorAdded(email);
      }
    } catch {
      setMsg('Erreur lors du partage.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop" style={backdropStyle}>
      <div style={modalBoxStyle}>
        <div style={headerStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Share2 size={18} color="var(--primary)" />
            <h3 style={{ fontSize: '15px', fontWeight: 'bold' }}>Inviter un Rédacteur</h3>
          </div>
          <button onClick={onClose} style={closeBtnStyle}><X size={18} /></button>
        </div>
        <form onSubmit={handleShare} style={{ padding: '20px' }}>
          <p style={{ fontSize: '12px', color: '#64748b', marginBottom: '12px' }}>
            Indiquez l'adresse e-mail déclarative du rédacteur à inviter. Une demande d'approbation lui sera adressée dans son espace personnel.
          </p>
          <input
            type="email"
            placeholder="etudiant@univ.fr"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{ width: '100%', marginBottom: '12px' }}
            required
          />
          {msg && <p style={{ fontSize: '12px', color: 'var(--success)', marginBottom: '10px' }}>{msg}</p>}
          <button
            type="submit"
            disabled={loading}
            style={{ width: '100%', padding: '10px', backgroundColor: 'var(--primary)', color: '#fff', border: 'none' }}
          >
            {loading ? 'Envoi...' : 'Envoyer l\'invitation'}
          </button>
        </form>
      </div>
    </div>
  );
}

export function CreateLinkModal({ docId, user, userEmail, onClose, onLinkCreated }) {
  const isAdmin = user?.role === 'ADMIN' || userEmail === 'admin@etudiant.fr';
  const [title, setTitle] = useState(`Revue Étudiante — Document ${docId}`);
  const [description, setDescription] = useState('Édition numérique officielle préparée par la rédaction étudiante.');
  const [isImmediate, setIsImmediate] = useState(true);
  const [scheduledDateTime, setScheduledDateTime] = useState('');
  const [maxPlaces, setMaxPlaces] = useState(500);
  const [createdLink, setCreatedLink] = useState(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCreate = async (e) => {
    e.preventDefault();
    setLoading(true);

    // Seul l'administrateur peut fixer la date et l'heure d'ouverture annoncée
    const scheduledAt = isAdmin
      ? (isImmediate || !scheduledDateTime ? new Date().toISOString() : new Date(scheduledDateTime).toISOString())
      : null;

    try {
      const res = await fetch('/api/links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          docId,
          title,
          description,
          scheduledAt,
          maxPlaces: parseInt(maxPlaces, 10),
          creatorEmail: userEmail || user?.email
        })
      });
      const data = await res.json();
      setCreatedLink(data);
      if (onLinkCreated) onLinkCreated(data);
    } catch {
      alert('Erreur lors de la création du lien de parution');
    } finally {
      setLoading(false);
    }
  };

  const copyUrl = () => {
    const fullUrl = `${window.location.origin}/#/download/${createdLink.linkId}`;
    navigator.clipboard.writeText(fullUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  return (
    <div className="modal-backdrop" style={backdropStyle}>
      <div style={modalBoxStyle}>
        <div style={headerStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Download size={18} color="var(--primary)" />
            <h3 style={{ fontSize: '15px', fontWeight: 'bold' }}>
              {isAdmin ? 'Publier et Programmer une Parution (Admin)' : 'Créer un Lien de Parution'}
            </h3>
          </div>
          <button onClick={onClose} style={closeBtnStyle}><X size={18} /></button>
        </div>
        <div style={{ padding: '20px' }}>
          {!createdLink ? (
            <form onSubmit={handleCreate}>
              <p style={{ fontSize: '12px', color: '#64748b', marginBottom: '14px' }}>
                {isAdmin
                  ? "Définissez les détails et fixez la date et l'heure officielles d'ouverture du tirage."
                  : "Préparez le lien officiel de parution pour ce document. La date et l'heure d'annonce officielle seront fixées exclusivement par l'administrateur."}
              </p>

              <label style={{ fontSize: '12px', fontWeight: '600', display: 'block', marginBottom: '4px' }}>
                Titre de la parution :
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                style={{ width: '100%', marginBottom: '12px' }}
                required
              />

              <label style={{ fontSize: '12px', fontWeight: '600', display: 'block', marginBottom: '4px' }}>
                Sommaire / Description :
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                style={{ width: '100%', marginBottom: '12px', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                required
              />

              {/* DATE ET HEURE D'ANNONCE : VISIBLE ET MODIFIABLE UNIQUEMENT PAR L'ADMIN */}
              {isAdmin ? (
                <div style={{ marginBottom: '14px', padding: '12px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <label style={{ fontSize: '12px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px', color: '#1e293b' }}>
                    <Calendar size={14} color="#4338ca" />
                    Date et heure d'ouverture annoncée :
                  </label>

                  <div style={{ display: 'flex', gap: '14px', alignItems: 'center', marginBottom: '8px' }}>
                    <label style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}>
                      <input
                        type="radio"
                        name="scheduleType"
                        checked={isImmediate}
                        onChange={() => setIsImmediate(true)}
                      />
                      Immédiate (Tirage ouvert dès maintenant)
                    </label>

                    <label style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}>
                      <input
                        type="radio"
                        name="scheduleType"
                        checked={!isImmediate}
                        onChange={() => setIsImmediate(false)}
                      />
                      Programmée (Date et heure précises)
                    </label>
                  </div>

                  {!isImmediate && (
                    <input
                      type="datetime-local"
                      value={scheduledDateTime}
                      onChange={(e) => setScheduledDateTime(e.target.value)}
                      style={{ width: '100%', padding: '6px 8px', fontSize: '13px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                      required={!isImmediate}
                    />
                  )}
                </div>
              ) : (
                <div style={{
                  marginBottom: '14px',
                  padding: '12px 14px',
                  backgroundColor: '#f8fafc',
                  borderRadius: '8px',
                  border: '1px solid #e2e8f0',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '10px'
                }}>
                  <Lock size={16} color="#7c3aed" style={{ marginTop: '2px', flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: '12px', fontWeight: '700', color: '#1e293b', marginBottom: '2px' }}>
                      Programmation réservée à l'Administration
                    </div>
                    <div style={{ fontSize: '11.5px', color: '#64748b', lineHeight: '1.4' }}>
                      En tant que rédacteur, vous générez le lien de parution. La date et l'heure d'annonce officielle du tirage seront fixées exclusivement par l'administrateur.
                    </div>
                  </div>
                </div>
              )}

              <label style={{ fontSize: '12px', fontWeight: '600', display: 'block', marginBottom: '4px' }}>
                Quota d'exemplaires certifiés (Tirage limité) :
              </label>
              <input
                type="number"
                min="1"
                max="5000"
                value={maxPlaces}
                onChange={(e) => setMaxPlaces(e.target.value)}
                style={{ width: '100%', marginBottom: '16px' }}
                required
              />

              <button
                type="submit"
                disabled={loading}
                style={{ width: '100%', padding: '11px', backgroundColor: '#7c3aed', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: '700', cursor: 'pointer' }}
              >
                {loading 
                  ? 'Enregistrement en cours...' 
                  : (isAdmin ? `Publier et Programmer la Parution (${maxPlaces} places)` : `Créer le Lien de Parution (${maxPlaces} places)`)}
              </button>
            </form>
          ) : (
            <div>
              <div style={{ padding: '12px', backgroundColor: 'var(--success-bg)', color: 'var(--success)', borderRadius: '6px', fontSize: '13px', fontWeight: 'bold', marginBottom: '12px' }}>
                ✓ {isAdmin ? 'Parution enregistrée et programmée avec succès !' : 'Lien de parution créé avec succès !'} Quota : {createdLink.maxPlaces} exemplaires.
              </div>
              <p style={{ fontSize: '12px', color: '#64748b', marginBottom: '8px', lineHeight: '1.4' }}>
                {isAdmin
                  ? "La parution est désormais accessible avec sa date d'annonce officielle."
                  : "Le lien a été transmis à l'administrateur. La date et l'heure d'ouverture annoncée seront fixées dans la console d'administration."}
              </p>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                <input
                  type="text"
                  readOnly
                  value={`${window.location.origin}/#/download/${createdLink.linkId}`}
                  style={{ flex: 1, fontSize: '12px', backgroundColor: '#f8fafc' }}
                />
                <button
                  onClick={copyUrl}
                  style={{ padding: '8px 12px', backgroundColor: '#e2e8f0', border: 'none', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', cursor: 'pointer' }}
                >
                  {copied ? <Check size={14} color="green" /> : <Copy size={14} />} {copied ? 'Copié' : 'Copier'}
                </button>
              </div>
              <button
                onClick={onClose}
                style={{ width: '100%', padding: '10px', backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '6px', cursor: 'pointer' }}
              >
                Fermer
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function VersionsModal({ docId, userEmail, onClose }) {
  const [versions, setVersions] = useState([]);
  const [label, setLabel] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');

  const fetchVersions = async () => {
    try {
      const res = await fetch(`/api/documents/${docId}/versions`);
      const data = await res.json();
      setVersions(data.versions || []);
    } catch {}
  };

  useEffect(() => {
    fetchVersions();
  }, [docId]);

  const handleSnapshot = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await fetch(`/api/documents/${docId}/versions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label, authorEmail: userEmail })
      });
      setLabel('');
      setStatus('Instantané figé créé avec succès !');
      fetchVersions();
      setTimeout(() => setStatus(''), 4000);
    } catch {
      setStatus('Erreur création snapshot');
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async (versionSeq) => {
    if (!window.confirm(`Confirmer la restauration de la version #${versionSeq} ? Le texte actuel sera remplacé.`)) return;
    try {
      await fetch(`/api/documents/${docId}/restore/${versionSeq}`, { method: 'POST' });
      setStatus(`Version #${versionSeq} restaurée en direct !`);
      setTimeout(() => {
        setStatus('');
        onClose();
      }, 1500);
    } catch {
      alert('Erreur lors de la restauration');
    }
  };

  return (
    <div className="modal-backdrop" style={backdropStyle}>
      <div style={{ ...modalBoxStyle, maxWidth: '580px' }}>
        <div style={headerStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <History size={18} color="var(--primary)" />
            <h3 style={{ fontSize: '15px', fontWeight: 'bold' }}>Versions & Instantanés T1 (Contrainte C3)</h3>
          </div>
          <button onClick={onClose} style={closeBtnStyle}><X size={18} /></button>
        </div>
        <div style={{ padding: '20px' }}>
          {/* Créer un nouvel instantané */}
          <form onSubmit={handleSnapshot} style={{ marginBottom: '20px', paddingBottom: '16px', borderBottom: '1px solid var(--border)' }}>
            <label style={{ fontSize: '12px', fontWeight: '600', display: 'block', marginBottom: '6px' }}>
              Créer un nouvel instantané figé (T1) :
            </label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                placeholder="Ex: Version finale avant parution"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                style={{ flex: 1, fontSize: '12px' }}
                required
              />
              <button
                type="submit"
                disabled={loading}
                style={{ padding: '8px 14px', backgroundColor: 'var(--primary)', color: '#fff', border: 'none', fontSize: '12px', whiteSpace: 'nowrap' }}
              >
                Figer la version
              </button>
            </div>
            {status && <p style={{ fontSize: '12px', color: 'var(--success)', marginTop: '8px' }}>{status}</p>}
          </form>

          {/* Liste des versions */}
          <h4 style={{ fontSize: '13px', fontWeight: 'bold', marginBottom: '10px' }}>Historique des versions enregistrées :</h4>
          {versions.length === 0 ? (
            <p style={{ fontSize: '12px', color: '#64748b' }}>Aucune version figée enregistrée pour ce document.</p>
          ) : (
            <div style={{ maxHeight: '220px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {versions.map((v) => (
                <div
                  key={v.versionSeq}
                  style={{
                    padding: '10px 12px',
                    backgroundColor: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '6px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <div>
                    <span style={{ fontWeight: 'bold', fontSize: '13px', color: '#0f172a' }}>
                      Version #{v.versionSeq} : {v.label}
                    </span>
                    <p style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                      Créée le {new Date(v.createdAt).toLocaleDateString('fr-FR')} par {v.authorEmail}
                    </p>
                  </div>
                  <button
                    onClick={() => handleRestore(v.versionSeq)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '6px 10px',
                      backgroundColor: '#ffffff',
                      border: '1px solid var(--border)',
                      fontSize: '11px',
                      color: 'var(--primary)'
                    }}
                  >
                    <RotateCcw size={12} /> Restaurer (EF07)
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const backdropStyle = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: 'rgba(15, 23, 42, 0.5)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1000,
  padding: '16px'
};

const modalBoxStyle = {
  maxWidth: '460px',
  width: '100%',
  backgroundColor: '#ffffff',
  borderRadius: '10px',
  boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
  overflow: 'hidden'
};

const headerStyle = {
  padding: '14px 18px',
  borderBottom: '1px solid var(--border)',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  backgroundColor: '#f8fafc'
};

const closeBtnStyle = {
  background: 'transparent',
  border: 'none',
  color: '#64748b'
};

