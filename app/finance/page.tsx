'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowDownRight,
  CalendarDays,
  ChevronLeft,
  CircleDollarSign,
  FileSpreadsheet,
  PiggyBank,
  Plus,
  ReceiptText,
  TrendingDown,
} from 'lucide-react'
import { ThemeMenu, useDashboardTheme } from '@/components/theme-menu'
import {
  getMinusData,
  saveMinusImport,
  type MinusBudget,
  type MinusData,
  type MinusTransaction,
} from '@/lib/minus-data'

const money = new Intl.NumberFormat('en-CA', {
  style: 'currency',
  currency: 'CAD',
  maximumFractionDigits: 0,
})
const dateFormat = new Intl.DateTimeFormat('en-CA', {
  month: 'short',
  day: 'numeric',
})

const toIsoDate = (value: unknown) => {
  if (value instanceof Date && !Number.isNaN(value.getTime()))
    return value.toISOString()
  if (typeof value === 'number') {
    const excelEpoch = new Date(Date.UTC(1899, 11, 30))
    return new Date(excelEpoch.getTime() + value * 86_400_000).toISOString()
  }
  if (typeof value === 'string') {
    const date = new Date(value)
    if (!Number.isNaN(date.getTime())) return date.toISOString()
  }
  return undefined
}

const withinPeriod = (date: string, budget?: MinusBudget) => {
  if (!budget?.startDate || !budget.endDate) return true
  return date >= budget.startDate && date < budget.endDate
}

