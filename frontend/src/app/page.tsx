"use client";

import { useEffect, useState } from "react";
import { KanbanBoard } from "@/components/KanbanBoard";
import { LoginPage } from "@/components/LoginPage";

export default function Home() {
  const [username, setUsername] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("pm_session");
    setUsername(stored);
    setReady(true);
  }, []);

  const handleLogin = (u: string) => setUsername(u);

  const handleLogout = () => {
    localStorage.removeItem("pm_session");
    setUsername(null);
  };

  if (!ready) return null;

  if (!username) return <LoginPage onLogin={handleLogin} />;

  return <KanbanBoard username={username} onLogout={handleLogout} />;
}
