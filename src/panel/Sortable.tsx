import { forwardRef, useId, type ReactNode } from 'react';
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import { restrictToParentElement, restrictToVerticalAxis } from '@dnd-kit/modifiers';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import s from './Sortable.module.css';

/**
 * Reordenado por arrastre (CLAUDE.md §6).
 *
 * Envuelve `@dnd-kit` para que el resto del panel no sepa de sensores ni de
 * modificadores. El `KeyboardSensor` no es un extra: es lo que permite
 * reordenar sin ratón (Tab hasta el asa, Espacio para levantar, flechas para
 * mover, Espacio para soltar), y por eso sustituye a los botones ↑/↓.
 */

interface SortableListProps {
  /** Ids en el orden actual. */
  ids: string[];
  /** Se llama con el id movido y su índice destino. */
  onReorder: (id: string, toIndex: number) => void;
  children: ReactNode;
}

export function SortableList({ ids, onReorder, children }: SortableListProps) {
  const sensors = useSensors(
    // Un umbral de 6px evita que un clic en el asa cuente como arrastre.
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function handleDragEnd({ active, over }: DragEndEvent) {
    if (!over || active.id === over.id) return;
    onReorder(String(active.id), ids.indexOf(String(over.id)));
  }

  return (
    <DndContext
      id={useId()}
      sensors={sensors}
      collisionDetection={closestCenter}
      modifiers={[restrictToVerticalAxis, restrictToParentElement]}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        {children}
      </SortableContext>
    </DndContext>
  );
}

/**
 * Un elemento arrastrable. Expone el asa por render prop para que cada tarjeta
 * decida dónde ponerla: arrastrar desde toda la tarjeta impediría seleccionar
 * texto en los campos del formulario.
 */
export function SortableItem({
  id,
  children,
}: {
  id: string;
  children: (handle: { handleProps: Record<string, unknown>; dragging: boolean }) => ReactNode;
}) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } =
    useSortable({ id });

  return (
    <div
      ref={setNodeRef}
      className={`${s.item} ${isDragging ? s.dragging : ''}`}
      style={{ transform: CSS.Transform.toString(transform), transition }}
    >
      {children({
        handleProps: { ref: setActivatorNodeRef, ...attributes, ...listeners },
        dragging: isDragging,
      })}
    </div>
  );
}

/**
 * Asa de arrastre. Es un `<button>` de verdad: enfocable y operable con teclado.
 *
 * `forwardRef` no es opcional: dnd-kit pasa `setActivatorNodeRef` como `ref`, y
 * un componente función lo descarta en silencio. Sin él, la librería no sabe
 * cuál es el nodo activador y el sensor de teclado pierde el anclaje y el foco
 * tras soltar — el arrastre con ratón seguiría pareciendo correcto.
 */
export const DragHandle = forwardRef<HTMLButtonElement, { label: string } & Record<string, unknown>>(
  function DragHandle({ label, ...props }, ref) {
    return (
      <button
        ref={ref}
        type="button"
        className={`btn btn-ghost btn-sm ${s.handle}`}
        aria-label={`Reordenar ${label}`}
        title="Arrastra, o pulsa Espacio y usa las flechas"
        {...props}
      >
        ⠿
      </button>
    );
  },
);
