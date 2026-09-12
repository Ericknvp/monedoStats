"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
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
          <h1 className="text-lg font-semibold text-slate-900">Perfiles</h1>
          <p className="text-sm text-slate-500">
            {users.length} usuario{users.length === 1 ? "" : "s"} registrado
            {users.length === 1 ? "" : "s"}
          </p>
        </div>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nombre o email…"
          className="w-64 rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
        />
      </div>

      <div className="mt-6 overflow-hidden rounded-lg border border-slate-200 bg-white">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                Usuario
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                Email
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                Moneda
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                Registrado
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td
                  colSpan={4}
                  className="px-4 py-6 text-center text-sm text-slate-400"
                >
                  Cargando…
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td
                  colSpan={4}
                  className="px-4 py-6 text-center text-sm text-slate-400"
                >
                  Sin resultados.
                </td>
              </tr>
            ) : (
              filtered.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <Link
                      href={`/dashboard/profile/${u.id}`}
                      className="font-medium text-slate-900 hover:underline"
                    >
                      {u.username || "(sin nombre)"}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600">
                    {u.email}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600">
                    {u.currency || "—"}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600">
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
