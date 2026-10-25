import React from 'react';
import { Shield, Cloud, BookOpen, Heart } from 'lucide-react';

export default function Footer() {
  return (
    <footer style={{
      backgroundColor: '#0f172a',
      color: '#94a3b8',
      padding: '40px 24px 24px',
      borderTop: '1px solid #1e293b',
      fontSize: '13px'
    }}>
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: '32px',
        marginBottom: '32px'
      }}>
        {/* Colonne 1 : Projet */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#ffffff', fontWeight: 'bold', fontSize: '15px', marginBottom: '12px' }}>
            <BookOpen size={18} color="var(--primary-border)" />
            <span>Revue Numérique Annuelle</span>
          </div>
          <p style={{ lineHeight: '1.6', fontSize: '12px' }}>
            Plateforme collaborative d'écriture et de parution numérique pour l'association étudiante.
            Déployée sur AWS dans le cadre de l'évaluation Cloud & Développement Web.
          </p>
        </div>

        {/* Colonne 2 : Architecture & Contraintes */}
        <div>
          <h4 style={{ color: '#ffffff', fontWeight: '600', marginBottom: '12px', fontSize: '13px' }}>
            Contraintes d'Évaluation
          </h4>
          <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12px' }}>
            <li>• <b>C1 :</b> 500 exemplaires maximum au pic (Gatekeeper)</li>
            <li>• <b>C2 :</b> 300 rédacteurs simultanés sans perte (CRDT Yjs)</li>
            <li>• <b>C3 :</b> Instantanés T1 et rendu PDF dynamique à jour</li>
            <li>• <b>C4 :</b> 10 000 caractères par jour et par rédacteur</li>
            <li>• <b>C6 :</b> Alerte e-mail automatique au dernier exemplaire</li>
          </ul>
        </div>

        {/* Colonne 3 : Infrastructure Cloud AWS */}
        <div>
          <h4 style={{ color: '#ffffff', fontWeight: '600', marginBottom: '12px', fontSize: '13px' }}>
            Services Cloud Utilisés (Région eu-west-3)
          </h4>
          <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12px' }}>
            <li>• <b>Amazon EC2 (t3.micro) :</b> Nginx + Node.js LTS + Typst</li>
            <li>• <b>Amazon DynamoDB :</b> Arbitrage O(1) & Journal immuable</li>
            <li>• <b>Amazon S3 :</b> Stockage privé sécurisé des PDF</li>
            <li>• <b>Amazon SQS :</b> Découplage et lissage de charge du pic</li>
            <li>• <b>Amazon SNS :</b> Notifications par e-mail sans serveur SMTP</li>
          </ul>
        </div>
      </div>

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
        fontSize: '11px'
      }}>
        <span>© 2026 Association Étudiante • Projet d'évaluation Cloud & Développement Web</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          Conçu avec <Heart size={12} color="#ec4899" /> et hébergé sous AWS Free Tier (&lt; 0,05 $ USD)
        </span>
      </div>
    </footer>
  );
}
