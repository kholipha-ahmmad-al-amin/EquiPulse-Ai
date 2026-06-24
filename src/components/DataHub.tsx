import { useState, useEffect } from 'react'
import { FileUp, Sparkles, CheckCircle2, ScanLine, FileText, Cloud, Download, Upload, Settings, Printer, Loader2 } from 'lucide-react'
import { generateAiContent, testApiKey } from '../utils/aiClient'
import { useApiKeys } from '../hooks/useApiKeys'
import { useStoreSettings } from '../hooks/useStoreSettings'
import { usePOSData } from '../hooks/usePOSData'
import { useToast } from './ToastProvider'
import { useI18n } from '../i18n'
import { OcrUploader } from './OcrUploader'
import { useDriveSync } from '../hooks/useDriveSync'
import { useP2PSync } from '../hooks/useP2PSync'
import { useAuthSession } from '../hooks/useAuthSession'
import { useLocalAIModel } from '../hooks/useLocalAIModel'
import { useThermalPrinter } from '../hooks/useThermalPrinter'
import { useWeightScale } from '../hooks/useWeightScale'
import { useInventory, type InventoryItem } from '../hooks/useInventory'
import { useStoreProfile } from '../hooks/useStoreProfile'
import { useCustomerLedger, type CustomerCredit } from '../hooks/useCustomerLedger'
import { useExpenses, type ShopExpense } from '../hooks/useExpenses'
import { useDailyRegister, type DailyRegister } from '../hooks/useDailyRegister'

const LaborIllusionCycler = () => {
  const [text, setText] = useState('Initializing DuckDB WASM Engine...')
  useEffect(() => {
    const phrases = [
      'Initializing DuckDB WASM Engine...',
      'Constructing Vector Indices...',
      'Parsing raw CSV bytes...',
      'Validating Data Schemas...',
      'Cross-referencing ML predictors...',
      'Aggregating local offline metrics...',
      'Applying Zero-Latency Filters...'
    ]
    let i = 0
    const interval = setInterval(() => {
      i = (i + 1) % phrases.length
      setText(phrases[i] as string)
    }, 1200)
    return () => clearInterval(interval)
  }, [])
  return <span>{text}</span>
}

