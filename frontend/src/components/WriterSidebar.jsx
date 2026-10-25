import React from 'react';
import { 
  FileText, Users, Bell, Link2, 
  History, Edit3, Plus, ChevronRight, Sparkles
} from 'lucide-react';

export default function WriterSidebar({ 
  user, 
  activeTab = 'DOCS', // 'DOCS' | 'SHARED' | 'VERSIONS' | 'LINKS' | 'NOTIFS' | 'EDITOR'
  activeDocTitle,
  ownedDocsCount = 0,
  sharedDocsCount = 0,
  unreadNotifsCount = 0,
  linksCount = 0,
  onSelectTab,
  onCreateDocClick,
  quota = { used: 0, limit: 10000, remaining: 10000 }
}) {
  const quotaPercent = Math.min(100, Math.round((quota.used / quota.limit) * 100));

  const navItems = [
    {
      id: 'DOCS',
      label: 'Mes Documents',
      sublabel: 'Articles rédigés',
      icon: FileText,
      badge: ownedDocsCount,
      color: '#7c3aed'
    },
    {
      id: 'SHARED',
      label: 'Documents Partagés',
      sublabel: 'Collaborations actives',
      icon: Users,
      badge: sharedDocsCount,
      color: '#2563eb'
    },
    {
      id: 'VERSIONS',
      label: 'Versions & Sauvegardes',
      sublabel: 'Historique & instantanés',
      icon: History,
      badge: null,
      color: '#0891b2'
    },
    {
      id: 'LINKS',
      label: 'Liens de Parution',
      sublabel: 'Publications & tirages certifiés',
      icon: Link2,
      badge: linksCount > 0 ? linksCount : null,
      color: '#059669'
    },
    {
      id: 'NOTIFS',
      label: 'Notifications',
      sublabel: 'Alertes & invitations',
      icon: Bell,
      badge: unreadNotifsCount > 0 ? unreadNotifsCount : null,
      badgeColor: '#ef4444',
      color: '#d97706'
    }
  ];

  return (
    <aside style={{
      width: '280px',
      minWidth: '280px',
      height: '100%',
      minHeight: '100%',
      backgroundColor: '#ffffff',
      borderRight: '1px solid #e2e8f0',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      flexShrink: 0,
      userSelect: 'none',
      boxSizing: 'border-box'
    }}>
      {/* 1. Haut de Sidebar : Profil du Rédacteur & Bouton d'Action */}
      <div>
        {/* Carte de Profil */}
        <div style={{
          padding: '18px 20px',
          borderBottom: '1px solid #f1f5f9',
          backgroundColor: '#ffffff'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #7c3aed 0%, #4338ca 100%)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: '800',
              fontSize: '17px',
              boxShadow: '0 4px 12px rgba(124, 58, 237, 0.25)'
            }}>
              {user?.name ? user.name.charAt(0).toUpperCase() : 'R'}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize: '14.5px',
                fontWeight: '700',
                color: '#0f172a',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}>
                {user?.name || 'Rédacteur'}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                <span style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: '#22c55e' }} />
                <span style={{
                  fontSize: '11px',
                  fontWeight: '600',
                  color: user?.role === 'ADMIN' ? '#b45309' : '#7c3aed',
                  backgroundColor: user?.role === 'ADMIN' ? '#fef3c7' : '#f5f3ff',
                  padding: '1px 6px',
                  borderRadius: '4px'
                }}>
                  {user?.role === 'ADMIN' ? 'Administrateur' : 'Rédactrice en ligne'}
                </span>
              </div>
            </div>
          </div>

          {/* Bouton d'Action Rapide : Nouveau Document */}
          <button
            onClick={() => {
              if (onCreateDocClick) onCreateDocClick();
              else if (onSelectTab) onSelectTab('DOCS');
            }}
            style={{
              width: '100%',
              marginTop: '16px',
              padding: '10px 14px',
              backgroundColor: '#7c3aed',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(124, 58, 237, 0.25)',
              transition: 'background-color 0.15s ease'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#6d28d9'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#7c3aed'}
          >
            <Plus size={16} /> Nouveau Document
          </button>
        </div>

        {/* 2. Menu des Toggles de Navigation */}
        <div style={{ padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
          <div style={{
            fontSize: '11px',
            fontWeight: '800',
            color: '#94a3b8',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            padding: '4px 10px 8px 10px'
          }}>
            Navigation
          </div>

          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 12px',
                  borderRadius: '10px',
                  border: 'none',
                  backgroundColor: isActive ? '#f5f3ff' : 'transparent',
                  color: isActive ? '#6b21a8' : '#334155',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.15s ease',
                  borderLeft: isActive ? '3px solid #7c3aed' : '3px solid transparent'
                }}
                onMouseEnter={(e) => {
                  if (!isActive) e.currentTarget.style.backgroundColor = '#f8fafc';
                }}
                onMouseLeave={(e) => {
                  if (!isActive) e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '11px', minWidth: 0 }}>
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    backgroundColor: isActive ? '#ede9fe' : '#f1f5f9',
                    color: isActive ? '#7c3aed' : '#64748b',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    <Icon size={16} />
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{
                      fontSize: '13px',
                      fontWeight: isActive ? '700' : '600',
                      color: isActive ? '#581c87' : '#1e293b',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}>
                      {item.label}
                    </div>
                    <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                      {item.sublabel}
                    </div>
                  </div>
                </div>

                {item.badge !== null && item.badge !== undefined && (
                  <span style={{
                    fontSize: '11px',
                    fontWeight: '700',
                    padding: '2px 7px',
                    borderRadius: '10px',
                    backgroundColor: item.badgeColor || (isActive ? '#7c3aed' : '#f1f5f9'),
                    color: item.badgeColor ? '#ffffff' : (isActive ? '#ffffff' : '#64748b')
                  }}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}

          {/* Raccourci vers l'éditeur si un document est en cours */}
          {activeTab === 'EDITOR' && (
            <div style={{
              marginTop: '12px',
              padding: '12px',
              borderRadius: '10px',
              backgroundColor: '#faf5ff',
              border: '1px solid #e9d5ff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '9px', minWidth: 0 }}>
                <Edit3 size={16} color="#7c3aed" />
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: '10.5px', fontWeight: '800', color: '#7c3aed', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Éditeur Actif
                  </div>
                  <div style={{ fontSize: '12.5px', fontWeight: '700', color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {activeDocTitle || 'Revue en cours'}
                  </div>
                </div>
              </div>
              <ChevronRight size={14} color="#7c3aed" />
            </div>
          )}
        </div>
      </div>

      {/* 3. Bas de Sidebar : Jauge Quota Quotidien d'Écriture */}
      <div style={{
        padding: '16px 20px',
        borderTop: '1px solid #f1f5f9',
        backgroundColor: '#fafafa'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
          <span style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>
            Crédit d'écriture quotidien
          </span>
          <span style={{ fontSize: '11px', fontWeight: '800', color: quotaPercent >= 90 ? '#ef4444' : '#7c3aed' }}>
            {quota.used.toLocaleString()} / 10 000
          </span>
        </div>

        <div style={{ width: '100%', height: '6px', backgroundColor: '#e2e8f0', borderRadius: '3px', overflow: 'hidden', marginBottom: '6px' }}>
          <div style={{
            width: `${quotaPercent}%`,
            height: '100%',
            backgroundColor: quotaPercent >= 90 ? '#ef4444' : (quotaPercent >= 70 ? '#f59e0b' : '#7c3aed'),
            transition: 'width 0.3s ease'
          }} />
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#94a3b8' }}>
          <span>{quota.remaining.toLocaleString()} car. restants</span>
          <span>Équité de rédaction</span>
        </div>
      </div>
    </aside>
  );
}
