"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { collection, getDocs, limit, orderBy, query } from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  Account,
  Budget,
  Category,
  FeedEvent,
  Goal,
  Transaction,
} from "@/lib/types";
import { formatCurrency, formatDate, timeAgo } from "@/lib/format";
import { ErrorBanner, permissionErrorMessage } from "@/components/ErrorBanner";
import { Pagination } from "@/components/Pagination";
import { Icon } from "@/components/Icon";
import { FeedEventIcon } from "@/components/FeedEventIcon";
import { useNotifications } from "@/contexts/NotificationContext";

const HISTORY_TX_LIMIT = 30;
const HISTORY_GOALS_LIMIT = 20;
const HISTORY_ACCOUNTS_LIMIT = 20;
const HISTORY_BUDGETS_LIMIT = 20;
const HISTORY_CATEGORIES_LIMIT = 20;
const ACCOUNTS_PAGE_SIZE = 10;
const FEED_PAGE_SIZE = 15;

export default function ActivityPage() {
  const { events: liveEvents, markAllRead } = useNotifications();
  const [usersMap, setUsersMap] = useState<Record<string, string>>({});
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [historicalEvents, setHistoricalEvents] = useState<FeedEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [accountsPage, setAccountsPage] = useState(1);
  const [feedPage, setFeedPage] = useState(1);

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

        const [txSnap, goalsSnap, accountsSnap, budgetsSnap, categoriesSnap] =
          await Promise.all([
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
            getDocs(
              query(
                collection(db, "budgets"),
                orderBy("createdAt", "desc"),
                limit(HISTORY_BUDGETS_LIMIT),
              ),
            ),
            getDocs(
              query(
                collection(db, "categories"),
                orderBy("createdAt", "desc"),
                limit(HISTORY_CATEGORIES_LIMIT),
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
            entity: "transaction",
            action: "created",
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
            entity: "goal",
            action: "created",
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
            entity: "account",
            action: "created",
            userId: a.userId,
            username,
            message: `${username} creó una nueva cuenta: "${a.name}"`,
            createdAt: Date.parse(a.createdAt) || 0,
          };
        });

        const budgetEvents: FeedEvent[] = budgetsSnap.docs.map((d) => {
          const data = d.data() as Budget;
          const username = nameFor(data.userId);
          return {
            id: `budget-${d.id}`,
            entity: "budget",
            action: "created",
            userId: data.userId,
            username,
            message: `${username} creó un presupuesto de "${data.category}": ${formatCurrency(
              data.monthlyLimit || 0,
            )}/mes`,
            createdAt: Date.parse(data.createdAt) || 0,
          };
        });

        const categoryEvents: FeedEvent[] = categoriesSnap.docs.map((d) => {
          const data = d.data() as Category;
          const username = nameFor(data.userId);
          return {
            id: `category-${d.id}`,
            entity: "category",
            action: "created",
            userId: data.userId,
            username,
            message: `${username} creó una categoría: "${data.name}"`,
            createdAt: Date.parse(data.createdAt) || 0,
          };
        });

        const merged = [
          ...txEvents,
          ...goalEvents,
          ...accountEvents,
          ...budgetEvents,
          ...categoryEvents,
        ].sort((a, b) => b.createdAt - a.createdAt);
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

  const accountsTotalPages = Math.max(
    1,
    Math.ceil(accounts.length / ACCOUNTS_PAGE_SIZE),
  );
  const pagedAccounts = accounts.slice(
    (accountsPage - 1) * ACCOUNTS_PAGE_SIZE,
    accountsPage * ACCOUNTS_PAGE_SIZE,
  );

  const feedTotalPages = Math.max(1, Math.ceil(feed.length / FEED_PAGE_SIZE));
  const pagedFeed = feed.slice(
    (feedPage - 1) * FEED_PAGE_SIZE,
    feedPage * FEED_PAGE_SIZE,
  );

  if (error) {
    return <ErrorBanner message={error} />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-lg font-bold text-text-primary">
          Actividad
        </h1>
        <p className="text-sm text-text-secondary">
          Cuentas nuevas y actividad reciente de todos los usuarios.
        </p>
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
                pagedAccounts.map((a) => (
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
          <Pagination
            page={accountsPage}
            totalPages={accountsTotalPages}
            onChange={setAccountsPage}
          />
        )}
      </section>

      <section className="card-shadow rounded-2xl border border-border-soft bg-surface">
        <h2 className="border-b border-border-soft px-4 py-3 text-sm font-semibold text-text-primary">
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
            {pagedFeed.map((evt) => (
              <li key={evt.id}>
                <Link
                  href={`/dashboard/profile/${evt.userId}`}
                  className="flex items-start gap-3 px-4 py-3 text-sm hover:bg-surface-2"
                >
                  <span className="mt-0.5 shrink-0">
                    <FeedEventIcon event={evt} />
                  </span>
                  <span>
                    <p className="text-text-primary">{evt.message}</p>
                    <p className="mt-0.5 text-xs text-text-muted">
                      {timeAgo(evt.createdAt)}
                    </p>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
        {!loading && (
          <Pagination
            page={feedPage}
            totalPages={feedTotalPages}
            onChange={setFeedPage}
          />
        )}
      </section>
    </div>
  );
}
