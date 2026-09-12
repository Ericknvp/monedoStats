"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

export function Sidebar() {
  const pathname = usePathname();
  const { logout, user } = useAuth();
  const isProfiles = pathname === "/dashboard";

  return (
    <aside className="flex h-full w-60 shrink-0 flex-col border-r border-slate-200 bg-white">
      <div className="border-b border-slate-200 px-5 py-4">
        <p className="text-sm font-semibold text-slate-900">Monedo Admin</p>
        <p className="mt-0.5 truncate text-xs text-slate-500">{user?.email}</p>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4">
        <Link
          href="/dashboard"
          className={`block rounded-md px-3 py-2 text-sm font-medium ${
            isProfiles
              ? "bg-slate-900 text-white"
              : "text-slate-700 hover:bg-slate-100"
          }`}
        >
          Perfiles
        </Link>
      </nav>

      <div className="border-t border-slate-200 p-3">
        <button
          onClick={() => logout()}
          className="w-full rounded-md px-3 py-2 text-left text-sm text-slate-600 hover:bg-slate-100"
        >
          Cerrar sesión
        </button>
      </div>
    </aside>
  );
}