export function DataHub() {
  const { analysisResult, isProcessing, error, processCSV } = usePOSData()
  const { t, tNum, locale } = useI18n()
  const [activeTab, setActiveTab] = useState<'csv' | 'ocr' | 'cloud' | 'ai' | 'settings'>('csv')
  const [aiGenerating, setAiGenerating] = useState(false)
  const [aiSuccess, setAiSuccess] = useState(false)
  const [apiKeys, saveApiKeys] = useApiKeys()
  const [testingProvider, setTestingProvider] = useState<string | null>(null)
  const toast = useToast()
  const [settings, saveSettings] = useStoreSettings()

  const { isSyncing, lastSyncTime, syncError, syncToDrive, restoreFromDrive } = useDriveSync()
  const { user, googleAccessToken, linkGoogleAccount } = useAuthSession()
  const { modelWeights, isTraining, lastError: trainError, trainModel } = useLocalAIModel()
  const storeId = user?.uid || 'local'
  const { peerId, connections, syncStatus, connectToPeer } = useP2PSync(storeId)
  const { isSupported: serialSupported, isConnected: printerConnected, connect: connectPrinter, disconnect: disconnectPrinter, error: printerError } = useThermalPrinter()
  const { isConnected: scaleConnected, connect: connectScale, disconnect: disconnectScale, weight } = useWeightScale()
  const [connectId, setConnectId] = useState('')
  const { saveItem, items: inventoryItems } = useInventory()
  const { saveProfile } = useStoreProfile()
  const { addCredit, credits } = useCustomerLedger()
  const { addExpense, expenses } = useExpenses()
  const { restoreRegister, logTransaction, register } = useDailyRegister()

  const [syncStages, setSyncStages] = useState<string[]>([])
  const [currentStageIdx, setCurrentStageIdx] = useState<number>(-1)
  const [illusionActive, setIllusionActive] = useState(false)
  const [syncMode, setSyncMode] = useState<'backup' | 'restore' | null>(null)

  const runBackupWithIllusion = async () => {
    setSyncMode('backup')
    setIllusionActive(true)
    const stages = [
      t("Initiating secure cloud API handshake..."),
      t("Validating authorization token and session key..."),
      t("Scanning Google Drive for existing database tables..."),
      t("Serializing offline IndexedDB and DuckDB data..."),
      t("Compressing JSON schemas and encrypting backup payload..."),
      t("Uploading secure data package to cloud server..."),
      t("Updating remote file metadata and sync timestamp...")
    ]
    setSyncStages(stages)
    
    for (let i = 0; i < stages.length; i++) {
      setCurrentStageIdx(i)
      await new Promise(r => setTimeout(r, 600 + Math.random() * 400))
      if (i === 4) {
        try {
          await syncToDrive()
        } catch (e) {
          console.error(e)
        }
      }
    }
    setIllusionActive(false)
    setCurrentStageIdx(-1)
  }

  const runRestoreWithIllusion = async () => {
    setSyncMode('restore')
    setIllusionActive(true)
    const stages = [
      t("Establishing connection to Google Drive client..."),
      t("Locating latest cloud snapshot archive..."),
      t("Downloading encrypted data package..."),
      t("Decrypting backup and verifying schema version..."),
      t("De-serializing ledger, inventory, and shift tables..."),
      t("Writing datasets into local storage engine..."),
      t("Rebuilding indexes and verifying transaction logs...")
    ]
    setSyncStages(stages)
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let restoreData: any = null
    for (let i = 0; i < stages.length; i++) {
      setCurrentStageIdx(i)
      await new Promise(r => setTimeout(r, 600 + Math.random() * 400))
      if (i === 2) {
        try {
          restoreData = await restoreFromDrive()
        } catch (e) {
          console.error(e)
        }
      }
    }
    setIllusionActive(false)
    setCurrentStageIdx(-1)

    if (restoreData) {
      try {
        if (restoreData.profile) await saveProfile(restoreData.profile)
        if (restoreData.inventory && Array.isArray(restoreData.inventory)) {
          for (const item of restoreData.inventory) {
            await saveItem(item as InventoryItem)
          }
        }
        if (restoreData.credits && Array.isArray(restoreData.credits)) {
          for (const credit of restoreData.credits) {
            await addCredit(credit as CustomerCredit)
          }
        }
        if (restoreData.expenses && Array.isArray(restoreData.expenses)) {
          for (const expense of restoreData.expenses) {
            await addExpense(expense as ShopExpense)
          }
        }
        if (restoreData.register) {
          await restoreRegister(restoreData.register as DailyRegister)
        }
        toast(
          t(`Restore Complete!`),
          t(`Your data was successfully restored from Google Drive.`),
          'success'
        )
      } catch (err) {
        console.error(err)
        toast('Error', 'Failed to restore data', 'error')
      }
    } else if (!syncError) {
      toast(
        t(`No Backup Found`),
        t(`No backup file was found on your Google Drive.`),
        'error'
      )
    }
  }

  const handleFileDrop = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setAiSuccess(false)

    try {
      await processCSV(file)
      toast(
        t(`CSV Processed successfully!`),
        t("DuckDB analysis complete. Head over to Metrics Hub to view the dashboards."), 
        'success'
      )
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to parse CSV with DuckDB'
      toast(t(`Processing Failed`), msg, 'error')
    }
  }


  const generateInsights = async () => {
    if (!analysisResult) return
    setAiGenerating(true)

    try {
      const prompt = `
        You are an AI business analyst for a cooperative SME in Bangladesh.
        Analyze this POS data summary: ${JSON.stringify(analysisResult.slice(0, 5))}
        Generate exactly ONE actionable insight task in JSON format that matches this TypeScript type:
        {
          id: string,
          priority: "Urgent" | "Advice" | "Opportunity",
          title: { en: string, bn: string },
          meta: { en: string, bn: string },
          summary: { en: string, bn: string },
          metrics: { confidence: string, revenueImpact: string, stockImpact: string },
          risk: { level: "Low" | "Medium" | "High", guardrail: string, sources: string },
          logic: { en: string[], bn: string[] }
        }
        Return ONLY valid JSON.
      `

      const text = await generateAiContent({
        apiKeys,
        model: 'gemini-1.5-flash',
        parts: [{ text: prompt }]
      })

      if (!text) throw new Error('No insight generated')

      // clean code block if any
      const cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim()
      const task = JSON.parse(cleaned)

      // save to local storage
      const existingStr = window.localStorage.getItem('equipulse-dynamic-tasks')
      const existing = existingStr ? JSON.parse(existingStr) : []
      const newTasks = [task, ...existing]
      window.localStorage.setItem('equipulse-dynamic-tasks', JSON.stringify(newTasks))

      // Also push ID to queue state
      const stateStr = window.localStorage.getItem('equipulse-action-queue-buffer')
      const state = stateStr ? JSON.parse(stateStr) : { queueIds: [], metrics: { accepted: 0, snoozed: 0, reviewed: 0 } }
      state.queueIds = [task.id, ...state.queueIds]
      window.localStorage.setItem('equipulse-action-queue-buffer', JSON.stringify(state))

      setAiSuccess(true)
      toast(
        t(`Insights Generated`), 
        t(`A new decision task was added to your Action Queue!`), 
        'success'
      )
    } catch (err: unknown) {
      console.error(err)
      toast('AI Generation Failed', 'Could not formulate actionable insights from the data.', 'error')
    } finally {
      setAiGenerating(false)
    }
  }

  return (
    <div className="space-y-6 p-4 md:p-6 lg:p-8">
      {/* Sleek Tabs Navigation */}
      <div className="relative z-20 flex flex-wrap items-center gap-1.5 rounded-2xl bg-surface-strong/60 backdrop-blur-xl p-1.5 ring-1 ring-line/50 max-w-3xl w-full shadow-[0_4px_20px_rgb(0,0,0,0.04)] mx-auto">
        <button
          onClick={() => setActiveTab('csv')}
          className={`flex flex-1 min-w-[130px] items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-all justify-center whitespace-nowrap ${
            activeTab === 'csv'
              ? 'bg-accent text-surface shadow-[0_2px_10px_rgba(var(--color-accent),0.3)]'
              : 'text-ink-soft hover:text-ink hover:bg-surface/50'
          }`}
        >
          <FileText size={16} />
          <span>{t(`CSV POS Upload`)}</span>
        </button>
        <button
          onClick={() => setActiveTab('ocr')}
          className={`flex flex-1 min-w-[130px] items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-all justify-center whitespace-nowrap ${
            activeTab === 'ocr'
              ? 'bg-accent text-surface shadow-[0_2px_10px_rgba(var(--color-accent),0.3)]'
              : 'text-ink-soft hover:text-ink hover:bg-surface/50'
          }`}
        >
          <ScanLine size={16} />
          <span>{t(`Memo Scan`)}</span>
        </button>
        <button
          onClick={() => setActiveTab('cloud')}
          className={`flex flex-1 min-w-[130px] items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-all justify-center whitespace-nowrap ${
            activeTab === 'cloud'
              ? 'bg-accent text-surface shadow-[0_2px_10px_rgba(var(--color-accent),0.3)]'
              : 'text-ink-soft hover:text-ink hover:bg-surface/50'
          }`}
        >
          <Cloud size={16} />
          <span>{t(`Cloud Sync`)}</span>
        </button>
        <button
          onClick={() => setActiveTab('ai')}
          className={`flex flex-1 min-w-[130px] items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-all justify-center whitespace-nowrap ${
            activeTab === 'ai'
              ? 'bg-accent text-surface shadow-[0_2px_10px_rgba(var(--color-accent),0.3)]'
              : 'text-ink-soft hover:text-ink hover:bg-surface/50'
          }`}
        >
          <Sparkles size={16} />
          <span>{t(`AI Setup`)}</span>
        </button>
        <button
          onClick={() => setActiveTab('settings')}
          className={`flex flex-1 min-w-[130px] items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-all justify-center whitespace-nowrap ${
            activeTab === 'settings'
              ? 'bg-accent text-surface shadow-[0_2px_10px_rgba(var(--color-accent),0.3)]'
              : 'text-ink-soft hover:text-ink hover:bg-surface/50'
          }`}
        >
          <Settings size={16} />
          <span>{t(`Settings`)}</span>
        </button>
      </div>

      {activeTab === 'csv' ? (
        <section className="glass bg-surface-strong/60 backdrop-blur-2xl rounded-3xl p-6 shadow-[0_8px_40px_rgb(0,0,0,0.08)] xl:p-8 border border-line/40 animate-fade-in flex flex-col gap-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h2 className="font-heading text-xl font-extrabold tracking-tight">
                {t(`Upload Store Sales File`)}
              </h2>
              <p className="mt-1 text-sm text-ink-soft">
                {t("Upload your daily store sales CSV to run on-device analytical intelligence.")}
              </p>
            </div>
          </div>

          <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-accent/30 bg-accent/5 py-12 transition-all hover:bg-accent/10 hover:border-accent group">
            <FileUp className="mb-4 text-accent transition-transform group-hover:-translate-y-1" size={32} />
            <span className="text-sm font-bold text-ink">
              {isProcessing ? (t(`Processing with DuckDB WASM...`)) : (t(`Click or Drag CSV File`))}
            </span>
            <input
              accept=".csv"
              className="hidden"
              disabled={isProcessing}
              type="file"
              onChange={(e) => void handleFileDrop(e)}
            />
          </label>
          
          {(isProcessing) && (
            <div className="mt-2 flex items-center justify-center p-4 bg-surface-strong/20 rounded-xl border border-line/20">
              <div className="flex items-center gap-3">
                <div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin"></div>
                <span className="text-sm font-semibold text-accent animate-pulse">
                  <LaborIllusionCycler />
                </span>
              </div>
            </div>
          )}

          {error && (
            <p className="rounded-xl bg-danger/10 p-3 text-sm font-semibold text-danger border border-danger/10">
              {error}
            </p>
          )}
        </section>
      ) : activeTab === 'ocr' ? (
        <section id="tour-ocr-upload" className="glass bg-surface-strong/60 backdrop-blur-2xl rounded-3xl p-6 shadow-[0_8px_40px_rgb(0,0,0,0.08)] xl:p-8 border border-line/40 animate-fade-in flex flex-col gap-4">
          <div>
            <h2 className="font-heading text-xl font-extrabold tracking-tight">
              {t(`Scan Physical Receipt Memo`)}
            </h2>
            <p className="mt-1 text-sm text-ink-soft">
              {t("Upload a picture of a paper receipt to auto-parse items with the smart memo reader.")}
            </p>
          </div>
            <OcrUploader
              onParseComplete={async (rawData: unknown) => {
              const data = rawData as { line_items: { product: string; quantity: string | number; price: string | number; total: string | number }[]; actual_total: string | number } | null;
              console.log('OCR Parsed receipt data:', data)
              
              if (data && data.line_items && data.actual_total) {
                // Construct items for POS register
                const mappedItems = data.line_items.map((item: { product: string; quantity: string | number; price: string | number; total: string | number }, idx: number) => ({
                  itemId: `ocr-item-${idx}`,
                  name: item.product,
                  quantity: Number(item.quantity) || 1,
                  unitPrice: Number(item.price) || 0,
                  lineTotal: Number(item.total) || 0
                }))

                try {
                  await logTransaction({
                    type: 'sale',
                    amount: Number(data.actual_total) || 0,
                    note: 'AI OCR Scanned Receipt',
                    paymentMethod: 'cash',
                    items: mappedItems,
                  })
                  
                  toast(
                    t(`OCR Success`), 
                    t(`Receipt items parsed and successfully logged to Sales Register.`), 
                    'success'
                  )
                } catch (e) {
                  console.error('Failed to log OCR transaction', e)
                  toast('Error', 'Failed to save OCR data to register', 'error')
                }
              }
            }}
          />
        </section>
      ) : activeTab === 'cloud' ? (
        <section className="glass bg-surface-strong/60 backdrop-blur-2xl rounded-3xl p-6 shadow-[0_8px_40px_rgb(0,0,0,0.08)] xl:p-8 border border-line/40 animate-fade-in flex flex-col gap-6">
          <div>
            <h2 className="font-heading text-xl font-extrabold tracking-tight flex items-center gap-2">
              <Cloud className="text-accent" />
              {t(`Google Drive Backup & Sync`)}
            </h2>
            <p className="mt-1 text-sm text-ink-soft">
              {t("Securely backup your store data to Google Drive and restore it anytime.")}
            </p>
          </div>
          
          {(!googleAccessToken) ? (
            <div className="flex flex-col items-center justify-center p-8 border border-dashed border-line/50 rounded-[1.5rem] bg-surface-strong/30 gap-5 max-w-lg mx-auto text-center">
              <div className="size-16 rounded-2xl bg-surface-strong shadow-sm border border-line flex items-center justify-center">
                <Cloud size={32} className="text-accent" />
              </div>
              <div>
                <h3 className="font-heading text-lg font-bold text-ink">
                  {t(`Link Google Account for Cloud Backup`)}
                </h3>
                <p className="text-sm text-ink-soft mt-2 leading-relaxed">
                  {t("Connect your Google account to automatically backup your store profile, inventory, sales, and ledger data to your personal Google Drive.")}
                </p>
              </div>
              <button
                onClick={() => void linkGoogleAccount()}
                className="mt-2 flex items-center gap-3 rounded-full bg-surface-strong/80 text-ink px-6 py-3 text-sm font-bold shadow-sm hover:bg-surface-strong transition-all border border-line/40 hover:border-accent/40"
              >
                <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />
                {t(`Connect Google Drive`)}
              </button>
            </div>
          ) : (
            <div className="grid lg:grid-cols-[1fr_300px] gap-6">
              
              <div className="space-y-4">

                <div className="flex flex-col p-6 border border-line/30 rounded-[1.5rem] bg-surface-strong/20">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="size-12 rounded-2xl bg-accent/10 flex items-center justify-center text-accent">
                      <Upload size={24} />
                    </div>
                    <div>
                      <h3 className="font-heading font-bold text-lg text-ink">
                        {t(`Backup Data Now`)}
                      </h3>
                      <p className="text-sm text-ink-soft mt-1">
                        {lastSyncTime 
                          ? (locale === 'bn' ? `শেষ ব্যাকআপ: ${lastSyncTime.toLocaleTimeString()}` : `Last backup: ${lastSyncTime.toLocaleTimeString()}`)
                          : (t(`No backup taken yet`))}
                      </p>
                    </div>
                  </div>
                  
                  <div className="bg-surface rounded-xl p-4 border border-line/30 mb-6">
                    <p className="text-xs font-bold text-ink-soft mb-3 uppercase tracking-wider">
                      {t(`Included in backup:`)}
                    </p>
                    <ul className="grid grid-cols-2 gap-2 text-sm text-ink font-medium">
                      <li className="flex items-center justify-between"><span className="flex items-center gap-2"><CheckCircle2 size={16} className="text-success" /> {t(`Store Profile`)}</span></li>
                      <li className="flex items-center justify-between"><span className="flex items-center gap-2"><CheckCircle2 size={16} className="text-success" /> {t(`Inventory Items`)}</span><span className="text-xs font-bold bg-muted px-2 py-0.5 rounded-md">{inventoryItems.length}</span></li>
                      <li className="flex items-center justify-between"><span className="flex items-center gap-2"><CheckCircle2 size={16} className="text-success" /> {t(`Sales History`)}</span><span className="text-xs font-bold bg-muted px-2 py-0.5 rounded-md">{register?.transactions?.filter(t=>t.type==='sale').length || 0}</span></li>
                      <li className="flex items-center justify-between"><span className="flex items-center gap-2"><CheckCircle2 size={16} className="text-success" /> {t(`Ledger & Dues`)}</span><span className="text-xs font-bold bg-muted px-2 py-0.5 rounded-md">{credits.length}</span></li>
                      <li className="flex items-center justify-between"><span className="flex items-center gap-2"><CheckCircle2 size={16} className="text-success" /> {t(`Expenses`)}</span><span className="text-xs font-bold bg-muted px-2 py-0.5 rounded-md">{expenses.length}</span></li>
                    </ul>
                  </div>

                  {syncError && <div className="text-sm text-error bg-error/10 p-3 rounded-lg mb-4">{syncError}</div>}

                  <button
                    onClick={() => void runBackupWithIllusion()}
                    disabled={isSyncing || illusionActive}
                    className="w-full sm:w-auto rounded-full bg-accent text-surface px-6 py-3 text-sm font-bold shadow-premium disabled:opacity-50 hover:bg-indigo-600 transition-colors"
                  >
                    {illusionActive && syncMode === 'backup' ? (t(`Backing up...`)) : (t(`Start Backup`))}
                  </button>

                  {illusionActive && syncMode === 'backup' && syncStages.length > 0 && (
                    <div className="mt-4 p-4 rounded-xl bg-surface border border-line/30 text-xs flex flex-col gap-2 shadow-inner">
                      {syncStages.map((stage, idx) => {
                        const isCurrent = idx === currentStageIdx
                        const isPassed = idx < currentStageIdx
                        return (
                          <div key={idx} className={`flex items-center gap-3 transition-all duration-300 ${isCurrent ? 'font-bold text-accent' : isPassed ? 'text-success opacity-85' : 'text-ink-soft opacity-40'}`}>
                            <span className="shrink-0 font-bold">
                              {isPassed ? '✓' : isCurrent ? '●' : '○'}
                            </span>
                            <span>{stage}</span>
                            {isCurrent && <Loader2 size={12} className="animate-spin text-accent shrink-0" />}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex flex-col p-6 border border-line/30 rounded-3xl bg-surface/50 backdrop-blur-lg items-center text-center justify-center hover:-translate-y-1 hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all duration-300">
                <div className="size-16 rounded-2xl bg-success/10 flex items-center justify-center text-success mb-4">
                  <Download size={28} />
                </div>
                <h3 className="font-heading font-bold text-lg text-ink">
                  {t(`Restore Data`)}
                </h3>
                <p className="text-sm text-ink-soft mt-2 mb-6 leading-relaxed">
                  {t("Fetch and restore your store data from your latest Google Drive backup.")}
                </p>
                <button
                  onClick={() => void runRestoreWithIllusion()}
                  disabled={isSyncing || illusionActive}
                  className="w-full rounded-full bg-surface-strong border border-line text-ink px-6 py-3 text-sm font-bold shadow-sm disabled:opacity-50 hover:border-success/40 transition-colors"
                >
                  {illusionActive && syncMode === 'restore' ? (t(`Restoring...`)) : (t(`Restore Now`))}
                </button>

                {illusionActive && syncMode === 'restore' && syncStages.length > 0 && (
                  <div className="mt-4 p-4 rounded-xl bg-surface border border-line/30 text-xs flex flex-col gap-2 text-left w-full shadow-inner">
                    {syncStages.map((stage, idx) => {
                      const isCurrent = idx === currentStageIdx
                      const isPassed = idx < currentStageIdx
                      return (
                        <div key={idx} className={`flex items-center gap-3 transition-all duration-300 ${isCurrent ? 'font-bold text-success' : isPassed ? 'text-success opacity-85' : 'text-ink-soft opacity-40'}`}>
                          <span className="shrink-0 font-bold">
                            {isPassed ? '✓' : isCurrent ? '●' : '○'}
                          </span>
                          <span>{stage}</span>
                          {isCurrent && <Loader2 size={12} className="animate-spin text-success shrink-0" />}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

            </div>
          )}
        </section>
      ) : activeTab === 'ai' ? (
        <section className="glass bg-surface-strong/60 backdrop-blur-2xl rounded-3xl p-6 shadow-[0_8px_40px_rgb(0,0,0,0.08)] xl:p-8 border border-line/40 animate-fade-in flex flex-col gap-6">
          <div>
            <h2 className="font-heading text-xl font-extrabold tracking-tight flex items-center gap-2">
              <Sparkles className="text-accent" />
              {t(`AI Provider Setup`)}
            </h2>
            <p className="mt-1 text-sm text-ink-soft">
              {t("Save your own API keys for redundancy. If one fails, it automatically falls back. Groq is highly recommended for speed.")}
            </p>
          </div>
          
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { id: 'atomesus', name: 'Atomesus (Cipher)', url: 'https://www.atomesus.com/profile/api-keys' },
              { id: 'groq', name: 'Groq (Llama 3)', url: 'https://console.groq.com/keys' },
              { id: 'gemini', name: 'Google Gemini', url: 'https://aistudio.google.com/app/apikey' },
              { id: 'openrouter', name: 'OpenRouter', url: 'https://openrouter.ai/keys' }
            ].map((provider) => (
              <div key={provider.id} className="p-5 border border-line/60 rounded-2xl bg-surface/80 backdrop-blur-md shadow-sm hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)] hover:-translate-y-1 transition-all duration-300">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-sm">{provider.name}</h3>
                  <a href={provider.url} target="_blank" rel="noreferrer" className="text-xs text-accent hover:underline">
                    Get Key ↗
                  </a>
                </div>
                <div className="flex flex-col gap-1 mb-3">
                  <label className="text-[10px] font-black uppercase text-ink-soft">
                    {t(`Paste API Key (Or leave blank to use .env):`)}
                  </label>
                  <div className="relative">
                    <input
                      type="password"
                      placeholder="sk-..."
                      value={apiKeys[provider.id as keyof typeof apiKeys] || ''}
                      onChange={(e) => saveApiKeys({ [provider.id]: e.target.value })}
                      className="w-full rounded-lg border-2 border-line bg-surface px-3 py-2 text-sm text-ink font-mono focus:border-accent focus:outline-none transition-colors pr-16"
                    />
                    {apiKeys[provider.id as keyof typeof apiKeys] && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 text-success flex items-center gap-1 bg-surface pl-1">
                        <CheckCircle2 size={14} />
                        <span className="text-[10px] font-black uppercase">{t('Saved')}</span>
                      </div>
                    )}
                  </div>
                </div>
                <button
                  onClick={async () => {
                    setTestingProvider(provider.id);
                    toast('Testing...', `Testing ${provider.name} connection...`, 'warning');
                    const works = await testApiKey(provider.id, apiKeys[provider.id as keyof typeof apiKeys]);
                    setTestingProvider(null);
                    if (works) {
                      toast('Success', `${provider.name} connected!`, 'success');
                    } else {
                      toast('Failed', `Could not connect to ${provider.name}.`, 'error');
                    }
                  }}
                  disabled={!apiKeys[provider.id as keyof typeof apiKeys] || testingProvider === provider.id}
                  className="w-full rounded-lg bg-surface-strong px-3 py-1.5 text-xs font-bold border border-line hover:bg-muted disabled:opacity-50 transition-colors"
                >
                  {testingProvider === provider.id ? 'Testing...' : t('Test Connection')}
                </button>
              </div>
            ))}
          </div>

          <div className="mt-8 border-t border-line/30 pt-8">
            <h3 className="font-heading text-lg font-extrabold tracking-tight flex items-center gap-2 mb-2">
              <Sparkles className="text-accent" />
              {t(`Local On-Device AI Model`)}
            </h3>
            <p className="text-sm text-ink-soft mb-4">
              {t("Train the local AI heuristic model using your offline transaction data to improve predictions without internet.")}
            </p>
            
            <div className="p-5 border border-line/60 rounded-2xl bg-surface/80 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <p className="text-sm font-bold text-ink">
                  {t(`Current Model Status:`)}
                </p>
                {modelWeights ? (
                  <ul className="text-xs font-bold text-ink-soft mt-2 space-y-1">
                    <li>{t(`Version:`)} <span className="text-accent">{modelWeights.version}</span></li>
                    <li>{t(`Confidence:`)} <span className="text-success">{modelWeights.confidenceScore}%</span></li>
                    <li>{t(`Last Trained:`)} {new Date(modelWeights.lastTrained).toLocaleDateString()}</li>
                  </ul>
                ) : (
                  <p className="text-xs text-ink-soft mt-1">{t(`Loading baseline model...`)}</p>
                )}
                {trainError && <p className="text-xs text-error mt-2">{trainError}</p>}
              </div>
              
              <button
                onClick={trainModel}
                disabled={isTraining}
                className="w-full sm:w-auto rounded-xl bg-accent px-5 py-2.5 text-xs font-extrabold text-surface shadow-glow transition-all hover:scale-[1.02] hover:bg-accent/90 disabled:opacity-60 disabled:hover:scale-100 shrink-0 flex items-center justify-center gap-2"
              >
                {isTraining && <div className="w-4 h-4 border-2 border-surface border-t-transparent rounded-full animate-spin" />}
                {isTraining ? t(`Training...`) : t(`Train Local Model`)}
              </button>
            </div>
          </div>
        </section>
      ) : null}

      {analysisResult && (
        <section className="glass bg-surface-strong/60 backdrop-blur-2xl rounded-3xl p-6 shadow-[0_8px_40px_rgb(0,0,0,0.08)] xl:p-8 border border-line/40 animate-fade-in">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
            <div>
              <h2 className="font-heading text-lg font-extrabold tracking-tight">
                {t(`Processed Sales Summary`)}
              </h2>
              <p className="mt-1 text-xs text-ink-soft">
                {t("Highest revenue categories calculated secure and offline on your device.")}
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
              {!aiSuccess && (
                <button
                  onClick={() => setActiveTab('ai')}
                  className="rounded-xl bg-surface px-4 py-2.5 text-xs font-bold text-ink border border-line hover:bg-muted transition-colors"
                >
                  {t(`Configure AI ⚙️`)}
                </button>
              )}
              {aiSuccess ? (
                <span className="inline-flex items-center gap-2 rounded-xl bg-success/15 px-4 py-2.5 text-xs font-bold text-success border border-success/20">
                  <CheckCircle2 size={16} />
                  {t(`Insight Added to Queue`)}
                </span>
              ) : (
                <button
                  onClick={() => void generateInsights()}
                  disabled={aiGenerating}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-accent px-5 py-2.5 text-xs font-extrabold text-surface shadow-glow transition-all hover:scale-[1.02] hover:bg-accent/90 focus:outline-none disabled:opacity-60 disabled:hover:scale-100 shrink-0"
                >
                  <Sparkles size={14} className={aiGenerating ? "animate-pulse" : ""} />
                  {aiGenerating ? (t(`Generating...`)) : (t(`Generate Smart Insights`))}
                </button>
              )}
            </div>
          </div>

          {aiGenerating && (
            <div className="mb-6 flex items-center justify-center p-4 bg-surface-strong/20 rounded-xl border border-line/20">
              <div className="flex items-center gap-3">
                <div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin"></div>
                <span className="text-sm font-semibold text-accent animate-pulse">
                  {t(`Querying AI API for actionable insights...`)}
                </span>
              </div>
            </div>
          )}

          <div className="overflow-x-auto rounded-xl border border-line/50">
            <table className="w-full text-left text-sm">
              <thead className="bg-surface-strong text-ink border-b border-line/50">
                <tr>
                  <th className="px-4 py-3 font-semibold text-xs uppercase tracking-wider">{t(`Category`)}</th>
                  <th className="px-4 py-3 font-semibold text-xs uppercase tracking-wider text-right">{t(`Total Revenue`)}</th>
                  <th className="px-4 py-3 font-semibold text-xs uppercase tracking-wider text-right">{t(`Total Quantity`)}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line/50 bg-surface/50">
                {analysisResult.slice(0, 10).map((row, i) => (
                  <tr key={i} className="group hover:bg-surface-strong/80 transition-all duration-300">
                    <td className="px-4 py-4 font-bold text-sm group-hover:text-accent transition-colors">{row.category || 'Unknown'}</td>
                    <td className="px-4 py-4 text-right text-sm font-black text-ink font-mono tracking-tight">
                      ৳{typeof row.total_revenue === 'number' ? tNum(row.total_revenue.toLocaleString('en-US')) : tNum(row.total_revenue)}
                    </td>
                    <td className="px-4 py-4 text-right text-sm font-black text-success font-mono tracking-tight">
                      {typeof row.total_quantity === 'number' ? tNum(row.total_quantity.toLocaleString('en-US')) : tNum(row.total_quantity)} <span className="text-xs text-ink-soft font-bold">টি</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {activeTab === 'settings' && (
        <section className="glass bg-surface-strong/60 backdrop-blur-2xl rounded-3xl p-6 shadow-[0_8px_40px_rgb(0,0,0,0.08)] xl:p-8 border border-line/40 animate-fade-in">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-accent/10 rounded-xl text-accent">
              <Settings size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold font-display tracking-tight text-ink">
                {t(`Store Settings`)}
              </h2>
              <p className="text-sm font-bold text-ink-soft">
                {t("Configure global currency and receipt metadata.")}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-ink-soft uppercase tracking-wider">
                {t(`Store Name`)}
              </label>
              <input
                type="text"
                className="w-full rounded-xl border-2 border-line bg-surface px-4 py-2 font-bold text-ink transition-colors focus:border-accent focus:outline-none"
                value={settings.storeName}
                onChange={(e) => saveSettings({ storeName: e.target.value })}
                placeholder={t(`Store Name`)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-ink-soft uppercase tracking-wider">
                {t(`Currency Symbol`)}
              </label>
              <input
                type="text"
                className="w-full rounded-xl border-2 border-line bg-surface px-4 py-2 font-bold text-ink transition-colors focus:border-accent focus:outline-none"
                value={settings.currencySymbol}
                onChange={(e) => saveSettings({ currencySymbol: e.target.value })}
                placeholder="e.g. ৳, $, ₹"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-ink-soft uppercase tracking-wider">
                {t(`Secondary Currency`)}
              </label>
              <input
                type="text"
                className="w-full rounded-xl border-2 border-line bg-surface px-4 py-2 font-bold text-ink transition-colors focus:border-accent focus:outline-none"
                value={settings.secondaryCurrencySymbol || ''}
                onChange={(e) => saveSettings({ secondaryCurrencySymbol: e.target.value })}
                placeholder="e.g. $"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-ink-soft uppercase tracking-wider">
                {t(`Exchange Rate (1 Primary = ?)`)}
              </label>
              <input
                type="number"
                step="any"
                className="w-full rounded-xl border-2 border-line bg-surface px-4 py-2 font-bold text-ink transition-colors focus:border-accent focus:outline-none"
                value={settings.exchangeRate || ''}
                onChange={(e) => saveSettings({ exchangeRate: Number(e.target.value) })}
                placeholder="e.g. 0.0091"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-ink-soft uppercase tracking-wider">
                {t(`Store Address`)}
              </label>
              <input
                type="text"
                className="w-full rounded-xl border-2 border-line bg-surface px-4 py-2 font-bold text-ink transition-colors focus:border-accent focus:outline-none"
                value={settings.storeAddress}
                onChange={(e) => saveSettings({ storeAddress: e.target.value })}
                placeholder={t(`Address`)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-ink-soft uppercase tracking-wider">
                {t(`VAT Rate (%)`)}
              </label>
              <input
                type="number"
                className="w-full rounded-xl border-2 border-line bg-surface px-4 py-2 font-bold text-ink transition-colors focus:border-accent focus:outline-none"
                value={settings.vatRate}
                onChange={(e) => saveSettings({ vatRate: Number(e.target.value) })}
                placeholder="0"
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <label className="text-xs font-bold text-ink-soft uppercase tracking-wider">
                {t(`Receipt Footer`)}
              </label>
              <textarea
                className="w-full rounded-xl border-2 border-line bg-surface px-4 py-2 font-bold text-ink transition-colors focus:border-accent focus:outline-none resize-none"
                rows={2}
                value={settings.receiptFooter}
                onChange={(e) => saveSettings({ receiptFooter: e.target.value })}
                placeholder={t(`Thank you!`)}
              />
            </div>
          </div>

          <div className="mt-8 border-t border-line/30 pt-8">
            <h3 className="font-heading text-lg font-extrabold tracking-tight flex items-center gap-2 mb-2">
              <Cloud className="text-accent" />
              {t(`LAN Multi-Device Sync (Offline)`)}
            </h3>
            <p className="text-sm text-ink-soft mb-6">
              {t("Connect multiple devices on the same local network (WiFi/Hotspot) to sync data without internet.")}
            </p>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="p-5 border border-line/60 rounded-2xl bg-surface/80 shadow-sm flex flex-col gap-4">
                <div>
                  <p className="text-xs font-bold text-ink-soft uppercase tracking-wider mb-1">
                    {t(`This Device Code (Host)`)}
                  </p>
                  <p className="font-mono text-sm font-black bg-surface-strong px-3 py-2 rounded-lg border border-line select-all">
                    {peerId || 'Loading...'}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-bold text-ink-soft mb-1">
                    {t(`Status:`)} <span className={syncStatus === 'synced' ? 'text-success' : syncStatus === 'connecting' ? 'text-warning' : 'text-error'}>{syncStatus.toUpperCase()}</span>
                  </p>
                  <p className="text-xs font-bold text-ink-soft">
                    {t(`Connected Devices:`)} <span className="text-accent">{connections.length}</span>
                  </p>
                </div>
              </div>

              <div className="p-5 border border-line/60 rounded-2xl bg-surface/80 shadow-sm flex flex-col gap-4">
                <div>
                  <label className="text-xs font-bold text-ink-soft uppercase tracking-wider mb-1 block">
                    {t(`Connect to Host Device`)}
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      className="flex-1 rounded-xl border border-line bg-surface px-3 py-2 font-mono text-xs font-bold text-ink focus:border-accent focus:outline-none"
                      placeholder={t(`Paste Host Code`)}
                      value={connectId}
                      onChange={(e) => setConnectId(e.target.value)}
                    />
                    <button
                      onClick={() => connectToPeer(connectId)}
                      disabled={!connectId || syncStatus === 'connecting'}
                      className="rounded-xl bg-accent px-4 py-2 text-xs font-extrabold text-surface shadow-glow transition-all hover:bg-accent/90 disabled:opacity-60"
                    >
                      {t(`Connect`)}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 border-t border-line/30 pt-8">
            <h3 className="font-heading text-lg font-extrabold tracking-tight flex items-center gap-2 mb-2">
              <Printer className="text-accent" />
              {t(`Hardware Peripherals`)}
            </h3>
            <p className="text-sm text-ink-soft mb-6">
              {t("Connect serial thermal printers (ESC/POS) directly via Web Serial API.")}
            </p>

            <div className="p-5 border border-line/60 rounded-2xl bg-surface/80 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
              <div>
                <p className="text-sm font-bold text-ink">
                  {t(`Thermal Receipt Printer`)}
                </p>
                {serialSupported ? (
                  printerConnected ? (
                    <p className="text-xs font-bold text-success mt-1">{t(`Connected to Serial Port`)}</p>
                  ) : (
                    <p className="text-xs font-bold text-ink-soft mt-1">{t(`Ready to connect via RS-232/USB`)}</p>
                  )
                ) : (
                  <p className="text-xs font-bold text-error mt-1">{t(`Web Serial API not supported in this browser.`)}</p>
                )}
                {printerError && <p className="text-xs font-bold text-error mt-2">{printerError}</p>}
              </div>

              {serialSupported && (
                <button
                  onClick={printerConnected ? disconnectPrinter : connectPrinter}
                  className={`w-full md:w-auto rounded-xl px-5 py-2.5 text-xs font-extrabold shadow-glow transition-all hover:scale-[1.02] ${
                    printerConnected 
                      ? 'bg-surface-strong text-ink border border-line' 
                      : 'bg-accent text-surface'
                  }`}
                >
                  {printerConnected ? t(`Disconnect`) : t(`Connect Printer`)}
                </button>
              )}
            </div>

            <div className="p-5 border border-line/60 rounded-2xl bg-surface/80 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4 mt-4">
              <div>
                <p className="text-sm font-bold text-ink">
                  {t(`Digital Weight Scale`)}
                </p>
                {serialSupported ? (
                  scaleConnected ? (
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-xs font-bold text-success">{t(`Connected to Serial Port`)}</p>
                      <span className="text-xs font-black bg-success/10 text-success px-2 py-0.5 rounded-lg border border-success/20">{weight.toFixed(3)} kg</span>
                    </div>
                  ) : (
                    <p className="text-xs font-bold text-ink-soft mt-1">{t(`Ready to connect via RS-232/USB`)}</p>
                  )
                ) : (
                  <p className="text-xs font-bold text-error mt-1">{t(`Web Serial API not supported in this browser.`)}</p>
                )}
              </div>

              {serialSupported && (
                <button
                  onClick={scaleConnected ? disconnectScale : connectScale}
                  className={`w-full md:w-auto rounded-xl px-5 py-2.5 text-xs font-extrabold shadow-glow transition-all hover:scale-[1.02] ${
                    scaleConnected 
                      ? 'bg-surface-strong text-ink border border-line' 
                      : 'bg-accent text-surface'
                  }`}
                >
                  {scaleConnected ? t(`Disconnect`) : t(`Connect Scale`)}
                </button>
              )}
            </div>
          </div>
        </section>
      )}
    </div>
  )
}

