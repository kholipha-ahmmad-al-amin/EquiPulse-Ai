import { useEffect } from 'react'
import { LogOut, Mail, ShieldCheck, User } from 'lucide-react'
import { useAuthSession } from '../hooks/useAuthSession'
import { useDecisionSync } from '../hooks/useDecisionSync'
import { useI18n } from '../i18n'

export function AuthPanel() {
  const { t } = useI18n()
  const {
    error,
    loading,
    signInWithGoogle,
    signOut,
    user,
  } = useAuthSession()
  const { seedUserProfile } = useDecisionSync()

  useEffect(() => {
    void seedUserProfile().catch(() => undefined)
  }, [seedUserProfile])

  return (
    <section className="glass rounded-2xl p-6 shadow-sm xl:p-8">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-heading text-xl font-bold tracking-tight">{t('firebaseAuthTitle')}</h3>
          <p className="mt-1 text-sm text-ink-soft leading-relaxed">
            {loading
              ? t('firebaseAuthLoading')
              : user
                ? t('firebaseSignedIn')
                : t('firebaseSignedOut')}
          </p>
        </div>
        <span className="grid size-12 place-items-center rounded-xl bg-accent/10 text-accent shadow-sm">
          <ShieldCheck aria-hidden="true" size={24} />
        </span>
      </div>

      <div className="mt-6 rounded-xl border border-line/50 bg-surface-strong/50 px-5 py-4 text-sm shadow-sm">
        <span className="font-semibold text-ink">{t('firebaseProjectLabel')}:</span>{' '}
        <span className="text-ink-soft">{t('firebaseProjectValue')}</span>
      </div>

      {user ? (
        <div className="mt-6 flex flex-col items-center sm:flex-row sm:justify-between gap-6 rounded-xl border border-line/50 bg-surface px-6 py-5 shadow-sm transition-all hover:border-accent/30 hover:shadow-glass">
          <div className="flex items-center gap-4">
            {user.photoURL ? (
              <img 
                src={user.photoURL} 
                alt="User avatar" 
                className="size-16 rounded-full ring-2 ring-accent/20 object-cover shadow-sm"
              />
            ) : (
              <div className="grid size-16 place-items-center rounded-full bg-muted text-ink-soft shadow-sm">
                <User size={32} />
              </div>
            )}
            <div>
              <p className="font-heading text-lg font-bold text-ink">
                {user.displayName || 'SME Pulse User'}
              </p>
              <p className="text-sm font-medium text-ink-soft">
                {user.email || user.uid}
              </p>
            </div>
          </div>
          <button
            className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl border border-line bg-surface-strong px-5 py-3 text-sm font-semibold shadow-sm transition-all hover:bg-danger/10 hover:text-danger hover:border-danger/30 focus:outline-none focus:ring-2 focus:ring-danger"
            type="button"
            onClick={() => void signOut().catch(() => undefined)}
          >
            <LogOut aria-hidden="true" size={18} />
            {t('buttonSignOut')}
          </button>
        </div>
      ) : (
        <>
          <div className="mt-6 flex flex-col gap-4">
            <button
              className="inline-flex w-full justify-center items-center gap-2 rounded-xl bg-accent px-6 py-4 text-base font-semibold text-surface shadow-glow transition-all hover:scale-[1.02] hover:bg-accent/90 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-surface"
              type="button"
              onClick={() => void signInWithGoogle().catch(() => undefined)}
            >
              <Mail aria-hidden="true" size={20} />
              {t('buttonGoogleSignIn')}
            </button>
            <p className="text-center text-xs text-ink-soft mt-2">
              Staff and owners can log in directly using their assigned Google account.
            </p>
          </div>

          {error ? (
            <p className="mt-5 rounded-xl border border-danger/50 bg-danger/5 px-4 py-3 text-sm text-danger shadow-sm flex items-center gap-2">
              <ShieldCheck className="shrink-0" size={18} />
              {error}
            </p>
          ) : null}
        </>
      )}
    </section>
  )
}
