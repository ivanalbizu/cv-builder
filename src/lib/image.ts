/** Lee un `File` de imagen y lo devuelve como dataURL base64. */
export function fileToDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error('No se pudo leer la imagen'));
    reader.readAsDataURL(file);
  });
}

/**
 * Avisa del gotcha que nos costó tiempo en el CV de referencia (CLAUDE.md §2):
 * una foto «sin fondo» guardada como JPEG lleva la transparencia **aplanada**,
 * normalmente con el cuadriculado incrustado, y ningún CSS lo tapa.
 */
export function photoWarning(dataUrl: string): string | null {
  if (/^data:image\/(jpeg|jpg)/i.test(dataUrl)) {
    return 'Es un JPEG: no admite transparencia. Si la foto va sin fondo, expórtala como PNG (RGBA) o el recorte saldrá con fondo aplanado.';
  }
  return null;
}
