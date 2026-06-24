import { useEffect, useState, useCallback } from 'react'

export function useNetworkStatus() {
  // Start with navigator.onLine as a baseline
  const [isOnline, setIsOnline] = useState(navigator.onLine)

  const checkTrueConnectivity = useCallback(async () => {
    // If browser says we are offline, trust it immediately (airplane mode, Wi-Fi off)
    if (!navigator.onLine) {
      setIsOnline(false)
      return
    }

    try {
      // If browser says we're online, verify with a tiny cache-busting ping.
      // We ping a highly available endpoint. A 204 or 200 means we have actual internet.
      await fetch('https://1.1.1.1/cdn-cgi/trace', {
        mode: 'no-cors', // We only care if the request completes, not about reading the body
        cache: 'no-store',
      })
      setIsOnline(true)
    } catch {
      // The fetch failed (timeout, dns error, no internet on mobile data)
      setIsOnline(false)
    }
  }, [])

  useEffect(() => {
    const handleOnline = () => checkTrueConnectivity()
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Initial check and periodic polling (every 30 seconds)
    checkTrueConnectivity()
    const interval = setInterval(checkTrueConnectivity, 30000)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      clearInterval(interval)
    }
  }, [checkTrueConnectivity])

  return { isOnline }
}
