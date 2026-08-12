/**
 * Declaración de argumentos de las herramientas del agente.
 *
 * De una sola declaración salen las dos cosas que necesitamos:
 *   · `toJsonSchema()` → lo que el agente lee para saber cómo llamar.
 *   · `validate()`     → lo que comprobamos antes de tocar el documento.
 *
 * Están juntas a propósito. Con un JSON Schema escrito a mano y una validación
 * aparte, ambos se separan en cuanto alguien añade un campo, y el agente acaba
 * llamando según un contrato que ya no se cumple.
 *
 * Es un subconjunto deliberadamente pequeño de JSON Schema: solo lo que usan
 * los comandos del CV. Si algún día hace falta más, mejor añadir un caso aquí
 * que traerse un validador completo a un bundle que se descarga en cada visita.
 */

export type FieldSpec =
  | { kind: 'string'; description: string; optional?: boolean; enum?: readonly string[] }
  | { kind: 'hexColor'; description: string; optional?: boolean }
  | { kind: 'integer'; description: string; optional?: boolean; min?: number; max?: number }
  | { kind: 'boolean'; description: string; optional?: boolean }
  | { kind: 'stringArray'; description: string; optional?: boolean };

export type ArgsSpec = Record<string, FieldSpec>;

export interface JsonSchema {
  type: 'object';
  properties: Record<string, Record<string, unknown>>;
  required: string[];
  additionalProperties: false;
}

const HEX = /^#[0-9a-f]{6}$/i;

export function toJsonSchema(spec: ArgsSpec): JsonSchema {
  const properties: Record<string, Record<string, unknown>> = {};
  const required: string[] = [];

  for (const [name, field] of Object.entries(spec)) {
    if (!field.optional) required.push(name);
    properties[name] = fieldToJsonSchema(field);
  }

  // `additionalProperties: false` es intencionado: si el agente inventa un
  // campo, preferimos un error claro a una escritura silenciosa que no hace
  // lo que cree.
  return { type: 'object', properties, required, additionalProperties: false };
}

function fieldToJsonSchema(field: FieldSpec): Record<string, unknown> {
  const base = { description: field.description };
  switch (field.kind) {
    case 'string':
      return field.enum ? { ...base, type: 'string', enum: [...field.enum] } : { ...base, type: 'string' };
    case 'hexColor':
      return { ...base, type: 'string', pattern: '^#[0-9a-fA-F]{6}$' };
    case 'integer':
      return {
        ...base,
        type: 'integer',
        ...(field.min === undefined ? {} : { minimum: field.min }),
        ...(field.max === undefined ? {} : { maximum: field.max }),
      };
    case 'boolean':
      return { ...base, type: 'boolean' };
    case 'stringArray':
      return { ...base, type: 'array', items: { type: 'string' } };
  }
}

export type ValidationResult =
  | { ok: true; value: Record<string, unknown> }
  | { ok: false; errors: string[] };

export function validate(spec: ArgsSpec, args: unknown): ValidationResult {
  if (args === null || typeof args !== 'object' || Array.isArray(args)) {
    return { ok: false, errors: ['los argumentos deben ser un objeto'] };
  }

  const input = args as Record<string, unknown>;
  const errors: string[] = [];
  const value: Record<string, unknown> = {};

  for (const key of Object.keys(input)) {
    if (!(key in spec)) errors.push(`campo desconocido: «${key}»`);
  }

  for (const [name, field] of Object.entries(spec)) {
    const raw = input[name];

    if (raw === undefined || raw === null) {
      if (!field.optional) errors.push(`falta el campo obligatorio «${name}»`);
      continue;
    }

    const error = checkField(name, field, raw);
    if (error) errors.push(error);
    else value[name] = raw;
  }

  return errors.length > 0 ? { ok: false, errors } : { ok: true, value };
}

function checkField(name: string, field: FieldSpec, raw: unknown): string | null {
  switch (field.kind) {
    case 'string':
      if (typeof raw !== 'string') return `«${name}» debe ser texto`;
      if (field.enum && !field.enum.includes(raw)) {
        return `«${name}» debe ser uno de: ${field.enum.join(', ')}`;
      }
      return null;

    case 'hexColor':
      if (typeof raw !== 'string') return `«${name}» debe ser texto`;
      if (!HEX.test(raw)) return `«${name}» debe ser un color hex de 6 dígitos, p. ej. «#004b8d»`;
      return null;

    case 'integer':
      if (typeof raw !== 'number' || !Number.isInteger(raw)) {
        return `«${name}» debe ser un número entero`;
      }
      if (field.min !== undefined && raw < field.min) return `«${name}» no puede ser menor que ${field.min}`;
      if (field.max !== undefined && raw > field.max) return `«${name}» no puede ser mayor que ${field.max}`;
      return null;

    case 'boolean':
      if (typeof raw !== 'boolean') return `«${name}» debe ser true o false`;
      return null;

    case 'stringArray':
      if (!Array.isArray(raw)) return `«${name}» debe ser una lista`;
      if (!raw.every((v) => typeof v === 'string')) return `«${name}» solo admite textos`;
      return null;
  }
}
