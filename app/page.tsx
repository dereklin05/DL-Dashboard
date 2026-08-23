'use client'

import { useEffect, useMemo, useState } from 'react'
import { ThemeMenu, useDashboardTheme } from '@/components/theme-menu'
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  CalendarDays,
  ChevronDown,
  ChevronRight,
  CircleDollarSign,
  CloudRain,
  CloudSun,
  Coffee,
  CreditCard,
  EyeOff,
  Flame,
  GripVertical,
  LayoutDashboard,
  Maximize2,
  MoreHorizontal,
  PanelRight,
  Plus,
  Settings2,
  Sparkles,
  Sun,
  TrendingUp,
  Watch,
  Wind,
  X,
  Zap,
} from 'lucide-react'

type WidgetId =
  'readiness' | 'calendar' | 'markets' | 'expenses' | 'briefing' | 'weather'
type Widget = {
  id: WidgetId
  label: string
  visible: boolean
  collapsed: boolean
}
type Data = {
  calendar?: {
    available: boolean
    events?: CalendarEvent[]
    nextEvent?: CalendarEvent | null
  }
  health?: {
    available: boolean
    steps?: Record<string, unknown>
    restingHeartRate?: Record<string, unknown>
    sleep?: Array<{ durationSeconds?: number }>
  }
  markets?: {
    available: boolean
    quotes?: { symbol: string; price?: string; change_ratio?: string }[]
    configuredSymbols?: number
    limited?: boolean
  }
  expenses?: {
    available: boolean
    monthSpentCents?: number
    transactions?: {
      occurred_at: string
      merchant: string
      category: string
      amount_cents: number
    }[]
  }
  weather?: {
    available: boolean
    location?: string
    current?: {
      temperature_2m?: number
      apparent_temperature?: number
      wind_speed_10m?: number
      weather_code?: number
    }
    hourly?: { temperature_2m?: number[]; precipitation_probability?: number[] }
    daily?: { temperature_2m_max?: number[]; temperature_2m_min?: number[] }
  }
}
type CalendarEvent = {
  id: string
  title: string
  start?: string
  end?: string
  link?: string
}
type LocalTransaction = {
  occurred_at: string
  merchant: string
  category: string
  amount_cents: number
}
const expenseStorageKey = 'dl-dashboard-minus-transactions'
const initial: Widget[] = [
  ['readiness', 'Health'],
  ['calendar', 'Schedule'],
  ['markets', 'Markets'],
  ['expenses', 'Expenses'],
  ['briefing', 'Data status'],
  ['weather', 'Weather'],
].map(([id, label]) => ({
  id: id as WidgetId,
  label,
  visible: true,
  collapsed: false,
}))
const money = (cents: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(
    cents / 100,
  )
const time = (date?: string) =>
  date
    ? new Intl.DateTimeFormat('en-US', {
        hour: 'numeric',
        minute: '2-digit',
      }).format(new Date(date))
    : 'All day'
const weatherCondition = (code?: number) => {
  if (code === undefined) return 'Weather unavailable'
  if (code === 0) return 'Sunny'
  if ([1, 2].includes(code)) return 'Partly cloudy'
  if (code === 3) return 'Cloudy'
  if ([45, 48].includes(code)) return 'Foggy'
  if ([51, 53, 55, 56, 57].includes(code)) return 'Drizzle'
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return 'Rainy'
  if ([71, 73, 75, 77, 85, 86].includes(code)) return 'Snowy'
  if ([95, 96, 99].includes(code)) return 'Thunderstorms'
  return 'Cloudy'
}
function Header({
  icon: Icon,
  eyebrow,
  title,
  action,
}: {
  icon: typeof Activity
  eyebrow: string
  title: string
  action?: React.ReactNode
}) {
  return (
    <div className="mb-5 flex items-start justify-between gap-3">
      <div className="flex items-start gap-3">
        <div className="icon-tile">
          <Icon size={16} />
        </div>
        <div>
          <p className="eyebrow">{eyebrow}</p>
          <h2>{title}</h2>
        </div>
      </div>
      {action}
    </div>
  )
}
function Empty({ children }: { children: React.ReactNode }) {
  return (
    <p className="advice">
      <Sparkles size={14} /> {children}
    </p>
  )
}

export default function Home() {
  const { theme, setTheme } = useDashboardTheme()
  const [widgets, setWidgets] = useState(initial),
    [customizing, setCustomizing] = useState(false),
    [maximized, setMaximized] = useState<WidgetId | null>(null),
    [data, setData] = useState<Data | null>(null),
    [localTransactions, setLocalTransactions] = useState<LocalTransaction[]>(
      [],
    ),
    [error, setError] = useState(''),
    [importNote, setImportNote] = useState('')
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(expenseStorageKey) ?? '[]')
      if (Array.isArray(saved)) setLocalTransactions(saved)
    } catch {
      localStorage.removeItem(expenseStorageKey)
    }
    fetch('/api/dashboard')
      .then(async (r) =>
        r.ok ? r.json() : Promise.reject((await r.json()).error),
      )
      .then(setData)
      .catch((e) =>
        setError(typeof e === 'string' ? e : 'Live data is unavailable'),
      )
  }, [])
  const today = new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  }).format(new Date())
  const events = data?.calendar?.available ? (data.calendar.events ?? []) : [],
    nextEvent = data?.calendar?.available ? data.calendar.nextEvent : undefined,
    quotes = data?.markets?.available ? (data.markets.quotes ?? []) : [],
    transactions = localTransactions,
    current = data?.weather?.available ? data.weather.current : undefined,
    hourly = data?.weather?.available
      ? (data.weather.hourly?.temperature_2m?.slice(0, 10) ?? [])
      : []
  const high = data?.weather?.daily?.temperature_2m_max?.[0]
  const low = data?.weather?.daily?.temperature_2m_min?.[0]
  const weatherSearchUrl = `https://www.google.com/search?q=${encodeURIComponent(`${data?.weather?.location ?? 'local'} weather`)}`
  const steps = Number(
      (data?.health?.steps?.steps as { countSum?: string } | undefined)
        ?.countSum ?? 0,
    ),
    heartRate = Number(
      (
        data?.health?.restingHeartRate?.restingHeartRate as
          { beatsPerMinuteAverage?: number } | undefined
      )?.beatsPerMinuteAverage ?? 0,
    )
  const sleepMinutes = Math.round(
    Number(data?.health?.sleep?.[0]?.durationSeconds ?? 0) / 60,
  )
  const sleepDuration = sleepMinutes
    ? `${Math.floor(sleepMinutes / 60)}h ${sleepMinutes % 60}m`
    : '—'
  const nextEventTime = nextEvent?.start
    ? new Intl.DateTimeFormat('en-US', {
        weekday: 'short',
        hour: 'numeric',
        minute: '2-digit',
      }).format(new Date(nextEvent.start))
    : 'Calendar'
  const monthSpentCents = transactions.reduce(
    (total, transaction) => total + transaction.amount_cents,
    0,
  )
  const visible = useMemo(() => widgets.filter((x) => x.visible), [widgets])
  const patch = (id: WidgetId, value: Partial<Widget>) =>
    setWidgets((all) => all.map((x) => (x.id === id ? { ...x, ...value } : x)))
  const importCsv = async (file: File) => {
    const rows = (await file.text())
      .split(/\r?\n/)
      .filter(Boolean)
      .map((line) => line.split(',').map((value) => value.trim()))
    const headers = rows.shift()?.map((value) => value.toLowerCase()) ?? []
    const value = (row: string[], names: string[]) =>
      row[headers.findIndex((header) => names.includes(header))] ?? ''
    const imported = rows
      .map((row) => ({
        occurred_at: value(row, ['date', 'transaction date', 'occurred_at']),
        merchant: value(row, ['merchant', 'description', 'name']),
        category: value(row, ['category']) || 'Uncategorized',
        amount_cents: Math.round(
          Math.abs(
            Number(
              value(row, ['amount', 'transaction amount']).replace(/[$,]/g, ''),
            ),
          ) * 100,
        ),
      }))
      .filter(
        (transaction) =>
          transaction.occurred_at &&
          transaction.merchant &&
          Number.isFinite(transaction.amount_cents),
      )
    if (!imported.length)
      return setImportNote(
        'Could not find Date, Merchant/Description, and Amount columns in this CSV.',
      )
    const updated = [...imported, ...localTransactions]
    localStorage.setItem(expenseStorageKey, JSON.stringify(updated))
    setLocalTransactions(updated)
    setImportNote(
      `Saved ${imported.length} Minus transactions in this browser.`,
    )
  }
  const frame = (widget: Widget, content: React.ReactNode) => (
    <article
      key={widget.id}
      className={`widget widget-${widget.id} ${widget.collapsed ? 'is-collapsed' : ''} ${maximized === widget.id ? 'is-maximized' : ''}`}
    >
      <div className="widget-actions">
        <button
          onClick={() => patch(widget.id, { collapsed: !widget.collapsed })}
        >
          <ChevronDown size={15} />
        </button>
        <button
          onClick={() =>
            setMaximized(maximized === widget.id ? null : widget.id)
          }
        >
          <Maximize2 size={14} />
        </button>
        <button onClick={() => patch(widget.id, { visible: false })}>
          <EyeOff size={14} />
        </button>
      </div>
      {content}
    </article>
  )
  return (
    <main className={`dashboard theme-${theme}`}>
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark">
            <LayoutDashboard size={18} />
          </div>
          <div>
            <strong>DL&apos;s Dashboard</strong>
            <span>Personal operating system</span>
          </div>
        </div>
        <div className="top-actions">
          <div className="date-chip">
            <span className="live-dot" /> <span>{today}</span>
            <b>{data ? 'Live' : 'Loading'}</b>
          </div>
          <ThemeMenu theme={theme} onThemeChange={setTheme} />
        </div>
      </header>
      <div className="dashboard-body">
        <aside className="sidebar">
          <div className="side-label">Workspace</div>
          <button className="side-link active">
            <LayoutDashboard size={16} /> Overview
          </button>
          <a className="side-link" href="/health">
            <Activity size={16} /> Health & recovery
          </a>
          <a className="side-link" href="/markets">
            <TrendingUp size={16} /> Markets
          </a>
          <button className="side-link">
            <CalendarDays size={16} /> Calendar
          </button>
          <div className="sidebar-bottom">
            <div className="side-label">System</div>
            <button className="side-link">
              <Settings2 size={16} /> Preferences
            </button>
            <div className="sync-status">
              <span className="live-dot" />
              <span>{data ? 'Next.js synced' : 'Loading live data'}</span>
            </div>
          </div>
        </aside>
        <section className="content">
          <div className="page-heading">
            <div>
              <p className="eyebrow">{today}</p>
              <h1>
                Good morning, DL<span className="accent-dot">.</span>
              </h1>
              <p className="subheading">Your real data, in one clear view.</p>
            </div>
            <div className="heading-actions">
              <label className="edit-button">
                <Plus size={16} /> Import Minus CSV
                <input
                  type="file"
                  accept=".csv,text/csv"
                  hidden
                  onChange={(e) =>
                    e.target.files?.[0] && importCsv(e.target.files[0])
                  }
                />
              </label>
              <button
                className="edit-button"
                onClick={() => setCustomizing(true)}
              >
                <PanelRight size={16} /> Edit dashboard layout
              </button>
            </div>
          </div>
          {error && <p className="subheading">{error}</p>}
          {importNote && <p className="subheading">{importNote}</p>}
          <div className="signal-row">
            <div className="signal-card">
              <span className="signal-icon green">
                <Zap size={16} />
              </span>
              <div>
                <span>Today&apos;s steps</span>
                <strong>
                  {data?.health?.available
                    ? `${steps.toLocaleString()} steps`
                    : 'Health not connected'}
                </strong>
              </div>
              <span className="signal-value">Google Health</span>
            </div>
            <div className="signal-card">
              <span className="signal-icon purple">
                <CalendarDays size={16} />
              </span>
              <div>
                <span>Next up</span>
                <strong>{nextEvent?.title ?? 'No upcoming events'}</strong>
              </div>
              <span className="signal-value">{nextEventTime}</span>
            </div>
            <a
              className="signal-card weather-link"
              href={weatherSearchUrl}
              target="_blank"
              rel="noreferrer"
              aria-label="Search Google for the local weather"
            >
              <span className="signal-icon orange">
                <CloudSun size={16} />
              </span>
              <div>
                <span>{weatherCondition(current?.weather_code)}</span>
                <strong>
                  {current?.temperature_2m === undefined
                    ? 'Weather unavailable'
                    : `${Math.round(current.temperature_2m)}°`}
                </strong>
              </div>
              <span className="signal-value">
                {high === undefined || low === undefined
                  ? 'Google weather'
                  : `H ${Math.round(high)}° · L ${Math.round(low)}°`}
              </span>
            </a>
          </div>
          <div className="widget-grid">
            {visible.map((widget) => {
              if (widget.id === 'readiness')
                return frame(
                  widget,
                  <>
                    <Header
                      icon={Watch}
                      eyebrow="Google Health"
                      title="Today's health"
                    />
                    {!widget.collapsed &&
                      (data?.health?.available ? (
                        <div className="readiness-layout">
                          <div className="battery-ring">
                            <div>
                              <strong>{steps.toLocaleString()}</strong>
                              <span>steps today</span>
                            </div>
                          </div>
                          <div className="readiness-metrics">
                            <div>
                              <span>Resting heart rate</span>
                              <strong>
                                {heartRate || '—'}{' '}
                                <small>{heartRate ? 'bpm' : ''}</small>
                              </strong>
                            </div>
                            <div>
                              <span>Sleep duration</span>
                              <strong>{sleepDuration}</strong>
                            </div>
                            <a className="text-button" href="/health">
                              View recovery details <ChevronRight size={14} />
                            </a>
                          </div>
                        </div>
                      ) : (
                        <Empty>
                          Add Google Health credentials to .env.local to load
                          metrics.
                        </Empty>
                      ))}
                  </>,
                )
              if (widget.id === 'calendar')
                return frame(
                  widget,
                  <>
                    <Header
                      icon={CalendarDays}
                      eyebrow="Google Calendar"
                      title="Your schedule"
                      action={
                        <span className="status-pill">
                          <span />{' '}
                          {data?.calendar?.available
                            ? 'Synced'
                            : 'Not connected'}
                        </span>
                      }
                    />
                    {!widget.collapsed &&
                      (events.length ? (
                        <div className="calendar-list">
                          {events.map((e, i) => (
                            <div
                              className={`calendar-event ${i === 0 ? 'current' : ''}`}
                              key={e.id}
                            >
                              <div className="event-time">
                                {time(e.start)}
                                <span>{time(e.end)}</span>
                              </div>
                              <div className="event-line blue">
                                <span />
                              </div>
                              <div className="event-info">
                                <strong>{e.title}</strong>
                                <span>
                                  <i className="event-tag blue" /> Google
                                  Calendar
                                </span>
                              </div>
                              {e.link && (
                                <a
                                  className="join-button"
                                  href={e.link}
                                  target="_blank"
                                >
                                  Open <ChevronRight size={12} />
                                </a>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <Empty>
                          No upcoming events, or connect Google Calendar.
                        </Empty>
                      ))}
                  </>,
                )
              if (widget.id === 'markets')
                return frame(
                  widget,
                  <>
                    <Header
                      icon={TrendingUp}
                      eyebrow="Twelve Data"
                      title="Your market pulse"
                    />
                    {!widget.collapsed &&
                      (quotes.length ? (
                        <>
                          <div className="market-list">
                            {quotes.map((q) => {
                              const c = Number(q.change_ratio ?? 0)
                              return (
                                <div className="market-row" key={q.symbol}>
                                  <div className="ticker-logo">
                                    {q.symbol[0]}
                                  </div>
                                  <div className="market-name">
                                    <strong>{q.symbol}</strong>
                                    <span>Twelve Data quote</span>
                                  </div>
                                  <div className="market-price">
                                    <strong>
                                      ${Number(q.price ?? 0).toFixed(2)}
                                    </strong>
                                    <span
                                      className={
                                        c >= 0 ? 'positive' : 'negative'
                                      }
                                    >
                                      {c >= 0 ? (
                                        <ArrowUpRight size={13} />
                                      ) : (
                                        <ArrowDownRight size={13} />
                                      )}
                                      {(c * 100).toFixed(2)}%
                                    </span>
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                          {data?.markets?.limited && (
                            <Empty>
                              Showing the first 8 of{' '}
                              {data.markets.configuredSymbols} symbols to stay
                              within your Twelve Data plan limit.
                            </Empty>
                          )}
                        </>
                      ) : (
                        <Empty>
                          Add your Twelve Data API key to .env.local.
                        </Empty>
                      ))}
                  </>,
                )
              if (widget.id === 'expenses')
                return frame(
                  widget,
                  <>
                    <Header
                      icon={CircleDollarSign}
                      eyebrow="Minus CSV / this browser"
                      title="Spend with intention"
                      action={<MoreHorizontal size={18} />}
                    />
                    {!widget.collapsed && (
                      <>
                        {data?.expenses?.available ? (
                          <div className="budget-header">
                            <div>
                              <span>This browser&apos;s imported spending</span>
                              <strong>{money(monthSpentCents)}</strong>
                            </div>
                          </div>
                        ) : (
                          <Empty>
                            Import a Minus CSV to store it in this browser.
                          </Empty>
                        )}
                        {transactions.length > 0 && (
                          <div className="transactions">
                            {transactions.map((t, i) => (
                              <div key={`${t.occurred_at}-${i}`}>
                                <span className="transaction-icon">
                                  {i % 2 ? (
                                    <CreditCard size={14} />
                                  ) : (
                                    <Coffee size={14} />
                                  )}
                                </span>
                                <span>
                                  <strong>{t.merchant}</strong>
                                  <small>
                                    {t.occurred_at} · {t.category}
                                  </small>
                                </span>
                                <b>-{money(t.amount_cents)}</b>
                              </div>
                            ))}
                          </div>
                        )}
                      </>
                    )}
                  </>,
                )
              if (widget.id === 'briefing')
                return frame(
                  widget,
                  <>
                    <Header
                      icon={Sparkles}
                      eyebrow="Integration status"
                      title="Your data sources"
                    />
                    {!widget.collapsed && (
                      <div className="briefing-copy">
                        <p>
                          Calendar:{' '}
                          {data?.calendar?.available
                            ? 'connected'
                            : 'not connected'}{' '}
                          · Health:{' '}
                          {data?.health?.available
                            ? 'connected'
                            : 'not connected'}{' '}
                          · Twelve Data:{' '}
                          {data?.markets?.available
                            ? 'connected'
                            : 'not connected'}{' '}
                          · Minus/D1:{' '}
                          {data?.expenses?.available
                            ? 'connected'
                            : 'not connected'}
                          .
                        </p>
                      </div>
                    )}
                  </>,
                )
              return frame(
                widget,
                <>
                  <Header
                    icon={CloudSun}
                    eyebrow={`${data?.weather?.location ?? 'Weather'} · Open-Meteo`}
                    title="Weather now"
                  />
                  {!widget.collapsed &&
                    (current ? (
                      <>
                        <div className="weather-main">
                          <div>
                            <strong>
                              {Math.round(current.temperature_2m ?? 0)}°
                            </strong>
                            <span>
                              Feels like{' '}
                              {Math.round(current.apparent_temperature ?? 0)}°
                            </span>
                          </div>
                          <Sun size={52} />
                        </div>
                        <div className="weather-stats">
                          <div>
                            <CloudRain size={15} />
                            <span>Precipitation</span>
                            <b>
                              {data?.weather?.hourly
                                ?.precipitation_probability?.[0] ?? '—'}
                              %
                            </b>
                          </div>
                          <div>
                            <Wind size={15} />
                            <span>Wind</span>
                            <b>{current.wind_speed_10m ?? '—'} km/h</b>
                          </div>
                          <div>
                            <Flame size={15} />
                            <span>Hourly data</span>
                            <b>{hourly.length} points</b>
                          </div>
                        </div>
                      </>
                    ) : (
                      <Empty>Weather data is unavailable.</Empty>
                    ))}
                </>,
              )
            })}
          </div>
        </section>
      </div>
      {customizing && (
        <div className="drawer-backdrop" onClick={() => setCustomizing(false)}>
          <aside
            className="customize-drawer"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="drawer-header">
              <div>
                <p className="eyebrow">Workspace settings</p>
                <h2>Customize dashboard</h2>
              </div>
              <button
                className="icon-button"
                onClick={() => setCustomizing(false)}
              >
                <X size={18} />
              </button>
            </div>
            <div className="drawer-section">
              {widgets.map((w) => (
                <div className="widget-toggle" key={w.id}>
                  <GripVertical size={16} className="grip" />
                  <span>{w.label}</span>
                  <button
                    className={`toggle ${w.visible ? 'on' : ''}`}
                    onClick={() => patch(w.id, { visible: !w.visible })}
                  >
                    <i />
                  </button>
                </div>
              ))}
            </div>
            <button
              className="done-button"
              onClick={() => setCustomizing(false)}
            >
              Done customizing
            </button>
          </aside>
        </div>
      )}
    </main>
  )
}
