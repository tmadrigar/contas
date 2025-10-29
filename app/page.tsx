"use client";

import { useEffect, useMemo, useState } from "react";
import { v4 as uuidv4 } from "uuid";

type Account = {
  id: string;
  name: string;
  institution?: string;
  balance: number;
};

type Category = {
  id: string;
  name: string;
  kind: "receita" | "despesa";
};

type Transaction = {
  id: string;
  description: string;
  amount: number;
  date: string;
  accountId: string;
  categoryId: string;
  kind: "receita" | "despesa";
  status: "pendente" | "pago";
};

type StoredData = {
  accounts: Account[];
  categories: Category[];
  transactions: Transaction[];
};

const STORAGE_KEY = "controle-financeiro";

const defaultData: StoredData = {
  accounts: [],
  categories: [],
  transactions: []
};

function loadStoredData(): StoredData {
  if (typeof window === "undefined") {
    return defaultData;
  }

  try {
    const data = window.localStorage.getItem(STORAGE_KEY);
    if (!data) return defaultData;

    const parsed = JSON.parse(data) as StoredData;
    return {
      accounts: parsed.accounts ?? [],
      categories: parsed.categories ?? [],
      transactions: parsed.transactions ?? []
    };
  } catch (error) {
    console.error("Erro ao carregar dados armazenados", error);
    return defaultData;
  }
}

function saveStoredData(data: StoredData) {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL"
});

