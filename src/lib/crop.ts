/** Región de recorte en píxeles del original, tal como la da react-easy-crop. */
export interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('No se pudo cargar la imagen'));
    img.src = src;
  });
}

/** Lado máximo del recorte. 900px sobran para un marco de 38mm a 300dpi. */
const MAX_SIDE = 900;

/**
 * Tamaño del lienzo de salida: nunca AMPLÍA (`scale` tope 1), porque estirar
 * píxeles solo engorda el base64 sin añadir detalle, y limita el lado mayor
 * para que la foto no dispare el peso del JSON exportado.
 */
export function cropCanvasSize(area: CropArea): { width: number; height: number } {
  const scale = Math.min(1, MAX_SIDE / Math.max(area.width, area.height));
  return {
    width: Math.max(1, Math.round(area.width * scale)),
    height: Math.max(1, Math.round(area.height * scale)),
  };
}

/**
 * Recorta una imagen y devuelve un dataURL.
 *
 * **Siempre PNG**, nunca JPEG: el canvas conserva el canal alfa y el PNG lo
 * guarda. Exportar a JPEG aquí aplanaría la transparencia y reaparecería el
 * cuadriculado que nos costó tiempo en el proyecto de referencia
 * (CLAUDE.md §2 «Imágenes»). Tampoco se rellena el fondo: el color lo pone la
 * plantilla vía `photoOptions.background`, y así sigue siendo cambiable.
 */
export async function cropImage(src: string, area: CropArea): Promise<string> {
  const img = await loadImage(src);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('El navegador no permite recortar imágenes');

  const { width, height } = cropCanvasSize(area);
  canvas.width = width;
  canvas.height = height;

  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(
    img,
    area.x,
    area.y,
    area.width,
    area.height,
    0,
    0,
    canvas.width,
    canvas.height,
  );

  return canvas.toDataURL('image/png');
}
