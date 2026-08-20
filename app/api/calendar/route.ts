import { NextResponse } from 'next/server'
import { getGoogleToken } from '@/lib/google-calendar'

export async function GET() {
  try {
    const token = await getGoogleToken()
    const timeMin = new Date().toISOString()
    const timeMax = new Date(Date.now() + 86_400_000).toISOString()
    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events?singleEvents=true&orderBy=startTime&timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}`,
      { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' },
    )
    if (!response.ok)
      return NextResponse.json(
        { error: 'Google Calendar unavailable' },
        { status: response.status },
      )
    return NextResponse.json(await response.json())
  } catch {
    return NextResponse.json(
      { connected: false, error: 'Connect Google Calendar to load events.' },
      { status: 401 },
    )
  }
}
