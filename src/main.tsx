import { StrictMode, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import { AuthSessionProvider } from './hooks/useAuthSession.tsx'
import { I18nProvider } from './i18n.tsx'
import { ToastProvider } from './components/ToastProvider.tsx'
import './index.css'
import { BrowserRouter } from 'react-router-dom'
import { ThemeProvider } from './theme.tsx'
import { POSDataProvider } from './hooks/usePOSData'
import { ErrorBoundary } from './components/ErrorBoundary.tsx'
import { PwaReloadPrompt } from './components/PwaReloadPrompt.tsx'

const root = document.getElementById('root')

if (!root) {
  throw new Error('Root node #root was not found.')
}

createRoot(root).render(
  <StrictMode>
    <ErrorBoundary>
      <ThemeProvider>
        <Suspense fallback={<div className="flex h-screen items-center justify-center p-4">Loading application...</div>}>
          <I18nProvider>
            <AuthSessionProvider>
              <POSDataProvider>
                <ToastProvider>
                  <BrowserRouter>
                    <App />
                    <PwaReloadPrompt />
                  </BrowserRouter>
                </ToastProvider>
              </POSDataProvider>
            </AuthSessionProvider>
          </I18nProvider>
        </Suspense>
      </ThemeProvider>
    </ErrorBoundary>
  </StrictMode>,
)
