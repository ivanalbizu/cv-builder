#!/usr/bin/env node
/**
 * Descarga el set curado de Google Fonts y lo deja servido por la propia app.
 *
 *   node scripts/descargar-fuentes.mjs
 *
 * Se auto-hospedan en vez de enlazar al CDN de Google por tres motivos, en
 * orden de importancia para este proyecto:
 *
 *  1. **El e2e de paginación dejaría de ser fiable.** Toda la garantía de que
 *     el CV cabe en una página se apoya en medir el PDF real. Con las fuentes
 *     viniendo de fuera, el CI dependería de la red y una actualización
 *     silenciosa de Google podría cambiar la maqueta sin que nadie tocara nada.
 *  2. **Privacidad.** Pedir la fuente al CDN envía la IP del visitante a
 *     Google en cada carga. En la UE eso ha dado sentencias; alojarla nosotros
 *     lo evita de raíz.
 *  3. **El PDF de servidor funciona sin red.** `pnpm pdf` no debería necesitar
 *     internet para componer un documento.
 *
 * Solo se descargan los subconjuntos `latin` y `latin-ext`: cubren el español
 * y los nombres europeos, y dejan fuera el griego y el cirílico, que en un CV
 * multiplicarían el peso sin usarse.
 *
 * Todas las familias son OFL 1.1 (ver `src/assets/fonts/LICENCIAS.md`), que
 * permite redistribuirlas junto a la aplicación.
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const DESTINO = join(RAIZ, 'src/assets/fonts');

/** UA de un Chrome moderno: sin él, la API devuelve TTF en vez de WOFF2. */
const UA =
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36';

const SUBCONJUNTOS = new Set(['latin', 'latin-ext']);

/**
 * Familias del set curado.
 *
 * Se piden como VARIABLES (`wght@400..700`): un solo archivo por subconjunto
 * cubre todos los pesos entre 400 y 700, en vez de uno por peso. Las plantillas
 * solo usan 400 y 700, pero el archivo variable pesa menos que los dos
 * estáticos juntos.
 */
export const FAMILIAS = [
  { familia: 'Inter', papel: 'sans' },
  { familia: 'Source Sans 3', papel: 'sans' },
  { familia: 'Manrope', papel: 'sans' },
  { familia: 'Lora', papel: 'serif' },
  { familia: 'Playfair Display', papel: 'serif' },
  { familia: 'EB Garamond', papel: 'serif' },
];

const slug = (nombre) => nombre.toLowerCase().replace(/\s+/g, '-');

async function css2(familia) {
  const url = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(familia)}:wght@400..700&display=swap`;
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`${familia}: ${res.status} ${res.statusText}`);
  return res.text();
}

/** Parte el CSS de Google en bloques `@font-face` con su comentario de subconjunto. */
function bloques(css) {
  const out = [];
  const re = /\/\*\s*([\w-]+)\s*\*\/\s*(@font-face\s*\{[^}]*\})/g;
  for (const [, subconjunto, bloque] of css.matchAll(re)) {
    const src = /src:\s*url\(([^)]+)\)/.exec(bloque)?.[1];
    // Variable: «font-weight: 400 700». Estático: «font-weight: 400».
    const weight = /font-weight:\s*([\d\s]+?);/.exec(bloque)?.[1]?.trim();
    const unicode = /unicode-range:\s*([^;]+);/.exec(bloque)?.[1];
    if (src && weight) out.push({ subconjunto, src, weight, unicode });
  }
  return out;
}

async function main() {
  await mkdir(DESTINO, { recursive: true });
  const reglas = [];
  const inventario = [];

  for (const { familia, papel } of FAMILIAS) {
    const encontrados = bloques(await css2(familia)).filter((b) =>
      SUBCONJUNTOS.has(b.subconjunto),
    );
    if (encontrados.length === 0) throw new Error(`${familia}: ningún subconjunto latino`);

    for (const b of encontrados) {
      const nombre = `${slug(familia)}-${b.subconjunto}.woff2`;
      const bin = Buffer.from(await (await fetch(b.src, { headers: { 'User-Agent': UA } })).arrayBuffer());
      await writeFile(join(DESTINO, nombre), bin);
      inventario.push({ familia, papel, pesos: b.weight, archivo: nombre, kb: Math.round(bin.length / 1024) });

      reglas.push(
        `@font-face {\n` +
          `  font-family: '${familia}';\n` +
          `  font-style: normal;\n` +
          `  font-weight: ${b.weight};\n` +
          `  font-display: swap;\n` +
          `  src: url('./fonts/${nombre}') format('woff2');\n` +
          `  unicode-range: ${b.unicode};\n` +
          `}`,
      );
    }
  }

  const cabecera =
    `/* GENERADO POR scripts/descargar-fuentes.mjs — NO EDITAR A MANO.\n` +
    `   Fuentes auto-hospedadas: el e2e de paginación no puede depender de la\n` +
    `   red, y pedirlas al CDN enviaría la IP del visitante a Google.\n` +
    `   Todas OFL 1.1; ver fonts/LICENCIAS.md. */\n\n`;
  await writeFile(join(RAIZ, 'src/assets/fuentes.css'), cabecera + reglas.join('\n\n') + '\n');

  const total = inventario.reduce((n, f) => n + f.kb, 0);
  console.table(inventario);
  console.log(`\n${inventario.length} archivos · ${total} KB en total`);

  await writeFile(
    join(DESTINO, 'INVENTARIO.json'),
    JSON.stringify({ generado: new Date().toISOString().slice(0, 10), archivos: inventario }, null, 2),
  );
}

// Solo se ejecuta como script; importable para los tests.
if (process.argv[1] && (await readFile(process.argv[1], 'utf8').catch(() => '')).includes('descargar-fuentes')) {
  await main();
}
