import clsx from "clsx";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import type { Card, Column } from "@/lib/kanban";
import { KanbanCard } from "@/components/KanbanCard";
import { NewCardForm } from "@/components/NewCardForm";

type KanbanColumnProps = {
  column: Column;
  cards: Card[];
  onRename: (columnId: string, title: string) => void;
  onAddCard: (columnId: string, title: string, details: string) => void;
  onDeleteCard: (columnId: string, cardId: string) => void;
};

export const KanbanColumn = ({
  column,
  cards,
  onRename,
  onAddCard,
  onDeleteCard,
}: KanbanColumnProps) => {
  const { setNodeRef, isOver } = useDroppable({ id: column.id });

  return (
    <section
      ref={setNodeRef}
      className={clsx(
        "flex w-[240px] shrink-0 flex-col rounded-2xl bg-[#eef0f5] transition-colors self-stretch",
        isOver && "bg-[#e4e8f0] ring-2 ring-[var(--accent-yellow)] ring-offset-2"
      )}
      data-testid={`column-${column.id}`}
    >
      {/* Column header */}
      <div className="px-4 pt-4 pb-2">
        <div className="flex items-center justify-between gap-2">
          <input
            value={column.title}
            onChange={(e) => onRename(column.id, e.target.value)}
            className="flex-1 bg-transparent text-sm font-semibold text-[var(--navy-dark)] outline-none"
            aria-label="Column title"
          />
          <span className="shrink-0 rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold text-[var(--gray-text)]">
            {cards.length}
          </span>
        </div>
      </div>

      {/* Cards */}
      <div className="flex flex-1 flex-col gap-2 overflow-y-auto px-3 pb-3 min-h-[120px]">
        <SortableContext items={column.cardIds} strategy={verticalListSortingStrategy}>
          {cards.map((card) => (
            <KanbanCard
              key={card.id}
              card={card}
              onDelete={(cardId) => onDeleteCard(column.id, cardId)}
            />
          ))}
        </SortableContext>

        {cards.length === 0 && (
          <div className="flex flex-1 min-h-[80px] items-center justify-center rounded-xl border-2 border-dashed border-[#d0d4de] text-[10px] font-medium uppercase tracking-widest text-[#b0b5c0]">
            Empty
          </div>
        )}
      </div>

      {/* Add card */}
      <div className="px-3 pb-3">
        <NewCardForm onAdd={(title, details) => onAddCard(column.id, title, details)} />
      </div>
    </section>
  );
};
