import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getDashboardData } from '@/lib/dashboard-data'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const store = await cookies()
    let refreshedStravaToken: string | undefined
    let marketSymbols: string[] | undefined
    try {
      const supabase = await createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (user) {
        const { data: watchlist } = await supabase
          .from('market_watchlist')
          .select('symbol')
          .eq('user_id', user.id)
          .order('position')
        if (watchlist?.length)
          marketSymbols = watchlist.slice(0, 8).map((item) => item.symbol)
      }
    } catch {
      // The dashboard remains usable before the optional watchlist table is set up.
    }
    const data = await getDashboardData({
      stravaRefreshToken: store.get('dl-dashboard-strava-refresh-token')?.value,
      onStravaRefresh: (token) => {
        refreshedStravaToken = token
      },
      marketSymbols,
    })
    const response = NextResponse.json(data)
    if (refreshedStravaToken)
      response.cookies.set(
        'dl-dashboard-strava-refresh-token',
        refreshedStravaToken,
        {
          httpOnly: true,
          sameSite: 'lax',
          secure: process.env.NODE_ENV === 'production',
          maxAge: 60 * 60 * 24 * 365,
          path: '/',
        },
      )
    return response
  } catch {
    return NextResponse.json(
      { error: 'Dashboard data is unavailable.' },
      { status: 502 },
    )
  }
}
