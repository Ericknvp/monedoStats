"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { timeAgo } from "@/lib/format";
import { ErrorBanner } from "@/components/ErrorBanner";
import { Pagination } from "@/components/Pagination";
import { FeedEventIcon } from "@/components/FeedEventIcon";
import { useNotifications } from "@/contexts/NotificationContext";
import { useActivityFeed } from "@/hooks/useActivityFeed";

const FEED_PAGE_SIZE = 15;

export default function ActivityPage() {
  const { markAllRead } = useNotifications();
  const { feed, loading, error } = useActivityFeed();
  const [feedPage, setFeedPage] = useState(1);

  useEffect(() => {
    markAllRead();
  }, [markAllRead]);

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
          Movimientos, ediciones y borrados de todos los usuarios, en tiempo
          real.
        </p>
      </div>

      <section className="card-shadow rounded-2xl border border-border-soft bg-surface">
        {loading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 8 }).map((_, i) => (
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
