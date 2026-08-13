/**
 * Exportación a **HTML autónomo**.
 *
 * Produce un único archivo que se abre en cualquier navegador, sin servidor ni
 * conexión, y que al imprimirlo da exactamente el mismo PDF que la app. Es el
 * formato del que nació este proyecto (§Origen) y el que mejor encaja con su
 * principio de artefacto autónomo: la foto ya viaja en base64 y aquí se le unen
 * los estilos y las tipografías.
 *
 * Sirve para compartir: se envía por correo, se sube a cualquier hosting
 * estático o se guarda como copia de seguridad legible dentro de diez años, sin
 * depender de que esta app siga existiendo.
 */

/** Recolecta todas las reglas CSS del documento, con las fuentes incrustadas. */
async function recogerEstilos(): Promise<string> {
  const usadas = fuentesDescargadas();
  const bloques: string[] = [];

  for (const hoja of Array.from(document.styleSheets)) {
    let reglas: CSSRuleList;
    try {
      reglas = hoja.cssRules;
    } catch {
      // Hoja de otro origen: no se puede leer. Hoy no ocurre —todo el CSS es
      // propio— pero conviene no reventar si algún día se añade una externa.
      continue;
    }

    for (const regla of Array.from(reglas)) {
      if (regla instanceof CSSFontFaceRule) {
        const incrustada = await incrustarFontFace(regla, usadas);
        if (incrustada) bloques.push(incrustada);
      } else {
        bloques.push(regla.cssText);
      }
    }
  }

  return bloques.join('\n');
}

/**
 * URLs de fuentes que el navegador ha pedido de verdad.
 *
 * Se leen del *resource timing* en vez de incrustar todas las declaradas: con
 * `unicode-range`, de cada familia solo se descarga el subconjunto que el CV
 * necesita, y meter los demás engordaría el archivo con glifos que nadie va a
 * ver.
 */
function fuentesDescargadas(): Set<string> {
  const recursos = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
  return new Set(recursos.filter((r) => r.name.endsWith('.woff2')).map((r) => r.name));
}

/** Convierte el `src: url(...)` de un @font-face en un dataURL base64. */
async function incrustarFontFace(
  regla: CSSFontFaceRule,
  usadas: Set<string>,
): Promise<string | null> {
  const src = regla.style.getPropertyValue('src');
  const url = /url\(["']?([^"')]+)["']?\)/.exec(src)?.[1];
  if (!url) return null;

  const absoluta = new URL(url, document.baseURI).href;
  // Solo las que hicieron falta; el resto se descartan enteras, así el
  // navegador que abra el archivo usará el respaldo genérico del stack.
  if (!usadas.has(absoluta)) return null;

  const buffer = await (await fetch(absoluta)).arrayBuffer();
  const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)));
  return regla.cssText.replace(src, `url(data:font/woff2;base64,${base64}) format("woff2")`);
}

export interface OpcionesExportacion {
  /** Nombre para el `<title>` y para el archivo. */
  nombre: string;
  /** Nº de páginas medido; el pie de página depende de él. */
  pages: number;
}

/**
 * Devuelve el HTML completo del CV.
 *
 * Se toma el nodo `.cv-page` tal cual está en la vista previa, así que hereda
 * las variables de tema que la app le inyecta y no hay que recalcular nada:
 * lo que se ve es lo que se exporta, igual que con la impresión.
 */
export async function construirHtml({ nombre, pages }: OpcionesExportacion): Promise<string> {
  const hoja = document.querySelector('.cv-page');
  if (!hoja) throw new Error('No se encontró la hoja del CV');

  const estilos = await recogerEstilos();
  const titulo = nombre.trim() || 'Currículum';

  return `<!doctype html>
<html lang="es" data-pages="${pages}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapar(titulo)}</title>
<!-- Generado por CV Builder. Archivo autónomo: no necesita red ni servidor.
     Para obtener el PDF: imprimir con A4, márgenes «Ninguno» y «Gráficos de
     fondo» activado. -->
<style>
${estilos}

/* La app centra la hoja dentro de su lienzo; aquí no hay lienzo. */
body { margin: 0; background: #e9e6df; display: flex; justify-content: center; }
.cv-page { margin: 24px; }
@media print { body { background: #fff; } .cv-page { margin: 0; } }
</style>
</head>
<body>
${hoja.outerHTML}
</body>
</html>
`;
}

function escapar(texto: string): string {
  return texto.replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!,
  );
}

/** Nombre de archivo a partir del nombre de la persona. */
export function nombreArchivo(nombre: string): string {
  const slug =
    nombre
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'cv';
  return `${slug}.html`;
}
