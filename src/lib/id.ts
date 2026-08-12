let counter = 0;

/**
 * Id corto y estable para items/secciones. No hace falta que sea un UUID:
 * solo tiene que ser único dentro de un documento y sobrevivir a JSON.
 */
export function newId(prefix = 'i'): string {
  counter += 1;
  return `${prefix}_${Date.now().toString(36)}${counter.toString(36)}`;
}
