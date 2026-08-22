import { FormEvent, useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { apiClient } from "../api/client";
import { EmptyState } from "../components/EmptyState";
import { ErrorState } from "../components/ErrorState";
import { LoadingState } from "../components/LoadingState";
import { Button } from "../components/Button";
import { Badge } from "../components/Badge";
import { Modal } from "../components/Modal";
import { BudgetOptimizerModal } from "../features/budget/BudgetOptimizerModal";
import {
  Wallet,
  Plus,
  Car,
  Hotel,
  Compass,
  Utensils,
  Tag,
  AlertTriangle,
  Pencil,
  Trash2,
  TrendingUp,
  TrendingDown,
  Receipt,
  Calendar,
  AlertCircle,
  Sparkles,
} from "lucide-react";

type Category = "transport" | "accommodation" | "activity" | "meal" | "other";

type Expense = {
  id: string;
  category: Category;
  description: string | null;
  amount: number;
  expenseDate: string;
};

type Daily = {
  date: string;
  total: number;
  percentageOfPlannedDailyBudget: number | null;
  isOverBudget: boolean;
  overBudgetAmount: number;
};

type BudgetSummary = {
  plannedBudget: number | null;
  totalSpent: number;
  remainingBudget: number | null;
  percentageUsed: number | null;
  transportTotal: number;
  accommodationTotal: number;
  activityTotal: number;
  mealTotal: number;
  otherTotal: number;
  averageDailyCost: number;
  estimatedActivityCost: number;
  totalEstimatedCost: number;
  projectedRemainingBudget: number | null;
  categoryPercentages: Record<Category, number>;
  dailyExpenseBreakdown: Daily[];
  overBudgetDays: Daily[];
  isOverBudget: boolean;
  overBudgetAmount: number;
};

const categoryConfig: {
  id: Category;
  label: string;
  color: string;
  icon: React.ReactNode;
}[] = [
  { id: "transport", label: "Transport", color: "bg-sky-500", icon: <Car className="h-4 w-4" /> },
  { id: "accommodation", label: "Accommodation", color: "bg-indigo-500", icon: <Hotel className="h-4 w-4" /> },
  { id: "activity", label: "Activities", color: "bg-amber-500", icon: <Compass className="h-4 w-4" /> },
  { id: "meal", label: "Meals", color: "bg-rose-500", icon: <Utensils className="h-4 w-4" /> },
  { id: "other", label: "Other", color: "bg-slate-500", icon: <Tag className="h-4 w-4" /> },
];

const formatMoney = (value: number | null) =>
  value === null
    ? "No budget set"
    : new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 0,
      }).format(value);

