// src/components/CredentialsPanel.tsx
// =============================================================================
//  Settings panel for user-supplied API credentials.
//
//  Every plugin that talks to a third party (WhatsApp, Email, bKash, Pathao,
//  fiscal printer, AI vision, ZK signing) reads its keys from here. The keys
//  are encrypted with AES-GCM at rest and never leave the device.
// =============================================================================

import { useState } from 'react'
import { Key, Eye, EyeOff, Save, Trash2, Check, ExternalLink, ShieldCheck } from 'lucide-react'
import {
  CREDENTIAL_REGISTRY,
  useCredentials,
  type CredentialProvider,
  type CredentialDefinition,
} from '../hooks/useCredentials'
import { useI18n } from '../i18n'

export function CredentialsPanel() {
  const { t } = useI18n()
  const { list, set, remove, ready } = useCredentials()
  const [active, setActive] = useState<CredentialProvider>(CREDENTIAL_REGISTRY[0]!.provider)
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({})
  const [savedToast, setSavedToast] = useState<string | null>(null)

  const creds = list()
  const def = CREDENTIAL_REGISTRY.find((d) => d.provider === active)!

  return (
    <section className="grid gap-6 lg:grid-cols-[280px_1fr]">
      {/* Sidebar of providers */}
      <aside className="rounded-2xl border border-line/50 bg-surface-strong p-3 shadow-sm h-fit">
        <header className="px-3 py-2 flex items-center gap-2 border-b border-line/40 mb-2">
          <ShieldCheck size={16} className="text-accent" />
          <h2 className="text-xs font-black uppercase tracking-wider text-ink">
            {t('API Integrations')}
          </h2>
        </header>
        <ul className="flex flex-col gap-1">
          {CREDENTIAL_REGISTRY.map((d) => {
            const filled = creds.some((c) => c.provider === d.provider)
            return (
              <li key={d.provider}>
                <button
                  type="button"
                  onClick={() => setActive(d.provider)}
                  className={`w-full text-left rounded-lg px-3 py-2 text-xs font-bold flex items-center justify-between gap-2 transition-colors ${
                    active === d.provider
                      ? 'bg-accent/15 text-accent'
                      : 'text-ink-soft hover:bg-muted/60'
                  }`}
                >
                  <span className="truncate">{d.title}</span>
                  {filled ? (
                    <Check size={12} className="text-success shrink-0" />
                  ) : (
                    <Key size={12} className="text-ink-faint shrink-0" />
                  )}
                </button>
              </li>
            )
          })}
        </ul>
      </aside>

      {/* Active provider form */}
      <article className="rounded-2xl border border-line/50 bg-surface-strong p-6 shadow-sm">
        <ProviderForm
          def={def}
          showSecrets={showSecrets}
          setShowSecrets={setShowSecrets}
          onSave={async (values) => {
            await set(def.provider, values)
            setSavedToast(def.title)
            setTimeout(() => setSavedToast(null), 2400)
          }}
          onRemove={async () => {
            if (!confirm(t('Remove saved credentials for this provider?'))) return
            await remove(def.provider)
            setSavedToast(t('Removed'))
            setTimeout(() => setSavedToast(null), 2400)
          }}
          ready={ready}
        />
      </article>

      {savedToast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 rounded-full bg-success text-surface px-5 py-2 text-xs font-black shadow-glow flex items-center gap-2">
          <Check size={14} />
          {t('Saved')} {savedToast}
        </div>
      )}
    </section>
  )
}

function ProviderForm({
  def,
  showSecrets,
  setShowSecrets,
  onSave,
  onRemove,
  ready,
}: {
  def: CredentialDefinition
  showSecrets: Record<string, boolean>
  setShowSecrets: (v: Record<string, boolean>) => void
  onSave: (values: Record<string, string>) => Promise<void>
  onRemove: () => Promise<void>
  ready: boolean
}) {
  const { t } = useI18n()
  const { list } = useCredentials()
  const existing = list().find((c) => c.provider === def.provider)
  const [values, setValues] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {}
    for (const f of def.fields) init[f.key] = existing?.values[f.key] ?? ''
    return init
  })
  const [busy, setBusy] = useState(false)

  return (
    <div className="flex flex-col gap-5">
      <header>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="font-heading text-xl font-extrabold text-ink">{def.title}</h3>
            <p className="text-sm text-ink-soft mt-1 leading-relaxed">{def.description}</p>
          </div>
          {def.docsUrl && (
            <a
              href={def.docsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 inline-flex items-center gap-1 text-[11px] font-bold text-accent hover:underline"
            >
              {t('Docs')}
              <ExternalLink size={12} />
            </a>
          )}
        </div>
        {existing && (
          <p className="mt-3 text-[11px] text-success font-bold flex items-center gap-1.5">
            <Check size={12} />
            {t('Configured')} • {t('last updated')}{' '}
            {new Date(existing.updatedAt).toLocaleString()} • fp:{existing.fingerprint}
          </p>
        )}
      </header>

      <fieldset className="grid gap-4" disabled={busy || !ready}>
        {def.fields.map((field) => {
          const isSecret = field.type === 'password'
          const revealed = showSecrets[field.key]
          return (
            <label key={field.key} className="flex flex-col gap-1.5">
              <span className="text-[11px] font-black uppercase tracking-wider text-ink-soft">
                {field.label}
                {field.required && <span className="text-danger ml-1">*</span>}
              </span>
              <div className="relative">
                <input
                  type={isSecret && !revealed ? 'password' : 'text'}
                  inputMode={field.type === 'number' ? 'numeric' : undefined}
                  placeholder={field.placeholder}
                  value={values[field.key] ?? ''}
                  onChange={(e) =>
                    setValues((v) => ({ ...v, [field.key]: e.target.value }))
                  }
                  className="w-full rounded-lg border border-line bg-surface px-3 py-2 pr-10 text-sm text-ink placeholder:text-ink-faint focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
                />
                {isSecret && (
                  <button
                    type="button"
                    onClick={() =>
                      setShowSecrets({ ...showSecrets, [field.key]: !revealed })
                    }
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md text-ink-soft hover:text-ink"
                    title={revealed ? t('Hide') : t('Reveal')}
                  >
                    {revealed ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                )}
              </div>
              {field.help && (
                <span className="text-[11px] text-ink-soft leading-relaxed">
                  {field.help}
                </span>
              )}
            </label>
          )
        })}
      </fieldset>

      <footer className="flex items-center justify-between gap-3 pt-2 border-t border-line/40">
        <button
          type="button"
          onClick={onRemove}
          disabled={!existing || busy}
          className="inline-flex items-center gap-1.5 rounded-lg border border-danger/30 bg-danger/5 px-3 py-2 text-xs font-bold text-danger hover:bg-danger/10 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Trash2 size={14} />
          {t('Remove')}
        </button>
        <button
          type="button"
          onClick={async () => {
            setBusy(true)
            try {
              await onSave(values)
            } finally {
              setBusy(false)
            }
          }}
          disabled={busy || !ready}
          className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-xs font-black text-surface shadow-glow hover:bg-accent/90 disabled:opacity-50"
        >
          <Save size={14} />
          {t('Save securely')}
        </button>
      </footer>

      <p className="text-[10px] text-ink-faint leading-relaxed">
        {t('Keys are encrypted with AES-GCM on this device. They never leave your browser unless a feature you enabled makes a direct call to its provider.')}
      </p>
    </div>
  )
}