export default function FinancePage() {
  const { theme, setTheme } = useDashboardTheme()
  const [minus, setMinus] = useState<MinusData>({ transactions: [] })
  const [note, setNote] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const load = useCallback(async () => {
    try {
      setMinus(await getMinusData())
    } catch {
      setNote('Could not read your locally imported Minus data.')
    }
  }, [])
  useEffect(() => {
    load()
  }, [load])

  const importBackup = async (file: File) => {
    try {
      const XLSX = await import('xlsx/xlsx.mjs')
      const workbook = XLSX.read(await file.arrayBuffer(), {
        type: 'array',
        cellDates: true,
      })
      const sheet = workbook.Sheets[workbook.SheetNames[0]]
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
        defval: undefined,
      })
      const transactions: MinusTransaction[] = rows.flatMap((row) => {
        const date = toIsoDate(row.date)
        const amount = Number(row.amount)
        const id = row.id === undefined ? '' : String(row.id)
        if (!date || !id || !Number.isFinite(amount)) return []
        return [
          {
            id,
            date,
            amountCents: Math.round(amount * 100),
            category: String(row.comment || 'Uncategorized'),
            isRecurrent: Boolean(row.is_recurrent),
          },
        ]
      })
      const budgetRow = rows.find((row) =>
        Number.isFinite(Number(row.budget_total)),
      )
      const budget: MinusBudget | undefined = budgetRow
        ? {
            totalCents: Math.round(Number(budgetRow.budget_total) * 100),
            period:
              typeof budgetRow.budget_period === 'string'
                ? budgetRow.budget_period
                : undefined,
            startDate: toIsoDate(budgetRow.budget_start_date),
            endDate: toIsoDate(budgetRow.budget_end_date),
            rolloverEnabled: Boolean(budgetRow.rollover_enabled),
          }
        : undefined
      if (!transactions.length)
        throw new Error('No Minus transactions were found in this file.')
      await saveMinusImport(transactions, budget)
      await load()
      setNote(`Merged ${transactions.length} Minus expenses from ${file.name}.`)
    } catch (error) {
      setNote(
        error instanceof Error
          ? error.message
          : 'Could not import this Minus backup.',
      )
    } finally {
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  const periodTransactions = useMemo(
    () =>
      minus.transactions.filter((item) =>
        withinPeriod(item.date, minus.budget),
      ),
    [minus],
  )
  const spentCents = periodTransactions.reduce(
    (sum, item) => sum + item.amountCents,
    0,
  )
  const budgetCents = minus.budget?.totalCents
  const remainingCents =
    budgetCents === undefined ? undefined : budgetCents - spentCents
  const daysLeft = minus.budget?.endDate
    ? Math.max(
        0,
        Math.ceil(
          (new Date(minus.budget.endDate).getTime() - Date.now()) / 86_400_000,
        ),
      )
    : undefined
  const categories = useMemo(
    () =>
      Object.entries(
        periodTransactions.reduce<Record<string, number>>((all, item) => {
          all[item.category] = (all[item.category] ?? 0) + item.amountCents
          return all
        }, {}),
      )
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5),
    [periodTransactions],
  )
  const daily = useMemo(() => {
    const values = new Map<string, number>()
    periodTransactions.forEach((item) => {
      const key = item.date.slice(0, 10)
      values.set(key, (values.get(key) ?? 0) + item.amountCents)
    })
    return [...values.entries()]
      .sort(([firstDay], [secondDay]) => firstDay.localeCompare(secondDay))
      .slice(-12)
  }, [periodTransactions])
  const maxDaily = Math.max(...daily.map(([, amount]) => amount), 1)

  return (
    <main className={`dashboard theme-${theme}`}>
      <header className="topbar">
        <a className="brand" href="/">
          <div className="brand-mark">
            <CircleDollarSign size={18} />
          </div>
          <div>
            <strong>DL&apos;s Finances</strong>
            <span>Minus budget mirror</span>
          </div>
        </a>
        <div className="top-actions">
          <ThemeMenu theme={theme} onThemeChange={setTheme} />
        </div>
      </header>
      <div className="finance-dashboard">
        <div className="finance-heading">
          <div>
            <a className="back-link" href="/">
              <ChevronLeft size={15} /> Overview
            </a>
            <p className="eyebrow">MINUS EXPENSE TRACKER</p>
            <h1>
              Spend with intention<span className="accent-dot">.</span>
            </h1>
            <p className="subheading">
              Private browser-only mirror of your Minus exports.
            </p>
          </div>
          <label className="edit-button finance-import">
            <Plus size={16} /> Import Minus backup
            <input
              ref={inputRef}
              type="file"
              accept=".xlsx,.xls,.csv,text/csv"
              hidden
              onChange={(event) =>
                event.target.files?.[0] && importBackup(event.target.files[0])
              }
            />
          </label>
        </div>
        {note && <p className="finance-note">{note}</p>}
        {!minus.transactions.length ? (
          <section className="finance-empty">
            <FileSpreadsheet size={28} />
            <h2>Import a Minus backup</h2>
            <p>
              Upload the XLSX or CSV backup exported from Minus. Your records
              stay in this browser and future imports merge by transaction ID.
            </p>
          </section>
        ) : (
          <>
            <section className="finance-summary">
              <div className="finance-stat">
                <TrendingDown size={17} />
                <span>Spent this period</span>
                <strong>{money.format(spentCents / 100)}</strong>
              </div>
              <div className="finance-stat">
                <PiggyBank size={17} />
                <span>Remaining budget</span>
                <strong>
                  {remainingCents === undefined
                    ? '—'
                    : money.format(remainingCents / 100)}
                </strong>
              </div>
              <div className="finance-stat">
                <CalendarDays size={17} />
                <span>Period ends</span>
                <strong>
                  {daysLeft === undefined ? '—' : `${daysLeft} days`}
                </strong>
              </div>
            </section>
            <div className="finance-grid">
              <section className="finance-panel">
                <div className="finance-panel-heading">
                  <div>
                    <p className="eyebrow">SPENDING TREND</p>
                    <h2>Recent days</h2>
                  </div>
                  <ReceiptText size={19} />
                </div>
                <div className="spend-bars">
                  {daily.map(([day, amount]) => (
                    <div className="spend-bar" key={day}>
                      <i
                        style={{
                          height: `${Math.max(8, (amount / maxDaily) * 100)}%`,
                        }}
                      />
                      <span>{new Date(`${day}T12:00:00`).getDate()}</span>
                    </div>
                  ))}
                </div>
              </section>
              <section className="finance-panel">
                <div className="finance-panel-heading">
                  <div>
                    <p className="eyebrow">CATEGORIES</p>
                    <h2>Where it&apos;s going</h2>
                  </div>
                  <ArrowDownRight size={19} />
                </div>
                <div className="category-list">
                  {categories.map(([category, amount]) => (
                    <div className="category-row" key={category}>
                      <span>{category}</span>
                      <strong>{money.format(amount / 100)}</strong>
                    </div>
                  ))}
                </div>
              </section>
            </div>
            <section className="finance-panel finance-transactions">
              <div className="finance-panel-heading">
                <div>
                  <p className="eyebrow">RECENT EXPENSES</p>
                  <h2>Transaction history</h2>
                </div>
                <span className="signal-value">
                  {minus.lastImportedAt
                    ? `Updated ${dateFormat.format(new Date(minus.lastImportedAt))}`
                    : 'Local only'}
                </span>
              </div>
              <div className="finance-transaction-list">
                {minus.transactions.slice(0, 12).map((transaction) => (
                  <div className="finance-transaction" key={transaction.id}>
                    <div>
                      <strong>{transaction.category}</strong>
                      <span>
                        {dateFormat.format(new Date(transaction.date))}
                      </span>
                    </div>
                    <strong>
                      {money.format(transaction.amountCents / 100)}
                    </strong>
                  </div>
                ))}
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  )
}
