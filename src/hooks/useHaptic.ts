import { useCallback } from 'react'

/**
 * A custom hook to trigger device haptic feedback (vibration) 
 * for micro-interactions to enhance UX on supported mobile devices.
 */
export function useHaptic() {
  const triggerHaptic = useCallback((pattern: number | number[] = 50) => {
    if (typeof window !== 'undefined' && window.navigator && window.navigator.vibrate) {
      try {
        window.navigator.vibrate(pattern)
      } catch {
        // Ignore errors for devices where vibrate is restricted or disabled
      }
    }
  }, [])

  return { triggerHaptic }
}
