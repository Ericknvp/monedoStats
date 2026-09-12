"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ErrorBanner } from "@/components/ErrorBanner";
import { Pagination } from "@/components/Pagination";
import { Icon } from "@/components/Icon";
import { useActivityFeed } from "@/hooks/useActivityFeed";

const RANKING_PAGE_SIZE = 10;

export default function RankingPage() {
  const { feed, loading, error } = useActivityFeed();
  const [page, setPage] = useState(1);

  const leaderboard = useMemo(() => {
    const byUser = new Map<string, { username: string; count: number }>();
    for (const evt of feed) {
      const entry = byUser.get(evt.userId) || {
        username: evt.username,
        count: 0,
      };
      entry.count += 1;
      entry.username = evt.username;
      byUser.set(evt.userId, entry);
    }
    return Array.from(byUser.entries())
      .map(([userId, v]) => ({ userId, ...v }))
      .sort((a, b) => b.count - a.count);
  }, [feed]);

  const totalPages = Math.max(
    1,
    Math.ceil(leaderboard.length / RANKING_PAGE_SIZE),
  );
  const paged = leaderboard.slice(
    (page - 1) * RANKING_PAGE_SIZE,
    page * RANKING_PAGE_SIZE,
  );

  if (error) {
    return <ErrorBanner message={error} />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-lg font-bold text-text-primary">
          Ranking
        </h1>
        <p className="text-sm text-text-secondary">
          Usuarios con más actividad reciente: movimientos, ediciones, borrados,
          cuentas, metas, presupuestos y categorías cuentan por igual.
        </p>
      </div>

      <section className="card-shadow rounded-2xl border border-border-soft bg-surface">
        <h2 className="flex items-center gap-2 border-b border-border-soft px-4 py-3 text-sm font-semibold text-text-primary">
          <Icon
            name="local_fire_department"
            size={18}
            className="text-accent"
          />
          Más activos recientemente
        </h2>
        {loading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="h-4 w-full animate-pulse rounded bg-surface-2"
              />
            ))}
          </div>
        ) : leaderboard.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-text-muted">
            Sin actividad todavía.
          </p>
        ) : (
          <ul className="divide-y divide-border-soft">
            {paged.map((u, i) => {
              const rank = (page - 1) * RANKING_PAGE_SIZE + i;
              return (
                <li key={u.userId}>
                  <Link
                    href={`/dashboard/profile/${u.userId}`}
                    className="flex items-center gap-3 px-4 py-3 text-sm hover:bg-surface-2"
                  >
                    <span
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                        rank === 0
                          ? "bg-accent text-on-accent"
                          : "bg-surface-2 text-text-secondary"
                      }`}
                    >
                      {rank + 1}
                    </span>
                    <span className="flex-1 font-medium text-text-primary">
                      {u.username}
                    </span>
                    <span className="text-xs text-text-muted">
                      {u.count} evento{u.count === 1 ? "" : "s"}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
        {!loading && (
          <Pagination page={page} totalPages={totalPages} onChange={setPage} />
        )}
      </section>
    </div>
  );
}
