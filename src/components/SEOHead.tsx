import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { useI18n } from '../i18n'

type RouteMeta = {
  [path: string]: {
    en: { title: string; description: string }
    bn: { title: string; description: string }
  }
}

const routeMetadata: RouteMeta = {
  '/pos': {
    en: { title: 'POS Checkout | EquiPulse AI', description: 'AI-powered Point of Sale checkout for SMEs.' },
    bn: { title: 'পস চেকআউট | ইকুইপালস এআই', description: 'এসএমইদের জন্য এআই-চালিত পয়েন্ট অফ সেল।' }
  },
  '/inventory': {
    en: { title: 'Inventory Management | EquiPulse AI', description: 'Track stock, variants, and pricing tiers.' },
    bn: { title: 'ইনভেন্টরি ম্যানেজমেন্ট | ইকুইপালস এআই', description: 'স্টক এবং পণ্যের মূল্য ট্র্যাক করুন।' }
  },
  '/leaderboard': {
    en: { title: 'Customer Ledger (Bakir Khata) | EquiPulse AI', description: 'Manage customer credit securely.' },
    bn: { title: 'বাকির খাতা | ইকুইপালস এআই', description: 'নিরাপদে কাস্টমারদের বাকির হিসাব রাখুন।' }
  },
  '/metrics': {
    en: { title: 'Business Analytics | EquiPulse AI', description: 'AI forecasting and revenue insights.' },
    bn: { title: 'বিজনেস অ্যানালিটিক্স | ইকুইপালস এআই', description: 'এআই ফোরকাস্টিং এবং আয়ের হিসাব।' }
  },
  '/data': {
    en: { title: 'Data Hub | EquiPulse AI', description: 'Secure data export and insights.' },
    bn: { title: 'ডাটা হাব | ইকুইপালস এআই', description: 'নিরাপদ ডাটা এক্সপোর্ট এবং ইনসাইটস।' }
  },
  '/queue': {
    en: { title: 'AI Action Queue | EquiPulse AI', description: 'Automated tasks and AI insights.' },
    bn: { title: 'এআই অ্যাকশন কিউ | ইকুইপালস এআই', description: 'অটোমেটেড টাস্ক এবং এআই ইনসাইটস।' }
  },
}

export function SEOHead() {
  const location = useLocation()
  const { t, locale } = useI18n()

  useEffect(() => {
    // Find matching route data, fallback to generic
    const path = '/' + (location.pathname.split('/')[1] || '')
    const meta = routeMetadata[path]?.[(locale === 'bn' ? 'bn' : 'en')] || {
      title: t(`EquiPulse AI | SME Dashboard`),
      description: t("AI-Native ERP and POS for Bangladeshi Merchants.")
    }

    // Update DOM
    document.title = meta.title

    const metaDescription = document.querySelector('meta[name="description"]')
    if (metaDescription) {
      metaDescription.setAttribute('content', meta.description)
    }

    const ogTitle = document.querySelector('meta[property="og:title"]')
    if (ogTitle) {
      ogTitle.setAttribute('content', meta.title)
    }

    const ogDesc = document.querySelector('meta[property="og:description"]')
    if (ogDesc) {
      ogDesc.setAttribute('content', meta.description)
    }
  }, [location.pathname, locale, t])

  return null
}
