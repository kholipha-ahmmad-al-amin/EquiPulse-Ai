import { useState } from 'react'
import { HelpCircle, ChevronDown, BookOpen, Sun, Moon, ArrowLeft } from 'lucide-react'
import { useI18n } from '../i18n'
import { LanguageSelector } from './LanguageSelector'
import { useTheme } from '../theme'
import { motion, AnimatePresence } from 'framer-motion'
import { BrandMark } from './BrandLogo'
import { NavLink } from 'react-router-dom'

type FaqItem = {
  id: string
  question: {
    en: string
    bn: string
  }
  answer: {
    en: string
    bn: string
  }
}

const faqData: FaqItem[] = [
  {
    id: 'faq-what',
    question: {
      en: 'What is EquiPulse and who is it for?',
      bn: 'ইকুইপালস কী এবং এটি কাদের জন্য?',
    },
    answer: {
      en: 'EquiPulse is a smart digital assistant designed specifically for shopkeepers and small businesses in Bangladesh. It helps you manage your daily sales, track your stock, and gives you simple advice to grow your profit, all without needing any complicated computer skills.',
      bn: 'ইকুইপালস হলো বাংলাদেশের ছোট ও মাঝারি দোকানদারদের জন্য তৈরি একটি স্মার্ট ডিজিটাল সহকারী। এটি খুব সহজেই আপনার প্রতিদিনের বেচাকেনা, স্টকের হিসাব এবং ব্যবসার লাভ বাড়ানোর সহজ পরামর্শ দেয়, যার জন্য কোনো কম্পিউটার জ্ঞান থাকার দরকার নেই।',
    },
  },
  {
    id: 'faq-pos',
    question: {
      en: 'How do I create a bill for a customer?',
      bn: 'আমি কীভাবে কাস্টমারকে বিল দেব?',
    },
    answer: {
      en: 'Simply go to the Cash Counter (POS) tab. You can add items to the cart by tapping on them or searching by name. Once you have added everything, tap "Complete Sale". Your stock will be updated automatically.',
      bn: 'খুব সহজেই ক্যাশ কাউন্টার (POS) ট্যাবে যান। পণ্যের নামের ওপর ট্যাপ করে বা নাম লিখে কার্টে যোগ করুন। সব যোগ করা হয়ে গেলে "Complete Sale" বাটনে চাপুন। আপনার স্টক নিজে থেকেই আপডেট হয়ে যাবে।',
    },
  },
  {
    id: 'faq-offline',
    question: {
      en: 'Will it work if I have no internet connection?',
      bn: 'ইন্টারনেট না থাকলে এটি কি কাজ করবে?',
    },
    answer: {
      en: 'Yes, absolutely! The app is designed to work completely offline. You can continue adding sales and checking your stock without any internet. Once your phone connects to the internet again, it safely saves everything online.',
      bn: 'হ্যাঁ, অবশ্যই! ইন্টারনেট না থাকলেও আপনি নিশ্চিন্তে বেচাকেনা করতে পারবেন এবং স্টকের হিসাব দেখতে পারবেন। আপনার ফোন আবার ইন্টারনেটে কানেক্ট হলে, এটি নিজে থেকেই সব ডাটা নিরাপদে অনলাইনে সেভ করে নেবে।',
    },
  },
  {
    id: 'faq-ai',
    question: {
      en: 'How does the Memo Scanner work?',
      bn: 'মেমো স্ক্যানার কীভাবে কাজ করে?',
    },
    answer: {
      en: 'Instead of typing a long list of products from your wholesale memo, just take a clear photo of it. Our smart system will read the handwritten or printed text and automatically calculate the items and prices for you.',
      bn: 'সাপ্লায়ারের বড় মেমো দেখে আপনাকে আর কষ্ট করে হিসাব খাতায় তুলতে হবে না। শুধু মেমোর একটি পরিষ্কার ছবি তুলুন, আর আমাদের স্মার্ট সিস্টেম লেখাগুলো পড়ে নিজে থেকেই সব হিসাব আপনার খাতায় যোগ করে দেবে।',
    },
  },
  {
    id: 'faq-action-queue',
    question: {
      en: 'What is "Smart Advice" and how does it help me?',
      bn: '"স্মার্ট পরামর্শ" কী এবং এটি আমাকে কীভাবে সাহায্য করবে?',
    },
    answer: {
      en: 'Smart Advice gives you helpful daily tips, like reminding you to buy more of a product that is selling fast. You can swipe right if you like the advice, or swipe left if you want to ignore it.',
      bn: '"স্মার্ট পরামর্শ" আপনাকে প্রতিদিন ব্যবসার জন্য কিছু দরকারি টিপস দেয়, যেমন- কোনো পণ্য দ্রুত বিক্রি হয়ে গেলে তা আবার কিনে আনার কথা মনে করিয়ে দেওয়া। পরামর্শটি ভালো লাগলে ডানদিকে সোয়াইপ করুন, আর না চাইলে বামদিকে সোয়াইপ করুন।',
    },
  },
  {
    id: 'faq-coop',
    question: {
      en: 'What are the Achievement Medals?',
      bn: 'অর্জিত ব্যাজ বা মেডেলগুলো কী?',
    },
    answer: {
      en: 'As you make good decisions and use the app regularly to grow your store, you will earn points and unlock beautiful medals to celebrate your success!',
      bn: 'আপনি যখন নিয়মিত অ্যাপটি ব্যবহার করে দোকানের লাভ বাড়াবেন এবং সঠিক সিদ্ধান্ত নেবেন, তখন আপনার সফলতাকে উদযাপন করার জন্য আপনি পয়েন্ট পাবেন এবং দারুণ সব মেডেল অর্জন করবেন!',
    },
  },
  {
    id: 'faq-multi-llm',
    question: {
      en: 'Is the app fast and reliable?',
      bn: 'অ্যাপটি কি দ্রুত কাজ করে এবং নির্ভরযোগ্য?',
    },
    answer: {
      en: 'Yes! It runs completely on your device, which makes it extremely fast. You don\'t have to wait for loading screens or worry about the app crashing when you are busy with a customer.',
      bn: 'হ্যাঁ! এটি সরাসরি আপনার ফোনে কাজ করে, তাই এটি অত্যন্ত দ্রুত। কাস্টমারের ভিড়ের সময় কোনো লোডিং স্ক্রিনের জন্য আপনাকে বসে থাকতে হবে না।',
    },
  },
  {
    id: 'faq-export',
    question: {
      en: 'Can I download my business records?',
      bn: 'আমি কি আমার ব্যবসার হিসাব ডাউনলোড করতে পারব?',
    },
    answer: {
      en: 'Absolutely. At any time, you can download your complete stock list, sales history, and customer dues (Baki) to your phone or computer. Your business data belongs only to you.',
      bn: 'অবশ্যই। আপনি যেকোনো সময় আপনার স্টকের তালিকা, বিক্রির হিসাব এবং বাকির খাতা আপনার ফোন বা কম্পিউটারে ডাউনলোড করে নিতে পারবেন। আপনার ব্যবসার তথ্যের সম্পূর্ণ নিয়ন্ত্রণ আপনার হাতেই থাকবে।'
    },
  },
  {
    id: 'faq-staff',
    question: {
      en: 'Can my shop assistants use it too?',
      bn: 'আমার দোকানের কর্মচারীরা কি এটি ব্যবহার করতে পারবে?',
    },
    answer: {
      en: 'Yes, you can create separate accounts for your staff members. They can log in to help with sales, but you remain in control of what they can see or change.',
      bn: 'হ্যাঁ, আপনি চাইলে আপনার কর্মচারীদের জন্য আলাদা অ্যাকাউন্ট তৈরি করে দিতে পারেন। তারা লগইন করে বেচাকেনায় সাহায্য করতে পারবে, কিন্তু মালিক হিসেবে আপনি ঠিক করে দিতে পারবেন তারা কোন জিনিসগুলো দেখতে পারবে বা পারবে না।'
    },
  },
  {
    id: 'faq-secure',
    question: {
      en: 'Is my business data safe?',
      bn: 'আমার ব্যবসার হিসাব কি নিরাপদ থাকবে?',
    },
    answer: {
      en: 'Completely safe. Your data is protected by Google\'s security systems. It is also backed up to the cloud automatically, so even if you lose your phone, your business records are safe.',
      bn: 'সম্পূর্ণ নিরাপদ। আপনার সব তথ্য গুগলের কড়া নিরাপত্তার মধ্যে থাকে। এটি স্বয়ংক্রিয়ভাবে ইন্টারনেটে সেভ হয়, তাই ফোন হারিয়ে গেলেও আপনার ব্যবসার কোনো হিসাব হারাবে না।'
    },
  }
]

