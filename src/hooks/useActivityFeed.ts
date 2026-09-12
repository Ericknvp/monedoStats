"use client";

import { useEffect, useMemo, useState } from "react";
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
import { formatCurrency } from "@/lib/format";
import { useNotifications } from "@/contexts/NotificationContext";
import { permissionErrorMessage } from "@/components/ErrorBanner";

const HISTORY_TX_LIMIT = 30;
const HISTORY_GOALS_LIMIT = 20;
const HISTORY_ACCOUNTS_LIMIT = 20;
const HISTORY_BUDGETS_LIMIT = 20;
const HISTORY_CATEGORIES_LIMIT = 20;

export function useActivityFeed() {
  const { events: liveEvents } = useNotifications();
  const [usersMap, setUsersMap] = useState<Record<string, string>>({});
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [historicalEvents, setHistoricalEvents] = useState<FeedEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  return { usersMap, accounts, feed, loading, error };
}
