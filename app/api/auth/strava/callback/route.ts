import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  const state = url.searchParams.get('state')
  const store = await cookies()
  const expectedState = store.get('dl-dashboard-strava-state')?.value
  const redirect = (status: string) =>
    NextResponse.redirect(new URL(`/health?strava=${status}`, request.url))

  if (!code || !state || state !== expectedState) return redirect('denied')
  const clientId = process.env.STRAVA_CLIENT_ID
  const clientSecret = process.env.STRAVA_CLIENT_SECRET
  if (!clientId || !clientSecret) return redirect('not-configured')

  const tokenResponse = await fetch('https://www.strava.com/oauth/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      grant_type: 'authorization_code',
    }),
    cache: 'no-store',
  })
  if (!tokenResponse.ok) return redirect('error')
  const token = (await tokenResponse.json()) as { refresh_token?: string }
  if (!token.refresh_token) return redirect('error')

  const response = redirect('connected')
  response.cookies.set(
    'dl-dashboard-strava-refresh-token',
    token.refresh_token,
    {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 365,
      path: '/',
    },
  )
  response.cookies.delete('dl-dashboard-strava-state')
  return response
}
