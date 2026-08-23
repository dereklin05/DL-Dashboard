import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const defaultSymbols = (
  process.env.MARKET_SYMBOLS ||
  'SNDK,QQQ,SPY,AVGO,LITE,PLTR,MSFT,AMD,ZEB,INTC,AAPL,AMZN,APLD,META,NVDA'
)
  .split(',')
  .map((symbol) => symbol.trim().toUpperCase())
  .filter(Boolean)

async function currentUser() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Sign in required.')
  return { supabase, user }
}

export async function GET() {
  try {
    const { supabase, user } = await currentUser()
    const { data, error } = await supabase
      .from('market_watchlist')
      .select('symbol, visible, position')
      .eq('user_id', user.id)
      .order('position')
    if (error) throw error
    if (data?.length)
      return NextResponse.json({
        watchlist: data.map((item, index) => ({
          ...item,
          visible: index < 8,
        })),
      })
    const watchlist = defaultSymbols.map((symbol, position) => ({
      user_id: user.id,
      symbol,
      visible: position < 8,
      position,
    }))
    const { error: seedError } = await supabase
      .from('market_watchlist')
      .insert(watchlist)
    if (seedError) throw seedError
    return NextResponse.json({
      watchlist: watchlist.map(({ user_id, ...item }) => item),
    })
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : 'Could not load watchlist.',
      },
      { status: 503 },
    )
  }
}

export async function PUT(request: Request) {
  try {
    const body = (await request.json()) as {
      watchlist?: Array<{ symbol?: string; visible?: boolean }>
    }
    const normalized = (body.watchlist ?? [])
      .map((item) => ({
        symbol: String(item.symbol ?? '')
          .trim()
          .toUpperCase(),
        visible: false,
      }))
      .filter((item) => /^[A-Z0-9.:-]{1,20}$/.test(item.symbol))
    const unique = normalized.filter(
      (item, index, all) =>
        all.findIndex((candidate) => candidate.symbol === item.symbol) ===
        index,
    )
    if (unique.length > 100)
      return NextResponse.json(
        { error: 'Watchlist is limited to 100 symbols.' },
        { status: 400 },
      )
    const ordered = unique.map((item, position) => ({
      ...item,
      visible: position < 8,
    }))
    const { supabase, user } = await currentUser()
    const { error: deleteError } = await supabase
      .from('market_watchlist')
      .delete()
      .eq('user_id', user.id)
    if (deleteError) throw deleteError
    if (ordered.length) {
      const { error: insertError } = await supabase
        .from('market_watchlist')
        .insert(
          ordered.map((item, position) => ({
            user_id: user.id,
            ...item,
            position,
          })),
        )
      if (insertError) throw insertError
    }
    return NextResponse.json({ watchlist: ordered })
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : 'Could not save watchlist.',
      },
      { status: 503 },
    )
  }
}
