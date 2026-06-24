import { useI18n } from '../i18n'
;
import { useTheme } from '../theme';
import { Moon, Sun, Languages, Presentation } from 'lucide-react';
import { motion } from 'framer-motion';

const guideData = [
  {
    slideNumber: 1,
    id: 'intro',
    en: {
      title: "Slide 1: Introduction",
      script: "Welcome Judges and the audience to our presentation. I am honored to introduce you to EquiPulse AI. We are building the world's first AI-powered, offline-first ERP and POS platform specifically designed for the Global South. We are not just building software; we are on a mission to digitize the massive unstructured retail economy, transforming ordinary paper-based stores into highly efficient, data-driven smart businesses. Let's dive into how we are doing this."
    },
    bn: {
      title: "স্লাইড ১: সূচনা",
      script: "উপস্থিত বিচারকমণ্ডলী এবং দর্শকদের আমাদের প্রেজেন্টেশনে স্বাগতম। আমি অত্যন্ত আনন্দের সাথে আপনাদের সামনে 'ইকুইপালস এআই' উপস্থাপন করছি। আমরা গ্লোবাল সাউথ-এর জন্য বিশ্বের প্রথম এআই-চালিত, অফলাইন-ফার্স্ট ইআরপি এবং পস প্ল্যাটফর্ম তৈরি করছি। আমরা শুধু একটি সফটওয়্যার বানাচ্ছি না; আমরা বাংলাদেশের লক্ষ লক্ষ ক্ষুদ্র ব্যবসার অফলাইন অর্থনীতিকে ডিজিটালাইজ করে একটি সাধারণ দোকানকে স্মার্ট ব্যবসায় রূপান্তর করার লক্ষ্যে কাজ করছি। চলুন দেখি আমরা কীভাবে এটি করছি।"
    }
  },
  {
    slideNumber: 2,
    id: 'problem',
    en: {
      title: "Slide 2: The Core Problem",
      script: "Why does EquiPulse exist? Because across the Global South, over 70 million small businesses are operating entirely in the dark. They rely on fragile paper ledgers and gut feelings. Existing Enterprise software is simply unaffordable, costing upwards of $50 to $500 a month. Even if they could afford it, 40% of rural businesses face internet outages, making cloud-only SaaS completely useless. A single wrong inventory decision can push a family business into debt. They lack data, intelligence, and protection."
    },
    bn: {
      title: "স্লাইড ২: মূল সমস্যা",
      script: "ইকুইপালস কেন তৈরি করা হলো? কারণ উন্নয়নশীল দেশগুলোতে ৭ কোটিরও বেশি ক্ষুদ্র ব্যবসা শুধুমাত্র কাগজের হিসাব এবং অনুমানের ওপর ভিত্তি করে চলছে। প্রচলিত ইআরপি সফটওয়্যারগুলোর খরচ মাসে ৫০ থেকে ৫০০ ডলার, যা তাদের সামর্থ্যের সম্পূর্ণ বাইরে। তাছাড়া ৪০% গ্রাম্য এলাকায় নিরবচ্ছিন্ন ইন্টারনেট না থাকায় ক্লাউড সফটওয়্যারগুলো অকেজো হয়ে পড়ে। ভুল সময়ে ভুল পণ্য স্টক করার কারণে অনেক পারিবারিক ব্যবসা ঋণের মুখে পড়ে। তাদের কাছে কোনো ডেটা, বিজনেস ইন্টেলিজেন্স বা আর্থিক সুরক্ষা নেই।"
    }
  },
  {
    slideNumber: 3,
    id: 'innovation',
    en: {
      title: "Slide 3: Our Innovations",
      script: "To solve this, we had to innovate for the real world. We threw out complex forms and reinvented inventory management using a familiar Tinder-like UX. The AI suggests what to restock, and the merchant simply swipes to approve. Next, we built Mathematical OCR powered by Gemini. It doesn't just read handwritten wholesale memos; it mathematically cross-verifies the totals to catch billing errors instantly. Finally, with our Voice POS integration, merchants can manage rush hours completely hands-free using natural spoken language."
    },
    bn: {
      title: "স্লাইড ৩: আমাদের ইনোভেশন",
      script: "এই সমস্যা সমাধানের জন্য আমরা বাস্তব পৃথিবীর উপযোগী কিছু উদ্ভাবন করেছি। আমরা জটিল ফর্ম বাদ দিয়ে টিন্ডারের মত সোয়াইপিং পদ্ধতি ব্যবহার করেছি। এআই রিস্টকের পরামর্শ দেয় এবং দোকানদার শুধু সোয়াইপ করেই তা কার্যকর করতে পারেন। এরপর আমরা জেমিনাই-এর সাহায্যে ম্যাথমেটিক্যাল ওসিআর তৈরি করেছি। এটি শুধু হাতের লেখা পড়েই না, গাণিতিক হিসাব নিজে মিলিয়ে দেখে ভুলগুলো তাৎক্ষণিকভাবে ধরে ফেলে। আর ভয়েস পস-এর মাধ্যমে ক্রেতার ভিড় থাকলে স্ক্রিন স্পর্শ না করেই শুধু কথা বলে বিক্রি করা সম্ভব।"
    }
  },
  {
    slideNumber: 4,
    id: 'technical',
    en: {
      title: "Slide 4: Deep Tech Architecture",
      script: "How do we make this incredibly fast and offline? This is our Deep Tech Architecture. We embedded DuckDB WASM directly inside the browser. This allows us to parse thousands of sales records with zero latency and absolutely zero cloud server cost. The app is a Progressive Web App utilizing IndexedDB for 100% offline functionality. We also pioneered WebRTC Mesh Sync, allowing multiple devices in a shop to sync data peer-to-peer over local Wi-Fi, completely without internet. Hardware like thermal printers connects instantly via the Web Serial API."
    },
    bn: {
      title: "স্লাইড ৪: ডিপ টেক আর্কিটেকচার",
      script: "আমরা কীভাবে এটিকে এত দ্রুত এবং অফলাইন সক্ষম করেছি? ক্লাউড সার্ভারের খরচ শূন্য করতে আমরা সরাসরি ব্রাউজারে DuckDB WASM যুক্ত করেছি। এর ফলে হাজার হাজার সেলস ডেটা চোখের পলকে অ্যানালাইসিস হয়। এটি একটি সম্পূর্ণ PWA যা IndexedDB ব্যবহার করে শতভাগ অফলাইনে কাজ করে। আর WebRTC Mesh Sync এর মাধ্যমে ইন্টারনেট ছাড়াই দোকানের সব ডিভাইস লোকাল নেটওয়ার্কে একসাথে সিঙ্ক হয়। হার্ডওয়্যার সাপোর্ট করা হয়েছে খুবই সহজে; Web Serial API ব্যবহার করে কোনো ড্রাইভার ছাড়াই থার্মাল প্রিন্টার যুক্ত করা যায়।"
    }
  },
  {
    slideNumber: 5,
    id: 'features',
    en: {
      title: "Slide 5: Comprehensive Ecosystem",
      script: "EquiPulse is much more than just a POS. It's a comprehensive ecosystem. It handles full Finance tracking, automatically calculating your daily Cost of Goods Sold and Net Margins. Our CRM tracks customer loyalty, manages offline credit ledgers, and even sends automated WhatsApp promos. On the HR side, we feature advanced shift management and strict Role-Based Access Control to ensure absolute accountability for every transaction."
    },
    bn: {
      title: "স্লাইড ৫: কমপ্রিহেনসিভ ইকোসিস্টেম",
      script: "ইকুইপালস একটি সাধারণ পস-এর চেয়েও অনেক বেশি কিছু। এটি সম্পূর্ণ ফিন্যান্স এবং লাভ-ক্ষতির হিসাব রাখে, স্বয়ংক্রিয়ভাবে প্রতিদিনের প্রফিট মার্জিন বের করে। আমাদের সিআরএম মডিউল কাস্টমারদের লয়্যালটি পয়েন্ট ট্র্যাক করে, বাকি খাতার হিসাব রাখে এবং হোয়াটসঅ্যাপে প্রমোশনাল মেসেজ পাঠায়। এইচআর ফিচারের মধ্যে রয়েছে শিফট ম্যানেজমেন্ট এবং কঠোর RBAC সিস্টেম, যা প্রতিটি বিক্রির শতভাগ স্বচ্ছতা নিশ্চিত করে।"
    }
  },
  {
    slideNumber: 6,
    id: 'business',
    en: {
      title: "Slide 6: Business Model & Revenue",
      script: "Here is how we monetize sustainably. Our core POS and inventory features are 100% free forever. This Freemium model drives massive, rapid user adoption. We generate recurring revenue through Enterprise Subscriptions for large businesses needing advanced AI and Multi-LLM usage. But our real breakthrough is Co-op Data Monetization. Merchants earn equity by contributing anonymized data. We use GraphRAG analysis to turn this into hyper-local market intelligence and partner with banks to facilitate low-risk micro-loans, earning commissions."
    },
    bn: {
      title: "স্লাইড ৬: বিজনেস মডেল এবং রেভিনিউ",
      script: "যেভাবে আমরা টেকসই আয় নিশ্চিত করি: ছোট ব্যবসায়ীদের জন্য কোর পস সম্পূর্ণ ফ্রি, যার ফলে খুব দ্রুত আমরা লক্ষ লক্ষ ব্যবহারকারী পাব। বড় সুপারশপগুলোর অ্যাডভান্সড এআই ব্যবহারের জন্য এন্টারপ্রাইজ সাবস্ক্রিপশন থেকে আমাদের নিয়মিত আয় আসবে। তবে আমাদের সবচেয়ে বড় উদ্ভাবন হলো ডেটা মনিটাইজেশন এবং মাইক্রো-লোন। দোকানদাররা ডেটা প্রদান করে সিস্টেমের শেয়ারহোল্ডার হবেন। আমরা এই ডেটা অ্যানালাইসিস করে মার্কেট ইন্টেলিজেন্স বিক্রি করব এবং ব্যাংকগুলোর সাথে পার্টনারশিপ করে দোকানদারদের লোন প্রদান করে কমিশন আয় করব।"
    }
  },
  {
    slideNumber: 7,
    id: 'scalability',
    en: {
      title: "Slide 7: Global Scalability",
      script: "We are built for borderless growth. By utilizing a Serverless Edge architecture powered by Firebase and Cloudflare, we ensure instantaneous load times globally, no matter how many users hit our platform. The system is universally adaptable, natively supporting 15 languages, including Arabic RTL layouts, and dynamic currency formatting. Because our heavy AI processing runs on-device, as we scale to millions of users, our cloud computing costs remain functionally zero."
    },
    bn: {
      title: "স্লাইড ৭: গ্লোবাল স্কেলেবিলিটি",
      script: "আমরা বিশ্বব্যাপী বিস্তারের জন্য তৈরি। Serverless Edge আর্কিটেকচার এবং ক্লাউডফ্লেয়ার ব্যবহার করায় পৃথিবীর যেকোনো প্রান্ত থেকে সিস্টেম মুহূর্তের মধ্যে লোড হবে। এটি ১৫টি ভাষার সাপোর্ট এবং আরবি ভাষার জন্য RTL লেআউট সাপোর্ট করে। যেহেতু আমাদের মূল এআই প্রসেসিং সরাসরি ডিভাইসেই অফলাইনে চলে, তাই লক্ষ লক্ষ ব্যবহারকারী হলেও আমাদের ক্লাউড সার্ভারের খরচ বলতে গেলে শূন্য।"
    }
  },
  {
    slideNumber: 8,
    id: 'presentation',
    en: {
      title: "Slide 8: Ready for Deployment",
      script: "To conclude, EquiPulse AI is not just a hackathon concept. It is a fully investor-ready, production-grade system built to scale immediately. I invite you to test it yourself. Turn off your Wi-Fi, and watch how seamlessly our offline AI and POS operations continue to function. Thank you for taking the time to experience the future of retail alongside EquiSaaS BD. We are now open for questions."
    },
    bn: {
      title: "স্লাইড ৮: চূড়ান্ত প্রেজেন্টেশন",
      script: "পরিশেষে বলতে চাই, ইকুইপালস এআই কেবল একটি ধারণা নয়। এটি একটি সম্পূর্ণ ইনভেস্টর-রেডি এবং প্রোডাকশন-গ্রেড সিস্টেম যা এখনই মার্কেটে লঞ্চ করার জন্য প্রস্তুত। আপনার ডিভাইসের ওয়াইফাই বন্ধ করে নিজেই পরীক্ষা করে দেখুন কীভাবে ইন্টারনেট ছাড়াই আমাদের এআই নিখুঁতভাবে কাজ করে। EquiSaaS BD এর সাথে রিটেইলের এই নতুন ভবিষ্যৎ উপভোগ করার জন্য আপনাদের অসংখ্য ধন্যবাদ। আমরা এখন আপনাদের যেকোনো প্রশ্নের উত্তর দিতে প্রস্তুত।"
    }
  }
];

