import { useCallback, useEffect, useState } from 'react'
import { useAuthSession } from './useAuthSession'
import { useInventory } from './useInventory'
import { useStoreProfile } from './useStoreProfile'
import { useCustomerLedger } from './useCustomerLedger'
import { useExpenses } from './useExpenses'
import { usePOSData } from './usePOSData'
import { useDailyRegister } from './useDailyRegister'

export type DriveBackupSnapshot = {
  schemaVersion: 2
  timestamp: string
  userId: string
  profile: ReturnType<typeof useStoreProfile>['profile']
  inventory: ReturnType<typeof useInventory>['items']
  credits: ReturnType<typeof useCustomerLedger>['credits']
  expenses: ReturnType<typeof useExpenses>['expenses']
  register: ReturnType<typeof useDailyRegister>['register']
  analytics: ReturnType<typeof usePOSData>['analysisResult']
}

export function useDriveSync() {
  const { user, googleAccessToken, clearGoogleAccessToken } = useAuthSession()
  const { items: inventory } = useInventory()
  const { profile } = useStoreProfile()
  const { credits } = useCustomerLedger()
  const { expenses } = useExpenses()
  const { analysisResult } = usePOSData()
  const { register } = useDailyRegister()
  
  const [isSyncing, setIsSyncing] = useState(false)
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null)
  const [syncError, setSyncError] = useState<string | null>(null)

  // Helper to find if we already created a backup file
  const findExistingBackupFileId = useCallback(async () => {
    if (!googleAccessToken) return null
    try {
      const res = await fetch("https://www.googleapis.com/drive/v3/files?q=name='equipulse-backup.json' and trashed=false&fields=files(id, name)", {
        headers: { 'Authorization': `Bearer ${googleAccessToken}` }
      })
      if (res.ok) {
        const data = await res.json()
        if (data.files && data.files.length > 0) {
          return data.files[0].id
        }
      } else if (res.status === 401) {
        clearGoogleAccessToken()
      }
    } catch (e) {
      console.error('Failed to query drive for existing backup:', e)
    }
    return null
  }, [googleAccessToken, clearGoogleAccessToken])

  const syncToDrive = useCallback(async () => {
    if (!googleAccessToken || !user) {
      setSyncError('Google Drive account not linked. Please connect your Google account in Data Hub.')
      return
    }
    
    setIsSyncing(true)
    setSyncError(null)
    
    try {
      const backupData: DriveBackupSnapshot = {
        schemaVersion: 2,
        timestamp: new Date().toISOString(),
        userId: user.uid,
        profile,
        inventory,
        credits,
        expenses,
        register,
        analytics: analysisResult,
      }
      
      const fileContent = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' })
      const metadata = {
        name: 'equipulse-backup.json',
        mimeType: 'application/json',
      }

      const form = new FormData()
      form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }))
      form.append('file', fileContent)

      const existingFileId = await findExistingBackupFileId()
      
      let url = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart'
      let method = 'POST'
      
      if (existingFileId) {
        // Update existing file instead of creating a new one
        url = `https://www.googleapis.com/upload/drive/v3/files/${existingFileId}?uploadType=multipart`
        method = 'PATCH'
      }

      const res = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${googleAccessToken}`
        },
        body: form
      })

      if (res.ok) {
        setLastSyncTime(new Date())
        console.log('✅ Synced to Google Drive successfully')
      } else {
        const error = await res.json()
        setSyncError(error?.error?.message || 'Google Drive backup failed.')
        console.error('Drive Sync Error:', error)
        if (res.status === 401) {
          clearGoogleAccessToken()
          console.warn('Google Session expired. Automatically unlinked. Please reconnect your account.')
          setSyncError(null)
        }
      }
    } catch (e) {
      setSyncError(e instanceof Error ? e.message : 'Google Drive backup failed.')
      console.error('Failed to sync to drive:', e)
    } finally {
      setIsSyncing(false)
    }
  }, [
    analysisResult,
    credits,
    expenses,
    findExistingBackupFileId,
    googleAccessToken,
    inventory,
    profile,
    register,
    user,
    clearGoogleAccessToken
  ])

  useEffect(() => {
    // If we have an access token, user, and some data, we can auto-sync periodically.
    if (!googleAccessToken || !user || !profile) return

    // Debounce the sync to avoid spamming the API on every keystroke
    const timer = setTimeout(() => {
      void syncToDrive()
    }, 15000) // Sync 15 seconds after the last change

    return () => clearTimeout(timer)
  }, [credits, expenses, googleAccessToken, inventory, profile, register, syncToDrive, user])

  const restoreFromDrive = useCallback(async (): Promise<DriveBackupSnapshot | null> => {
    if (!googleAccessToken) {
      setSyncError('Google Drive account not linked.')
      return null
    }
    setIsSyncing(true)
    setSyncError(null)
    try {
      const fileId = await findExistingBackupFileId()
      if (!fileId) {
        console.warn('No backup found on Google Drive.')
        return null
      }
      
      const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
        headers: { 'Authorization': `Bearer ${googleAccessToken}` }
      })
      
      if (res.ok) {
        const data = await res.json() as DriveBackupSnapshot
        console.log('✅ Restored from Google Drive successfully')
        return data
      } else {
        const error = await res.json()
        setSyncError(error?.error?.message || 'Google Drive restore failed.')
        console.error('Drive Restore Error:', error)
        if (res.status === 401) {
          clearGoogleAccessToken()
          console.warn('Google Session expired. Automatically unlinked. Please reconnect your account.')
          setSyncError(null)
        }
      }
    } catch (e) {
      setSyncError(e instanceof Error ? e.message : 'Google Drive restore failed.')
      console.error('Failed to restore from drive:', e)
    } finally {
      setIsSyncing(false)
    }
    return null
  }, [findExistingBackupFileId, googleAccessToken, clearGoogleAccessToken])

  return { isSyncing, lastSyncTime, syncError, syncToDrive, restoreFromDrive }
}
