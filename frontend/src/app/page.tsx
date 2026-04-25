"use client";

import { useEffect, useState } from "react";
import { KanbanBoard } from "@/components/KanbanBoard";
import { LoginPage } from "@/components/LoginPage";

export default function Home() {
  const [loggedIn, setLoggedIn] = useState<boolean | null>(null);

  useEffect(() => {
    setLoggedIn(localStorage.getItem("pm_session") === "1");
  }, []);

  const handleLogin = () => setLoggedIn(true);

  const handleLogout = () => {
    localStorage.removeItem("pm_session");
    setLoggedIn(false);
  };

  if (loggedIn === null) return null; // hydration guard

  if (!loggedIn) return <LoginPage onLogin={handleLogin} />;

  return <KanbanBoard onLogout={handleLogout} />;
}
