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
        <p className="text-sm text-slate-500">Cargando…</p>
      </div>
    );
  }

  return (
    <NotificationProvider>
      <div className="flex min-h-screen flex-1">
        <Sidebar />
        <div className="flex flex-1 flex-col">
          <header className="flex h-14 items-center justify-end border-b border-slate-200 bg-white px-6">
            <NotificationBell />
          </header>
          <main className="flex-1 overflow-y-auto bg-slate-50 p-6">
            {children}
          </main>
        </div>
      </div>
    </NotificationProvider>
  );
}
