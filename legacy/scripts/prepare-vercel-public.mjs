import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dist = resolve(root, 'frontend', 'dist');
const publicDir = resolve(root, 'public');
const distIndex = resolve(dist, 'index.html');
const generatedModule = resolve(root, 'backend', 'src', 'generated-spa.js');

let html;
try {
  html = await readFile(distIndex, 'utf8');
} catch {
  throw new Error('No se encontró frontend/dist/index.html. Ejecuta primero el build de Vite.');
}

await rm(publicDir, { recursive: true, force: true });
await mkdir(publicDir, { recursive: true });
await cp(dist, publicDir, { recursive: true });
await writeFile(
  generatedModule,
  `// Generado automáticamente por scripts/prepare-vercel-public.mjs. No editar.\nexport const generatedSpaHtml = ${JSON.stringify(html)};\n`,
  'utf8',
);

process.stdout.write('Vercel: frontend/dist copiado a public/ y HTML SPA incluido para rutas React.\n');
