import React from 'react';
import { BookOpen, Heart, Mail, Award, Newspaper } from 'lucide-react';

export default function Footer() {
  return (
    <footer style={{
      backgroundColor: '#0f172a',
      color: '#94a3b8',
      padding: '44px 24px 28px',
      borderTop: '1px solid #1e293b',
      fontSize: '13px'
    }}>
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
        gap: '36px',
        marginBottom: '36px'
      }}>
        {/* Colonne 1 : Présentation de la Revue */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '9px', color: '#ffffff', fontWeight: '700', fontSize: '16px', marginBottom: '12px' }}>
            <Newspaper size={20} color="#a855f7" />
            <span>Revue Numérique Étudiante</span>
          </div>
          <p style={{ lineHeight: '1.6', fontSize: '12.5px', color: '#94a3b8' }}>
            Publication officielle éditée et rédigée par l'association étudiante. Tribune libre universitaire d'investigation, d'innovations pédagogiques et de créations culturelles sur le campus.
          </p>
        </div>

        {/* Colonne 2 : Rubriques & Éditions */}
        <div>
          <h4 style={{ color: '#ffffff', fontWeight: '700', marginBottom: '14px', fontSize: '13.5px', letterSpacing: '0.02em' }}>
            Rubriques & Parutions
          </h4>
          <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12.5px' }}>
            <li style={{ color: '#cbd5e1' }}>• Grand Numéro Annuel de l'Université</li>
            <li style={{ color: '#cbd5e1' }}>• Enquêtes & Vie sur le Campus</li>
            <li style={{ color: '#cbd5e1' }}>• Innovations, Sciences & Technologies</li>
            <li style={{ color: '#cbd5e1' }}>• Chroniques Culturelles & Artistiques</li>
            <li style={{ color: '#cbd5e1' }}>• Archives Numériques des Tirages Certifiés</li>
          </ul>
        </div>

        {/* Colonne 3 : Rédaction & Association */}
        <div>
          <h4 style={{ color: '#ffffff', fontWeight: '700', marginBottom: '14px', fontSize: '13.5px', letterSpacing: '0.02em' }}>
            Comité de Rédaction
          </h4>
          <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12.5px' }}>
            <li style={{ color: '#cbd5e1' }}>• Association des Étudiants du Campus</li>
            <li style={{ color: '#cbd5e1' }}>• Rédaction collaborative en temps réel</li>
            <li style={{ color: '#cbd5e1' }}>• Charte de déontologie journalistique</li>
            <li style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#cbd5e1', marginTop: '4px' }}>
              <Mail size={13} color="#a855f7" />
              <span>Contact : redaction@etudiant.fr</span>
            </li>
          </ul>
        </div>
      </div>

      {/* Ligne inférieure de copyright */}
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        paddingTop: '20px',
        borderTop: '1px solid #1e293b',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '12px',
        fontSize: '11.5px',
        color: '#64748b'
      }}>
        <span>© 2026 Revue Numérique — Association des Étudiants • Tous droits réservés</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          Édition universitaire collaborative certifiée
        </span>
      </div>
    </footer>
  );
}
