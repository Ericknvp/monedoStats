"use client";

import { Icon } from "@/components/Icon";

export function Pagination({
  page,
  totalPages,
  onChange,
}: {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
}) {
  if (totalPages <= 1) return null;

  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);

  return (
    <div className="flex items-center justify-center gap-1 border-t border-border-soft px-4 py-3">
      <button
        onClick={() => onChange(Math.max(1, page - 1))}
        disabled={page === 1}
        className="flex h-8 w-8 items-center justify-center rounded-full text-text-secondary hover:bg-surface-2 hover:text-text-primary disabled:opacity-30"
        aria-label="Página anterior"
      >
        <Icon name="chevron_left" size={18} />
      </button>
      {pages.map((p) => (
        <button
          key={p}
          onClick={() => onChange(p)}
          className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-medium ${
            p === page
              ? "bg-accent text-on-accent"
              : "text-text-secondary hover:bg-surface-2 hover:text-text-primary"
          }`}
        >
          {p}
        </button>
      ))}
      <button
        onClick={() => onChange(Math.min(totalPages, page + 1))}
        disabled={page === totalPages}
        className="flex h-8 w-8 items-center justify-center rounded-full text-text-secondary hover:bg-surface-2 hover:text-text-primary disabled:opacity-30"
        aria-label="Página siguiente"
      >
        <Icon name="chevron_right" size={18} />
      </button>
    </div>
  );
}
