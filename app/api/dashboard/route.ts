import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getDashboardData } from '@/lib/dashboard-data'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const store = await cookies()
    let refreshedStravaToken: string | undefined
    const data = await getDashboardData({
      stravaRefreshToken: store.get('dl-dashboard-strava-refresh-token')?.value,
      onStravaRefresh: (token) => {
        refreshedStravaToken = token
      },
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
