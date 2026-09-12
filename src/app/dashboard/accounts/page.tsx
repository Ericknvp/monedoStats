"use client";

import { useState } from "react";
import Link from "next/link";
import { formatCurrency, formatDate } from "@/lib/format";
import { ErrorBanner } from "@/components/ErrorBanner";
import { Pagination } from "@/components/Pagination";
import { Icon } from "@/components/Icon";
import { useActivityFeed } from "@/hooks/useActivityFeed";

const ACCOUNTS_PAGE_SIZE = 15;

type SortOption = "recent" | "oldest" | "az" | "za" | "highest" | "lowest";

const SORT_LABELS: Record<SortOption, string> = {
  recent: "Más reciente",
  oldest: "Menos reciente",
  az: "Nombre (A-Z)",
  za: "Nombre (Z-A)",
  highest: "Mayor saldo",
  lowest: "Menor saldo",
};

export default function AccountsPage() {
  const { accounts, usersMap, loading, error } = useActivityFeed();
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState<SortOption>("recent");

  const sorted = [...accounts].sort((a, b) => {
    switch (sortBy) {
      case "oldest":
        return a.createdAt < b.createdAt ? -1 : 1;
      case "az":
        return a.name.localeCompare(b.name);
      case "za":
        return b.name.localeCompare(a.name);
      case "highest":
        return b.balance - a.balance;
      case "lowest":
        return a.balance - b.balance;
      case "recent":
      default:
        return a.createdAt < b.createdAt ? 1 : -1;
    }
  });

  const totalPages = Math.max(1, Math.ceil(sorted.length / ACCOUNTS_PAGE_SIZE));
  const paged = sorted.slice(
    (page - 1) * ACCOUNTS_PAGE_SIZE,
    page * ACCOUNTS_PAGE_SIZE,
  );

  if (error) {
    return <ErrorBanner message={error} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-lg font-bold text-text-primary">
            Cuentas
          </h1>
          <p className="text-sm text-text-secondary">
            Últimas cuentas registradas por todos los usuarios.
          </p>
        </div>
        <div className="relative">
          <Icon
            name="sort"
            size={18}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
          />
          <select
            value={sortBy}
            onChange={(e) => {
              setSortBy(e.target.value as SortOption);
              setPage(1);
            }}
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

      <section className="card-shadow rounded-2xl border border-border-soft bg-surface">
        <h2 className="flex items-center gap-2 border-b border-border-soft px-4 py-3 text-sm font-semibold text-text-primary">
          <Icon name="account_balance" size={18} className="text-accent" />
          Últimas cuentas registradas
        </h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-border-soft">
            <thead className="bg-surface-2">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wide text-text-muted">
                  Cuenta
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wide text-text-muted">
                  Usuario
                </th>
                <th className="px-4 py-2 text-right text-xs font-medium uppercase tracking-wide text-text-muted">
                  Saldo
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wide text-text-muted">
                  Creada
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-soft">
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i}>
                    <td colSpan={4} className="px-4 py-3">
                      <div className="h-4 w-full animate-pulse rounded bg-surface-2" />
                    </td>
                  </tr>
                ))
              ) : accounts.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-4 py-10 text-center text-sm text-text-muted"
                  >
                    Sin cuentas registradas.
                  </td>
                </tr>
              ) : (
                paged.map((a) => (
                  <tr
                    key={a.id}
                    className="transition-colors hover:bg-surface-2"
                  >
                    <td className="px-4 py-2 text-sm text-text-primary">
                      {a.name}
                    </td>
                    <td className="px-4 py-2 text-sm">
                      <Link
                        href={`/dashboard/profile/${a.userId}`}
                        className="text-text-secondary hover:text-accent"
                      >
                        {usersMap[a.userId] || a.userId}
                      </Link>
                    </td>
                    <td className="px-4 py-2 text-right text-sm tabular-nums text-text-primary">
                      {formatCurrency(a.balance)}
                    </td>
                    <td className="px-4 py-2 text-sm text-text-secondary">
                      {formatDate(a.createdAt)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {!loading && (
          <Pagination page={page} totalPages={totalPages} onChange={setPage} />
        )}
      </section>
    </div>
  );
}
