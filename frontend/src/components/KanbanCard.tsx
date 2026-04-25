import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import clsx from "clsx";
import type { Card } from "@/lib/kanban";

type KanbanCardProps = {
  card: Card;
  onDelete: (cardId: string) => void;
};

export const KanbanCard = ({ card, onDelete }: KanbanCardProps) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: card.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <article
      ref={setNodeRef}
      style={style}
      className={clsx(
        "group relative rounded-xl bg-white px-3 py-3 shadow-sm transition-all duration-150 cursor-grab active:cursor-grabbing",
        isDragging && "opacity-50 shadow-lg"
      )}
      {...attributes}
      {...listeners}
      data-testid={`card-${card.id}`}
    >
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onDelete(card.id); }}
        className="absolute right-2 top-2 hidden h-5 w-5 items-center justify-center rounded-full text-[var(--gray-text)] transition hover:bg-red-50 hover:text-red-400 group-hover:flex"
        aria-label={`Delete ${card.title}`}
      >
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
          <path d="M1 1l8 8M9 1L1 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </button>

      <p className="pr-5 text-sm font-medium leading-snug text-[var(--navy-dark)]">
        {card.title}
      </p>
      {card.details && (
        <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-[var(--gray-text)]">
          {card.details}
        </p>
      )}
    </article>
  );
};
