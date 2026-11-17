// Maakt dist/KnockKnock_SCORM2004.zip met imsmanifest.xml in de root.
// Elk bestand uit de build staat in het manifest.
import { readFileSync, writeFileSync, readdirSync, statSync, existsSync, rmSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { execFileSync } from 'node:child_process';

const DIST = 'dist';
const ZIP = 'KnockKnock_SCORM2004.zip';
if (!existsSync(join(DIST, 'index.html'))) { console.error('Geen build gevonden. Draai eerst: npm run build'); process.exit(1); }

const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
const content = JSON.parse(readFileSync('public/content/scenarios.json', 'utf8'));

const bestanden = [];
(function loop(dir) {
  for (const naam of readdirSync(dir)) {
    const pad = join(dir, naam);
    if (statSync(pad).isDirectory()) loop(pad);
    else bestanden.push(relative(DIST, pad).split(sep).join('/'));
  }
})(DIST);
const lijst = bestanden.filter((f) => f !== ZIP && f !== 'imsmanifest.xml' && !f.endsWith('.DS_Store')).sort();
if (lijst.some((f) => /safiro/i.test(f))) { console.error('Safiro-bestand in de build gevonden. Afgebroken (licentie).'); process.exit(1); }

const xmlEsc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const files = lijst.map((f) => `      <file href="${xmlEsc(encodeURI(f))}"/>`).join('\n');
const manifest = readFileSync('scorm/imsmanifest.xml', 'utf8')
  .replaceAll('{{TITEL}}', xmlEsc(content.meta?.titel?.nl ?? 'Knock Knock!'))
  .replaceAll('{{VERSIE}}', xmlEsc(pkg.version))
  .replace('{{FILES}}', files);
writeFileSync(join(DIST, 'imsmanifest.xml'), manifest);

const zipPad = join(DIST, ZIP);
if (existsSync(zipPad)) rmSync(zipPad);
execFileSync('zip', ['-q', '-r', '-X', ZIP, 'imsmanifest.xml', ...lijst], { cwd: DIST, stdio: 'inherit' });
const mb = (statSync(zipPad).size / 1024 / 1024).toFixed(2);
console.log(`Klaar: ${zipPad} (${lijst.length} bestanden + manifest, ${mb} MB)`);
