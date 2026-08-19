'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  Activity, ArrowDownRight, ArrowUpRight, Bell, CalendarDays, ChevronDown, ChevronLeft, ChevronRight,
  CircleDollarSign, CloudRain, CloudSun, Coffee, CreditCard, ExternalLink, Eye, EyeOff, Flame,
  GripVertical, Headphones, LayoutDashboard, Maximize2, Menu, Mic2, Moon, MoreHorizontal, Move,
  Music2, PanelRight, Pause, Play, Plus, Send, Settings2, Sparkles, Sun, Timer, TrendingUp,
  UserRound, Wallet, Watch, Wind, X, Zap,
} from 'lucide-react'

type Theme = 'dark' | 'light' | 'oled' | 'neon' | 'sunset' | 'forest'
type WidgetId = 'readiness' | 'calendar' | 'markets' | 'expenses' | 'briefing' | 'weather'

type Widget = { id: WidgetId; label: string; visible: boolean; collapsed: boolean }

const initialWidgets: Widget[] = [
  { id: 'readiness', label: 'Readiness', visible: true, collapsed: false },
  { id: 'calendar', label: 'Schedule', visible: true, collapsed: false },
  { id: 'markets', label: 'Markets', visible: true, collapsed: false },
  { id: 'expenses', label: 'Expenses', visible: true, collapsed: false },
  { id: 'briefing', label: 'AI briefing', visible: true, collapsed: false },
  { id: 'weather', label: 'Weather', visible: true, collapsed: false },
]

const markets = [
  { symbol: 'VOO', name: 'Vanguard S&P 500', price: '482.61', change: '+0.82%', positive: true, points: [38, 35, 37, 34, 36, 31, 32, 28, 29, 25] },
  { symbol: 'QQQ', name: 'Invesco QQQ', price: '472.88', change: '+1.24%', positive: true, points: [40, 38, 39, 34, 35, 30, 31, 28, 30, 24] },
  { symbol: 'AAPL', name: 'Apple Inc.', price: '229.87', change: '-0.34%', positive: false, points: [26, 29, 27, 31, 29, 33, 31, 34, 33, 36] },
  { symbol: 'BTC', name: 'Bitcoin / USD', price: '68,430', change: '+2.90%', positive: true, points: [39, 42, 40, 37, 34, 36, 30, 32, 27, 25] },
]

const calendarEvents = [
  { time: '09:30', end: '10:00', title: 'Daily standup', type: 'Work', tone: 'blue' },
  { time: '11:00', end: '12:00', title: 'Design sync with Nina', type: 'Focus', tone: 'violet' },
  { time: '13:30', end: '14:15', title: 'Lunch with Alex', type: 'Personal', tone: 'orange' },
  { time: '15:00', end: '16:00', title: 'Product roadmap review', type: 'Work', tone: 'blue' },
]

const hourlyWeather = [24, 30, 40, 54, 68, 76, 70, 61, 48, 38]

function MiniSparkline({ points, positive }: { points: number[]; positive: boolean }) {
  const max = Math.max(...points), min = Math.min(...points)
  const path = points.map((point, index) => `${index ? 'L' : 'M'} ${index * 100 / (points.length - 1)} ${92 - ((point - min) / (max - min || 1)) * 62}`).join(' ')
  return <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-10 w-20" aria-hidden="true"><path d={path} fill="none" stroke={positive ? 'var(--lime)' : 'var(--coral)'} strokeWidth="4" strokeLinecap="round" vectorEffect="non-scaling-stroke" /></svg>
}

function SectionHeader({ icon: Icon, eyebrow, title, action }: { icon: typeof Activity; eyebrow: string; title: string; action?: React.ReactNode }) {
  return <div className="mb-5 flex items-start justify-between gap-3"><div className="flex items-start gap-3"><div className="icon-tile"><Icon size={16} /></div><div><p className="eyebrow">{eyebrow}</p><h2>{title}</h2></div></div>{action}</div>
}

