import { useState } from 'react';
import { commands } from '../core/commands';
import { useCVStore } from '../core/store';
import { Actions, Field } from './ui';
import s from './Variantes.module.css';

/**
 * Versiones del CV.
 *
 * Adaptar el currículum a una oferta produce variantes por naturaleza —una por
 * candidatura—, y con un solo documento adaptarlo a la segunda destruía la
 * primera. Es también lo que hace utilizable la edición por agente: se duplica,
 * se le deja reescribir sobre la copia y el CV bueno no se toca.
 */
export function Variantes() {
  const variantes = useCVStore((st) => st.variantes);
  const activaId = useCVStore((st) => st.activaId);
  const [nombre, setNombre] = useState('');

  const activa = variantes.find((v) => v.id === activaId);
  const lista = commands.variantes();

  function duplicar() {
    commands.duplicarVariante(nombre || `${activa?.nombre ?? 'CV'} (copia)`);
    setNombre('');
  }

  return (
    <>
      <Field label="Versión en edición">
        {(id) => (
          <select
            id={id}
            className={s.select}
            value={activaId}
            onChange={(e) => commands.activarVariante(e.target.value)}
          >
            {lista.map((v) => (
              <option key={v.id} value={v.id}>
                {v.nombre}
              </option>
            ))}
          </select>
        )}
      </Field>

      {activa ? (
        <Field label="Nombre de esta versión" hint="Por ejemplo: «Recepción — Hotel Aurora».">
          {(id) => (
            <input
              id={id}
              className={s.input}
              value={activa.nombre}
              onChange={(e) => commands.renombrarVariante(activa.id, e.target.value)}
            />
          )}
        </Field>
      ) : null}

      <Actions>
        <button className="btn btn-sm" onClick={duplicar}>
          Duplicar esta
        </button>
        <button className="btn btn-sm" onClick={() => commands.nuevaVariante('Nuevo CV')}>
          Empezar una vacía
        </button>
        <button
          className="btn btn-sm btn-danger"
          disabled={variantes.length <= 1}
          onClick={() => {
            if (activa && confirm(`¿Eliminar «${activa.nombre}»? No se puede deshacer.`)) {
              commands.eliminarVariante(activa.id);
            }
          }}
        >
          Eliminar
        </button>
      </Actions>

      <p className={s.nota}>
        Cada versión guarda su propio contenido, tema y plantilla. Para adaptar el CV a una oferta,
        <strong> duplica</strong> y trabaja sobre la copia: la original se queda intacta.
      </p>

      {variantes.length > 1 ? (
        <p className={s.nota}>
          Al cambiar de versión se vacía el historial de deshacer, porque un paso atrás pertenece a
          la versión donde se dio.
        </p>
      ) : null}
    </>
  );
}
