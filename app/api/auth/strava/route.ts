import { randomUUID } from 'crypto'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const clientId = process.env.STRAVA_CLIENT_ID
  const clientSecret = process.env.STRAVA_CLIENT_SECRET
  if (!clientId || !clientSecret)
    return NextResponse.redirect(
      new URL('/health?strava=not-configured', request.url),
    )

  const state = randomUUID()
  const callback = new URL('/api/auth/strava/callback', request.url).toString()
  const authorization = new URL('https://www.strava.com/oauth/authorize')
  authorization.search = new URLSearchParams({
    client_id: clientId,
    redirect_uri: callback,
    response_type: 'code',
    approval_prompt: 'force',
    scope: 'activity:read_all',
    state,
  }).toString()
  const response = NextResponse.redirect(authorization)
  response.cookies.set('dl-dashboard-strava-state', state, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 600,
    path: '/',
  })
  return response
}