const formatDate = (value: string) =>
  new Date(`${value}T00:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

export const BudgetPage = () => {
  const { tripId } = useParams();
  const [summary, setSummary] = useState<BudgetSummary | null>(null);
  const [expenses, setExpenses] = useState<Expense[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<Expense | "new" | null>(null);
  const [deletingExpense, setDeletingExpense] = useState<Expense | null>(null);
  const [optimizerOpen, setOptimizerOpen] = useState(false);

  const load = useCallback(async () => {
    if (!tripId) {
      setError("Trip not found.");
      return;
    }
    setError(null);
    try {
      const [budget, expenseData] = await Promise.all([
        apiClient<{ budgetSummary: BudgetSummary }>(`/trips/${tripId}/budget-summary`),
        apiClient<{ expenses: Expense[] }>(`/trips/${tripId}/expenses`),
      ]);
      setSummary(budget.budgetSummary);
      setExpenses(expenseData.expenses);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to load budget details.");
    }
  }, [tripId]);

  useEffect(() => {
    void load();
  }, [load]);

  const mutate = async (action: () => Promise<unknown>) => {
    setSaving(true);
    setError(null);
    try {
      await action();
      setEditing(null);
      setDeletingExpense(null);
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to save expense.");
    } finally {
      setSaving(false);
    }
  };

  const confirmDeleteExpense = () => {
    if (!deletingExpense) return;
    void mutate(() =>
      apiClient(`/trips/${tripId}/expenses/${deletingExpense.id}`, { method: "DELETE" })
    );
  };

  if (!summary || !expenses) {
    if (error) return <ErrorState message={error} onRetry={() => void load()} />;
    return <LoadingState label="Loading budget insights..." />;
  }

  const categoryValues = categoryConfig.map((item) => ({
    ...item,
    amount: summary[`${item.id === "activity" ? "activity" : item.id}Total` as keyof BudgetSummary] as number,
    percentage: summary.categoryPercentages[item.id] ?? 0,
  }));

  return (
    <div className="space-y-6">
      {/* Hero Banner */}
      <section
        className={`relative overflow-hidden rounded-3xl p-6 text-white shadow-floating sm:p-8 ${
          summary.isOverBudget
            ? "bg-gradient-to-r from-rose-900 via-rose-950 to-slate-900"
            : "bg-gradient-to-r from-slate-900 via-sky-950 to-indigo-950"
        }`}
      >
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div className="space-y-1">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-sky-200 border border-white/10">
              <Wallet className="h-3.5 w-3.5" /> Budget & Expense Intelligence
            </span>
            <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl text-white">
              Trip Budget Tracker
            </h1>
            <p className="text-sm text-slate-300">
              Monitor real-time expenses against your planned budget.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <Button
              variant="outline"
              size="md"
              leftIcon={<TrendingDown className="h-4 w-4 text-emerald-300" />}
              onClick={() => setOptimizerOpen(true)}
              className="bg-white/10 border-white/20 text-white hover:bg-white/20 font-bold backdrop-blur-md"
            >
              Optimize Budget
            </Button>

            <Button
              variant="primary"
              size="md"
              leftIcon={<Plus className="h-4 w-4" />}
              onClick={() => setEditing("new")}
              className="bg-white text-slate-950 hover:bg-slate-100 focus:ring-white font-bold shadow-md"
            >
              Record Expense
            </Button>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 rounded-2xl bg-white/10 p-4 text-xs sm:text-sm font-medium border border-white/10">
          <div>
            <span className="text-slate-300">Planned Limit:</span> <b>{formatMoney(summary.plannedBudget)}</b>
          </div>
          <div>
            <span className="text-slate-300">Total Projected:</span> <b>{formatMoney(summary.totalEstimatedCost)}</b>
          </div>
          <div className="font-bold">
            {summary.plannedBudget === null ? (
              <span className="text-slate-300">Set a trip budget to track remaining balance</span>
            ) : summary.isOverBudget ? (
              <span className="text-rose-300">⚠️ {formatMoney(summary.overBudgetAmount)} over budget</span>
            ) : (
              <span className="text-emerald-300">✓ {formatMoney(summary.projectedRemainingBudget)} remaining</span>
            )}
          </div>
        </div>
      </section>

      {error && <ErrorState message={error} />}

      {/* Metrics */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <BudgetMetric
          label="Planned Budget"
          value={formatMoney(summary.plannedBudget)}
          icon={<Wallet className="h-5 w-5 text-emerald-600" />}
          iconBg="bg-emerald-50"
        />
        <BudgetMetric
          label="Spent So Far"
          value={formatMoney(summary.totalSpent)}
          icon={<Receipt className="h-5 w-5 text-sky-600" />}
          iconBg="bg-sky-50"
        />
        <BudgetMetric
          label="Projected Total"
          value={formatMoney(summary.totalEstimatedCost)}
          icon={<TrendingUp className="h-5 w-5 text-indigo-600" />}
          iconBg="bg-indigo-50"
        />
      </section>

      {summary.isOverBudget && (
        <div
          role="alert"
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-900 shadow-sm"
        >
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-rose-900">Projected budget exceeded by {formatMoney(summary.overBudgetAmount)}.</p>
              <p className="text-xs text-rose-700 mt-0.5">
                Our budget optimizer can identify cost reduction opportunities across your accommodation, activities, meals, and transport.
              </p>
            </div>
          </div>
          <Button
            variant="primary"
            size="sm"
            leftIcon={<TrendingDown className="h-4 w-4" />}
            onClick={() => setOptimizerOpen(true)}
            className="shrink-0 bg-rose-600 hover:bg-rose-700 text-white font-bold shadow-sm"
          >
            Find Savings Opportunities
          </Button>
        </div>
      )}

      {/* Breakdown Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Category Breakdown */}
        <section className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-card space-y-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Category Breakdown</h2>
            <p className="text-xs text-slate-500">Distribution of expenses across travel categories.</p>
          </div>

          <div className="space-y-4 pt-2">
            {categoryValues.map((cat) => (
              <div key={cat.id} className="space-y-1.5">
                <div className="flex justify-between items-center text-xs font-semibold">
                  <div className="flex items-center gap-2 text-slate-700">
                    <span className="text-slate-400">{cat.icon}</span>
                    <span>{cat.label}</span>
                  </div>
                  <span className="text-slate-600">
                    {formatMoney(cat.amount)} ({cat.percentage}%)
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${cat.color}`}
                    style={{ width: `${Math.min(cat.percentage, 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Daily Expense Breakdown */}
        <section className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-card space-y-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Daily Budget Breakdown</h2>
            <p className="text-xs text-slate-500">Daily spending compared against target daily allowance.</p>
          </div>

          {summary.dailyExpenseBreakdown.length ? (
            <div className="space-y-3 pt-2 max-h-72 overflow-auto pr-1">
              {summary.dailyExpenseBreakdown.map((day) => (
                <div key={day.date} className="space-y-1">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-semibold text-slate-700">{formatDate(day.date)}</span>
                    <span className={day.isOverBudget ? "font-bold text-rose-700" : "text-slate-600"}>
                      {formatMoney(day.total)} {day.isOverBudget && "• Over daily budget"}
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={`h-full rounded-full ${day.isOverBudget ? "bg-rose-500" : "bg-sky-500"}`}
                      style={{ width: `${Math.min(day.percentageOfPlannedDailyBudget ?? 0, 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              title="No daily expense logs"
              description="Recorded expenses will plot against daily target allowances here."
            />
          )}
        </section>
      </div>

      {/* Expense List Table */}
      <section className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-card space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Expense Log</h2>
            <p className="text-xs text-slate-500">All itemized costs recorded for this trip.</p>
          </div>

          <Button
            variant="outline"
            size="sm"
            leftIcon={<Plus className="h-4 w-4" />}
            onClick={() => setEditing("new")}
          >
            Add Expense
          </Button>
        </div>

        {expenses.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px] text-left text-sm">
              <thead className="border-b border-slate-200 text-xs font-bold uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="py-3 px-2">Date</th>
                  <th className="py-3 px-2">Category</th>
                  <th className="py-3 px-2">Description</th>
                  <th className="py-3 px-2 text-right">Amount</th>
                  <th className="py-3 px-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {expenses.map((expense) => (
                  <tr key={expense.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-2 font-medium text-slate-700">{formatDate(expense.expenseDate)}</td>
                    <td className="py-3 px-2">
                      <Badge variant="sky" size="sm" className="capitalize">
                        {expense.category}
                      </Badge>
                    </td>
                    <td className="py-3 px-2 text-slate-600">{expense.description || "—"}</td>
                    <td className="py-3 px-2 text-right font-bold text-slate-900">
                      {formatMoney(expense.amount)}
                    </td>
                    <td className="py-3 px-2 text-right">
                      <div className="inline-flex items-center gap-1 justify-end">
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={saving}
                          leftIcon={<Pencil className="h-3.5 w-3.5" />}
                          onClick={() => setEditing(expense)}
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={saving}
                          leftIcon={<Trash2 className="h-3.5 w-3.5 text-rose-600" />}
                          onClick={() => setDeletingExpense(expense)}
                          className="hover:bg-rose-50"
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            title="No expenses recorded yet"
            description="Keep track of your accommodation, flights, dining, and activities."
            actionLabel="Add Expense"
            onAction={() => setEditing("new")}
          />
        )}
      </section>

      {/* Edit / New Expense Modal */}
      {editing && (
        <ExpenseModal
          expense={editing === "new" ? undefined : editing}
          saving={saving}
          onCancel={() => setEditing(null)}
          onSave={(input) =>
            void mutate(() =>
              editing === "new"
                ? apiClient(`/trips/${tripId}/expenses`, { method: "POST", body: JSON.stringify(input) })
                : apiClient(`/trips/${tripId}/expenses/${editing.id}`, {
                    method: "PUT",
                    body: JSON.stringify(input),
                  })
            )
          }
        />
      )}

      {/* Delete Expense Modal */}
      <Modal
        isOpen={Boolean(deletingExpense)}
        onClose={() => setDeletingExpense(null)}
        title="Delete Expense?"
        description={`Are you sure you want to delete "${deletingExpense?.description || deletingExpense?.category}" (${formatMoney(deletingExpense?.amount ?? 0)})?`}
        confirmText="Delete Expense"
        onConfirm={confirmDeleteExpense}
        isConfirming={saving}
        variant="danger"
      />

      {/* Budget Optimizer Modal */}
      <BudgetOptimizerModal
        isOpen={optimizerOpen}
        onClose={() => setOptimizerOpen(false)}
        tripId={tripId!}
        onSuccess={() => void load()}
      />
    </div>
  );
};

