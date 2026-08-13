import { useState } from 'react';
import { commands } from '../core/commands';
import { construirPregunta, dominio, extraerColores } from '../lib/marcaColores';
import { TextAreaField, TextField } from './ui';
import s from './MarcaColores.module.css';

/**
 * Toma los colores corporativos de una empresa con ayuda de un asistente.
 *
 * La app no llama a ninguna IA ni descarga ninguna web: prepara la pregunta,
 * la copias donde quieras (ChatGPT, Claude, Gemini) y pegas la respuesta. Así
 * el contenido solo sale del navegador si tú lo llevas, y no hacen falta claves
 * ni servidor.
 */
export function MarcaColores() {
  const [url, setUrl] = useState('');
  const [respuesta, setRespuesta] = useState('');
  const [copiado, setCopiado] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const host = dominio(url);
  const pregunta = construirPregunta(url);

  async function copiar() {
    try {
      await navigator.clipboard.writeText(pregunta);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      setError('El navegador no dejó copiar. Selecciona el texto de abajo a mano.');
    }
  }

  function aplicar() {
    const { primary, accent } = extraerColores(respuesta);
    if (!primary) {
      setError('No encontré ningún color hexadecimal en la respuesta.');
      return;
    }
    setError(null);
    commands.setPrimary(primary);
    if (accent) commands.setAccent(accent);
  }

  return (
    <>
      <TextField
        label="Web de la empresa"
        value={url}
        onChange={setUrl}
        placeholder="https://www.empresa.com"
        hint={host ? `Se preguntará por ${host}.` : 'Pega la dirección de su web.'}
      />

      <div className={s.acciones}>
        <button className="btn btn-sm" onClick={() => void copiar()} disabled={!host}>
          {copiado ? '✓ Copiada' : 'Copiar pregunta'}
        </button>
        <span className={s.pista}>Pégala en ChatGPT, Claude o Gemini.</span>
      </div>

      {/* Visible siempre: si el portapapeles falla, se puede seleccionar.
          `tabIndex` y nombre porque tiene scroll propio: sin ellos, quien
          navega con teclado no puede desplazarlo (lo cazó axe). */}
      <pre className={s.pregunta} tabIndex={0} aria-label="Pregunta para el asistente">
        {pregunta}
      </pre>

      <TextAreaField
        label="Respuesta del asistente"
        value={respuesta}
        onChange={setRespuesta}
        rows={4}
        placeholder={'principal: #004b8d\nacento: #c8102e'}
        hint="Pega la respuesta entera; se buscan los colores dentro."
      />

      <div className={s.acciones}>
        <button className="btn btn-sm btn-primary" onClick={aplicar} disabled={!respuesta.trim()}>
          Aplicar los colores
        </button>
      </div>

      {error ? <p className={s.error}>{error}</p> : null}

      <p className={s.aviso}>
        Comprueba el resultado en la vista previa: un asistente puede equivocarse de color. Lo que
        no puede es dejarlo ilegible — el contraste se ajusta solo.
      </p>
    </>
  );
}
