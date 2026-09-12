"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, LayoutGrid, LogOut } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useNotifications } from "@/contexts/NotificationContext";

export function Sidebar() {
  const pathname = usePathname();
  const { logout, user } = useAuth();
  const { unreadCount } = useNotifications();
  const isProfiles = pathname === "/dashboard";
  const isActivity = pathname === "/dashboard/activity";

  return (
    <aside className="flex h-full w-60 shrink-0 flex-col border-r border-border-soft bg-surface/80 backdrop-blur-md">
      <div className="flex items-center gap-2.5 border-b border-border-soft px-5 py-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-accent to-accent-dark text-sm font-bold text-white shadow-[0_0_16px_-2px_var(--accent-glow)]">
          M
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-100">Monedo Admin</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4">
        <Link
          href="/dashboard"
          className={`flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
            isProfiles
              ? "bg-accent-soft text-accent shadow-[inset_0_0_0_1px_var(--accent-glow)]"
              : "text-text-secondary hover:bg-surface-2 hover:text-slate-100"
          }`}
        >
          <LayoutGrid size={17} strokeWidth={2} />
          Perfiles
        </Link>
        <Link
          href="/dashboard/activity"
          className={`flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
            isActivity
              ? "bg-accent-soft text-accent shadow-[inset_0_0_0_1px_var(--accent-glow)]"
              : "text-text-secondary hover:bg-surface-2 hover:text-slate-100"
          }`}
        >
          <Activity size={17} strokeWidth={2} />
          Actividad
          {unreadCount > 0 && (
            <span className="ml-auto flex h-4 min-w-4 items-center justify-center rounded-full bg-critical px-1 text-[10px] font-semibold text-white">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </Link>
      </nav>

      <div className="border-t border-border-soft p-3">
        <div className="flex items-center gap-2.5 rounded-md px-3 py-2">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-surface-2 text-xs font-semibold text-text-secondary">
            {(user?.email || "?").charAt(0).toUpperCase()}
          </div>
          <p className="truncate text-xs text-text-secondary">{user?.email}</p>
        </div>
        <button
          onClick={() => logout()}
          className="mt-1 flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-left text-sm text-text-secondary hover:bg-surface-2 hover:text-slate-100"
        >
          <LogOut size={16} strokeWidth={2} />
          Cerrar sesión
        </button>
      </div>
    </aside>
  );
}
