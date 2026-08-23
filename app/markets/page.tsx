'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ArrowDownRight,
  ArrowUpRight,
  ChevronLeft,
  GripVertical,
  Plus,
  RefreshCw,
  TrendingUp,
} from 'lucide-react'
import { ThemeMenu, useDashboardTheme } from '@/components/theme-menu'
import { SignOutButton } from '@/components/sign-out-button'

type Quote = {
  symbol: string
  name?: string
  price?: string
  change_ratio?: string
}
type MarketData = {
  markets?: {
    available: boolean
    quotes?: Quote[]
    configuredSymbols?: number
    limited?: boolean
    error?: string
  }
  fetchedAt?: string
}
type WatchlistItem = {
  symbol: string
  visible: boolean
  position?: number
}

const currency = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
})
const percent = new Intl.NumberFormat('en-US', {
  style: 'percent',
  maximumFractionDigits: 2,
  signDisplay: 'always',
})

export default function MarketsPage() {
  const { theme, setTheme } = useDashboardTheme()
  const [data, setData] = useState<MarketData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([])
  const [symbolToAdd, setSymbolToAdd] = useState('')
  const [watchlistNote, setWatchlistNote] = useState('')
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [dropIndex, setDropIndex] = useState<number | null>(null)
  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [response, watchlistResponse] = await Promise.all([
        fetch('/api/dashboard'),
        fetch('/api/watchlist', { cache: 'no-store' }),
      ])
      const body = await response.json()
      if (!response.ok)
        throw new Error(body.error || 'Market data is unavailable')
      setData(body)
      if (watchlistResponse.ok) {
        const watchlistBody = await watchlistResponse.json()
        setWatchlist(watchlistBody.watchlist ?? [])
      }
      setError('')
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : 'Market data is unavailable',
      )
    } finally {
      setLoading(false)
    }
  }, [])
  useEffect(() => {
    load()
  }, [load])
  const quotes = data?.markets?.available ? (data.markets.quotes ?? []) : []
  const gainers = useMemo(
    () =>
      [...quotes].sort(
        (a, b) => Number(b.change_ratio) - Number(a.change_ratio),
      ),
    [quotes],
  )
  const leader = gainers[0],
    laggard = gainers.at(-1)
  const updated = data?.fetchedAt
    ? new Intl.DateTimeFormat('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        second: '2-digit',
      }).format(new Date(data.fetchedAt))
    : '—'
  const visibleCount = Math.min(8, watchlist.length)
  const saveWatchlist = async (nextWatchlist: WatchlistItem[]) => {
    const normalized = nextWatchlist.map((item, index) => ({
      ...item,
      visible: index < 8,
    }))
    setWatchlist(normalized)
    setWatchlistNote('Saving…')
    try {
      const response = await fetch('/api/watchlist', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ watchlist: normalized }),
      })
      const body = await response.json()
      if (!response.ok)
        throw new Error(body.error || 'Could not save watchlist')
      setWatchlist(body.watchlist ?? normalized)
      setWatchlistNote('Saved')
      load()
    } catch (cause) {
      setWatchlistNote(
        cause instanceof Error ? cause.message : 'Could not save watchlist',
      )
    }
  }
  const addSymbol = () => {
    const symbol = symbolToAdd.trim().toUpperCase()
    if (!/^[A-Z0-9.:-]{1,20}$/.test(symbol))
      return setWatchlistNote('Enter a valid ticker symbol.')
    if (watchlist.some((item) => item.symbol === symbol))
      return setWatchlistNote(`${symbol} is already in your watchlist.`)
    saveWatchlist([...watchlist, { symbol, visible: false }])
    setSymbolToAdd('')
  }
  const dropAt = (targetIndex: number) => {
    if (draggedIndex === null || draggedIndex === targetIndex) return
    const next = [...watchlist]
    const [moved] = next.splice(draggedIndex, 1)
    next.splice(targetIndex, 0, moved)
    saveWatchlist(next)
    setDraggedIndex(null)
    setDropIndex(null)
  }
  const removeDraggedSymbol = () => {
    if (draggedIndex === null) return
    const symbol = watchlist[draggedIndex]?.symbol
    saveWatchlist(watchlist.filter((_, index) => index !== draggedIndex))
    setWatchlistNote(symbol ? `${symbol} removed from your watchlist.` : '')
    setDraggedIndex(null)
    setDropIndex(null)
  }

  return (
    <main className={`dashboard theme-${theme}`}>
      <header className="topbar">
        <a className="brand" href="/">
          <div className="brand-mark">
            <TrendingUp size={18} />
          </div>
          <div>
            <strong>DL&apos;s Markets</strong>
            <span>Twelve Data watchlist</span>
          </div>
        </a>
        <div className="top-actions">
          <span className="date-chip">
            <span className="live-dot" /> Updated {updated}
          </span>
          <ThemeMenu theme={theme} onThemeChange={setTheme} />
          <SignOutButton />
          <button className="edit-button" onClick={load} disabled={loading}>
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />{' '}
            Refresh
          </button>
        </div>
      </header>
      <div className="market-dashboard">
        <div className="market-heading">
          <div>
            <a className="back-link" href="/">
              <ChevronLeft size={15} /> Overview
            </a>
            <p className="eyebrow">MARKET DASHBOARD</p>
            <h1>
              Your watchlist<span className="accent-dot">.</span>
            </h1>
            <p className="subheading">
              Hosted quotes from Twelve Data. Values refresh at most once per
              minute.
            </p>
          </div>
          <div className="market-source">
            <span>Source</span>
            <strong>
              {data?.markets?.available
                ? 'Twelve Data connected'
                : 'Checking connection'}
            </strong>
          </div>
        </div>
        {error && <p className="market-error">{error}</p>}
        {data?.markets?.error && (
          <p className="market-error">{data.markets.error}</p>
        )}
        <section className="market-summary">
          <div className="market-stat">
            <span>Tracked now</span>
            <strong>{quotes.length}</strong>
            <small>live quotes</small>
          </div>
          <div className="market-stat">
            <span>Top mover</span>
            <strong>{leader?.symbol ?? '—'}</strong>
            <small
              className={
                Number(leader?.change_ratio) >= 0 ? 'positive' : 'negative'
              }
            >
              {leader ? percent.format(Number(leader.change_ratio)) : '—'}
            </small>
          </div>
          <div className="market-stat">
            <span>Lowest mover</span>
            <strong>{laggard?.symbol ?? '—'}</strong>
            <small
              className={
                Number(laggard?.change_ratio) >= 0 ? 'positive' : 'negative'
              }
            >
              {laggard ? percent.format(Number(laggard.change_ratio)) : '—'}
            </small>
          </div>
          <div className="market-stat">
            <span>Watchlist</span>
            <strong>{watchlist.length}</strong>
            <small>{visibleCount} shown on dashboard</small>
          </div>
        </section>
        <section className="watchlist-panel">
          <div className="watchlist-heading">
            <div>
              <p className="eyebrow">WATCHLIST MANAGER</p>
              <h2>Order your dashboard watchlist</h2>
            </div>
            <span>First 8 are shown</span>
          </div>
          <div className="watchlist-add">
            <input
              value={symbolToAdd}
              onChange={(event) => setSymbolToAdd(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault()
                  addSymbol()
                }
              }}
              placeholder="Add ticker, e.g. TSLA"
              aria-label="Ticker symbol"
            />
            <button className="edit-button" type="button" onClick={addSymbol}>
              <Plus size={15} /> Add
            </button>
          </div>
          {watchlistNote && <p className="watchlist-note">{watchlistNote}</p>}
          <div className="watchlist-items">
            {watchlist.map((item, index) => (
              <div
                className={`watchlist-item ${index < 8 ? 'is-shown' : ''} ${dropIndex === index ? 'is-drop-target' : ''}`}
                key={item.symbol}
                draggable
                onDragStart={() => setDraggedIndex(index)}
                onDragEnd={() => {
                  setDraggedIndex(null)
                  setDropIndex(null)
                }}
                onDragOver={(event) => event.preventDefault()}
                onDragEnter={() => setDropIndex(index)}
                onDrop={() => dropAt(index)}
              >
                <GripVertical className="watchlist-grip" size={16} />
                <strong>{item.symbol}</strong>
                <span
                  className={`watchlist-position ${index < 8 ? 'is-visible' : ''}`}
                >
                  {index < 8 ? `Shown · #${index + 1}` : 'Hidden'}
                </span>
              </div>
            ))}
          </div>
          <div
            className={`watchlist-removal ${draggedIndex !== null ? 'is-active' : ''}`}
            onDragOver={(event) => event.preventDefault()}
            onDrop={removeDraggedSymbol}
          >
            Drop a ticker here to remove it from your watchlist
          </div>
        </section>
        <section className="quote-grid">
          {quotes.map((quote) => {
            const change = Number(quote.change_ratio ?? 0)
            return (
              <article className="quote-card" key={quote.symbol}>
                <div className="quote-card-top">
                  <div>
                    <span className="quote-symbol">{quote.symbol}</span>
                    <span className="quote-name">
                      {quote.name || 'Market quote'}
                    </span>
                  </div>
                  <span
                    className={`quote-change ${change >= 0 ? 'positive' : 'negative'}`}
                  >
                    {change >= 0 ? (
                      <ArrowUpRight size={16} />
                    ) : (
                      <ArrowDownRight size={16} />
                    )}
                    {percent.format(change)}
                  </span>
                </div>
                <strong className="quote-price">
                  {currency.format(Number(quote.price ?? 0))}
                </strong>
                <div className="quote-line">
                  <i className={change >= 0 ? 'up' : 'down'} />
                </div>
                <span className="quote-caption">Latest available price</span>
              </article>
            )
          })}
        </section>
        {!loading && !quotes.length && (
          <div className="market-empty">
            <TrendingUp size={22} />
            <h2>No market quotes yet</h2>
            <p>
              Add `TWELVE_DATA_API_KEY` and `MARKET_SYMBOLS` to `.env.local`,
              then restart the dev server.
            </p>
          </div>
        )}
      </div>
    </main>
  )
}
