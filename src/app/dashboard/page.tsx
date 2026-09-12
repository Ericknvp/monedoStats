"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { AppUser } from "@/lib/types";
import { formatDate } from "@/lib/format";
import { ErrorBanner, permissionErrorMessage } from "@/components/ErrorBanner";
import { Icon } from "@/components/Icon";

type SortOption = "recent" | "oldest" | "az" | "za";

const SORT_LABELS: Record<SortOption, string> = {
  recent: "Más reciente",
  oldest: "Menos reciente",
  az: "Nombre (A-Z)",
  za: "Nombre (Z-A)",
};

export default function ProfilesPage() {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("recent");
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

  const filtered = users
    .filter((u) => {
      const term = search.toLowerCase();
      return (
        u.username?.toLowerCase().includes(term) ||
        u.email?.toLowerCase().includes(term)
      );
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "oldest":
          return a.createdAt < b.createdAt ? -1 : 1;
        case "az":
          return (a.username || "").localeCompare(b.username || "");
        case "za":
          return (b.username || "").localeCompare(a.username || "");
        case "recent":
        default:
          return a.createdAt < b.createdAt ? 1 : -1;
      }
    });

  if (error) {
    return <ErrorBanner message={error} />;
  }

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-lg font-bold text-text-primary">
            Perfiles
          </h1>
          <p className="text-sm text-text-secondary">
            {users.length} usuario{users.length === 1 ? "" : "s"} registrado
            {users.length === 1 ? "" : "s"}
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative">
            <Icon
              name="search"
              size={18}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
            />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nombre o email…"
              className="w-full rounded-full border border-border-soft bg-surface py-2 pl-10 pr-4 text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent sm:w-64"
            />
          </div>
          <div className="relative">
            <Icon
              name="sort"
              size={18}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
            />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="w-full appearance-none rounded-full border border-border-soft bg-surface py-2 pl-10 pr-8 text-sm text-text-primary focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent sm:w-48"
            >
              {(Object.keys(SORT_LABELS) as SortOption[]).map((key) => (
                <option key={key} value={key}>
                  {SORT_LABELS[key]}
                </option>
              ))}
            </select>
            <Icon
              name="expand_more"
              size={18}
              className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted"
            />
          </div>
        </div>
      </div>

      <div className="card-shadow mt-6 overflow-hidden rounded-2xl border border-border-soft bg-surface">
        <div className="overflow-x-auto">
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
                    <Icon
                      name="group"
                      size={28}
                      className="mx-auto mb-2 text-text-muted"
                    />
                    <p className="text-sm text-text-muted">Sin resultados.</p>
                  </td>
                </tr>
              ) : (
                filtered.map((u) => (
                  <tr
                    key={u.id}
                    className="transition-colors hover:bg-surface-2"
                  >
                    <td className="px-4 py-3">
                      <Link
                        href={`/dashboard/profile/${u.id}`}
                        className="flex items-center gap-3 font-medium text-text-primary hover:text-accent"
                      >
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-semibold text-on-accent">
                          {(u.username || u.email || "?")
                            .charAt(0)
                            .toUpperCase()}
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
    </div>
  );
}
