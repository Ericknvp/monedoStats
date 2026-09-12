"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { Search, Users } from "lucide-react";
import { db } from "@/lib/firebase";
import { AppUser } from "@/lib/types";
import { formatDate } from "@/lib/format";
import { ErrorBanner, permissionErrorMessage } from "@/components/ErrorBanner";

export default function ProfilesPage() {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const q = query(collection(db, "users"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(
      q,
      (snap) => {
        setUsers(
          snap.docs.map((d) => ({
            id: d.id,
            ...(d.data() as Omit<AppUser, "id">),
          })),
        );
        setLoading(false);
      },
      (err) => {
        setError(permissionErrorMessage(err));
        setLoading(false);
      },
    );
    return () => unsub();
  }, []);

  const filtered = users.filter((u) => {
    const term = search.toLowerCase();
    return (
      u.username?.toLowerCase().includes(term) ||
      u.email?.toLowerCase().includes(term)
    );
  });

  if (error) {
    return <ErrorBanner message={error} />;
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-slate-100">Perfiles</h1>
          <p className="text-sm text-text-secondary">
            {users.length} usuario{users.length === 1 ? "" : "s"} registrado
            {users.length === 1 ? "" : "s"}
          </p>
        </div>
        <div className="relative">
          <Search
            size={15}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
          />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre o email…"
            className="w-64 rounded-md border border-border-soft bg-surface py-2 pl-9 pr-3 text-sm text-slate-100 placeholder:text-text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
          />
        </div>
      </div>

      <div className="glow-ring mt-6 overflow-hidden rounded-lg border border-border-soft bg-surface">
        <table className="min-w-full divide-y divide-border-soft">
          <thead className="bg-surface-2">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-text-muted">
                Usuario
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-text-muted">
                Email
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-text-muted">
                Moneda
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-text-muted">
                Registrado
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-soft">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  <td colSpan={4} className="px-4 py-3">
                    <div className="h-4 w-full animate-pulse rounded bg-surface-2" />
                  </td>
                </tr>
              ))
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center">
                  <Users
                    size={22}
                    className="mx-auto mb-2 text-text-muted"
                    strokeWidth={1.5}
                  />
                  <p className="text-sm text-text-muted">Sin resultados.</p>
                </td>
              </tr>
            ) : (
              filtered.map((u) => (
                <tr key={u.id} className="transition-colors hover:bg-surface-2">
                  <td className="px-4 py-3">
                    <Link
                      href={`/dashboard/profile/${u.id}`}
                      className="flex items-center gap-3 font-medium text-slate-100 hover:text-accent"
                    >
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-accent to-accent-dark text-xs font-semibold text-white">
                        {(u.username || u.email || "?").charAt(0).toUpperCase()}
                      </span>
                      {u.username || "(sin nombre)"}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-sm text-text-secondary">
                    {u.email}
                  </td>
                  <td className="px-4 py-3 text-sm text-text-secondary">
                    {u.currency || "—"}
                  </td>
                  <td className="px-4 py-3 text-sm text-text-secondary">
                    {u.createdAt ? formatDate(u.createdAt) : "—"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
