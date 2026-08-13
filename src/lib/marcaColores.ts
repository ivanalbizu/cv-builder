import { normalizeHex } from './color';

/**
 * Ayudante para tomar los colores de marca de una empresa.
 *
 * La app **no llama a ninguna IA ni descarga ninguna web**. Prepara la pregunta,
 * el usuario se la hace al asistente que quiera y pega la respuesta. Con eso se
 * esquivan de golpe tres problemas que harían inviable hacerlo automático:
 * CORS impide leer una web ajena desde el navegador, una API de IA exigiría
 * claves y coste, y enviar nada a un tercero debe decidirlo quien usa la app.
 *
 * El riesgo que queda —que el asistente se invente los colores— está cubierto
 * por otro lado: `setBrandColors` deriva los tonos de texto para cumplir WCAG
 * AA sea cual sea el color, así que un valor equivocado dará un CV feo, nunca
 * uno ilegible. Y la vista previa es inmediata.
 */

/** Pregunta lista para pegar en ChatGPT, Claude o Gemini. */
export function construirPregunta(url: string): string {
  const limpia = url.trim() || 'https://ejemplo.com';
  return [
    `Entra en ${limpia} y dime los dos colores corporativos principales de esa web.`,
    '',
    'Respóndeme solo con estas dos líneas, en hexadecimal:',
    'principal: #xxxxxx',
    'acento: #xxxxxx',
    '',
    'El «principal» es el color dominante de su identidad (cabeceras, botones).',
    'El «acento» es el secundario con el que destacan detalles.',
    'Si la web no carga o no puedes navegar, dímelo en vez de adivinar.',
  ].join('\n');
}

export interface ColoresDeMarca {
  primary?: string;
  accent?: string;
}

const HEX = /#(?:[0-9a-f]{3}|[0-9a-f]{6})\b/gi;

/**
 * Extrae los dos colores de la respuesta del asistente.
 *
 * Se acepta cualquier redacción a propósito: los modelos rara vez responden
 * exactamente con el formato pedido, y obligar al usuario a limpiar el texto a
 * mano sería peor que aceptar un párrafo entero. Si vienen etiquetados, se
 * respeta la etiqueta; si no, se toman los dos primeros por orden de aparición.
 */
export function extraerColores(texto: string): ColoresDeMarca {
  const etiquetado = (palabras: string[]): string | undefined => {
    for (const linea of texto.split('\n')) {
      const bajo = linea.toLowerCase();
      if (!palabras.some((p) => bajo.includes(p))) continue;
      const hex = linea.match(HEX)?.[0];
      if (hex) return normalizeHex(hex) ?? undefined;
    }
    return undefined;
  };

  const primary = etiquetado(['principal', 'primary', 'primario']);
  const accent = etiquetado(['acento', 'accent', 'secundario', 'secondary']);
  if (primary || accent) return { primary, accent };

  // Sin etiquetas: los dos primeros hex distintos que aparezcan.
  const encontrados: string[] = [];
  for (const bruto of texto.match(HEX) ?? []) {
    const hex = normalizeHex(bruto);
    if (hex && !encontrados.includes(hex)) encontrados.push(hex);
    if (encontrados.length === 2) break;
  }
  return { primary: encontrados[0], accent: encontrados[1] };
}

/** Dominio legible de una URL, para rotular. Devuelve null si no es válida. */
export function dominio(url: string): string | null {
  try {
    return new URL(url.trim().startsWith('http') ? url.trim() : `https://${url.trim()}`).hostname;
  } catch {
    return null;
  }
}
