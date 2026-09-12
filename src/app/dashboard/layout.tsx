"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { NotificationProvider } from "@/contexts/NotificationContext";
import { Sidebar } from "@/components/Sidebar";
import { NotificationBell } from "@/components/NotificationBell";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [user, loading, router]);

  if (loading || !user) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-sm text-text-secondary">Cargando…</p>
      </div>
    );
  }

  return (
    <NotificationProvider>
      <div className="flex min-h-screen flex-1">
        <Sidebar />
        <div className="flex flex-1 flex-col">
          <header className="flex h-14 items-center justify-end border-b border-border-soft bg-surface/70 px-6 backdrop-blur-md">
            <NotificationBell />
          </header>
          <main className="flex-1 overflow-y-auto p-6">{children}</main>
        </div>
      </div>
    </NotificationProvider>
  );
}
