import { useState, useEffect } from 'react'
import { useAuthSession } from './useAuthSession'

export function useCashierLock() {
  const { user } = useAuthSession()
  
  // If no user is logged in, we can't be "locked" in the cashier sense, we are just logged out.
  // We store the lock state in localStorage so it persists across reloads.
  const [isLocked, setIsLocked] = useState(() => {
    return localStorage.getItem('equipulse_cashier_lock') === 'true'
  })
  const [activeCashierId, setActiveCashierId] = useState<string | null>(() => {
    return localStorage.getItem('equipulse_active_cashier_id')
  })
  const [activeCashierName, setActiveCashierName] = useState<string | null>(() => {
    return localStorage.getItem('equipulse_active_cashier_name')
  })
  const [activeCashierRole, setActiveCashierRole] = useState<string | null>(() => {
    return localStorage.getItem('equipulse_active_cashier_role')
  })

  useEffect(() => {
    if (!user) {
      // Auto-unlock if the user completely logs out
      setIsLocked(false)
      setActiveCashierId(null)
      setActiveCashierName(null)
      setActiveCashierRole(null)
      localStorage.setItem('equipulse_cashier_lock', 'false')
      localStorage.removeItem('equipulse_active_cashier_id')
      localStorage.removeItem('equipulse_active_cashier_name')
      localStorage.removeItem('equipulse_active_cashier_role')
    }
  }, [user])

  const lock = () => {
    if (user) {
      localStorage.setItem('equipulse_cashier_lock', 'true')
      setIsLocked(true)
    }
  }

  const unlock = (cashierId?: string, cashierName?: string, cashierRole?: string) => {
    localStorage.setItem('equipulse_cashier_lock', 'false')
    setIsLocked(false)
    if (cashierId && cashierName) {
      localStorage.setItem('equipulse_active_cashier_id', cashierId)
      localStorage.setItem('equipulse_active_cashier_name', cashierName)
      setActiveCashierId(cashierId)
      setActiveCashierName(cashierName)
      if (cashierRole) {
        localStorage.setItem('equipulse_active_cashier_role', cashierRole)
        setActiveCashierRole(cashierRole)
      } else {
        localStorage.setItem('equipulse_active_cashier_role', 'cashier')
        setActiveCashierRole('cashier')
      }
    }
  }

  return { isLocked, lock, unlock, activeCashierId, activeCashierName, activeCashierRole }
}
