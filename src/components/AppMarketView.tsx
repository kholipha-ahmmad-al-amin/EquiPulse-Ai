import React, { useState } from 'react'
import { motion } from 'framer-motion'
import {
  MessageSquareText, 
  Mic, 
  Check, 
  Download,
  AlertCircle
} from 'lucide-react'
import { useI18n } from '../i18n'
import { useCustomerLedger } from '../hooks/useCustomerLedger'
import { useToast } from './ToastProvider'

import { usePlugins, type PluginId } from '../hooks/usePlugins'

type Plugin = {
  id: PluginId
  titleEn: string
  titleBn: string
  descEn: string
  descBn: string
  icon: React.ElementType
  isComingSoon?: boolean
  isTrending?: boolean
  color: string
}

export function AppMarketView() {
  const { t } = useI18n()
  const toast = useToast()
  const { credits } = useCustomerLedger()
  const { isInstalled, installPlugin, uninstallPlugin } = usePlugins()
  
  const plugins: Plugin[] = [
    {
      id: 'voice-pos',
      titleEn: 'Voice POS (Bangla)',
      titleBn: 'ভয়েস পিওএস (বাংলা)',
      descEn: 'Log sales or baki using voice commands. Powered by Gemini Audio.',
      descBn: 'শুধুমাত্র মুখে কথা বলে বেচাকেনা বা বাকির হিসাব এন্ট্রি করুন।',
      icon: Mic,
      color: 'bg-accent/10 text-accent ring-accent/20',
    },
    {
      id: 'baki-reminder',
      titleEn: 'Auto Baki SMS',
      titleBn: 'অটোমেটিক বাকি রিমাইন্ডার',
      descEn: 'AI sends polite WhatsApp/SMS reminders to customers with pending dues.',
      descBn: 'বকেয়া থাকা কাস্টমারদের AI এর মাধ্যমে সম্মানজনক বকেয়া রিমাইন্ডার (SMS) পাঠান।',
      icon: MessageSquareText,
      color: 'bg-success/10 text-success ring-success/20',
      isTrending: true,
    }
  ]

  const [activeSimulation, setActiveSimulation] = useState<string | null>(null)

  const toggleInstall = (plugin: Plugin) => {
    if (plugin.isComingSoon) return
    
    if (isInstalled(plugin.id)) {
      uninstallPlugin(plugin.id)
      toast('Uninstall', t(`${plugin.titleEn} uninstalled.`), 'info')
    } else {
      installPlugin(plugin.id)
      toast('Success', t(`${plugin.titleEn} installed successfully!`), 'success')
    }
  }

  const simulateBakiSMS = () => {
    setActiveSimulation('baki-sms')
    const pendingCustomers = credits.filter(c => c.status === 'pending')
    
    setTimeout(() => {
      setActiveSimulation(null)
      if (pendingCustomers.length === 0) {
        toast('Info', t('No pending dues found.'), 'info')
        return
      }
      const customer = pendingCustomers[0]
      if (!customer) return
      const msg = `Dear ${customer.name || 'Customer'}, your pending amount is ৳${customer.amount}. Please clear it at your earliest convenience.`
      const phone = customer.mobile ? customer.mobile.replace(/\D/g, '') : ''
      const url = `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`
      window.open(url, '_blank')
      toast('Success', t(`WhatsApp opened for ${customer.name || 'customer'}.`), 'success')
    }, 1000)
  }

  return (
    <div className="flex h-full flex-col p-4 lg:p-8 animate-fade-in">
      <header className="mb-8">
        <h1 className="font-heading text-2xl font-bold tracking-tight md:text-3xl lg:text-4xl">
          {t(`App Market`)}
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-soft">
          {t(`Extend your POS with powerful mini-apps. Since everything is backed up to Google Drive, you can add infinite features without bloating the system.`)}
        </p>
      </header>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3">
        {plugins.map((plugin) => (
          <motion.article 
            layoutId={`plugin-${plugin.id}`}
            key={plugin.id}
            className={`group relative flex flex-col rounded-2xl border bg-surface p-5 shadow-sm transition-all hover:shadow-glass overflow-hidden ${
              isInstalled(plugin.id) ? 'border-accent/50 bg-accent/5' : 'border-line/50 hover:border-accent/30'
            }`}
          >
            {plugin.isTrending && !isInstalled(plugin.id) && (
              <div className="absolute top-0 right-0 z-10 translate-x-1/4 -translate-y-1/4 rotate-12">
                <span className="inline-flex items-center gap-1 rounded-full bg-danger px-3 py-1 text-[10px] font-black uppercase text-surface shadow-[0_0_15px_rgba(var(--color-danger),0.5)] animate-pulse">
                  🔥 {t(`High Demand`)}
                </span>
              </div>
            )}
            <div className="flex items-start justify-between relative z-0">
              <div className={`flex h-12 w-12 items-center justify-center rounded-xl ring-1 ${plugin.color}`}>
                <plugin.icon size={24} />
              </div>
              
              {plugin.isComingSoon ? (
                <span className="rounded-full bg-surface-strong px-2.5 py-1 text-[10px] font-bold text-ink-soft border border-line">
                  {t(`Coming Soon`)}
                </span>
              ) : (
                <button
                  onClick={() => toggleInstall(plugin)}
                  className={`flex h-8 items-center justify-center gap-1.5 rounded-full px-4 text-xs font-bold transition-all shadow-sm ${
                    isInstalled(plugin.id) 
                      ? 'bg-surface-strong text-ink border border-line hover:bg-danger/10 hover:text-danger hover:border-danger/30'
                      : 'bg-accent text-surface hover:bg-accent/90'
                  }`}
                >
                  {isInstalled(plugin.id) ? (
                    <>
                      <Check size={14} className="group-hover:hidden" />
                      <span className="group-hover:hidden">{t(`Installed`)}</span>
                      <span className="hidden group-hover:block">{t(`Uninstall`)}</span>
                    </>
                  ) : (
                    <>
                      <Download size={14} />
                      {t(`Install`)}
                    </>
                  )}
                </button>
              )}
            </div>

            <div className="mt-5 flex-1">
              <h3 className="font-heading text-lg font-bold">
                {t(plugin.titleEn)}
              </h3>
              <p className="mt-1.5 text-sm text-ink-soft leading-relaxed">
                {t(plugin.descEn)}
              </p>
            </div>

            {/* Simulated Action Area for Installed Plugins */}
            {isInstalled(plugin.id) && plugin.id === 'baki-reminder' && (
              <div className="mt-5 pt-4 border-t border-line/50">
                <button 
                  onClick={simulateBakiSMS}
                  disabled={activeSimulation === 'baki-sms'}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-success/10 py-2.5 text-sm font-bold text-success hover:bg-success/20 transition-all disabled:opacity-50"
                >
                  {activeSimulation === 'baki-sms' ? (
                    <span className="animate-pulse">{t(`Generating SMS via AI...`)}</span>
                  ) : (
                    t(`Run SMS Baki Reminder Now`)
                  )}
                </button>
              </div>
            )}
            
            {isInstalled(plugin.id) && plugin.id === 'voice-pos' && (
              <div className="mt-5 pt-4 border-t border-line/50">
                <div className="flex items-center gap-2 text-xs text-accent bg-accent/10 p-2.5 rounded-xl">
                  <AlertCircle size={16} />
                  <span>{t(`Voice POS activated! Microphone button is now available in POS.`)}</span>
                </div>
              </div>
            )}
          </motion.article>
        ))}
      </div>
    </div>
  )
}
