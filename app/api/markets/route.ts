import { NextResponse } from 'next/server'

const symbols = ['VOO', 'QQQ', 'AAPL', 'BTC-USD']

export async function GET() {
  const rows = await Promise.all(
    symbols.map(async (symbol) => {
      const response = await fetch(
        `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=1d&interval=1d`,
        { next: { revalidate: 300 } },
      )
      if (!response.ok) return { symbol, unavailable: true }
      const payload = await response.json()
      const result = payload.chart?.result?.[0]
      const meta = result?.meta
      const price = meta?.regularMarketPrice ?? null
      const previous = meta?.chartPreviousClose ?? null
      return {
        symbol,
        price,
        previous,
        changePercent:
          price && previous ? ((price - previous) / previous) * 100 : null,
        currency: meta?.currency ?? 'USD',
      }
    }),
  )
  return NextResponse.json({
    source: 'Yahoo Finance chart endpoint',
    quotes: rows,
  })
}
