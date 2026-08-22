'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Activity,
  BedDouble,
  ChevronLeft,
  Clock3,
  Flame,
  Footprints,
  HeartPulse,
  Route,
} from 'lucide-react'
import { ThemeMenu, useDashboardTheme } from '@/components/theme-menu'

type Exercise = {
  id: string
  name: string
  type?: string
  start?: string
  durationSeconds?: number
  calories?: number
  distanceMeters?: number
  paceSecondsPerKm?: number
  averageHeartRate?: number
}
type SleepSession = {
  id: string
  start?: string
  end?: string
  durationSeconds?: number
  stages?: Array<{ type: string; durationSeconds?: number }>
}
type HealthData = {
  health?: {
    available: boolean
    error?: string
    steps?: Record<string, unknown>
    restingHeartRate?: Record<string, unknown>
    exercises?: Exercise[]
    sleep?: SleepSession[]
    sleepError?: string
  }
}

const duration = (seconds?: number) => {
  if (!seconds) return '—'
  const minutes = Math.round(seconds / 60)
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`
}
const pace = (seconds?: number) => {
  if (!seconds) return '—'
  const minutes = Math.floor(seconds / 60)
  return `${minutes}:${String(Math.round(seconds % 60)).padStart(2, '0')} /km`
}
const dateTime = (value?: string) =>
  value
    ? new Intl.DateTimeFormat('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      }).format(new Date(value))
    : 'Recent activity'

export default function HealthPage() {
  const { theme, setTheme } = useDashboardTheme()
  const [data, setData] = useState<HealthData | null>(null)
  const [error, setError] = useState('')
  const load = useCallback(async () => {
    try {
      const response = await fetch('/api/dashboard')
      const body = await response.json()
      if (!response.ok)
        throw new Error(body.error || 'Health data is unavailable')
      setData(body)
      setError('')
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : 'Health data is unavailable',
      )
    }
  }, [])
  useEffect(() => {
    load()
  }, [load])

  const health = data?.health
  const steps = Number(
    (health?.steps?.steps as { countSum?: string } | undefined)?.countSum ?? 0,
  )
  const restingHeartRate = Number(
    (
      health?.restingHeartRate?.restingHeartRate as
        { beatsPerMinuteAverage?: number } | undefined
    )?.beatsPerMinuteAverage ?? 0,
  )
  const latestSleep = health?.sleep?.[0]
  const stages = useMemo(() => {
    const totals = new Map<string, number>()
    latestSleep?.stages?.forEach((stage) =>
      totals.set(
        stage.type,
        (totals.get(stage.type) ?? 0) + (stage.durationSeconds ?? 0),
      ),
    )
    return [...totals.entries()]
  }, [latestSleep])

  return (
    <main className={`dashboard theme-${theme}`}>
      <header className="topbar">
        <a className="brand" href="/">
          <div className="brand-mark">
            <Activity size={18} />
          </div>
          <div>
            <strong>DL&apos;s Health</strong>
            <span>Recovery and training</span>
          </div>
        </a>
        <div className="top-actions">
          <span className="date-chip">
            <span className="live-dot" /> Google Health
          </span>
          <ThemeMenu theme={theme} onThemeChange={setTheme} />
        </div>
      </header>
      <div className="health-dashboard">
        <a className="back-link" href="/">
          <ChevronLeft size={15} /> Overview
        </a>
        <div className="health-heading">
          <div>
            <p className="eyebrow">HEALTH &amp; RECOVERY</p>
            <h1>
              Train, recover, repeat<span className="accent-dot">.</span>
            </h1>
            <p className="subheading">
              Sleep sessions and workouts reported by Google Health / Health
              Connect.
            </p>
          </div>
        </div>
        {(error || health?.error) && (
          <p className="market-error">{error || health?.error}</p>
        )}

        <section className="health-summary">
          <div className="health-stat">
            <Footprints size={17} />
            <span>Steps today</span>
            <strong>{health?.available ? steps.toLocaleString() : '—'}</strong>
          </div>
          <div className="health-stat">
            <HeartPulse size={17} />
            <span>Resting heart rate</span>
            <strong>
              {restingHeartRate ? `${restingHeartRate} bpm` : '—'}
            </strong>
          </div>
          <div className="health-stat">
            <BedDouble size={17} />
            <span>Latest sleep</span>
            <strong>{duration(latestSleep?.durationSeconds)}</strong>
          </div>
        </section>

        <div className="health-grid">
          <section className="health-panel">
            <div className="health-panel-heading">
              <div>
                <p className="eyebrow">SLEEP</p>
                <h2>Last sleep session</h2>
              </div>
              <BedDouble size={19} />
            </div>
            {latestSleep ? (
              <>
                <p className="sleep-session-time">
                  <Clock3 size={14} /> {dateTime(latestSleep.start)} ·{' '}
                  {duration(latestSleep.durationSeconds)}
                </p>
                <div className="sleep-stages">
                  {stages.map(([type, seconds]) => (
                    <div className="sleep-stage" key={type}>
                      <span>{type.toLowerCase().replace('_', ' ')}</span>
                      <strong>{duration(seconds)}</strong>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <p className="health-empty">
                {health?.sleepError ||
                  'No sleep session is available from Google Health yet.'}
              </p>
            )}
          </section>

          <section className="health-panel">
            <div className="health-panel-heading">
              <div>
                <p className="eyebrow">RUNNING &amp; WORKOUTS</p>
                <h2>Recent activity</h2>
              </div>
              <Route size={19} />
            </div>
            {health?.exercises?.length ? (
              <div className="workout-list">
                {health.exercises.map((exercise) => (
                  <article className="workout-row" key={exercise.id}>
                    <div>
                      <strong>{exercise.name}</strong>
                      <span>{dateTime(exercise.start)}</span>
                    </div>
                    <div className="workout-metrics">
                      <span>
                        <Clock3 size={13} />{' '}
                        {duration(exercise.durationSeconds)}
                      </span>
                      {exercise.distanceMeters ? (
                        <span>
                          <Route size={13} />{' '}
                          {(exercise.distanceMeters / 1000).toFixed(2)} km
                        </span>
                      ) : null}
                      {exercise.calories ? (
                        <span>
                          <Flame size={13} /> {Math.round(exercise.calories)}{' '}
                          kcal
                        </span>
                      ) : null}
                      {exercise.paceSecondsPerKm ? (
                        <span>{pace(exercise.paceSecondsPerKm)}</span>
                      ) : null}
                      {exercise.averageHeartRate ? (
                        <span>
                          <HeartPulse size={13} /> {exercise.averageHeartRate}{' '}
                          bpm
                        </span>
                      ) : null}
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <p className="health-empty">
                No exercise sessions were returned. Confirm that Health Connect
                shares your activity records with Google Health.
              </p>
            )}
          </section>
        </div>
      </div>
    </main>
  )
}
