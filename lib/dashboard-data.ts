type GoogleEvent = {
  id: string
  summary?: string
  htmlLink?: string
  start?: { dateTime?: string; date?: string }
  end?: { dateTime?: string; date?: string }
}

const unavailable = (error: string) => ({ available: false, error })

async function googleAccessToken(refreshToken?: string) {
  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  if (!clientId || !clientSecret || !refreshToken)
    throw new Error('Google OAuth is not configured')
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  })
  const body = (await response.json()) as {
    access_token?: string
    error?: string
    error_description?: string
  }
  if (!response.ok) {
    const reason = [body.error, body.error_description]
      .filter(Boolean)
      .join(': ')
    throw new Error(
      `Google token refresh failed${reason ? ` (${reason})` : ''}`,
    )
  }
  if (!body.access_token)
    throw new Error('Google did not return an access token')
  return body.access_token
}

async function calendar() {
  try {
    const token = await googleAccessToken(
      process.env.GOOGLE_CALENDAR_REFRESH_TOKEN,
    )
    const params = new URLSearchParams({
      singleEvents: 'true',
      orderBy: 'startTime',
      timeMin: new Date().toISOString(),
      timeMax: new Date(Date.now() + 86_400_000).toISOString(),
      maxResults: '10',
    })
    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events?${params}`,
      { headers: { authorization: `Bearer ${token}` }, cache: 'no-store' },
    )
    if (!response.ok) throw new Error('Calendar request failed')
    const data = (await response.json()) as { items?: GoogleEvent[] }
    return {
      available: true,
      events: (data.items ?? []).map((event) => ({
        id: event.id,
        title: event.summary || 'Untitled event',
        start: event.start?.dateTime || event.start?.date,
        end: event.end?.dateTime || event.end?.date,
        link: event.htmlLink,
      })),
    }
  } catch (error) {
    return unavailable(
      error instanceof Error ? error.message : 'Calendar unavailable',
    )
  }
}

function civilDay(offset = 0) {
  const day = new Date(Date.now() + offset * 86_400_000)
  return {
    date: {
      year: day.getUTCFullYear(),
      month: day.getUTCMonth() + 1,
      day: day.getUTCDate(),
    },
    time: { hours: 0, minutes: 0, seconds: 0, nanos: 0 },
  }
}

async function healthRollup(token: string, dataType: string) {
  const response = await fetch(
    `https://health.googleapis.com/v4/users/me/dataTypes/${dataType}/dataPoints:dailyRollUp`,
    {
      method: 'POST',
      headers: {
        authorization: `Bearer ${token}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        range: { start: civilDay(), end: civilDay(1) },
        windowSizeDays: 1,
      }),
      cache: 'no-store',
    },
  )
  if (!response.ok) throw new Error(`${dataType} request failed`)
  return response.json() as Promise<Record<string, unknown>>
}

async function health() {
  try {
    const token = await googleAccessToken(
      process.env.GOOGLE_HEALTH_REFRESH_TOKEN,
    )
    const [steps, restingHeartRate] = await Promise.allSettled([
      healthRollup(token, 'steps'),
      healthRollup(token, 'daily-resting-heart-rate'),
    ])
    const last = (value: PromiseSettledResult<Record<string, unknown>>) =>
      value.status === 'fulfilled'
        ? ((
            value.value.rollupDataPoints as
              Array<Record<string, unknown>> | undefined
          )?.at(-1) ?? null)
        : null
    return {
      available: true,
      steps: last(steps),
      restingHeartRate: last(restingHeartRate),
    }
  } catch (error) {
    return unavailable(
      error instanceof Error ? error.message : 'Health unavailable',
    )
  }
}

async function markets() {
  const apiKey = process.env.TWELVE_DATA_API_KEY
  if (!apiKey) return unavailable('Twelve Data is not configured')
  try {
    const symbols = (
      process.env.MARKET_SYMBOLS ||
      'SNDK,QQQ,SPY,AVGO,LITE,PLTR,MSFT,AMD,ZEB,INTC,AAPL,AMZN,APLD,META,NVDA'
    )
      .split(',')
      .map((symbol) => symbol.trim())
      .filter(Boolean)
    const visibleSymbols = symbols.slice(0, 8)
    const results = await Promise.allSettled(
      visibleSymbols.map(async (symbol) => {
        const params = new URLSearchParams({ symbol, apikey: apiKey })
        const response = await fetch(
          `https://api.twelvedata.com/quote?${params}`,
          { next: { revalidate: 60 } },
        )
        const quote = (await response.json()) as {
          status?: string
          message?: string
          symbol?: string
          name?: string
          close?: string
          percent_change?: string
        }
        if (!response.ok || quote.status === 'error')
          throw new Error(
            quote.message || `Twelve Data quote failed for ${symbol}`,
          )
        return {
          symbol: quote.symbol || symbol,
          name: quote.name,
          price: quote.close,
          change_ratio: String(Number(quote.percent_change ?? 0) / 100),
        }
      }),
    )
    const quotes = results.flatMap((result) =>
      result.status === 'fulfilled' ? [result.value] : [],
    )
    const unavailableSymbols = results.flatMap((result, index) =>
      result.status === 'rejected'
        ? [
            {
              symbol: visibleSymbols[index],
              error:
                result.reason instanceof Error
                  ? result.reason.message
                  : 'Quote unavailable',
            },
          ]
        : [],
    )
    if (!quotes.length)
      throw new Error(
        unavailableSymbols[0]?.error || 'No market quotes are available',
      )
    return {
      available: true,
      quotes,
      unavailableSymbols,
      configuredSymbols: symbols.length,
      limited: symbols.length > visibleSymbols.length,
    }
  } catch (error) {
    return unavailable(
      error instanceof Error ? error.message : 'Twelve Data unavailable',
    )
  }
}

async function weather() {
  try {
    const query = new URLSearchParams({
      latitude: process.env.WEATHER_LATITUDE || '43.6532',
      longitude: process.env.WEATHER_LONGITUDE || '-79.3832',
      current:
        'temperature_2m,apparent_temperature,wind_speed_10m,weather_code',
      hourly: 'temperature_2m,precipitation_probability',
      forecast_days: '1',
      timezone: process.env.WEATHER_TIMEZONE || 'America/Toronto',
    })
    const response = await fetch(
      `https://api.open-meteo.com/v1/forecast?${query}`,
      { cache: 'no-store' },
    )
    if (!response.ok) throw new Error('Weather request failed')
    return {
      available: true,
      location: process.env.WEATHER_LOCATION || 'Toronto, ON',
      ...(await response.json()),
    }
  } catch (error) {
    return unavailable(
      error instanceof Error ? error.message : 'Weather unavailable',
    )
  }
}

export async function getDashboardData() {
  const [calendarData, healthData, marketData, weatherData] = await Promise.all(
    [calendar(), health(), markets(), weather()],
  )
  return {
    calendar: calendarData,
    health: healthData,
    markets: marketData,
    expenses: { available: true },
    weather: weatherData,
    fetchedAt: new Date().toISOString(),
  }
}
