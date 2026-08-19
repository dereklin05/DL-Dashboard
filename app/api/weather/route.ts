import { NextResponse } from 'next/server'

export async function GET() {
  const response = await fetch('https://api.open-meteo.com/v1/forecast?latitude=43.6532&longitude=-79.3832&current=temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,weather_code&hourly=temperature_2m,precipitation_probability&forecast_days=1&timezone=America%2FToronto', { next: { revalidate: 900 } })
  if (!response.ok) return NextResponse.json({ error: 'Weather unavailable' }, { status: 502 })
  const data = await response.json()
  return NextResponse.json({ location: 'Toronto, ON', current: data.current, hourly: data.hourly })
}
