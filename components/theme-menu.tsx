'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Check, ChevronDown, Sun } from 'lucide-react'

export type Theme =
  'dark' | 'light' | 'oled' | 'neon' | 'sunset' | 'forest' | 'rose-pine'

const themeStorageKey = 'dl-dashboard-theme'
const themes: Array<{ value: Theme; label: string; swatch: string }> = [
  { value: 'dark', label: 'Midnight', swatch: '#c8f36a' },
  { value: 'light', label: 'Daylight', swatch: '#639e34' },
  { value: 'oled', label: 'OLED black', swatch: '#050505' },
  { value: 'neon', label: 'Cyberpunk', swatch: '#c392ff' },
  { value: 'sunset', label: 'Sunset pastel', swatch: '#ee9fae' },
  { value: 'forest', label: 'Forest', swatch: '#76b89e' },
  { value: 'rose-pine', label: 'Rosé Pine', swatch: '#c4a7e7' },
]

const isTheme = (value: string | null): value is Theme =>
  themes.some((theme) => theme.value === value)

export function useDashboardTheme() {
  const [theme, setThemeState] = useState<Theme>('dark')

  useEffect(() => {
    const savedTheme = localStorage.getItem(themeStorageKey)
    if (isTheme(savedTheme)) setThemeState(savedTheme)
  }, [])

  const setTheme = useCallback((nextTheme: Theme) => {
    localStorage.setItem(themeStorageKey, nextTheme)
    setThemeState(nextTheme)
  }, [])

  return { theme, setTheme }
}

export function ThemeMenu({
  theme,
  onThemeChange,
}: {
  theme: Theme
  onThemeChange: (theme: Theme) => void
}) {
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const closeMenu = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', closeMenu)
    return () => document.removeEventListener('mousedown', closeMenu)
  }, [])

  return (
    <div className="theme-menu" ref={menuRef}>
      <button
        className="theme-trigger"
        onClick={() => setOpen((isOpen) => !isOpen)}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <Sun size={15} />
        <span>{themes.find((item) => item.value === theme)?.label}</span>
        <ChevronDown size={13} className={open ? 'rotate-180' : ''} />
      </button>
      {open && (
        <div
          className="theme-dropdown"
          role="listbox"
          aria-label="Choose dashboard theme"
        >
          {themes.map((item) => (
            <button
              key={item.value}
              className={`theme-option ${theme === item.value ? 'selected' : ''}`}
              role="option"
              aria-selected={theme === item.value}
              onClick={() => {
                onThemeChange(item.value)
                setOpen(false)
              }}
            >
              <i style={{ backgroundColor: item.swatch }} />
              <span>{item.label}</span>
              {theme === item.value && <Check size={14} />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