function WidgetFrame({ widget, children, onCollapse, onMaximize, onHide, isMaximized }: { widget: Widget; children: React.ReactNode; onCollapse: () => void; onMaximize: () => void; onHide: () => void; isMaximized: boolean }) {
  return <article className={`widget widget-${widget.id} ${widget.collapsed ? 'is-collapsed' : ''} ${isMaximized ? 'is-maximized' : ''}`}><div className="widget-actions"><button onClick={onCollapse} aria-label={widget.collapsed ? `Expand ${widget.label}` : `Collapse ${widget.label}`}><ChevronDown size={15} className={widget.collapsed ? '-rotate-90' : ''} /></button><button onClick={onMaximize} aria-label={`Maximize ${widget.label}`}><Maximize2 size={14} /></button><button onClick={onHide} aria-label={`Hide ${widget.label}`}><EyeOff size={14} /></button></div>{children}</article>
}

export default function Home() {
  const [theme, setTheme] = useState<Theme>('dark')
  const [widgets, setWidgets] = useState(initialWidgets)
  const [customizing, setCustomizing] = useState(false)
  const [playing, setPlaying] = useState(false)
  const [maximized, setMaximized] = useState<WidgetId | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [weatherLive, setWeatherLive] = useState<{ temperature_2m?: number; apparent_temperature?: number; relative_humidity_2m?: number; wind_speed_10m?: number; weather_code?: number } | null>(null)
  const [calendarConnected, setCalendarConnected] = useState<boolean | null>(null)
  const [expenseMessage, setExpenseMessage] = useState('')
  const importExpenses = async (file: File) => { const form = new FormData(); form.append('file', file); const response = await fetch('/api/expenses/import', { method: 'POST', body: form }); const data = await response.json(); setExpenseMessage(response.ok ? `Imported ${data.imported} Minus transactions` : data.error) }
  useEffect(() => {
    fetch('/api/weather').then((response) => response.ok ? response.json() : null).then((data) => setWeatherLive(data?.current ?? null)).catch(() => setWeatherLive(null))
    fetch('/api/calendar').then((response) => setCalendarConnected(response.ok)).catch(() => setCalendarConnected(false))
  }, [])
  const visibleWidgets = useMemo(() => widgets.filter((widget) => widget.visible), [widgets])
  const today = new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'short', day: 'numeric' }).format(new Date())

  const updateWidget = (id: WidgetId, patch: Partial<Widget>) => setWidgets((current) => current.map((widget) => widget.id === id ? { ...widget, ...patch } : widget))
  const widgetProps = (id: WidgetId) => { const widget = widgets.find((item) => item.id === id)!; return { widget, isMaximized: maximized === id, onCollapse: () => updateWidget(id, { collapsed: !widget.collapsed }), onMaximize: () => setMaximized(maximized === id ? null : id), onHide: () => updateWidget(id, { visible: false }) } }

  return <main className={`dashboard theme-${theme}`}>
    <header className="topbar"><div className="brand"><div className="brand-mark"><LayoutDashboard size={18} /></div><div><strong>DL&apos;s Dashboard</strong><span>Personal operating system</span></div></div><div className="top-actions"><div className="date-chip"><span className="live-dot" /> <span>{today}</span><b>10:42 AM</b></div><div className="theme-control"><Sun size={15} /><select value={theme} onChange={(event) => setTheme(event.target.value as Theme)} aria-label="Choose dashboard theme"><option value="dark">Midnight</option><option value="light">Daylight</option><option value="oled">OLED black</option><option value="neon">Cyberpunk</option><option value="sunset">Sunset pastel</option><option value="forest">Forest</option></select><ChevronDown size={13} /></div><button className="icon-button" aria-label="Notifications"><Bell size={17} /><span className="notification-dot" /></button><button className="avatar" aria-label="Open profile">DL</button><button className="mobile-menu icon-button" onClick={() => setMenuOpen(!menuOpen)} aria-label="Open menu"><Menu size={18} /></button></div></header>
    <div className={`dashboard-body ${menuOpen ? 'menu-is-open' : ''}`}>
      <aside className="sidebar"><div className="side-label">Workspace</div><button className="side-link active"><LayoutDashboard size={16} /> Overview</button><button className="side-link"><Activity size={16} /> Health & recovery</button><button className="side-link"><TrendingUp size={16} /> Markets</button><button className="side-link"><Wallet size={16} /> Finances</button><button className="side-link"><CalendarDays size={16} /> Calendar</button><div className="sidebar-bottom"><div className="side-label">System</div><button className="side-link"><Settings2 size={16} /> Preferences</button><div className="sync-status"><span className="live-dot" /><span>All systems synced</span></div></div></aside>
      <section className="content"><div className="page-heading"><div><p className="eyebrow">Tuesday, August 19, 2026</p><h1>Good morning, DL<span className="accent-dot">.</span></h1><p className="subheading">Here&apos;s the pulse of your day, in one clear view.</p></div><div className="heading-actions"><label className="edit-button"><Plus size={16} /> Import Minus CSV<input type="file" accept=".csv,text/csv" hidden onChange={(event) => event.target.files?.[0] && importExpenses(event.target.files[0])} /></label><button className="edit-button" onClick={() => setCustomizing(true)}><PanelRight size={16} /> Edit dashboard layout</button></div></div>
        <div className="signal-row"><div className="signal-card"><span className="signal-icon green"><Zap size={16} /></span><div><span>Energy level</span><strong>Strong start</strong></div><span className="signal-value">84%</span></div><div className="signal-card"><span className="signal-icon purple"><Timer size={16} /></span><div><span>Next up</span><strong>Daily standup</strong></div><span className="signal-value">in 48m</span></div><div className="signal-card"><span className="signal-icon orange"><CloudSun size={16} /></span><div><span>Outside</span><strong>{weatherLive?.temperature_2m ? `${Math.round(weatherLive.temperature_2m)}° · Live` : 'Loading weather'}</strong></div><span className="signal-value">Toronto, ON</span></div></div>
        <div className="widget-grid">{visibleWidgets.map(({ id }) => { const props = widgetProps(id); if (id === 'readiness') return <WidgetFrame key={id} {...props}><SectionHeader icon={Watch} eyebrow="Garmin / readiness" title="How ready are you?" action={<span className="status-pill good"><span /> Balanced</span>} />{!props.widget.collapsed && <div className="readiness-layout"><div className="battery-ring"><div><strong>82</strong><span>body battery</span></div></div><div className="readiness-metrics"><div><span>Sleep score</span><strong>91 <small>/ 100</small></strong><div className="metric-track"><i style={{ width: '91%' }} /></div></div><div><span>Resting heart rate</span><strong>52 <small>bpm</small></strong><div className="metric-track"><i style={{ width: '68%' }} /></div></div><p className="advice"><Sparkles size={14} /> Great recovery. High-intensity training is on the table today.</p></div></div>}</WidgetFrame>; if (id === 'calendar') return <WidgetFrame key={id} {...props}><SectionHeader icon={CalendarDays} eyebrow="Tuesday, August 19" title="Your schedule" action={<span className="status-pill"><span /> {calendarConnected === true ? 'Google synced' : calendarConnected === false ? 'Connect Google' : 'Checking'}</span>} />{!props.widget.collapsed && <div className="calendar-list">{calendarEvents.map((event, index) => <div className={`calendar-event ${index === 0 ? 'current' : ''}`} key={event.title}><div className="event-time">{event.time}<span>{event.end}</span></div><div className={`event-line ${event.tone}`}><span /></div><div className="event-info"><strong>{event.title}</strong><span><i className={`event-tag ${event.tone}`} /> {event.type}{index === 0 && <b className="now-tag">NOW</b>}</span></div>{index === 0 && <button className="join-button">Join <ExternalLink size={12} /></button>}</div>)}</div>}</WidgetFrame>; if (id === 'markets') return <WidgetFrame key={id} {...props}><SectionHeader icon={TrendingUp} eyebrow="Markets & watchlist" title="Your market pulse" action={<button className="text-button">View all <ChevronRight size={14} /></button>} />{!props.widget.collapsed && <div className="market-list">{markets.map((market) => <div className="market-row" key={market.symbol}><div className="ticker-logo">{market.symbol.slice(0, 1)}</div><div className="market-name"><strong>{market.symbol}</strong><span>{market.name}</span></div><MiniSparkline points={market.points} positive={market.positive} /><div className="market-price"><strong>${market.price}</strong><span className={market.positive ? 'positive' : 'negative'}>{market.positive ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}{market.change}</span></div></div>)}</div>}</WidgetFrame>; if (id === 'expenses') return <WidgetFrame key={id} {...props}><SectionHeader icon={CircleDollarSign} eyebrow="Expense tracker" title="Spend with intention" action={<button className="more-button" aria-label="More expense options"><MoreHorizontal size={18} /></button>} />{!props.widget.collapsed && <><div className="budget-header"><div><span>August budget</span><strong>$1,284.30 <small>of $2,500</small></strong></div><span className="budget-percent">51.4%</span></div><div className="budget-track"><i /></div><div className="expense-bottom"><div className="donut-chart"><div><strong>$1.2k</strong><span>spent</span></div></div><div className="expense-legend"><p><i className="legend-dot food" /><span>Food</span><b>$438</b></p><p><i className="legend-dot bills" /><span>Bills</span><b>$512</b></p><p><i className="legend-dot tech" /><span>Tech</span><b>$334</b></p></div></div><div className="transactions"><div><span className="transaction-icon"><Coffee size={14} /></span><span><strong>Oat & Honey</strong><small>Today · Food</small></span><b>-$12.40</b></div><div><span className="transaction-icon"><CreditCard size={14} /></span><span><strong>Linear</strong><small>Yesterday · Tech</small></span><b>-$8.00</b></div></div></>}</WidgetFrame>; if (id === 'briefing') return <WidgetFrame key={id} {...props}><SectionHeader icon={Sparkles} eyebrow="AI briefing snapshot" title="Your morning report" action={<span className="ai-badge">AI GENERATED</span>} />{!props.widget.collapsed && <><div className="briefing-copy"><p>Today is a high-leverage day. Your energy is up, the calendar is clean, and markets opened with a positive signal. Protect your 11:00 focus block and keep the afternoon meeting outcome-oriented.</p></div><div className="briefing-footer"><button className="play-button" onClick={() => setPlaying(!playing)}>{playing ? <Pause size={14} /> : <Play size={14} />} {playing ? 'Pause preview' : 'Play audio preview'}<span>1:24</span></button><button className="send-button"><Send size={14} /> Send report <ChevronDown size={13} /></button></div></>}</WidgetFrame>; return <WidgetFrame key={id} {...props}><SectionHeader icon={CloudSun} eyebrow="Austin, TX · Updated now" title="A clear day ahead" action={<button className="more-button"><MoreHorizontal size={18} /></button>} />{!props.widget.collapsed && <><div className="weather-main"><div><strong>72°</strong><span>Feels like 71°</span></div><Sun size={52} strokeWidth={1.25} /></div><div className="weather-stats"><div><CloudRain size={15} /><span>Precipitation</span><b>5%</b></div><div><Wind size={15} /><span>Wind</span><b>8 mph</b></div><div><Flame size={15} /><span>High / low</span><b>78° / 61°</b></div></div><div className="hourly"><div className="hourly-bars">{hourlyWeather.map((height, index) => <div key={index} className="hour-bar" style={{ height: `${height}%` }}><span /></div>)}</div><div className="hour-labels">{['Now', '11am', '12pm', '1pm', '2pm', '3pm', '4pm', '5pm', '6pm', '7pm'].map((hour) => <span key={hour}>{hour}</span>)}</div></div></>}</WidgetFrame>})}</div>
      </section>
    </div>
    {customizing && <div className="drawer-backdrop" onClick={() => setCustomizing(false)}><aside className="customize-drawer" onClick={(event) => event.stopPropagation()}><div className="drawer-header"><div><p className="eyebrow">Workspace settings</p><h2>Customize dashboard</h2></div><button className="icon-button" onClick={() => setCustomizing(false)} aria-label="Close customization"><X size={18} /></button></div><p className="drawer-copy">Choose what appears on your overview. Changes are saved automatically.</p><div className="drawer-section"><span className="side-label">Visible widgets</span>{widgets.map((widget) => <div className="widget-toggle" key={widget.id}><GripVertical size={16} className="grip" /><span>{widget.label}</span><button className={`toggle ${widget.visible ? 'on' : ''}`} onClick={() => updateWidget(widget.id, { visible: !widget.visible })} aria-label={`${widget.visible ? 'Hide' : 'Show'} ${widget.label}`}><i /></button></div>)}</div><div className="drawer-section theme-section"><span className="side-label">Accent theme</span><div className="theme-swatches">{(['dark', 'light', 'oled', 'neon', 'sunset', 'forest'] as Theme[]).map((item) => <button className={`swatch swatch-${item} ${theme === item ? 'selected' : ''}`} key={item} onClick={() => setTheme(item)} aria-label={item}>{theme === item && <span />}</button>)}</div></div><button className="done-button" onClick={() => setCustomizing(false)}>Done customizing</button></aside></div>}
    {maximized && <div className="maximized-toast"><Maximize2 size={14} /> {widgets.find((widget) => widget.id === maximized)?.label} expanded <button onClick={() => setMaximized(null)}>Close</button></div>}
  </main>
}
