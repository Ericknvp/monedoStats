"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, ArrowDownCircle, ArrowUpCircle, Target } from "lucide-react";
import { useNotifications } from "@/contexts/NotificationContext";
import { timeAgo } from "@/lib/format";
import { FeedEvent } from "@/lib/types";

function EventIcon({ event }: { event: FeedEvent }) {
  if (event.type === "transaction") {
    return event.positive ? (
      <ArrowDownCircle size={18} className="text-good" strokeWidth={2} />
    ) : (
      <ArrowUpCircle size={18} className="text-critical" strokeWidth={2} />
    );
  }
  return <Target size={18} className="text-accent" strokeWidth={2} />;
}

export function NotificationBell() {
  const { events, unreadCount, markAllRead } = useNotifications();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  function toggle() {
    setOpen((o) => {
      if (!o) markAllRead();
      return !o;
    });
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={toggle}
        className="relative flex h-9 w-9 items-center justify-center rounded-full border border-border-soft bg-surface-2 text-text-secondary transition-colors hover:text-slate-100"
        aria-label="Notificaciones"
      >
        <Bell size={18} strokeWidth={2} />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-critical px-1 text-[10px] font-semibold text-white shadow-[0_0_8px_-1px_rgba(248,113,113,0.7)]">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="glow-ring absolute right-0 z-40 mt-2 w-96 max-h-[28rem] overflow-y-auto rounded-lg border border-border-soft bg-surface">
          <div className="border-b border-border-soft px-4 py-2.5 text-sm font-semibold text-slate-100">
            Actividad reciente
          </div>
          {events.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-text-muted">
              Sin novedades todavía.
            </p>
          ) : (
            <ul className="divide-y divide-border-soft">
              {events.map((evt) => (
                <li key={evt.id}>
                  <button
                    onClick={() => {
                      setOpen(false);
                      router.push(`/dashboard/profile/${evt.userId}`);
                    }}
                    className="flex w-full items-start gap-3 px-4 py-3 text-left text-sm hover:bg-surface-2"
                  >
                    <span className="mt-0.5 shrink-0">
                      <EventIcon event={evt} />
                    </span>
                    <span>
                      <p className="text-slate-200">{evt.message}</p>
                      <p className="mt-0.5 text-xs text-text-muted">
                        {timeAgo(evt.createdAt)}
                      </p>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