const BudgetMetric = ({
  label,
  value,
  icon,
  iconBg,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  iconBg: string;
}) => (
  <article className="flex items-center gap-4 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-card">
    <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${iconBg}`}>
      {icon}
    </div>
    <div className="min-w-0">
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-extrabold text-slate-900 truncate">{value}</p>
    </div>
  </article>
);

const ExpenseModal = ({
  expense,
  saving,
  onCancel,
  onSave,
}: {
  expense?: Expense;
  saving: boolean;
  onCancel: () => void;
  onSave: (input: Omit<Expense, "id">) => void;
}) => {
  const [error, setError] = useState("");

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const amount = Number(form.get("amount"));
    const expenseDate = String(form.get("expenseDate"));
    if (!expenseDate) return setError("Choose an expense date.");
    if (!Number.isFinite(amount) || amount < 0)
      return setError("Enter a valid non-negative amount.");
    onSave({
      category: String(form.get("category")) as Category,
      description: String(form.get("description")).trim() || null,
      amount,
      expenseDate,
    });
  };

  return (
    <Modal
      isOpen={true}
      onClose={onCancel}
      title={expense ? "Edit Expense" : "Record New Expense"}
    >
      <form onSubmit={submit} className="space-y-4">
        {error && (
          <div className="flex items-center gap-2 rounded-xl bg-rose-50 p-3 text-xs text-rose-700 font-medium">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1">Category</label>
          <select
            name="category"
            defaultValue={expense?.category ?? "transport"}
            className="block w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
          >
            {categoryConfig.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1">Amount (USD)</label>
          <input
            required
            name="amount"
            type="number"
            min="0"
            step="0.01"
            placeholder="0.00"
            defaultValue={expense?.amount ?? ""}
            className="block w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1">Date</label>
          <input
            required
            name="expenseDate"
            type="date"
            defaultValue={expense?.expenseDate ?? ""}
            className="block w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1">
            Description <span className="font-normal text-slate-400">(optional)</span>
          </label>
          <input
            name="description"
            placeholder="e.g. Flight ticket, Train pass, Hotel booking"
            defaultValue={expense?.description ?? ""}
            className="block w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
          />
        </div>

        <div className="mt-6 flex justify-end gap-2.5 pt-2 border-t border-slate-100">
          <Button variant="outline" onClick={onCancel} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" isLoading={saving}>
            Save Expense
          </Button>
        </div>
      </form>
    </Modal>
  );
};