export function FaqView() {
  const { t, locale } = useI18n()
  const { isNight, toggleTheme } = useTheme()
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const toggleExpand = (id: string) => {
    setExpandedId((currentId) => (currentId === id ? null : id))
  }

  return (
    <div className="min-h-screen bg-surface font-sans text-ink flex flex-col relative overflow-x-hidden">
      {/* Background Ambient Gradients */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-40 -right-40 size-[600px] bg-sundarban/10 blur-[140px] rounded-full mix-blend-multiply dark:mix-blend-screen"></div>
        <div className="absolute top-1/2 -left-40 size-[600px] bg-terracotta/10 blur-[140px] rounded-full mix-blend-multiply dark:mix-blend-screen"></div>
      </div>

      {/* Header */}
      <header className="glass z-40 sticky top-0 flex items-center justify-between border-b border-line p-4 md:px-8">
        <div className="flex items-center gap-4">
          <NavLink to="/" className="p-2 rounded-full hover:bg-surface-strong transition-colors ring-1 ring-line/50">
            <ArrowLeft size={20} className="text-ink-soft" />
          </NavLink>
          <div className="flex items-center gap-3">
            <BrandMark className="size-8 sm:size-10 shrink-0 text-sundarban drop-shadow-sm" />
            <div>
              <p className="font-heading text-lg sm:text-xl font-extrabold tracking-tight text-ink leading-tight">EquiPulse AI</p>
              <p className="text-[9px] sm:text-[10px] font-bold text-terracotta leading-none tracking-widest uppercase mt-0.5">FAQ & Knowledge Base</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 sm:gap-4">
          <button
            onClick={toggleTheme}
            className="rounded-full p-2 sm:p-2.5 bg-surface-strong hover:bg-muted text-sundarban transition-all duration-300 ring-1 ring-line/50 flex items-center justify-center shadow-premium active:scale-95"
            title={isNight ? 'Switch to Day Theme' : 'Switch to Night Theme'}
          >
            {isNight ? <Sun size={16} className="animate-fade-in sm:size-[18px]" /> : <Moon size={16} className="animate-fade-in sm:size-[18px]" />}
          </button>
          <LanguageSelector />
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 w-full max-w-4xl mx-auto px-4 py-12 sm:py-20 z-10">
        <div className="text-center mb-12 sm:mb-16">
          <span className="inline-flex items-center justify-center size-16 sm:size-20 rounded-2xl bg-accent/10 text-accent mb-6 ring-1 ring-accent/20 shadow-glow">
            <BookOpen size={36} />
          </span>
          <h1 className="font-heading text-4xl sm:text-5xl lg:text-6xl font-black mb-6 tracking-tight">
            {t(`Frequently Asked Questions`)}
          </h1>
          <p className="text-base sm:text-lg text-ink-soft max-w-2xl mx-auto leading-relaxed">
            {t(`Everything you need to know about EquiPulse AI, our offline-first architecture, AI capabilities, and data security.`)}
          </p>
        </div>

        <div className="space-y-4">
          {faqData.map((faq) => {
            const isExpanded = expandedId === faq.id

            return (
              <article 
                key={faq.id}
                className={`rounded-2xl border transition-all duration-300 ${
                  isExpanded 
                    ? 'border-accent/40 bg-surface-strong/40 shadow-sm' 
                    : 'border-line/60 bg-surface hover:border-accent/20'
                }`}
              >
                <button
                  onClick={() => toggleExpand(faq.id)}
                  className="flex w-full items-center justify-between gap-4 p-6 sm:p-8 text-left outline-none group"
                >
                  <div className="flex items-start sm:items-center gap-4">
                    <HelpCircle className={`shrink-0 mt-1 sm:mt-0 transition-colors duration-300 ${isExpanded ? 'text-accent' : 'text-ink-soft group-hover:text-ink'}`} size={24} />
                    <span className={`font-heading text-lg sm:text-xl font-extrabold leading-snug transition-colors duration-300 ${isExpanded ? 'text-accent drop-shadow-sm' : 'text-ink'}`}>
                      {faq.question[(locale === 'bn' ? 'bn' : 'en')]}
                    </span>
                  </div>
                  <ChevronDown 
                    className={`shrink-0 text-ink-soft transition-transform duration-300 ${
                      isExpanded ? 'rotate-180 text-accent' : 'group-hover:text-ink'
                    }`} 
                    size={24} 
                  />
                </button>

                <AnimatePresence initial={false}>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: 'easeInOut' }}
                      className="overflow-hidden"
                    >
                      <div className="border-t border-line/40 px-6 sm:px-8 pb-8 pt-6 text-base sm:text-lg leading-relaxed text-ink-soft">
                        {faq.answer[(locale === 'bn' ? 'bn' : 'en')]}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </article>
            )
          })}
        </div>
        
        {/* Footer CTA */}
        <div className="mt-16 sm:mt-24 text-center glass rounded-[2rem] p-8 sm:p-12 border border-line/50 relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-accent/5 to-transparent mix-blend-overlay"></div>
          <h3 className="font-heading text-2xl sm:text-3xl font-black mb-4 relative z-10">{t(`Still have questions?`)}</h3>
          <p className="text-ink-soft mb-8 relative z-10">
            {t(`Our support team is ready to help you optimize your store operations.`)}
          </p>
          <NavLink 
            to="/auth" 
            className="inline-flex relative z-10 rounded-full bg-ink text-surface px-8 py-4 font-bold text-lg hover:scale-105 transition-transform shadow-lg active:scale-95"
          >
            {t(`Get Started Today`)}
          </NavLink>
        </div>
      </main>
    </div>
  )
}
