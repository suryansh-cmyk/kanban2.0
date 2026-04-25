"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { KanbanColumn } from "@/components/KanbanColumn";
import { KanbanCardPreview } from "@/components/KanbanCardPreview";
import { AiChat } from "@/components/AiChat";
import { createId, moveCard, type BoardData, type Column } from "@/lib/kanban";
import { fetchBoard, saveBoard } from "@/lib/api";

interface KanbanBoardProps {
  username: string;
  onLogout: () => void;
}

function isColumnId(columns: Column[], id: string) {
  return columns.some((c) => c.id === id);
}

export const KanbanBoard = ({ username, onLogout }: KanbanBoardProps) => {
  const [board, setBoard] = useState<BoardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeCardId, setActiveCardId] = useState<string | null>(null);

  // Keep a stable ref to the board so drag handlers always see latest state
  const boardRef = useRef<BoardData | null>(null);
  boardRef.current = board;

  // Snapshot the board at drag start so we can restore on cancel
  const dragStartBoard = useRef<BoardData | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } })
  );

  useEffect(() => {
    fetchBoard(username)
      .then(setBoard)
      .catch(() => setError("Failed to load board. Please refresh."))
      .finally(() => setLoading(false));
  }, [username]);

  const persist = useCallback(
    (next: BoardData) => {
      saveBoard(username, next).catch(() =>
        setError("Failed to save. Please try again.")
      );
    },
    [username]
  );

  const applyAiBoard = useCallback((updated: BoardData) => {
    setBoard(updated);
  }, []);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveCardId(event.active.id as string);
    dragStartBoard.current = boardRef.current;
  };

  // Move card in real-time as user drags over new positions/columns
  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    setBoard((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        columns: moveCard(prev.columns, active.id as string, over.id as string),
      };
    });
  };

  // On drop: just persist whatever real-time state we landed on
  const handleDragEnd = (event: DragEndEvent) => {
    const { over } = event;
    setActiveCardId(null);

    if (!over) {
      // Dropped outside — restore original
      setBoard(dragStartBoard.current);
      return;
    }

    // Persist the current board state (already updated by onDragOver)
    setBoard((prev) => {
      if (prev) persist(prev);
      return prev;
    });
  };

  const handleDragCancel = () => {
    setActiveCardId(null);
    setBoard(dragStartBoard.current);
  };

  const handleRenameColumn = (columnId: string, title: string) => {
    setBoard((prev) => {
      if (!prev) return prev;
      const next = {
        ...prev,
        columns: prev.columns.map((col) =>
          col.id === columnId ? { ...col, title } : col
        ),
      };
      persist(next);
      return next;
    });
  };

  const handleAddCard = (columnId: string, title: string, details: string) => {
    const id = createId("card");
    setBoard((prev) => {
      if (!prev) return prev;
      const next = {
        ...prev,
        cards: { ...prev.cards, [id]: { id, title, details: details || "" } },
        columns: prev.columns.map((col) =>
          col.id === columnId ? { ...col, cardIds: [...col.cardIds, id] } : col
        ),
      };
      persist(next);
      return next;
    });
  };

  const handleDeleteCard = (columnId: string, cardId: string) => {
    setBoard((prev) => {
      if (!prev) return prev;
      const next = {
        ...prev,
        cards: Object.fromEntries(
          Object.entries(prev.cards).filter(([id]) => id !== cardId)
        ),
        columns: prev.columns.map((col) =>
          col.id === columnId
            ? { ...col, cardIds: col.cardIds.filter((id) => id !== cardId) }
            : col
        ),
      };
      persist(next);
      return next;
    });
  };

  const cardsById = useMemo(() => board?.cards ?? {}, [board]);
  const activeCard = activeCardId ? cardsById[activeCardId] : null;

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center text-sm text-[var(--gray-text)]">
        Loading…
      </div>
    );
  }

  if (!board) {
    return (
      <div className="flex h-screen items-center justify-center text-sm text-red-500">
        {error || "Board not found."}
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[#f4f5f8]">
      {/* Board panel */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top bar */}
        <header className="flex shrink-0 items-center justify-between gap-4 border-b border-[var(--stroke)] bg-white px-8 py-4">
          <div className="flex items-center gap-3">
            <div className="h-7 w-1 rounded-full bg-[var(--accent-yellow)]" />
            <h1 className="font-display text-xl font-semibold text-[var(--navy-dark)]">
              Kanban Studio
            </h1>
          </div>
          <div className="flex items-center gap-3">
            {error && <span className="text-xs text-red-500">{error}</span>}
            <span className="text-xs text-[var(--gray-text)]">
              Signed in as{" "}
              <strong className="text-[var(--navy-dark)]">{username}</strong>
            </span>
            <button
              onClick={onLogout}
              className="rounded-lg border border-[var(--stroke)] px-3 py-1.5 text-xs font-medium text-[var(--gray-text)] transition hover:border-red-200 hover:text-red-500"
            >
              Sign out
            </button>
          </div>
        </header>

        {/* Columns */}
        <div className="flex-1 overflow-x-auto overflow-y-auto px-6 py-6">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
            onDragCancel={handleDragCancel}
          >
            <div
              className="flex items-stretch gap-4"
              style={{ minWidth: "max-content", minHeight: "100%" }}
            >
              {board.columns.map((column) => (
                <KanbanColumn
                  key={column.id}
                  column={column}
                  cards={column.cardIds
                    .map((cardId) => board.cards[cardId])
                    .filter(Boolean)}
                  onRename={handleRenameColumn}
                  onAddCard={handleAddCard}
                  onDeleteCard={handleDeleteCard}
                />
              ))}
            </div>
            <DragOverlay dropAnimation={{ duration: 150, easing: "ease" }}>
              {activeCard ? (
                <div className="w-[240px] rotate-1 opacity-90 shadow-xl">
                  <KanbanCardPreview card={activeCard} />
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        </div>
      </div>

      {/* AI sidebar */}
      <aside className="flex w-[340px] shrink-0 flex-col border-l border-[var(--stroke)] bg-white">
        <AiChat username={username} onBoardUpdated={applyAiBoard} />
      </aside>
    </div>
  );
};
