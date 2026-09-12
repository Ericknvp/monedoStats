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
import { ArrowDownCircle, ArrowUpCircle, Landmark, Target } from "lucide-react";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { formatCurrency } from "@/lib/format";
import { FeedEvent } from "@/lib/types";

const MAX_EVENTS = 200;
const TOAST_DURATION_MS = 6000;

type ToastItem = FeedEvent;

function ToastIcon({ event }: { event: FeedEvent }) {
  const className = "mt-0.5 shrink-0";
  if (event.type === "transaction") {
    return event.positive ? (
      <ArrowDownCircle
        size={18}
        className={`${className} text-good`}
        strokeWidth={2}
      />
    ) : (
      <ArrowUpCircle
        size={18}
        className={`${className} text-critical`}
        strokeWidth={2}
      />
    );
  }
  if (event.type === "account_created") {
    return (
      <Landmark
        size={18}
        className={`${className} text-accent`}
        strokeWidth={2}
      />
    );
  }
  return (
    <Target size={18} className={`${className} text-accent`} strokeWidth={2} />
  );
}

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
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const usersMapRef = useRef<Record<string, string>>({});
  const goalAmountsRef = useRef<Record<string, number>>({});
  const isInitialTx = useRef(true);
  const isInitialGoals = useRef(true);
  const isInitialAccounts = useRef(true);

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
        snap.forEach((doc) => {
          const data = doc.data();
          usersMapRef.current[doc.id] = data.username || data.email || doc.id;
        });
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
          if (change.type !== "added") return;
          const data = change.doc.data();
          const username = usernameFor(data.userId);
          const kind = data.isIncome ? "un ingreso" : "un gasto";
          pushEvent({
            type: "transaction",
            userId: data.userId,
            username,
            positive: !!data.isIncome,
            message: `${username} registró ${kind} de ${formatCurrency(
              data.amount || 0,
            )} en ${data.category || "Sin categoría"}`,
          });
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
              type: "goal_created",
              userId: data.userId,
              username,
              message: `${username} creó una nueva meta: "${data.title}"`,
            });
            return;
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
              type: "goal_updated",
              userId: data.userId,
              username,
              message,
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
          if (change.type !== "added") return;
          const data = change.doc.data();
          const username = usernameFor(data.userId);
          pushEvent({
            type: "account_created",
            userId: data.userId,
            username,
            message: `${username} creó una nueva cuenta: "${data.name}"`,
          });
        });
      },
      (err) => console.error("accounts listener failed:", err),
    );

    return () => {
      unsubUsers();
      unsubTx();
      unsubGoals();
      unsubAccounts();
      isInitialTx.current = true;
      isInitialGoals.current = true;
      isInitialAccounts.current = true;
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
      <div className="fixed bottom-4 right-4 z-50 flex w-80 flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="glow-ring animate-toast-in flex items-start gap-2.5 rounded-lg border border-border-soft bg-surface px-4 py-3 text-sm text-slate-200"
          >
            <ToastIcon event={t} />
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
