/**
 * Compilateur PDF Typst (Rust) avec fallback de génération PDF natif
 * Conçu pour compiler les revues en moins de 80 ms avec moins de 40 Mo de RAM
 */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

class TypstCompiler {
  constructor() {
    this.hasTypst = this.checkTypstInstalled();
    console.log(`[Typst Compiler] Typst disponible sur le système : ${this.hasTypst ? 'OUI (Rust natif)' : 'NON (Mode émulation PDF intégré)'}`);
  }

  checkTypstInstalled() {
    try {
      execSync('typst --version', { stdio: 'ignore' });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Compile le contenu textuel en document PDF vectoriel
   */
  async compileToPdf({ title = 'Revue Numérique Annuelle', content = '', versionSeq = 1, docId = 'doc-1' }) {
    if (this.hasTypst) {
      return this.compileWithTypstCli({ title, content, versionSeq, docId });
    } else {
      return this.compileWithFallback({ title, content, versionSeq, docId });
    }
  }

  compileWithTypstCli({ title, content, versionSeq, docId }) {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'typst-'));
    const typPath = path.join(tmpDir, 'document.typ');
    const pdfPath = path.join(tmpDir, 'document.pdf');

    // Template Typst épuré et moderne
    const typstSource = `
#set page(paper: "a4", margin: (x: 2cm, y: 2.5cm))
#set text(font: "Liberation Sans", size: 11pt, lang: "fr")

#align(center)[
  #text(size: 22pt, weight: "bold", fill: rgb("#663399"))[ ${this.escapeTypst(title)} ]
  #v(0.5em)
  #text(size: 11pt, fill: rgb("#555555"))[ Édition Spéciale — Version figée #${versionSeq} ]
  #v(0.2em)
  #line(length: 100%, stroke: 1.5pt + rgb("#663399"))
]

#v(1.5em)

#text(size: 10.5pt)[
${this.escapeTypst(content || 'Document collaboratif finalisé.')}
]

#v(2em)
#line(length: 100%, stroke: 0.5pt + rgb("#cccccc"))
#align(center)[
  #text(size: 8pt, fill: rgb("#888888"))[ Exemplaire certifié conforme — Identifiant : ${docId} — Horodatage : ${new Date().toISOString()} ]
]
`;

    fs.writeFileSync(typPath, typstSource, 'utf-8');

    try {
      execSync(`typst compile "${typPath}" "${pdfPath}"`, { stdio: 'pipe' });
      const pdfBuffer = fs.readFileSync(pdfPath);
      // Nettoyage temporaire
      fs.rmSync(tmpDir, { recursive: true, force: true });
      return pdfBuffer;
    } catch (err) {
      console.warn(`[Typst] Erreur compilation CLI (${err.message}). Utilisation fallback.`);
      fs.rmSync(tmpDir, { recursive: true, force: true });
      return this.compileWithFallback({ title, content, versionSeq, docId });
    }
  }

  escapeTypst(text) {
    if (!text) return '';
    return text
      .replace(/\\/g, '\\\\')
      .replace(/\$/g, '\\$')
      .replace(/\[/g, '\\[')
      .replace(/\]/g, '\\]')
      .replace(/#/g, '\\#');
  }

  /**
   * Générateur de PDF vectoriel pur JavaScript autonome (aucun binaire externe requis)
   * Produit un binaire PDF standard conforme aux spécifications PDF 1.4
   */
  compileWithFallback({ title, content, versionSeq, docId }) {
    const textLines = [
      `======================================================`,
      `              ${title.toUpperCase()}                  `,
      `            Version Certifiee #${versionSeq}         `,
      `======================================================`,
      ``,
      `Date de parution : ${new Date().toLocaleDateString('fr-FR')} a ${new Date().toLocaleTimeString('fr-FR')}`,
      `Identifiant du document : ${docId}`,
      ``,
      `------------------------------------------------------`,
      `CONTENU DE L'EDITION :`,
      `------------------------------------------------------`,
      content || '(Le document ne contient aucun texte modifie)',
      ``,
      `------------------------------------------------------`,
      `Exemplaire unique certifie conforme - Distribution officielle`
    ];

    return this.buildStandardPdf(textLines);
  }

  buildStandardPdf(lines) {
    let streamContent = 'BT\n/F1 12 Tf\n40 780 Td\n16 TL\n';
    for (const line of lines) {
      // Échappement PDF string standard
      const clean = line.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
      streamContent += `(${clean}) '\n`;
    }
    streamContent += 'ET\n';

    const streamLen = Buffer.byteLength(streamContent, 'utf-8');

    const objects = [
      `1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n`,
      `2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n`,
      `3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj\n`,
      `4 0 obj\n<< /Length ${streamLen} >>\nstream\n${streamContent}endstream\nendobj\n`,
      `5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n`
    ];

    let header = '%PDF-1.4\n';
    let offsets = [];
    let curOffset = Buffer.byteLength(header, 'utf-8');

    for (const obj of objects) {
      offsets.push(curOffset);
      curOffset += Buffer.byteLength(obj, 'utf-8');
    }

    const startXref = curOffset;
    let xref = `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
    for (const off of offsets) {
      xref += `${String(off).padStart(10, '0')} 00000 n \n`;
    }

    const trailer = `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${startXref}\n%%EOF\n`;

    const fullPdf = header + objects.join('') + xref + trailer;
    return Buffer.from(fullPdf, 'utf-8');
  }
}

module.exports = new TypstCompiler();