export default function Home() {
  const [data, setData] = useState<StoredData>(defaultData);
  const [isLoaded, setIsLoaded] = useState(false);

  const [accountForm, setAccountForm] = useState({
    name: "",
    institution: "",
    balance: ""
  });

  const [categoryForm, setCategoryForm] = useState({
    name: "",
    kind: "despesa" as Category["kind"]
  });

  const [transactionForm, setTransactionForm] = useState({
    description: "",
    amount: "",
    date: "",
    accountId: "",
    categoryId: "",
    kind: "despesa" as Transaction["kind"],
    status: "pendente" as Transaction["status"]
  });

  useEffect(() => {
    const stored = loadStoredData();
    setData(stored);
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (!isLoaded) return;
    saveStoredData(data);
  }, [data, isLoaded]);

  const summary = useMemo(() => {
    const paidTransactions = data.transactions.filter(
      (transaction) => transaction.status === "pago"
    );

    const pendingTransactions = data.transactions.filter(
      (transaction) => transaction.status === "pendente"
    );

    const incomes = paidTransactions.filter(
      (transaction) => transaction.kind === "receita"
    );

    const expenses = paidTransactions.filter(
      (transaction) => transaction.kind === "despesa"
    );

    const totalIncome = incomes.reduce(
      (acc, transaction) => acc + transaction.amount,
      0
    );

    const totalExpenses = expenses.reduce(
      (acc, transaction) => acc + transaction.amount,
      0
    );

    const pendingTotal = pendingTransactions.reduce(
      (acc, transaction) => acc + transaction.amount,
      0
    );

    const balance = totalIncome - totalExpenses;

    return {
      totalIncome,
      totalExpenses,
      pendingTotal,
      balance
    };
  }, [data.transactions]);

  const handleAddAccount = () => {
    if (!accountForm.name.trim()) return;

    setData((previous) => ({
      ...previous,
      accounts: [
        ...previous.accounts,
        {
          id: uuidv4(),
          name: accountForm.name.trim(),
          institution: accountForm.institution.trim() || undefined,
          balance: Number(accountForm.balance) || 0
        }
      ]
    }));

    setAccountForm({ name: "", institution: "", balance: "" });
  };

  const handleAddCategory = () => {
    if (!categoryForm.name.trim()) return;

    setData((previous) => ({
      ...previous,
      categories: [
        ...previous.categories,
        {
          id: uuidv4(),
          name: categoryForm.name.trim(),
          kind: categoryForm.kind
        }
      ]
    }));

    setCategoryForm({ name: "", kind: "despesa" });
  };

  const handleAddTransaction = () => {
    if (!transactionForm.description.trim() || !transactionForm.amount) {
      return;
    }

    if (!transactionForm.accountId || !transactionForm.categoryId) {
      return;
    }

    setData((previous) => ({
      ...previous,
      transactions: [
        ...previous.transactions,
        {
          id: uuidv4(),
          description: transactionForm.description.trim(),
          amount: Number(transactionForm.amount),
          date: transactionForm.date || new Date().toISOString().slice(0, 10),
          accountId: transactionForm.accountId,
          categoryId: transactionForm.categoryId,
          kind: transactionForm.kind,
          status: transactionForm.status
        }
      ]
    }));

    setTransactionForm({
      description: "",
      amount: "",
      date: "",
      accountId: "",
      categoryId: "",
      kind: transactionForm.kind,
      status: "pendente"
    });
  };

  const handleTogglePayment = (id: string) => {
    setData((previous) => ({
      ...previous,
      transactions: previous.transactions.map((transaction) =>
        transaction.id === id
          ? {
              ...transaction,
              status: transaction.status === "pago" ? "pendente" : "pago"
            }
          : transaction
      )
    }));
  };

  const handleRemoveTransaction = (id: string) => {
    setData((previous) => ({
      ...previous,
      transactions: previous.transactions.filter((transaction) => transaction.id !== id)
    }));
  };

  const getAccountById = (id: string) =>
    data.accounts.find((account) => account.id === id)?.name ?? "Conta removida";

  const getCategoryById = (id: string) =>
    data.categories.find((category) => category.id === id)?.name ?? "Categoria removida";

  const transactionRows = [...data.transactions].sort((a, b) =>
    a.date.localeCompare(b.date)
  );

  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-8 p-6">
      <header className="flex flex-col gap-4 rounded-xl bg-white p-6 shadow-sm">
        <div>
          <h1 className="text-3xl font-bold">Controle Financeiro Familiar</h1>
          <p className="text-sm text-slate-500">
            Cadastre contas, categorias, lançamentos e acompanhe o status de cada despesa
            ou receita em um só lugar.
          </p>
        </div>
        <section className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <SummaryCard
            title="Saldo consolidado"
            value={summary.balance}
            highlight="neutral"
          />
          <SummaryCard title="Receitas pagas" value={summary.totalIncome} highlight="positive" />
          <SummaryCard title="Despesas pagas" value={summary.totalExpenses} highlight="negative" />
          <SummaryCard title="Lançamentos pendentes" value={summary.pendingTotal} highlight="warning" />
        </section>
      </header>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-[2fr_3fr]">
        <div className="flex flex-col gap-6">
          <FormCard title="Nova conta" description="Cadastre uma conta bancária ou carteira.">
            <div className="grid grid-cols-1 gap-3">
              <label className="flex flex-col gap-1 text-sm">
                Nome da conta
                <input
                  value={accountForm.name}
                  onChange={(event) =>
                    setAccountForm((previous) => ({
                      ...previous,
                      name: event.target.value
                    }))
                  }
                  className="rounded border border-slate-300 px-3 py-2 focus:border-slate-500 focus:outline-none"
                  placeholder="Conta corrente, carteira..."
                />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                Instituição (opcional)
                <input
                  value={accountForm.institution}
                  onChange={(event) =>
                    setAccountForm((previous) => ({
                      ...previous,
                      institution: event.target.value
                    }))
                  }
                  className="rounded border border-slate-300 px-3 py-2 focus:border-slate-500 focus:outline-none"
                  placeholder="Banco, fintech..."
                />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                Saldo inicial
                <input
                  type="number"
                  value={accountForm.balance}
                  onChange={(event) =>
                    setAccountForm((previous) => ({
                      ...previous,
                      balance: event.target.value
                    }))
                  }
                  className="rounded border border-slate-300 px-3 py-2 focus:border-slate-500 focus:outline-none"
                  placeholder="0,00"
                />
              </label>
              <button
                type="button"
                onClick={handleAddAccount}
                className="rounded bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
              >
                Salvar conta
              </button>
            </div>
          </FormCard>

          <FormCard title="Nova categoria" description="Separe suas receitas e despesas.">
            <div className="grid grid-cols-1 gap-3">
              <label className="flex flex-col gap-1 text-sm">
                Nome da categoria
                <input
                  value={categoryForm.name}
                  onChange={(event) =>
                    setCategoryForm((previous) => ({
                      ...previous,
                      name: event.target.value
                    }))
                  }
                  className="rounded border border-slate-300 px-3 py-2 focus:border-slate-500 focus:outline-none"
                  placeholder="Alimentação, salário..."
                />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                Tipo
                <select
                  value={categoryForm.kind}
                  onChange={(event) =>
                    setCategoryForm((previous) => ({
                      ...previous,
                      kind: event.target.value as Category["kind"]
                    }))
                  }
                  className="rounded border border-slate-300 px-3 py-2 focus:border-slate-500 focus:outline-none"
                >
                  <option value="despesa">Despesa</option>
                  <option value="receita">Receita</option>
                </select>
              </label>
              <button
                type="button"
                onClick={handleAddCategory}
                className="rounded bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
              >
                Salvar categoria
              </button>
            </div>
          </FormCard>
        </div>

        <FormCard
          title="Novo lançamento"
          description="Registre despesas ou receitas e faça a baixa quando o pagamento for concluído."
        >
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <label className="flex flex-col gap-1 text-sm">
              Descrição
              <input
                value={transactionForm.description}
                onChange={(event) =>
                  setTransactionForm((previous) => ({
                    ...previous,
                    description: event.target.value
                  }))
                }
                className="rounded border border-slate-300 px-3 py-2 focus:border-slate-500 focus:outline-none"
                placeholder="Ex.: Supermercado, salário"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              Valor
              <input
                type="number"
                min="0"
                step="0.01"
                value={transactionForm.amount}
                onChange={(event) =>
                  setTransactionForm((previous) => ({
                    ...previous,
                    amount: event.target.value
                  }))
                }
                className="rounded border border-slate-300 px-3 py-2 focus:border-slate-500 focus:outline-none"
                placeholder="0,00"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              Data
              <input
                type="date"
                value={transactionForm.date}
                onChange={(event) =>
                  setTransactionForm((previous) => ({
                    ...previous,
                    date: event.target.value
                  }))
                }
                className="rounded border border-slate-300 px-3 py-2 focus:border-slate-500 focus:outline-none"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              Conta
              <select
                value={transactionForm.accountId}
                onChange={(event) =>
                  setTransactionForm((previous) => ({
                    ...previous,
                    accountId: event.target.value
                  }))
                }
                className="rounded border border-slate-300 px-3 py-2 focus:border-slate-500 focus:outline-none"
              >
                <option value="">Selecione uma conta</option>
                {data.accounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm">
              Categoria
              <select
                value={transactionForm.categoryId}
                onChange={(event) =>
                  setTransactionForm((previous) => ({
                    ...previous,
                    categoryId: event.target.value
                  }))
                }
                className="rounded border border-slate-300 px-3 py-2 focus:border-slate-500 focus:outline-none"
              >
                <option value="">Selecione uma categoria</option>
                {data.categories
                  .filter((category) => category.kind === transactionForm.kind)
                  .map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm">
              Tipo
              <select
                value={transactionForm.kind}
                onChange={(event) =>
                  setTransactionForm((previous) => ({
                    ...previous,
                    kind: event.target.value as Transaction["kind"],
                    categoryId: ""
                  }))
                }
                className="rounded border border-slate-300 px-3 py-2 focus:border-slate-500 focus:outline-none"
              >
                <option value="despesa">Despesa</option>
                <option value="receita">Receita</option>
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm">
              Status
              <select
                value={transactionForm.status}
                onChange={(event) =>
                  setTransactionForm((previous) => ({
                    ...previous,
                    status: event.target.value as Transaction["status"]
                  }))
                }
                className="rounded border border-slate-300 px-3 py-2 focus:border-slate-500 focus:outline-none"
              >
                <option value="pendente">Pendente</option>
                <option value="pago">Pago</option>
              </select>
            </label>
          </div>
          <button
            type="button"
            onClick={handleAddTransaction}
            className="mt-4 w-full rounded bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500"
          >
            Registrar lançamento
          </button>
        </FormCard>
      </section>

      <section className="rounded-xl bg-white p-6 shadow-sm">
        <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-xl font-semibold">Lançamentos cadastrados</h2>
            <p className="text-sm text-slate-500">
              Faça a baixa de cada lançamento conforme o pagamento ou recebimento for concluído.
            </p>
          </div>
          <span className="text-sm text-slate-500">
            {data.transactions.length} lançamentos registrados
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left">
              <tr>
                <th className="px-4 py-3 font-medium">Data</th>
                <th className="px-4 py-3 font-medium">Descrição</th>
                <th className="px-4 py-3 font-medium">Conta</th>
                <th className="px-4 py-3 font-medium">Categoria</th>
                <th className="px-4 py-3 font-medium text-right">Valor</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {transactionRows.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center text-slate-500">
                    Nenhum lançamento cadastrado até o momento.
                  </td>
                </tr>
              )}

              {transactionRows.map((transaction) => (
                <tr key={transaction.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 text-slate-600">
                    {new Date(transaction.date).toLocaleDateString("pt-BR")}
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-900">{transaction.description}</div>
                    <div className="text-xs text-slate-500">
                      {transaction.kind === "despesa" ? "Despesa" : "Receita"}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{getAccountById(transaction.accountId)}</td>
                  <td className="px-4 py-3 text-slate-600">{getCategoryById(transaction.categoryId)}</td>
                  <td className="px-4 py-3 text-right font-semibold">
                    <span className={
                      transaction.kind === "despesa" ? "text-rose-600" : "text-emerald-600"
                    }>
                      {currencyFormatter.format(transaction.amount)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${
                        transaction.status === "pago"
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {transaction.status === "pago" ? "Pago" : "Pendente"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => handleTogglePayment(transaction.id)}
                        className="rounded border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
                      >
                        {transaction.status === "pago" ? "Marcar como pendente" : "Dar baixa"}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveTransaction(transaction.id)}
                        className="rounded border border-rose-200 px-3 py-1 text-xs font-semibold text-rose-600 transition hover:border-rose-300 hover:bg-rose-50"
                      >
                        Excluir
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <ListCard title="Contas cadastradas" items={data.accounts.map((account) => ({
          id: account.id,
          title: account.name,
          description: account.institution,
          extra: currencyFormatter.format(account.balance)
        }))} emptyMessage="Nenhuma conta cadastrada." />

        <ListCard
          title="Categorias cadastradas"
          items={data.categories.map((category) => ({
            id: category.id,
            title: category.name,
            description: category.kind === "despesa" ? "Despesa" : "Receita"
          }))}
          emptyMessage="Nenhuma categoria cadastrada."
        />
      </section>
    </main>
  );
}

type SummaryCardProps = {
  title: string;
  value: number;
  highlight: "positive" | "negative" | "warning" | "neutral";
};

function SummaryCard({ title, value, highlight }: SummaryCardProps) {
  const highlightClasses: Record<SummaryCardProps["highlight"], string> = {
    positive: "bg-emerald-100 text-emerald-700",
    negative: "bg-rose-100 text-rose-700",
    warning: "bg-amber-100 text-amber-700",
    neutral: "bg-slate-100 text-slate-700"
  };

  return (
    <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="text-sm font-semibold text-slate-500">{title}</h2>
      <p className={`mt-2 inline-block rounded px-2 py-1 text-lg font-bold ${highlightClasses[highlight]}`}>
        {currencyFormatter.format(value)}
      </p>
    </article>
  );
}

type FormCardProps = {
  title: string;
  description: string;
  children: React.ReactNode;
};

function FormCard({ title, description, children }: FormCardProps) {
  return (
    <section className="rounded-xl bg-white p-6 shadow-sm">
      <header className="mb-4">
        <h2 className="text-xl font-semibold text-slate-900">{title}</h2>
        <p className="text-sm text-slate-500">{description}</p>
      </header>
      {children}
    </section>
  );
}

type ListCardProps = {
  title: string;
  items: Array<{
    id: string;
    title: string;
    description?: string;
    extra?: string;
  }>;
  emptyMessage: string;
};

function ListCard({ title, items, emptyMessage }: ListCardProps) {
  return (
    <section className="rounded-xl bg-white p-6 shadow-sm">
      <header className="mb-4">
        <h2 className="text-xl font-semibold text-slate-900">{title}</h2>
      </header>
      <ul className="flex flex-col gap-3">
        {items.length === 0 && (
          <li className="rounded border border-dashed border-slate-300 px-4 py-6 text-center text-sm text-slate-500">
            {emptyMessage}
          </li>
        )}
        {items.map((item) => (
          <li
            key={item.id}
            className="flex flex-col gap-1 rounded border border-slate-200 px-4 py-3 text-sm text-slate-600"
          >
            <div className="flex items-center justify-between gap-4">
              <span className="font-semibold text-slate-900">{item.title}</span>
              {item.extra && <span className="text-xs text-slate-500">{item.extra}</span>}
            </div>
            {item.description && <span className="text-xs text-slate-500">{item.description}</span>}
          </li>
        ))}
      </ul>
    </section>
  );
}
