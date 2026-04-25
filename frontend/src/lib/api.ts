import type { BoardData } from "@/lib/kanban";

const headers = (username: string) => ({
  "Content-Type": "application/json",
  "x-username": username,
});

export interface ChatResponse {
  message: string;
  board: import("@/lib/kanban").BoardData | null;
}

export async function fetchBoard(username: string): Promise<BoardData> {
  const res = await fetch("/api/board", { headers: headers(username) });
  if (!res.ok) throw new Error(`Failed to load board: ${res.status}`);
  return res.json();
}

export async function saveBoard(username: string, board: BoardData): Promise<void> {
  const res = await fetch("/api/board", {
    method: "PUT",
    headers: headers(username),
    body: JSON.stringify(board),
  });
  if (!res.ok) throw new Error(`Failed to save board: ${res.status}`);
}

export async function sendChatMessage(
  username: string,
  message: string,
): Promise<ChatResponse> {
  const res = await fetch("/api/ai/chat", {
    method: "POST",
    headers: headers(username),
    body: JSON.stringify({ message }),
  });
  if (!res.ok) throw new Error(`Chat request failed: ${res.status}`);
  return res.json();
}
