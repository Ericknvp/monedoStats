"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  ReactNode,
} from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { formatCurrency } from "@/lib/format";
import { FeedEvent } from "@/lib/types";
import { FeedEventIcon } from "@/components/FeedEventIcon";

const MAX_EVENTS = 200;
const TOAST_DURATION_MS = 6000;

interface NotificationContextValue {
  events: FeedEvent[];
  unreadCount: number;
  markAllRead: () => void;
  resolveUsername: (userId: string) => string;
}

const NotificationContext = createContext<NotificationContextValue>({
  events: [],
  unreadCount: 0,
  markAllRead: () => {},
  resolveUsername: (userId) => userId,
});

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [events, setEvents] = useState<FeedEvent[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [toasts, setToasts] = useState<FeedEvent[]>([]);

  const usersMapRef = useRef<Record<string, string>>({});
  const userFieldsRef = useRef<
    Record<string, { username?: string; currency?: string }>
  >({});
  const goalAmountsRef = useRef<Record<string, number>>({});
  const isInitialTx = useRef(true);
  const isInitialGoals = useRef(true);
  const isInitialAccounts = useRef(true);
  const isInitialBudgets = useRef(true);
  const isInitialCategories = useRef(true);
  const isInitialUsers = useRef(true);

  const markAllRead = useCallback(() => setUnreadCount(0), []);

  function pushEvent(evt: Omit<FeedEvent, "id" | "createdAt">) {
    const fullEvent: FeedEvent = {
      ...evt,
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      createdAt: Date.now(),
    };
    setEvents((prev) => [fullEvent, ...prev].slice(0, MAX_EVENTS));
    setUnreadCount((c) => c + 1);
    setToasts((prev) => [...prev, fullEvent]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== fullEvent.id));
    }, TOAST_DURATION_MS);
  }

  function usernameFor(userId: string): string {
    return usersMapRef.current[userId] || "Un usuario";
  }

  useEffect(() => {
    if (!user) return;

    const unsubUsers = onSnapshot(
      collection(db, "users"),
      (snap) => {
        snap.docChanges().forEach((change) => {
          const data = change.doc.data();
          usersMapRef.current[change.doc.id] =
            data.username || data.email || change.doc.id;

          if (isInitialUsers.current) {
            userFieldsRef.current[change.doc.id] = {
              username: data.username,
              currency: data.currency,
            };
            return;
          }

          if (change.type === "modified") {
            const prev = userFieldsRef.current[change.doc.id] || {};
            const parts: string[] = [];
            if (data.username && data.username !== prev.username) {
              parts.push(`cambió su nombre a "${data.username}"`);
            }
            if (data.currency && data.currency !== prev.currency) {
              parts.push(`cambió su moneda a ${data.currency}`);
            }
            userFieldsRef.current[change.doc.id] = {
              username: data.username,
              currency: data.currency,
            };
            if (parts.length > 0) {
              const username = usernameFor(change.doc.id);
              pushEvent({
                entity: "user",
                action: "modified",
                userId: change.doc.id,
                username,
                message: `${username} ${parts.join(" y ")}`,
              });
            }
          }
        });
        isInitialUsers.current = false;
      },
      (err) => console.error("users listener failed:", err),
    );

    const unsubTx = onSnapshot(
      collection(db, "transactions"),
      (snap) => {
        if (isInitialTx.current) {
          isInitialTx.current = false;
          return;
        }
        snap.docChanges().forEach((change) => {
          const data = change.doc.data();
          const username = usernameFor(data.userId);
          const kind = data.isIncome ? "un ingreso" : "un gasto";
          const amountStr = formatCurrency(data.amount || 0);
          const category = data.category || "Sin categoría";
          if (change.type === "added") {
            pushEvent({
              entity: "transaction",
              action: "created",
              userId: data.userId,
              username,
              positive: !!data.isIncome,
              message: `${username} registró ${kind} de ${amountStr} en ${category}`,
            });
          } else if (change.type === "modified") {
            pushEvent({
              entity: "transaction",
              action: "modified",
              userId: data.userId,
              username,
              positive: !!data.isIncome,
              message: `${username} editó un movimiento: "${data.title}" (${amountStr} en ${category})`,
            });
          } else if (change.type === "removed") {
            pushEvent({
              entity: "transaction",
              action: "deleted",
              userId: data.userId,
              username,
              positive: !!data.isIncome,
              message: `${username} eliminó un movimiento: "${data.title}" (${amountStr} en ${category})`,
            });
          }
        });
      },
      (err) => console.error("transactions listener failed:", err),
    );

    const unsubGoals = onSnapshot(
      collection(db, "goals"),
      (snap) => {
        if (isInitialGoals.current) {
          snap.forEach((doc) => {
            goalAmountsRef.current[doc.id] = doc.data().savedAmount || 0;
          });
          isInitialGoals.current = false;
          return;
        }
        snap.docChanges().forEach((change) => {
          const data = change.doc.data();
          const username = usernameFor(data.userId);
          if (change.type === "added") {
            goalAmountsRef.current[change.doc.id] = data.savedAmount || 0;
            pushEvent({
              entity: "goal",
              action: "created",
              userId: data.userId,
              username,
              message: `${username} creó una nueva meta: "${data.title}"`,
            });
          } else if (change.type === "modified") {
            const prevAmount =
              goalAmountsRef.current[change.doc.id] ?? data.savedAmount;
            const diff = (data.savedAmount || 0) - prevAmount;
            goalAmountsRef.current[change.doc.id] = data.savedAmount || 0;
            const message =
              diff > 0
                ? `${username} aportó ${formatCurrency(diff)} a su meta "${data.title}"`
                : `${username} actualizó su meta "${data.title}"`;
            pushEvent({
              entity: "goal",
              action: "modified",
              userId: data.userId,
              username,
              message,
            });
          } else if (change.type === "removed") {
            delete goalAmountsRef.current[change.doc.id];
            pushEvent({
              entity: "goal",
              action: "deleted",
              userId: data.userId,
              username,
              message: `${username} eliminó la meta "${data.title}"`,
            });
          }
        });
      },
      (err) => console.error("goals listener failed:", err),
    );

    const unsubAccounts = onSnapshot(
      collection(db, "accounts"),
      (snap) => {
        if (isInitialAccounts.current) {
          isInitialAccounts.current = false;
          return;
        }
        snap.docChanges().forEach((change) => {
          const data = change.doc.data();
          const username = usernameFor(data.userId);
          if (change.type === "added") {
            pushEvent({
              entity: "account",
              action: "created",
              userId: data.userId,
              username,
              message: `${username} creó una nueva cuenta: "${data.name}"`,
            });
          } else if (change.type === "modified") {
            pushEvent({
              entity: "account",
              action: "modified",
              userId: data.userId,
              username,
              message: `${username} editó su cuenta "${data.name}"`,
            });
          } else if (change.type === "removed") {
            pushEvent({
              entity: "account",
              action: "deleted",
              userId: data.userId,
              username,
              message: `${username} eliminó la cuenta "${data.name}"`,
            });
          }
        });
      },
      (err) => console.error("accounts listener failed:", err),
    );

    const unsubBudgets = onSnapshot(
      collection(db, "budgets"),
      (snap) => {
        if (isInitialBudgets.current) {
          isInitialBudgets.current = false;
          return;
        }
        snap.docChanges().forEach((change) => {
          const data = change.doc.data();
          const username = usernameFor(data.userId);
          const amountStr = formatCurrency(data.monthlyLimit || 0);
          if (change.type === "added") {
            pushEvent({
              entity: "budget",
              action: "created",
              userId: data.userId,
              username,
              message: `${username} creó un presupuesto de "${data.category}": ${amountStr}/mes`,
            });
          } else if (change.type === "modified") {
            pushEvent({
              entity: "budget",
              action: "modified",
              userId: data.userId,
              username,
              message: `${username} editó su presupuesto de "${data.category}": ${amountStr}/mes`,
            });
          } else if (change.type === "removed") {
            pushEvent({
              entity: "budget",
              action: "deleted",
              userId: data.userId,
              username,
              message: `${username} eliminó el presupuesto de "${data.category}"`,
            });
          }
        });
      },
      (err) => console.error("budgets listener failed:", err),
    );

    const unsubCategories = onSnapshot(
      collection(db, "categories"),
      (snap) => {
        if (isInitialCategories.current) {
          isInitialCategories.current = false;
          return;
        }
        snap.docChanges().forEach((change) => {
          const data = change.doc.data();
          const username = usernameFor(data.userId);
          if (change.type === "added") {
            pushEvent({
              entity: "category",
              action: "created",
              userId: data.userId,
              username,
              message: `${username} creó una categoría: "${data.name}"`,
            });
          } else if (change.type === "modified") {
            pushEvent({
              entity: "category",
              action: "modified",
              userId: data.userId,
              username,
              message: `${username} editó una categoría: "${data.name}"`,
            });
          } else if (change.type === "removed") {
            pushEvent({
              entity: "category",
              action: "deleted",
              userId: data.userId,
              username,
              message: `${username} eliminó una categoría: "${data.name}"`,
            });
          }
        });
      },
      (err) => console.error("categories listener failed:", err),
    );

    return () => {
      unsubUsers();
      unsubTx();
      unsubGoals();
      unsubAccounts();
      unsubBudgets();
      unsubCategories();
      isInitialTx.current = true;
      isInitialGoals.current = true;
      isInitialAccounts.current = true;
      isInitialBudgets.current = true;
      isInitialCategories.current = true;
      isInitialUsers.current = true;
    };
  }, [user]);

  return (
    <NotificationContext.Provider
      value={{
        events,
        unreadCount,
        markAllRead,
        resolveUsername: usernameFor,
      }}
    >
      {children}
      <div className="fixed inset-x-4 bottom-4 z-50 flex flex-col gap-2 sm:inset-x-auto sm:right-4 sm:w-80">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="card-shadow animate-toast-in flex items-start gap-2.5 rounded-2xl border border-border-soft bg-surface px-4 py-3 text-sm text-text-primary"
          >
            <span className="mt-0.5 shrink-0">
              <FeedEventIcon event={t} />
            </span>
            {t.message}
          </div>
        ))}
      </div>
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  return useContext(NotificationContext);
}
