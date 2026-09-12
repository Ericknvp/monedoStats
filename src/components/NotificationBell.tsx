"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useNotifications } from "@/contexts/NotificationContext";
import { timeAgo } from "@/lib/format";
import { Icon } from "@/components/Icon";
import { FeedEventIcon } from "@/components/FeedEventIcon";

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
        className="relative flex h-10 w-10 items-center justify-center rounded-full text-text-secondary transition-colors hover:bg-surface-2 hover:text-text-primary"
        aria-label="Notificaciones"
      >
        <Icon name="notifications" size={22} />
        {unreadCount > 0 && (
          <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-critical px-1 text-[10px] font-semibold text-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="card-shadow fixed inset-x-4 top-16 z-40 max-h-[70vh] overflow-y-auto rounded-2xl border border-border-soft bg-surface sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-2 sm:max-h-[28rem] sm:w-96">
          <div className="border-b border-border-soft px-4 py-2.5 text-sm font-semibold text-text-primary">
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
                      <FeedEventIcon event={evt} />
                    </span>
                    <span>
                      <p className="text-text-primary">{evt.message}</p>
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