export const PitchGuide = () => {
  const { locale, toggleLocale } = useI18n();
  const { isNight, toggleTheme } = useTheme();

  return (
    <div className="min-h-screen pb-20 bg-surface text-ink transition-colors duration-300">
      
      {/* Navbar */}
      <div className="sticky top-0 z-50 flex items-center justify-between p-4 px-6 md:px-12 backdrop-blur-md border-b border-line bg-surface/80">
        <div className="flex items-center gap-3">
          <Presentation className="text-accent w-6 h-6" />
          <h1 className="text-xl font-bold font-heading">
            {locale === 'en' ? 'Pitch Presentation Guide' : 'প্রেজেন্টেশন স্ক্রিপ্ট গাইড'}
          </h1>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={toggleTheme}
            className="p-2 rounded-full transition-colors hover:bg-muted text-ink"
            title={locale === 'en' ? 'Toggle Theme' : 'থিম পরিবর্তন'}
          >
            {isNight ? <Sun size={20} className="text-warning" /> : <Moon size={20} />}
          </button>
          
          <button
            onClick={toggleLocale}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full font-medium transition-colors bg-muted hover:bg-line text-ink"
          >
            <Languages size={18} />
            {locale === 'en' ? 'English' : 'বাংলা'}
          </button>
        </div>
      </div>

      {/* Header Context */}
      <div className="max-w-4xl mx-auto mt-10 px-6">
        <div className="p-6 rounded-2xl mb-10 border bg-surface-strong border-line shadow-sm">
          <h2 className="text-2xl font-bold mb-3 font-heading text-accent">
            {locale === 'en' ? 'How to use this guide' : 'এই গাইডটি কীভাবে ব্যবহার করবেন'}
          </h2>
          <p className="text-lg text-ink-soft leading-relaxed">
            {locale === 'en' 
              ? 'This document contains the exact, highly impactful spoken script you should use while presenting the EquiPulse AI Pitch Deck. Open the presentation on the main screen, and keep this guide on your phone or secondary screen. Deliver the content with confidence, maintaining eye contact with the investors or judges.'
              : 'এই ডকুমেন্টে ইকুইপালস এআই প্রেজেন্টেশনের জন্য অত্যন্ত ইমপ্যাক্টফুল এবং প্রফেশনাল স্পিচ স্ক্রিপ্ট দেওয়া আছে। মূল স্ক্রিনে প্রেজেন্টেশনটি চালু রাখুন এবং আপনার ফোনে বা অন্য স্ক্রিনে এই গাইডটি দেখে দেখে প্রেজেন্টেশন দিন। বিনিয়োগকারী বা বিচারকদের চোখে চোখ রেখে আত্মবিশ্বাসের সাথে কথা বলবেন।'
            }
          </p>
        </div>

        {/* Slides Guide List */}
        <div className="space-y-8">
          {guideData.map((slide, index) => (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              key={slide.id} 
              className="p-8 rounded-3xl border border-line shadow-premium bg-surface-strong"
            >
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-full bg-accent/10 text-accent flex items-center justify-center font-bold text-xl ring-1 ring-accent/20">
                  {slide.slideNumber}
                </div>
                <h3 className="text-2xl font-bold font-heading text-ink">
                  {locale === 'en' ? slide.en.title : slide.bn.title}
                </h3>
              </div>
              
              <div className="relative">
                <div className="absolute left-0 top-0 bottom-0 w-1 rounded-full bg-accent/50"></div>
                <p className="pl-6 text-xl leading-relaxed font-medium text-ink/90">
                  {locale === 'en' ? slide.en.script : slide.bn.script}
                </p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Footer */}
        <div className="mt-16 text-center text-ink-soft flex flex-col items-center justify-center">
          <Presentation size={32} className="mb-4 opacity-50" />
          <p className="font-bold">EquiPulse AI - Investor Pitch Guide</p>
          <p className="text-sm opacity-80">Confidential & Proprietary</p>
        </div>
      </div>
    </div>
  );
};
