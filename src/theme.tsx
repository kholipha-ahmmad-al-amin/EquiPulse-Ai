/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  type ReactNode,
} from 'react'

export type ThemeMode = 'day' | 'night'

type ThemeEvent = 'TOGGLE' | 'SET_DAY' | 'SET_NIGHT'

type ThemeContextValue = {
  theme: ThemeMode
  isNight: boolean
  setDay: () => void
  setNight: () => void
  toggleTheme: () => void
}

const THEME_STORAGE_KEY = 'equipulse-theme'
const themeClasses = ['theme-day', 'theme-night', 'contrast-day', 'contrast-night']

const themeTransitions: Record<ThemeMode, Record<ThemeEvent, ThemeMode>> = {
  day: {
    TOGGLE: 'night',
    SET_DAY: 'day',
    SET_NIGHT: 'night',
  },
  night: {
    TOGGLE: 'day',
    SET_DAY: 'day',
    SET_NIGHT: 'night',
  },
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

function readInitialTheme(): ThemeMode {
  if (typeof window === 'undefined') {
    return 'day'
  }

  const savedTheme = window.localStorage.getItem(THEME_STORAGE_KEY)

  if (savedTheme === 'day' || savedTheme === 'night') {
    return savedTheme
  }

  // Default to light (day) theme as requested
  return 'day'
}

function themeReducer(state: ThemeMode, event: ThemeEvent): ThemeMode {
  return themeTransitions[state][event]
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, dispatch] = useReducer(themeReducer, undefined, readInitialTheme)

  useEffect(() => {
    const root = document.documentElement
    root.classList.remove(...themeClasses)
    root.classList.add(`theme-${theme}`, `contrast-${theme}`)
    if (theme === 'night') root.classList.add('dark')
    else root.classList.remove('dark')
    root.dataset.theme = theme
    root.style.colorScheme = theme === 'night' ? 'dark' : 'light'
    window.localStorage.setItem(THEME_STORAGE_KEY, theme)
  }, [theme])

  const setDay = useCallback(() => dispatch('SET_DAY'), [])
  const setNight = useCallback(() => dispatch('SET_NIGHT'), [])
  const toggleTheme = useCallback(() => dispatch('TOGGLE'), [])

  const value = useMemo(
    () => ({
      theme,
      isNight: theme === 'night',
      setDay,
      setNight,
      toggleTheme,
    }),
    [setDay, setNight, theme, toggleTheme],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const value = useContext(ThemeContext)

  if (!value) {
    throw new Error('useTheme must be used within ThemeProvider.')
  }

  return value
}

