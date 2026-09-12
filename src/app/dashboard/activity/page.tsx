"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { collection, getDocs, limit, orderBy, query } from "firebase/firestore";
import { ArrowDownCircle, ArrowUpCircle, Landmark, Target } from "lucide-react";
import { db } from "@/lib/firebase";
import { Account, FeedEvent, Goal, Transaction } from "@/lib/types";
import { formatCurrency, formatDate, timeAgo } from "@/lib/format";
import { ErrorBanner, permissionErrorMessage } from "@/components/ErrorBanner";
import { useNotifications } from "@/contexts/NotificationContext";

const HISTORY_TX_LIMIT = 30;
const HISTORY_GOALS_LIMIT = 20;
const HISTORY_ACCOUNTS_LIMIT = 20;

export default function ActivityPage() {
  const { events: liveEvents, markAllRead } = useNotifications();
  const [usersMap, setUsersMap] = useState<Record<string, string>>({});
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [historicalEvents, setHistoricalEvents] = useState<FeedEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    markAllRead();
  }, [markAllRead]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const usersSnap = await getDocs(collection(db, "users"));
        const map: Record<string, string> = {};
        usersSnap.forEach((d) => {
          const data = d.data();
          map[d.id] = data.username || data.email || d.id;
        });
        if (cancelled) return;
        setUsersMap(map);
        const nameFor = (uid: string) => map[uid] || "Un usuario";

        const [txSnap, goalsSnap, accountsSnap] = await Promise.all([
          getDocs(
            query(
              collection(db, "transactions"),
              orderBy("date", "desc"),
              limit(HISTORY_TX_LIMIT),
            ),
          ),
          getDocs(
            query(
              collection(db, "goals"),
              orderBy("createdAt", "desc"),
              limit(HISTORY_GOALS_LIMIT),
            ),
          ),
          getDocs(
            query(
              collection(db, "accounts"),
              orderBy("createdAt", "desc"),
              limit(HISTORY_ACCOUNTS_LIMIT),
            ),
          ),
        ]);
        if (cancelled) return;

        const accountDocs = accountsSnap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<Account, "id">),
        }));
        setAccounts(accountDocs);

        const txEvents: FeedEvent[] = txSnap.docs.map((d) => {
          const data = d.data() as Transaction;
          const username = nameFor(data.userId);
          const kind = data.isIncome ? "un ingreso" : "un gasto";
          return {
            id: `tx-${d.id}`,
            type: "transaction",
            userId: data.userId,
            username,
            positive: data.isIncome,
            message: `${username} registró ${kind} de ${formatCurrency(
              data.amount || 0,
            )} en ${data.category || "Sin categoría"}`,
            createdAt: Date.parse(data.date) || 0,
          };
        });

        const goalEvents: FeedEvent[] = goalsSnap.docs.map((d) => {
          const data = d.data() as Goal;
          const username = nameFor(data.userId);
          return {
            id: `goal-${d.id}`,
            type: "goal_created",
            userId: data.userId,
            username,
            message: `${username} creó una nueva meta: "${data.title}"`,
            createdAt: Date.parse(data.createdAt) || 0,
          };
        });

        const accountEvents: FeedEvent[] = accountDocs.map((a) => {
          const username = nameFor(a.userId);
          return {
            id: `account-${a.id}`,
            type: "account_created",
            userId: a.userId,
            username,
            message: `${username} creó una nueva cuenta: "${a.name}"`,
            createdAt: Date.parse(a.createdAt) || 0,
          };
        });

        const merged = [...txEvents, ...goalEvents, ...accountEvents].sort(
          (a, b) => b.createdAt - a.createdAt,
        );
        setHistoricalEvents(merged);
      } catch (err) {
        if (!cancelled) setError(permissionErrorMessage(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const feed = useMemo(() => {
    const liveIds = new Set(liveEvents.map((e) => e.id));
    return [
      ...liveEvents,
      ...historicalEvents.filter((e) => !liveIds.has(e.id)),
    ];
  }, [liveEvents, historicalEvents]);

  if (error) {
    return <ErrorBanner message={error} />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-slate-100">Actividad</h1>
        <p className="text-sm text-text-secondary">
          Cuentas nuevas y actividad reciente de todos los usuarios.
        </p>
      </div>

      <section className="glow-ring rounded-lg border border-border-soft bg-surface">
        <h2 className="flex items-center gap-2 border-b border-border-soft px-4 py-3 text-sm font-semibold text-slate-200">
          <Landmark size={16} className="text-accent" />
          Últimas cuentas registradas
        </h2>
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
              Array.from({ length: 4 }).map((_, i) => (
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
                  className="px-4 py-8 text-center text-sm text-text-muted"
                >
                  Sin cuentas registradas.
                </td>
              </tr>
            ) : (
              accounts.map((a) => (
                <tr key={a.id} className="transition-colors hover:bg-surface-2">
                  <td className="px-4 py-2 text-sm text-slate-200">{a.name}</td>
                  <td className="px-4 py-2 text-sm">
                    <Link
                      href={`/dashboard/profile/${a.userId}`}
                      className="text-text-secondary hover:text-accent"
                    >
                      {usersMap[a.userId] || a.userId}
                    </Link>
                  </td>
                  <td className="px-4 py-2 text-right text-sm tabular-nums text-slate-200">
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
      </section>

      <section className="glow-ring rounded-lg border border-border-soft bg-surface">
        <h2 className="border-b border-border-soft px-4 py-3 text-sm font-semibold text-slate-200">
          Actividad reciente
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
        ) : feed.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-text-muted">
            Sin actividad todavía.
          </p>
        ) : (
          <ul className="divide-y divide-border-soft">
            {feed.map((evt) => (
              <li key={evt.id}>
                <Link
                  href={`/dashboard/profile/${evt.userId}`}
                  className="flex items-start gap-3 px-4 py-3 text-sm hover:bg-surface-2"
                >
                  <span className="mt-0.5 shrink-0">
                    <FeedIcon event={evt} />
                  </span>
                  <span>
                    <p className="text-slate-200">{evt.message}</p>
                    <p className="mt-0.5 text-xs text-text-muted">
                      {timeAgo(evt.createdAt)}
                    </p>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function FeedIcon({ event }: { event: FeedEvent }) {
  if (event.type === "transaction") {
    return event.positive ? (
      <ArrowDownCircle size={18} className="text-good" strokeWidth={2} />
    ) : (
      <ArrowUpCircle size={18} className="text-critical" strokeWidth={2} />
    );
  }
  if (event.type === "account_created") {
    return <Landmark size={18} className="text-accent" strokeWidth={2} />;
  }
  return <Target size={18} className="text-accent" strokeWidth={2} />;
}
