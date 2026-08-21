'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ArrowDownRight,
  ArrowUpRight,
  ChevronLeft,
  RefreshCw,
  TrendingUp,
} from 'lucide-react'
import { ThemeMenu, useDashboardTheme } from '@/components/theme-menu'

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
  const load = useCallback(async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/dashboard')
      const body = await response.json()
      if (!response.ok)
        throw new Error(body.error || 'Market data is unavailable')
      setData(body)
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
            <strong>{data?.markets?.configuredSymbols ?? 0}</strong>
            <small>configured symbols</small>
          </div>
        </section>
        {data?.markets?.limited && (
          <p className="market-limit">
            Your current Twelve Data plan allows eight quote credits per minute.
            The first eight `MARKET_SYMBOLS` are displayed; reorder that setting
            to choose which ones appear.
          </p>
        )}
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
