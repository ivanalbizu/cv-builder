#!/usr/bin/env node
/**
 * PDF de servidor, pixel-perfect y sin diálogo (CLAUDE.md fase 3).
 *
 *   pnpm pdf --out cv.pdf
 *   pnpm pdf --data ~/mi-cv.cv.json --template sidebar --theme lujo --out cv.pdf
 *
 * El contenido se inyecta por `window.cvBuilder.loadJSON()`, la misma capa de
 * comandos que usan la interfaz y (en la fase 4) el agente. Por eso este script
 * no necesita conocer el modelo de datos ni tocar el store: si un comando
 * funciona aquí, funciona en los tres sitios.
 *
 * Levanta `vite preview` por su cuenta salvo que se le pase `--url`.
 */
import { spawn } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import { chromium } from '@playwright/test';

const args = parseArgs(process.argv.slice(2));

if (args.help) {
  console.log(`
Uso: pnpm pdf [opciones]

  --out <fichero>     PDF de salida            (por defecto: cv.pdf)
  --data <fichero>    JSON exportado del panel (por defecto: la semilla)
  --template <id>     single-column | sidebar
  --theme <id>        clasico | boutique | corporativo | lujo
  --primary <hex>     color principal, p. ej. '#004b8d'
  --accent <hex>      color de acento
  --density <id>      compact | comfy
  --url <url>         servidor ya en marcha; si se omite, se arranca uno
`);
  process.exit(0);
}

const out = args.out ?? 'cv.pdf';
let server;
let baseUrl = args.url;

try {
  if (!baseUrl) {
    ({ server, baseUrl } = await startPreview());
  }

  const params = new URLSearchParams();
  for (const key of ['template', 'theme', 'primary', 'accent', 'density']) {
    if (args[key]) params.set(key, args[key]);
  }

  const browser = await chromium.launch({ channel: process.env.PW_CHANNEL ?? 'chrome' });
  const page = await browser.newPage();
  await page.goto(`${baseUrl}/?${params}`);
  await page.locator('.cv-page').waitFor();

  if (args.data) {
    const doc = JSON.parse(await readFile(args.data, 'utf8'));
    await page.evaluate((d) => window.cvBuilder.loadJSON(d), doc);
  }

  // Las fuentes cambian el alto del texto: sin esperarlas, la paginación del
  // PDF puede no coincidir con la de la vista previa.
  await page.evaluate(() => document.fonts.ready);

  const pdf = await page.pdf({
    format: 'A4',
    printBackground: true,
    margin: { top: '0', right: '0', bottom: '0', left: '0' },
  });
  await writeFile(out, pdf);
  await browser.close();

  const paginas = (pdf.toString('latin1').match(/\/Type\s*\/Page[^s]/g) ?? []).length;
  console.log(`✓ ${out} — ${paginas || '?'} página(s) A4`);
} finally {
  server?.kill();
}

// ---------------------------------------------------------------------------

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith('--')) continue;
    const key = arg.slice(2);
    if (key === 'help') out.help = true;
    else if (argv[i + 1] && !argv[i + 1].startsWith('--')) out[key] = argv[++i];
  }
  return out;
}

/** Arranca `vite preview` y espera a que responda. */
function startPreview() {
  const port = 4180 + Math.floor(Math.random() * 400);
  const baseUrl = `http://localhost:${port}`;
  const server = spawn('pnpm', ['preview', '--port', String(port)], {
    stdio: 'ignore',
    detached: false,
  });

  return new Promise((resolve, reject) => {
    const deadline = Date.now() + 60_000;
    (async function poll() {
      try {
        const res = await fetch(baseUrl);
        if (res.ok) return resolve({ server, baseUrl });
      } catch {
        // aún no escucha
      }
      if (Date.now() > deadline) {
        server.kill();
        return reject(new Error(`El servidor no respondió en ${baseUrl}. ¿Has hecho "pnpm build"?`));
      }
      setTimeout(poll, 300);
    })();
  });
}
