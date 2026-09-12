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
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const PAGE_SIZE = 25;

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
    return <p className="text-sm text-slate-500">Cargando perfil…</p>;
  }

  if (error) {
    return <ErrorBanner message={error} />;
  }

  if (!profile) {
    return <p className="text-sm text-slate-500">Usuario no encontrado.</p>;
  }

  const chartData = totals
    ? [
        { name: "Ingresos", value: totals.incomeTotal },
        { name: "Gastos", value: totals.expenseTotal },
      ]
    : [];

  return (
    <div className="space-y-6">
      <div>
        <button
          onClick={() => router.push("/dashboard")}
          className="text-sm text-slate-500 hover:text-slate-800"
        >
          ← Volver a perfiles
        </button>
        <h1 className="mt-2 text-xl font-semibold text-slate-900">
          {profile.username}
        </h1>
        <p className="text-sm text-slate-500">
          {profile.email} · Registrado el {formatDate(profile.createdAt)}
          {profile.currency ? ` · ${profile.currency}` : ""}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <SummaryCard
          label="Movimientos"
          value={String(
            (totals?.incomeCount || 0) + (totals?.expenseCount || 0),
          )}
        />
        <SummaryCard
          label="Ingresos"
          value={formatCurrency(totals?.incomeTotal || 0, profile.currency)}
          hint={`${totals?.incomeCount || 0} movimientos`}
          tone="positive"
        />
        <SummaryCard
          label="Gastos"
          value={formatCurrency(totals?.expenseTotal || 0, profile.currency)}
          hint={`${totals?.expenseCount || 0} movimientos`}
          tone="negative"
        />
        <SummaryCard
          label="Balance neto"
          value={formatCurrency(
            (totals?.incomeTotal || 0) - (totals?.expenseTotal || 0),
            profile.currency,
          )}
        />
      </div>

      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-slate-700">
          Ingresos vs. gastos
        </h2>
        <div className="mt-2 h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} width={80} />
              <Tooltip
                formatter={(v) =>
                  formatCurrency(Number(v) || 0, profile.currency)
                }
              />
              <Bar dataKey="value" radius={[4, 4, 0, 0]} fill="#0f172a" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="rounded-lg border border-slate-200 bg-white p-4">
          <h2 className="text-sm font-semibold text-slate-700">Cuentas</h2>
          {accounts.length === 0 ? (
            <p className="mt-3 text-sm text-slate-400">Sin cuentas.</p>
          ) : (
            <ul className="mt-3 divide-y divide-slate-100">
              {accounts.map((a) => (
                <li
                  key={a.id}
                  className="flex items-center justify-between py-2"
                >
                  <span className="text-sm text-slate-700">{a.name}</span>
                  <span className="text-sm font-medium text-slate-900">
                    {formatCurrency(a.balance, profile.currency)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-4">
          <h2 className="text-sm font-semibold text-slate-700">Presupuestos</h2>
          {budgets.length === 0 ? (
            <p className="mt-3 text-sm text-slate-400">Sin presupuestos.</p>
          ) : (
            <ul className="mt-3 divide-y divide-slate-100">
              {budgets.map((b) => (
                <li
                  key={b.id}
                  className="flex items-center justify-between py-2"
                >
                  <span className="text-sm text-slate-700">{b.category}</span>
                  <span className="text-sm font-medium text-slate-900">
                    {formatCurrency(b.monthlyLimit, profile.currency)}/mes
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-slate-700">
          Metas de ahorro
        </h2>
        {goals.length === 0 ? (
          <p className="mt-3 text-sm text-slate-400">Sin metas.</p>
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
                  className="rounded-md border border-slate-200 p-3"
                >
                  <p className="text-sm font-medium text-slate-800">
                    {g.title}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {formatCurrency(g.savedAmount, profile.currency)} de{" "}
                    {formatCurrency(g.targetAmount, profile.currency)}
                  </p>
                  <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-slate-900"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <p className="mt-1 text-right text-xs text-slate-400">
                    {pct}%
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="rounded-lg border border-slate-200 bg-white">
        <h2 className="border-b border-slate-100 px-4 py-3 text-sm font-semibold text-slate-700">
          Movimientos
        </h2>
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                Fecha
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                Título
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                Categoría
              </th>
              <th className="px-4 py-2 text-right text-xs font-medium uppercase tracking-wide text-slate-500">
                Monto
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                Tipo
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {transactions.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-6 text-center text-sm text-slate-400"
                >
                  Sin movimientos.
                </td>
              </tr>
            ) : (
              transactions.map((t) => (
                <tr key={t.id} className="hover:bg-slate-50">
                  <td className="px-4 py-2 text-sm text-slate-600">
                    {formatDate(t.date)}
                  </td>
                  <td className="px-4 py-2 text-sm text-slate-800">
                    {t.title}
                  </td>
                  <td className="px-4 py-2 text-sm text-slate-600">
                    {t.category}
                  </td>
                  <td
                    className={`px-4 py-2 text-right text-sm font-medium ${
                      t.isIncome ? "text-emerald-600" : "text-red-600"
                    }`}
                  >
                    {t.isIncome ? "+" : "-"}
                    {formatCurrency(t.amount, profile.currency)}
                  </td>
                  <td className="px-4 py-2 text-sm text-slate-600">
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
        {hasMore && (
          <div className="border-t border-slate-100 p-3 text-center">
            <button
              onClick={loadMore}
              disabled={loadingMore}
              className="rounded-md border border-slate-300 px-4 py-1.5 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50"
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
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "positive" | "negative";
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p
        className={`mt-1 text-lg font-semibold ${
          tone === "positive"
            ? "text-emerald-600"
            : tone === "negative"
              ? "text-red-600"
              : "text-slate-900"
        }`}
      >
        {value}
      </p>
      {hint && <p className="mt-0.5 text-xs text-slate-400">{hint}</p>}
    </div>
  );
}
