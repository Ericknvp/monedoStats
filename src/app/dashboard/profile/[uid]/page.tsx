"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  collection,
  doc,
  getAggregateFromServer,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  startAfter,
  sum,
  count,
  where,
  QueryDocumentSnapshot,
  DocumentData,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { AppUser, Account, Budget, Goal, Transaction } from "@/lib/types";
import { formatCurrency, formatDate } from "@/lib/format";
import { ErrorBanner, permissionErrorMessage } from "@/components/ErrorBanner";
import { Icon } from "@/components/Icon";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const PAGE_SIZE = 25;
const GOOD = "#006c4b";
const CRITICAL = "#b3261e";

interface Totals {
  incomeCount: number;
  incomeTotal: number;
  expenseCount: number;
  expenseTotal: number;
}

export default function ProfileDetailPage() {
  const params = useParams<{ uid: string }>();
  const uid = params.uid;
  const router = useRouter();

  const [profile, setProfile] = useState<AppUser | null>(null);
  const [totals, setTotals] = useState<Totals | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [lastDoc, setLastDoc] =
    useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadFirstPage = useCallback(async (userId: string) => {
    const q = query(
      collection(db, "transactions"),
      where("userId", "==", userId),
      orderBy("date", "desc"),
      limit(PAGE_SIZE),
    );
    const snap = await getDocs(q);
    setTransactions(
      snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<Transaction, "id">),
      })),
    );
    setLastDoc(snap.docs[snap.docs.length - 1] ?? null);
    setHasMore(snap.docs.length === PAGE_SIZE);
  }, []);

  async function loadMore() {
    if (!lastDoc || loadingMore) return;
    setLoadingMore(true);
    try {
      const q = query(
        collection(db, "transactions"),
        where("userId", "==", uid),
        orderBy("date", "desc"),
        startAfter(lastDoc),
        limit(PAGE_SIZE),
      );
      const snap = await getDocs(q);
      setTransactions((prev) => [
        ...prev,
        ...snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<Transaction, "id">),
        })),
      ]);
      setLastDoc(snap.docs[snap.docs.length - 1] ?? null);
      setHasMore(snap.docs.length === PAGE_SIZE);
    } catch (err) {
      setError(permissionErrorMessage(err));
    } finally {
      setLoadingMore(false);
    }
  }

  useEffect(() => {
    if (!uid) return;
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        await loadInner();
      } catch (err) {
        console.error("profile load failed:", err);
        if (!cancelled) setError(permissionErrorMessage(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    async function loadInner() {
      const userSnap = await getDoc(doc(db, "users", uid));
      if (!cancelled && userSnap.exists()) {
        setProfile({
          id: userSnap.id,
          ...(userSnap.data() as Omit<AppUser, "id">),
        });
      }

      const [accountsSnap, goalsSnap, budgetsSnap] = await Promise.all([
        getDocs(query(collection(db, "accounts"), where("userId", "==", uid))),
        getDocs(query(collection(db, "goals"), where("userId", "==", uid))),
        getDocs(query(collection(db, "budgets"), where("userId", "==", uid))),
      ]);
      if (!cancelled) {
        setAccounts(
          accountsSnap.docs.map((d) => ({
            id: d.id,
            ...(d.data() as Omit<Account, "id">),
          })),
        );
        setGoals(
          goalsSnap.docs
            .map((d) => ({ id: d.id, ...(d.data() as Omit<Goal, "id">) }))
            .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)),
        );
        setBudgets(
          budgetsSnap.docs.map((d) => ({
            id: d.id,
            ...(d.data() as Omit<Budget, "id">),
          })),
        );
      }

      const [incomeAgg, expenseAgg] = await Promise.all([
        getAggregateFromServer(
          query(
            collection(db, "transactions"),
            where("userId", "==", uid),
            where("isIncome", "==", true),
          ),
          { count: count(), total: sum("amount") },
        ),
        getAggregateFromServer(
          query(
            collection(db, "transactions"),
            where("userId", "==", uid),
            where("isIncome", "==", false),
          ),
          { count: count(), total: sum("amount") },
        ),
      ]);
      if (!cancelled) {
        setTotals({
          incomeCount: incomeAgg.data().count,
          incomeTotal: incomeAgg.data().total || 0,
          expenseCount: expenseAgg.data().count,
          expenseTotal: expenseAgg.data().total || 0,
        });
      }

      await loadFirstPage(uid);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [uid, loadFirstPage]);

  if (loading) {
    return <p className="text-sm text-text-secondary">Cargando perfil…</p>;
  }

  if (error) {
    return <ErrorBanner message={error} />;
  }

  if (!profile) {
    return (
      <p className="text-sm text-text-secondary">Usuario no encontrado.</p>
    );
  }

  const chartData = totals
    ? [
        { name: "Ingresos", value: totals.incomeTotal, fill: GOOD },
        { name: "Gastos", value: totals.expenseTotal, fill: CRITICAL },
      ]
    : [];

  return (
    <div className="space-y-6">
      <div>
        <button
          onClick={() => router.push("/dashboard")}
          className="flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary"
        >
          <Icon name="arrow_back" size={16} />
          Volver a perfiles
        </button>
        <div className="mt-3 flex items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accent text-base font-semibold text-on-accent">
            {(profile.username || profile.email || "?").charAt(0).toUpperCase()}
          </span>
          <div>
            <h1 className="font-display text-xl font-bold text-text-primary">
              {profile.username}
            </h1>
            <p className="text-sm text-text-secondary">
              {profile.email} · Registrado el {formatDate(profile.createdAt)}
              {profile.currency ? ` · ${profile.currency}` : ""}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <SummaryCard
          icon="receipt_long"
          label="Movimientos"
          value={String(
            (totals?.incomeCount || 0) + (totals?.expenseCount || 0),
          )}
          tone="neutral"
        />
        <SummaryCard
          icon="trending_up"
          label="Ingresos"
          value={formatCurrency(totals?.incomeTotal || 0, profile.currency)}
          hint={`${totals?.incomeCount || 0} movimientos`}
          tone="positive"
        />
        <SummaryCard
          icon="trending_down"
          label="Gastos"
          value={formatCurrency(totals?.expenseTotal || 0, profile.currency)}
          hint={`${totals?.expenseCount || 0} movimientos`}
          tone="negative"
        />
        <SummaryCard
          icon="balance"
          label="Balance neto"
          value={formatCurrency(
            (totals?.incomeTotal || 0) - (totals?.expenseTotal || 0),
            profile.currency,
          )}
          tone="neutral"
        />
      </div>

      <section className="card-shadow rounded-2xl border border-border-soft bg-surface p-4">
        <h2 className="text-sm font-semibold text-text-primary">
          Ingresos vs. gastos
        </h2>
        <div className="mt-2 h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 20, right: 8, left: 8 }}>
              <CartesianGrid stroke="var(--outline-variant)" vertical={false} />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 12, fill: "var(--on-surface-variant)" }}
                axisLine={{ stroke: "var(--outline-variant)" }}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 12, fill: "var(--on-surface-variant)" }}
                axisLine={false}
                tickLine={false}
                width={80}
              />
              <Tooltip
                cursor={{ fill: "rgba(0,31,45,0.04)" }}
                contentStyle={{
                  background: "var(--surface-lowest)",
                  border: "1px solid var(--outline-variant)",
                  borderRadius: 12,
                  color: "var(--on-surface)",
                  fontSize: 13,
                }}
                formatter={(v) =>
                  formatCurrency(Number(v) || 0, profile.currency)
                }
              />
              <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={64}>
                {chartData.map((entry) => (
                  <Cell key={entry.name} fill={entry.fill} />
                ))}
                <LabelList
                  dataKey="value"
                  position="top"
                  formatter={(v) =>
                    formatCurrency(Number(v) || 0, profile.currency)
                  }
                  style={{ fill: "var(--on-surface-variant)", fontSize: 12 }}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="card-shadow rounded-2xl border border-border-soft bg-surface p-4">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-text-primary">
            <Icon name="account_balance" size={18} className="text-accent" />
            Cuentas
          </h2>
          {accounts.length === 0 ? (
            <p className="mt-3 text-sm text-text-muted">Sin cuentas.</p>
          ) : (
            <ul className="mt-3 divide-y divide-border-soft">
              {accounts.map((a) => (
                <li
                  key={a.id}
                  className="flex items-center justify-between py-2"
                >
                  <span className="text-sm text-text-secondary">{a.name}</span>
                  <span className="text-sm font-medium text-text-primary">
                    {formatCurrency(a.balance, profile.currency)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card-shadow rounded-2xl border border-border-soft bg-surface p-4">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-text-primary">
            <Icon name="checklist" size={18} className="text-accent" />
            Presupuestos
          </h2>
          {budgets.length === 0 ? (
            <p className="mt-3 text-sm text-text-muted">Sin presupuestos.</p>
          ) : (
            <ul className="mt-3 divide-y divide-border-soft">
              {budgets.map((b) => (
                <li
                  key={b.id}
                  className="flex items-center justify-between py-2"
                >
                  <span className="text-sm text-text-secondary">
                    {b.category}
                  </span>
                  <span className="text-sm font-medium text-text-primary">
                    {formatCurrency(b.monthlyLimit, profile.currency)}/mes
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="card-shadow rounded-2xl border border-border-soft bg-surface p-4">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-text-primary">
          <Icon name="savings" size={18} className="text-accent" />
          Metas de ahorro
        </h2>
        {goals.length === 0 ? (
          <p className="mt-3 text-sm text-text-muted">Sin metas.</p>
        ) : (
          <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {goals.map((g) => {
              const pct =
                g.targetAmount > 0
                  ? Math.min(
                      100,
                      Math.round((g.savedAmount / g.targetAmount) * 100),
                    )
                  : 0;
              return (
                <div
                  key={g.id}
                  className="rounded-2xl border border-border-soft bg-surface-2 p-3"
                >
                  <p className="flex items-center gap-1.5 text-sm font-medium text-text-primary">
                    <Icon
                      name="track_changes"
                      size={15}
                      className="text-accent"
                    />
                    {g.title}
                  </p>
                  <p className="mt-1 text-xs text-text-secondary">
                    {formatCurrency(g.savedAmount, profile.currency)} de{" "}
                    {formatCurrency(g.targetAmount, profile.currency)}
                  </p>
                  <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-surface-3">
                    <div
                      className="h-full rounded-full bg-accent"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <p className="mt-1 text-right text-xs text-text-muted">
                    {pct}%
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="card-shadow rounded-2xl border border-border-soft bg-surface">
        <h2 className="flex items-center gap-2 border-b border-border-soft px-4 py-3 text-sm font-semibold text-text-primary">
          <Icon name="receipt_long" size={18} className="text-accent" />
          Movimientos
        </h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-border-soft">
            <thead className="bg-surface-2">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wide text-text-muted">
                  Fecha
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wide text-text-muted">
                  Título
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wide text-text-muted">
                  Categoría
                </th>
                <th className="px-4 py-2 text-right text-xs font-medium uppercase tracking-wide text-text-muted">
                  Monto
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wide text-text-muted">
                  Tipo
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-soft">
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center">
                    <Icon
                      name="receipt_long"
                      size={24}
                      className="mx-auto mb-2 text-text-muted"
                    />
                    <p className="text-sm text-text-muted">Sin movimientos.</p>
                  </td>
                </tr>
              ) : (
                transactions.map((t) => (
                  <tr
                    key={t.id}
                    className="transition-colors hover:bg-surface-2"
                  >
                    <td className="px-4 py-2 text-sm text-text-secondary">
                      {formatDate(t.date)}
                    </td>
                    <td className="px-4 py-2 text-sm text-text-primary">
                      {t.title}
                    </td>
                    <td className="px-4 py-2 text-sm text-text-secondary">
                      <span className="rounded-full bg-surface-2 px-2 py-0.5 text-xs text-text-secondary">
                        {t.category}
                      </span>
                    </td>
                    <td
                      className={`px-4 py-2 text-right text-sm font-medium tabular-nums ${
                        t.isIncome ? "text-good" : "text-critical"
                      }`}
                    >
                      {t.isIncome ? "+" : "-"}
                      {formatCurrency(t.amount, profile.currency)}
                    </td>
                    <td className="px-4 py-2 text-sm text-text-secondary">
                      {t.isTransfer
                        ? "Transferencia"
                        : t.isIncome
                          ? "Ingreso"
                          : "Gasto"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {hasMore && (
          <div className="border-t border-border-soft p-3 text-center">
            <button
              onClick={loadMore}
              disabled={loadingMore}
              className="rounded-full border border-border-soft px-4 py-1.5 text-sm text-text-primary hover:bg-surface-2 disabled:opacity-50"
            >
              {loadingMore ? "Cargando…" : "Cargar más"}
            </button>
          </div>
        )}
      </section>
    </div>
  );
}

function SummaryCard({
  icon,
  label,
  value,
  hint,
  tone,
}: {
  icon: string;
  label: string;
  value: string;
  hint?: string;
  tone: "positive" | "negative" | "neutral";
}) {
  const toneClasses = {
    positive: "bg-good-soft text-good",
    negative: "bg-critical-soft text-critical",
    neutral: "bg-accent-soft text-accent",
  }[tone];

  return (
    <div className="card-shadow rounded-2xl border border-border-soft bg-surface p-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wide text-text-muted">
          {label}
        </p>
        <span
          className={`flex h-8 w-8 items-center justify-center rounded-full ${toneClasses}`}
        >
          <Icon name={icon} size={16} />
        </span>
      </div>
      <p className="mt-2 text-lg font-semibold text-text-primary">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-text-muted">{hint}</p>}
    </div>
  );
}
