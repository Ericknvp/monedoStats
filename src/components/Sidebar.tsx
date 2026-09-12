"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useNotifications } from "@/contexts/NotificationContext";
import { Icon } from "@/components/Icon";

export function Sidebar({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const pathname = usePathname();
  const { logout, user } = useAuth();
  const { unreadCount } = useNotifications();
  const isProfiles = pathname === "/dashboard";
  const isActivity = pathname === "/dashboard/activity";

  return (
    <>
      {open && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-30 bg-black/40 md:hidden"
          aria-hidden="true"
        />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex h-full w-64 shrink-0 flex-col bg-primary transition-transform duration-200 md:static md:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center gap-2.5 px-5 py-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-accent text-on-accent">
            <Icon name="account_balance_wallet" size={20} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-display text-base font-bold text-on-primary">
              MonedoStats
            </p>
          </div>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-full text-on-primary/70 hover:bg-white/10 hover:text-on-primary md:hidden"
            aria-label="Cerrar menú"
          >
            <Icon name="close" size={18} />
          </button>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-3">
          <Link
            href="/dashboard"
            onClick={onClose}
            className={`flex items-center gap-2.5 rounded-full px-4 py-2.5 text-sm font-medium transition-colors ${
              isProfiles
                ? "bg-accent text-on-accent"
                : "text-on-primary/70 hover:bg-white/10 hover:text-on-primary"
            }`}
          >
            <Icon name="grid_view" size={19} filled={isProfiles} />
            Perfiles
          </Link>
          <Link
            href="/dashboard/activity"
            onClick={onClose}
            className={`flex items-center gap-2.5 rounded-full px-4 py-2.5 text-sm font-medium transition-colors ${
              isActivity
                ? "bg-accent text-on-accent"
                : "text-on-primary/70 hover:bg-white/10 hover:text-on-primary"
            }`}
          >
            <Icon name="history" size={19} filled={isActivity} />
            Actividad
            {unreadCount > 0 && (
              <span className="ml-auto flex h-4 min-w-4 items-center justify-center rounded-full bg-critical px-1 text-[10px] font-semibold text-white">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </Link>
        </nav>

        <div className="border-t border-white/10 p-3">
          <div className="flex items-center gap-2.5 rounded-full px-3 py-2">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/10 text-xs font-semibold text-on-primary">
              {(user?.email || "?").charAt(0).toUpperCase()}
            </div>
            <p className="truncate text-xs text-on-primary/70">{user?.email}</p>
          </div>
          <button
            onClick={() => logout()}
            className="mt-1 flex w-full items-center gap-2.5 rounded-full px-4 py-2 text-left text-sm text-on-primary/70 hover:bg-white/10 hover:text-on-primary"
          >
            <Icon name="logout" size={18} />
            Cerrar sesión
          </button>
        </div>
      </aside>
    </>
  );
}
