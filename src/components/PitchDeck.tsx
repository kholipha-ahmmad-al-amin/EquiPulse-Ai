import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ChevronRight, ChevronLeft, Presentation, Rocket, Database,
  TrendingUp, Sun, Moon, Globe, Maximize, Minimize, Info, X, Users, AlertCircle, Sparkles, CheckCircle2
} from 'lucide-react'
import { TeamShowcase } from './TeamShowcase'
import { useI18n } from '../i18n'
import { LanguageSelector } from './LanguageSelector'

import { useTheme } from '../theme'

type KeywordDict = {
  [key: string]: {
    en: { definition: string; usage: string };
    bn: { definition: string; usage: string };
  };
};

const keywordsData: KeywordDict = {
  "Tinder UX": {
    en: { definition: "A swiping interaction to quickly approve or reject items.", usage: "Merchants swipe right to restock an item or left to ignore, making inventory decisions incredibly fast." },
    bn: { definition: "স্ক্রিনে ডানে বা বাঁয়ে সোয়াইপ করে দ্রুত সিদ্ধান্ত নেওয়ার পদ্ধতি।", usage: "দোকানদাররা পণ্য রিস্টক করতে চাইলে ডানে সোয়াইপ করেন, আর না চাইলে বাঁয়ে। এতে সেকেন্ডের মধ্যে সিদ্ধান্ত নেওয়া যায়।" }
  },
  "Mathematical OCR": {
    en: { definition: "Optical Character Recognition that reads text and validates numbers.", usage: "Our AI reads handwritten wholesale memos and recalculates totals to catch billing errors instantly." },
    bn: { definition: "হাতের লেখা পড়ার পাশাপাশি গাণিতিক হিসাবগুলোও মিলিয়ে দেখার প্রযুক্তি।", usage: "সাপ্লায়ারের হাতের লেখা মেমোর হিসাবগুলো স্ক্যান করার সাথে সাথে এআই নিজে হিসাব করে ভুল আছে কি না তা ধরে ফেলে।" }
  },
  "DuckDB WASM": {
    en: { definition: "A high-performance analytical database running directly inside the web browser.", usage: "We use it to process thousands of sales records instantly without needing a cloud server." },
    bn: { definition: "ওয়েব ব্রাউজারের ভেতরেই চলা একটি সুপারফাস্ট ডেটাবেস।", usage: "হাজার হাজার সেলস রিপোর্ট চোখের পলকে অ্যানালাইসিস করতে এটি ব্যবহৃত হয়, যার ফলে আমাদের ক্লাউড সার্ভারের খরচ শূন্য।" }
  },
  "GraphRAG": {
    en: { definition: "Graph Retrieval-Augmented Generation using connected data nodes.", usage: "Our on-device AI uses GraphRAG to map customer buying habits and predict future demand accurately." },
    bn: { definition: "গ্রাফ ডেটার ওপর ভিত্তি করে কাজ করা একটি এআই প্রযুক্তি।", usage: "ক্রেতাদের কেনার ধরন বিশ্লেষণ করে ভবিষ্যতে কোন পণ্যের চাহিদা বাড়বে তা নির্ভুলভাবে জানাতে আমাদের এআই এটি ব্যবহার করে।" }
  },
  "WebRTC Mesh Sync": {
    en: { definition: "Peer-to-peer data synchronization directly between devices.", usage: "Multiple shop devices sync inventory and sales over the local network even when the internet is completely down." },
    bn: { definition: "ইন্টারনেট ছাড়াই এক ডিভাইসের সাথে অন্য ডিভাইসের সরাসরি ডেটা আদান-প্রদান।", usage: "দোকানের ওয়াইফাই রাউটারের মাধ্যমেই একাধিক মোবাইল বা ল্যাপটপের মাঝে অফলাইনে স্টক ও সেলস সিঙ্ক হয়।" }
  },
  "IndexedDB": {
    en: { definition: "A low-level API for client-side storage of significant amounts of structured data.", usage: "Ensures the entire ERP system, from POS to CRM, works 100% offline with zero data loss." },
    bn: { definition: "ব্রাউজারের ভেতরে বিপুল পরিমাণ ডেটা সংরক্ষণের প্রযুক্তি।", usage: "ইন্টারনেট না থাকলেও পুরো সিস্টেম এবং সব ডেটা যেন সুরক্ষিত থাকে তা নিশ্চিত করতে এটি ব্যবহৃত হয়।" }
  },
  "Web Serial API": {
    en: { definition: "Allows websites to communicate directly with hardware devices via serial ports.", usage: "Enables instant connection to thermal receipt printers and weight scales without installing any drivers." },
    bn: { definition: "ওয়েবসাইটকে সরাসরি হার্ডওয়্যারের সাথে কানেক্ট করার প্রযুক্তি।", usage: "কোনো ড্রাইভার ইন্সটল করা ছাড়াই সরাসরি থার্মাল প্রিন্টার এবং ওজন মাপার স্কেলের সাথে পস সিস্টেমকে যুক্ত করতে এটি ব্যবহৃত হয়।" }
  },
  "Service Worker": {
    en: { definition: "A script that your browser runs in the background to handle caching and offline functionality.", usage: "Pre-caches 47 critical application assets so the system loads instantly, even on 2G networks or completely offline." },
    bn: { definition: "ব্রাউজারের ব্যাকগ্রাউন্ডে চলা একটি স্ক্রিপ্ট যা অফলাইন কাজ নিয়ন্ত্রণ করে।", usage: "ইন্টারনেট না থাকলেও পুরো অ্যাপটিকে অফলাইনে লোড করতে এবং দ্রুত চালাতে এটি ব্যাকগ্রাউন্ডে কাজ করে।" }
  },
  "Multi-LLM": {
    en: { definition: "Using multiple Large Language Models (AI brains) as backups.", usage: "If Gemini goes down, EquiPulse automatically switches to Groq or OpenRouter so business never stops." },
    bn: { definition: "একাধিক এআই ব্রেইন একসাথে ব্যবহার করা।", usage: "গুগল জেমিনাই এর সার্ভার ডাউন থাকলেও ইকুইপালস স্বয়ংক্রিয়ভাবে অন্য এআই দিয়ে কাজ চালিয়ে যায়।" }
  },
  "PWA": {
    en: { definition: "Progressive Web App: A website that acts like a native app.", usage: "Users can install EquiPulse from the browser to their phone screen and use it completely offline." },
    bn: { definition: "প্রোগ্রেসিভ ওয়েব অ্যাপ: ওয়েবসাইটের মতো হলেও মোবাইলের নিজস্ব অ্যাপের মতো কাজ করে।", usage: "ব্রাউজার থেকেই অ্যাপটি ইন্সটল করে অফলাইনে ইন্টারনেট ছাড়াই ব্যবহার করা যায়।" }
  },
  "RBAC": {
    en: { definition: "Role-Based Access Control: Assigning permissions based on roles.", usage: "A cashier can only sell items, but the owner can view analytics and modify prices." },
    bn: { definition: "রোল-বেসড অ্যাক্সেস কন্ট্রোল: পদবী অনুযায়ী সিস্টেম ব্যবহারের অনুমতি।", usage: "ক্যাশিয়ার শুধু বিক্রি করতে পারবেন, কিন্তু অ্যানালিটিক্স দেখা বা দাম পরিবর্তনের ক্ষমতা শুধু মালিকের থাকবে।" }
  },
  "MCP": {
    en: { definition: "Model Context Protocol: Securely giving AI access to tools.", usage: "Our custom MCP servers allow the AI to safely interact with the local POS ledger." },
    bn: { definition: "মডেল কনটেক্সট প্রটোকল: এআইকে সুনির্দিষ্ট টুলের সিকিউর অ্যাক্সেস দেওয়া।", usage: "এই সার্ভারের মাধ্যমে এআই নিরাপদভাবে দোকানের স্টক ও লেজার চেক করে সঠিক উত্তর দিতে পারে।" }
  },
  "Serverless Edge": {
    en: { definition: "Hosting logic across global nodes close to the user.", usage: "Firebase and Cloudflare deliver our app instantly to users in Bangladesh without latency." },
    bn: { definition: "কেন্দ্রীয় সার্ভারের বদলে ব্যবহারকারীর কাছাকাছি ডেটা সেন্টার থেকে সার্ভিস দেওয়া।", usage: "ক্লাউডফ্লেয়ার ও ফায়ারবেস ব্যবহার করায় বাংলাদেশের যেকোনো প্রান্ত থেকে অ্যাপটি চোখের পলকে লোড হয়।" }
  }
};

const slides = [
  {
    id: 'intro',
    icon: Rocket,
    gradient: 'from-violet-600 to-indigo-600',
    en: {
      title: 'EquiPulse AI',
      subtitle: 'The Offline-First AI Brain for Retail',
      points: [
        'Welcome! We are honored to present EquiPulse AI - the world’s first AI-powered, offline-first cooperative ERP and POS.',
        'We are on a mission to digitize the massive unstructured retail economy of the Global South, transforming ordinary stores into highly efficient smart businesses.',
        'Please swipe across your screen or use the keyboard arrow keys to navigate through our innovations, business model, and deep tech architecture.'
      ]
    },
    bn: {
      title: 'ইকুইপালস এআই',
      subtitle: 'রিটেইল ব্যবসার অফলাইন-ফার্স্ট এআই ব্রেইন',
      points: [
        'আমাদের প্রেজেন্টেশনে স্বাগতম! বিশ্বের প্রথম এআই-চালিত, অফলাইন-ফার্স্ট কো-অপারেটিভ ইআরপি এবং পস প্ল্যাটফর্ম "ইকুইপালস এআই" উপস্থাপন করতে পেরে আমরা আনন্দিত।',
        'আমরা বাংলাদেশের লক্ষ লক্ষ ক্ষুদ্র ব্যবসার অফলাইন অর্থনীতিকে ডিজিটালাইজ করার মাধ্যমে একটি সাধারণ দোকানকেও স্মার্ট ব্যবসায় রূপান্তর করার লক্ষ্যে কাজ করছি।',
        'আমাদের ইনোভেশন, বিজনেস মডেল এবং টেকনিক্যাল আর্কিটেকচার সম্পর্কে জানতে আপনার স্ক্রিনে সোয়াইপ করুন অথবা কীবোর্ডের অ্যারো কি ব্যবহার করুন।'
      ]
    }
  },
  {
    id: 'problem',
    icon: AlertCircle,
    gradient: 'from-red-600 to-orange-500',
    en: {
      title: 'The Core Problem',
      subtitle: '70 Million SMEs Struggling in the Dark',
      points: [
        'Across the Global South, over 70 million small businesses operate completely on paper ledgers and gut feelings.',
        'Enterprise tools cost $50-$500/month, making them completely unaffordable. Furthermore, 40% of rural businesses face internet outages, rendering cloud-only SaaS useless.',
        'A single wrong inventory decision can push a family business into debt. They lack data, business intelligence, and financial protection.'
      ]
    },
    bn: {
      title: 'মূল সমস্যা',
      subtitle: 'অন্ধকারে লড়াই করছে ৭ কোটিরও বেশি ক্ষুদ্র ব্যবসা',
      points: [
        'উন্নয়নশীল দেশগুলোতে ৭ কোটিরও বেশি ক্ষুদ্র ব্যবসা শুধুমাত্র কাগজের হিসাব এবং অনুমানের ওপর ভিত্তি করে চলছে।',
        'প্রচলিত ইআরপি সফটওয়্যারগুলোর খরচ মাসে ৫০-৫০০ ডলার, যা তাদের সামর্থ্যের বাইরে। তাছাড়া ৪০% গ্রাম্য এলাকায় ইন্টারনেট না থাকায় ক্লাউড সফটওয়্যারগুলো অকেজো।',
        'ভুল সময়ে ভুল পণ্য স্টক করার কারণে অনেক পারিবারিক ব্যবসা ঋণের মুখে পড়ে। তাদের কাছে কোনো ডেটা, বিজনেস ইন্টেলিজেন্স বা আর্থিক সুরক্ষা নেই।'
      ]
    }
  },
  {
    id: 'innovation',
    icon: Sparkles,
    gradient: 'from-amber-500 to-yellow-500',
    en: {
      title: 'Our Innovations',
      subtitle: 'AI Built for the Real World',
      points: [
        'We reinvented complex inventory tasks using a Tinder UX. The AI suggests critical restocking actions, and the merchant simply swipes to execute them instantly.',
        'Our custom Mathematical OCR powered by Gemini goes beyond simple text reading. It mathematically cross-verifies handwritten memo totals and detects billing errors before they cause financial loss.',
        'With Voice POS integration, merchants can operate the POS hands-free using natural language during busy rush hours.'
      ]
    },
    bn: {
      title: 'আমাদের ইনোভেশন',
      subtitle: 'বাস্তব পৃথিবীর জন্য তৈরি এআই',
      points: [
        'স্টক ম্যানেজমেন্ট সহজ করতে আমরা Tinder UX ব্যবহার করেছি। এআই রিস্টকের পরামর্শ দেয় এবং দোকানদার সোয়াইপ করেই তা কার্যকর করতে পারেন।',
        'আমাদের Mathematical OCR সাধারণ স্ক্যানারের মত নয়। এটি সাপ্লায়ারের হাতের লেখা মেমো পড়ে এবং গাণিতিক হিসাব নিজে মিলিয়ে দেখে ভুলগুলো তাৎক্ষণিকভাবে ধরে ফেলে।',
        'ভয়েস পস-এর মাধ্যমে ক্রেতার ভিড় থাকলে স্ক্রিন স্পর্শ না করেই শুধু কথা বলে পণ্য স্ক্যান ও বিক্রি করা সম্ভব।'
      ]
    }
  },
  {
    id: 'technical',
    icon: Database,
    gradient: 'from-emerald-500 to-teal-600',
    en: {
      title: 'Deep Tech Architecture',
      subtitle: 'Uncompromising Performance',
      points: [
        'To achieve zero-latency offline analytics, we embedded DuckDB WASM directly inside the browser. It effortlessly parses thousands of sales records with absolutely zero cloud server cost.',
        'The entire application functions as a robust PWA using IndexedDB and Service Worker for full offline capability, fortified with WebRTC Mesh Sync for local network multi-device syncing.',
        'Hardware integration is seamless. We use the Web Serial API to instantly connect thermal printers and weight scales directly from the browser.'
      ]
    },
    bn: {
      title: 'ডিপ টেক আর্কিটেকচার',
      subtitle: 'অফলাইনেও সর্বোচ্চ পারফরম্যান্স',
      points: [
        'ক্লাউড সার্ভারের খরচ শূন্য করতে আমরা সরাসরি ব্রাউজারে DuckDB WASM যুক্ত করেছি, যা হাজার হাজার সেলস ডেটা চোখের পলকে অফলাইনেই অ্যানালাইসিস করে।',
        'এটি একটি সম্পূর্ণ PWA, যা IndexedDB এবং Service Worker ব্যবহার করে অফলাইনে কাজ করে। আর WebRTC Mesh Sync এর মাধ্যমে ইন্টারনেট ছাড়াই দোকানের সব ডিভাইস একসাথে সিঙ্ক হয়।',
        'হার্ডওয়্যার সাপোর্ট করা হয়েছে খুবই সহজে। Web Serial API ব্যবহার করে কোনো ড্রাইভার ছাড়াই থার্মাল প্রিন্টার এবং ওজন মাপার স্কেল ব্রাউজারের সাথেই কাজ করে।'
      ]
    }
  },
  {
    id: 'features',
    icon: CheckCircle2,
    gradient: 'from-sky-500 to-blue-600',
    en: {
      title: 'Comprehensive Ecosystem',
      subtitle: 'More Than Just a POS',
      points: [
        'EquiPulse AI handles full Finance and P&L tracking, automatically calculating COGS, operational expenses, and net profit margins daily.',
        'The CRM module tracks customer loyalty points, manages credit ledgers, and enables sending personalized promotions via WhatsApp deep links.',
        'HR features include advanced shift management, cashier PIN sessions, and strict RBAC to ensure absolute accountability for every transaction.'
      ]
    },
    bn: {
      title: 'কমপ্রিহেনসিভ ইকোসিস্টেম',
      subtitle: 'একটি সাধারণ পস-এর চেয়েও বেশি কিছু',
      points: [
        'ইকুইপালস এআই সম্পূর্ণ ফিন্যান্স এবং লাভ-ক্ষতির হিসাব রাখে। এটি প্রতিদিনের প্রোডাক্টের কেনা দাম, অন্যান্য খরচ এবং নিট প্রফিট অটোমেটিক্যালি ক্যালকুলেট করে।',
        'কাস্টমার রিলেশনশিপ মডিউল কাস্টমারদের লয়্যালটি পয়েন্ট ট্র্যাক করে, বাকি খাতার হিসাব রাখে এবং হোয়াটসঅ্যাপের মাধ্যমে অটোমেটিক প্রমোশনাল মেসেজ পাঠায়।',
        'এইচআর ফিচারের মধ্যে রয়েছে স্টাফ শিফট ম্যানেজমেন্ট, ক্যাশিয়ার পিন লগইন এবং কঠোর RBAC সিস্টেম, যা প্রতিটি বিক্রির শতভাগ স্বচ্ছতা নিশ্চিত করে।'
      ]
    }
  },
  {
    id: 'business',
    icon: TrendingUp,
    gradient: 'from-fuchsia-600 to-pink-600',
    en: {
      title: 'Business Model & Revenue',
      subtitle: 'How We Monetize Sustainably',
      points: [
        'Freemium Core: The core POS, offline inventory, and CRM are 100% free forever for small merchants to ensure massive rapid adoption.',
        'Enterprise Subscriptions: Medium-to-large businesses pay recurring fees for advanced AI forecasting, Multi-LLM usage, and custom MCP integrations.',
        'Fintech Integration: By analyzing merchant data via GraphRAG, we partner with banks to facilitate low-risk micro-loans, earning commission on successful lending.'
      ]
    },
    bn: {
      title: 'বিজনেস মডেল এবং রেভিনিউ',
      subtitle: 'যেভাবে আমরা আয় করি',
      points: [
        'ফ্রিমিয়াম কোর: ক্ষুদ্র ব্যবসায়ীদের জন্য কোর পস এবং ইনভেন্টরি সম্পূর্ণ ফ্রি, যার ফলে খুব দ্রুত আমরা লক্ষ লক্ষ ব্যবহারকারী অর্জন করতে পারব।',
        'এন্টারপ্রাইজ সাবস্ক্রিপশন: বড় সুপারশপগুলোর অ্যাডভান্সড এআই ফোরকাস্টিং, Multi-LLM এবং കাস্টম MCP ব্যবহারের জন্য আমাদের নিয়মিত সাবস্ক্রিপশন আয় আসবে।',
        'ফিনটেক ইন্টিগ্রেশন: GraphRAG ব্যবহার করে ডেটা অ্যানালাইসিসের মাধ্যমে আমরা ব্যাংকগুলোর সাথে পার্টনারশিপ করে দোকানদারদের মাইক্রো-লোন সুবিধা দিব এবং সেখান থেকে কমিশন আয় করব।'
      ]
    }
  },
  {
    id: 'data_strategy',
    icon: Database,
    gradient: 'from-rose-500 to-red-600',
    en: {
      title: 'Data Acquisition & Scaling',
      subtitle: 'Zero-Friction Onboarding',
      points: [
        'Merchants hate manual data entry. We are investing heavily in acquiring and scraping massive global databases of Medicines, Pharmacy products, and FMCG goods.',
        'Our pre-filled product catalogs mean a pharmacy owner can simply scan a barcode, and the product name, details, and market price automatically populate instantly.',
        'This immense dataset creates a powerful moat against competitors and provides unparalleled convenience to our users from day one.'
      ]
    },
    bn: {
      title: 'ডেটা অ্যাকুইজিশন এবং স্কেলিং',
      subtitle: 'জিরো-ফ্রিকশন অনবোর্ডিং',
      points: [
        'দোকানদাররা ম্যানুয়ালি পণ্যের নাম টাইপ করতে অপছন্দ করেন। তাই আমরা মেডিসিন, ফার্মেসি পণ্য এবং FMCG পণ্যের বিশাল ডেটাবেস কেনা এবং স্ক্র্যাপ করার জন্য বিনিয়োগ করছি।',
        'আমাদের প্রি-ফিল্ড ক্যাটালগের কারণে একজন ফার্মেসি মালিক শুধু বারকোড স্ক্যান করলেই পণ্যের নাম, বিস্তারিত এবং বাজার মূল্য অটোমেটিকভাবে পসে চলে আসবে।',
        'এই বিশাল ডেটাসেট আমাদেরকে প্রতিযোগীদের চেয়ে যোজন যোজন এগিয়ে রাখবে এবং ব্যবহারকারীদের জন্য প্রথম দিন থেকেই অভাবনীয় সুবিধা নিশ্চিত করবে।'
      ]
    }
  },
  {
    id: 'roadmap',
    icon: Rocket,
    gradient: 'from-orange-500 to-amber-500',
    en: {
      title: '3-6 Month Roadmap',
      subtitle: 'Aggressive Market Expansion',
      points: [
        'Month 1-2: Finalize the offline-first web platform and complete the acquisition of the Bangladesh National Pharmacy & FMCG datasets.',
        'Month 3-4: Launch native Android/iOS applications to expand accessibility, followed by a large-scale targeted marketing campaign targeting 50,000 rural SMEs.',
        'Month 5-6: Introduce the AI-driven Micro-lending module with pilot bank partners and deploy custom localized LLMs for even faster on-device performance.'
      ]
    },
    bn: {
      title: '৩-৬ মাসের রোডম্যাপ',
      subtitle: 'তীব্র মার্কেট এক্সপানশন',
      points: [
        'মাস ১-২: অফলাইন-ফার্স্ট ওয়েব প্ল্যাটফর্ম সম্পূর্ণ করা এবং বাংলাদেশের জাতীয় ফার্মেসি ও FMCG ডেটাসেটগুলোর অ্যাকুইজিশন সম্পন্ন করা।',
        'মাস ৩-৪: সব ধরনের ডিভাইসে সাপোর্ট বাড়াতে নেটিভ Android/iOS অ্যাপ লঞ্চ করা, এবং ৫০,০০০ গ্রাম্য ব্যবসায়ী টার্গেট করে বড় পরিসরে মার্কেটিং শুরু করা।',
        'মাস ৫-৬: পাইলট ব্যাংক পার্টনারদের সাথে এআই-চালিত মাইক্রো-লোন মডিউল চালু করা এবং ডিভাইসের ভেতরেই আরও দ্রুত কাজ করার জন্য লোকাল LLM ডিপ্লয় করা।'
      ]
    }
  },
  {
    id: 'investment',
    icon: TrendingUp,
    gradient: 'from-green-500 to-emerald-600',
    en: {
      title: 'Investment Ask & ROI',
      subtitle: 'Fueling the Next Retail Revolution',
      points: [
        'We are raising a $150,000 Pre-Seed round to fund data acquisition (Pharmacy/FMCG datasets), robust cloud infrastructure, and nationwide aggressive marketing.',
        'With a CAC (Customer Acquisition Cost) estimated at under $2, we project reaching 100,000 active monthly users within the first 12 months.',
        'Investors will gain early equity in a hyper-scalable platform designed to monopolize the SME digital infrastructure of the Global South.'
      ]
    },
    bn: {
      title: 'ইনভেস্টমেন্ট এবং আর.ও.আই',
      subtitle: 'পরবর্তী রিটেইল বিপ্লবের জ্বালানি',
      points: [
        'ফার্মেসি/FMCG ডেটাসেট অ্যাকুইজিশন, ক্লাউড ইনফ্রাস্ট্রাকচার এবং দেশব্যাপী ব্যাপক মার্কেটিং-এর জন্য আমরা $১৫০,০০০ প্রি-সিড ফান্ডিং সংগ্রহ করছি।',
        'আমাদের ব্যবহারকারী অর্জনের খরচ (CAC) ২ ডলারেরও কম হবে বলে ধারণা করা হচ্ছে, যার মাধ্যমে প্রথম ১২ মাসের মধ্যেই আমরা ১ লক্ষ অ্যাক্টিভ ব্যবহারকারীতে পৌঁছানোর লক্ষ্যমাত্রা ঠিক করেছি।',
        'বিনিয়োগকারীরা এমন একটি হাইপার-স্কেলেবল প্ল্যাটফর্মের আর্লি শেয়ারহোল্ডার হবেন, যা উন্নয়নশীল দেশগুলোর ডিজিটাল রিটেইল অর্থনীতিতে রাজত্ব করবে।'
      ]
    }
  },
  {
    id: 'scalability',
    icon: Globe,
    gradient: 'from-purple-600 to-violet-700',
    en: {
      title: 'Global Scalability',
      subtitle: 'Built for Borderless Growth',
      points: [
        'We utilized a Serverless Edge architecture powered by Firebase and Cloudflare. This ensures instantaneous load times globally regardless of traffic spikes.',
        'The system is universally adaptable. It natively supports 15 global languages including full RTL layouts for Arabic and Urdu, alongside dynamic currency formatting.',
        'Our on-device processing ensures that as the system scales to millions of users, our cloud infrastructure costs remain functionally zero.'
      ]
    },
    bn: {
      title: 'গ্লোবাল স্কেলেবিলিটি',
      subtitle: 'বিশ্বব্যাপী বিস্তারের জন্য তৈরি',
      points: [
        'আমাদের Serverless Edge আর্কিটেকচার নিশ্চিত করে যে ব্যবহারকারীর সংখ্যা যতই বাড়ুক না কেন, ক্লাউডফ্লেয়ার ও ফায়ারবেস-এর কারণে সিস্টেম মুহূর্তের মধ্যে লোড হবে।',
        'সিস্টেমটি বিশ্বায়নের কথা মাথায় রেখে তৈরি। এতে বাংলা ও ইংরেজি সহ ১৫টি ভাষার সাপোর্ট রয়েছে এবং আরবি ও উর্দুর জন্য সম্পূর্ণ RTL লেআউট সাপোর্ট করে।',
        'যেহেতু আমাদের কোর প্রসেসিং সরাসরি ডিভাইসেই অফলাইনে চলে, তাই লক্ষ লক্ষ ব্যবহারকারী হলেও আমাদের ক্লাউড সার্ভারের খরচ বলতে গেলে শূন্য।'
      ]
    }
  },
  {
    id: 'presentation',
    icon: Presentation,
    gradient: 'from-blue-600 to-indigo-600',
    en: {
      title: 'Ready for Deployment',
      subtitle: 'The Verdict',
      points: [
        'We invite you to test it yourself. Simply turn off your device Wi-Fi to experience the seamless offline AI capabilities and uninterrupted POS operations.',
        'EquiPulse AI is not just a concept. It is a fully investor-ready, production-grade system that has been built to scale immediately.',
        'Thank you for taking the time to experience the future of retail alongside EquiSaaS BD. We deeply appreciate your attention.'
      ]
    },
    bn: {
      title: 'চূড়ান্ত প্রেজেন্টেশন',
      subtitle: 'সম্পূর্ণ প্রোডাকশন-রেডি সফটওয়্যার',
      points: [
        'আপনার ডিভাইসের ওয়াইফাই বন্ধ করে নিজেই পরীক্ষা করুন। দেখবেন ইন্টারনেট ছাড়াই সম্পূর্ণ অফলাইনে আমাদের এআই এবং পস সিস্টেম নিখুঁতভাবে কাজ করছে।',
        'ইকুইপালস এআই কেবল একটি ধারণা নয়। এটি দেশের অর্থনীতিকে পাল্টে দেওয়ার জন্য তৈরি করা একটি সম্পূর্ণ ইনভেস্টর-রেডি এবং প্রোডাকশন-গ্রেড সিস্টেম।',
        'EquiSaaS BD এর সাথে রিটেইলের এই নতুন ভবিষ্যৎ উপভোগ করার জন্য আপনাদের অসংখ্য ধন্যবাদ এবং কৃতজ্ঞতা জ্ঞাপন করছি।'
      ]
    }
  },
  {
    id: 'team',
    icon: Users,
    gradient: 'from-teal-600 to-emerald-600',
    en: {
      title: 'Team EquiSaaS BD',
      subtitle: 'The Architects Behind EquiPulse AI',
      points: []
    },
    bn: {
      title: 'Team EquiSaaS BD',
      subtitle: 'ইকুইপালস এআই-এর পেছনের রূপকার',
      points: []
    }
  }
];

const KeywordPopup = ({ keyword, onClose }: { keyword: string, onClose: () => void }) => {
  const { t } = useI18n();
  const data = keywordsData[keyword];
  if (!data) return null;
  const content = {
    definition: t(`keyword_${keyword.replace(/[^a-zA-Z0-9]/g, '_')}_definition`, { defaultValue: data.en.definition }),
    usage: t(`keyword_${keyword.replace(/[^a-zA-Z0-9]/g, '_')}_usage`, { defaultValue: data.en.usage })
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-ink/40 backdrop-blur-sm" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 10 }}
        className="bg-surface p-6 rounded-2xl shadow-2xl max-w-md w-full border border-line"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-ink">{keyword}</h3>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-muted text-ink-soft transition-colors">
            <X size={20} />
          </button>
        </div>
        <div className="space-y-4">
          <div>
            <h4 className="text-sm font-bold uppercase tracking-wider text-accent mb-1">
              {t("Definition")}
            </h4>
            <p className="text-ink-soft text-base leading-relaxed">{content.definition}</p>
          </div>
          <div>
            <h4 className="text-sm font-bold uppercase tracking-wider text-focus mb-1">
              {t("Our Implementation")}
            </h4>
            <p className="text-ink-soft text-base leading-relaxed">{content.usage}</p>
          </div>
        </div>
        <button 
          onClick={onClose}
          className="mt-6 w-full py-2.5 rounded-xl bg-muted hover:bg-line transition-colors text-ink font-semibold"
        >
          {t("Close")}
        </button>
      </motion.div>
    </div>
  );
};

export function PitchDeck() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [activeKeyword, setActiveKeyword] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  
  const { t } = useI18n();
  const { isNight, toggleTheme } = useTheme();
  const mouseTimer = useRef<NodeJS.Timeout | null>(null);

  const nextSlide = () => setCurrentSlide((prev) => (prev === slides.length - 1 ? prev : prev + 1));
  const prevSlide = () => setCurrentSlide((prev) => (prev === 0 ? 0 : prev - 1));

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if a popup is open
      if (activeKeyword) return;
      
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        setCurrentSlide(p => (p === slides.length - 1 ? p : p + 1));
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        setCurrentSlide(p => (p === 0 ? 0 : p - 1));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeKeyword]);

  // Fullscreen and Idle logic
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
      if (!document.fullscreenElement) {
        setShowControls(true);
      }
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  useEffect(() => {
    const handleMouseMove = () => {
      if (isFullscreen) {
        setShowControls(true);
        if (mouseTimer.current) clearTimeout(mouseTimer.current);
        mouseTimer.current = setTimeout(() => {
          setShowControls(false);
        }, 3000);
      }
    };
    
    if (!isFullscreen) {
      setShowControls(true);
      if (mouseTimer.current) clearTimeout(mouseTimer.current);
    }

    window.addEventListener('mousemove', handleMouseMove);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      if (mouseTimer.current) clearTimeout(mouseTimer.current);
    };
  }, [isFullscreen]);

  const parseText = (text: string) => {
    const keywordKeys = Object.keys(keywordsData);
    const regex = new RegExp(`(${keywordKeys.join('|')})`, 'gi');
    const parts = text.split(regex);

    return parts.map((part, index) => {
      const matchedKeyword = keywordKeys.find(k => k.toLowerCase() === part.toLowerCase());
      if (matchedKeyword) {
        return (
          <span 
            key={index} 
            onClick={() => setActiveKeyword(matchedKeyword)}
            className="inline-flex items-center gap-1 font-bold text-accent cursor-pointer hover:underline bg-accent/10 px-1.5 py-0.5 rounded transition-colors"
          >
            {part} <Info size={14} className="shrink-0" />
          </span>
        );
      }
      return <span key={index}>{part}</span>;
    });
  };

  const slide = slides[currentSlide]!;
  const content = {
    title: t(`pitch_${slide.id}_title`, { defaultValue: slide.en.title }),
    subtitle: t(`pitch_${slide.id}_subtitle`, { defaultValue: slide.en.subtitle }),
    points: slide.en.points.map((point, index) => t(`pitch_${slide.id}_point_${index}`, { defaultValue: point }))
  };
  const Icon = slide.icon;

  return (
    <div className={`fixed inset-0 z-[100] bg-surface flex flex-col items-center justify-center overflow-hidden selection:bg-accent/20 transition-all ${isFullscreen ? 'cursor-auto' : ''}`}>
      <div className="absolute inset-0 z-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:28px_28px]" />
      
      <AnimatePresence mode="wait">
        <motion.div
          key={currentSlide + '-bg'}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6 }}
          className="absolute inset-0 z-0 pointer-events-none"
        >
          <div className={`absolute top-[-20%] left-[-10%] w-[65%] h-[65%] rounded-full bg-gradient-to-br ${slide.gradient} opacity-10 blur-[180px]`} />
          <div className={`absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] rounded-full bg-gradient-to-tl ${slide.gradient} opacity-8 blur-[160px]`} />
        </motion.div>
      </AnimatePresence>

      <AnimatePresence>
        {showControls && (
          <motion.header 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute top-0 inset-x-0 p-4 md:p-8 flex justify-between items-center z-20"
          >
            <div className="flex items-center gap-3">
              <div className={`size-10 md:size-11 rounded-2xl bg-gradient-to-br ${slide.gradient} flex items-center justify-center text-white shadow-lg transition-all duration-500`}>
                <Presentation size={20} />
              </div>
              <div>
                <span className="font-heading font-black text-base md:text-xl text-ink tracking-tight">EquiPulse AI</span>
                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-accent mt-0.5 leading-none">
                  {t(`Presentation Mode`)} · {currentSlide + 1}/{slides.length}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 md:gap-3">
              <button
                onClick={toggleFullscreen}
                className="hidden md:flex items-center justify-center size-9 rounded-full bg-surface-strong/70 ring-1 ring-line shadow-sm backdrop-blur-md text-ink-soft hover:text-ink transition-all"
                title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
              >
                {isFullscreen ? <Minimize size={16} /> : <Maximize size={16} />}
              </button>
              <button
                onClick={toggleTheme}
                className="flex items-center justify-center size-9 rounded-full bg-surface-strong/70 ring-1 ring-line shadow-sm backdrop-blur-md text-ink-soft hover:text-ink transition-all"
              >
                {isNight ? <Sun size={16} /> : <Moon size={16} />}
              </button>
              <div className="hidden sm:block">
                <LanguageSelector />
              </div>
              <button
                onClick={() => window.location.href = '/'}
                className="rounded-full bg-ink text-surface px-4 py-1.5 md:px-5 md:py-2 text-xs font-bold shadow-sm hover:bg-ink-soft transition-all"
              >
                {t("Exit")}
              </button>
            </div>
          </motion.header>
        )}
      </AnimatePresence>

      <div className="relative w-full max-w-[90rem] px-4 md:px-12 flex-1 flex items-center justify-center z-10 pt-24 pb-28">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentSlide}
            initial={{ opacity: 0, scale: 0.97, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 1.02, y: -12 }}
            transition={{ type: "spring", stiffness: 200, damping: 26 }}
            className="w-full h-full max-h-[80vh] flex flex-col lg:grid lg:grid-cols-[1fr_1.5fr] gap-6 lg:gap-16 overflow-y-auto lg:overflow-visible scrollbar-none"
          >
            <div className="flex flex-col items-center lg:items-start text-center lg:text-left gap-4 lg:gap-6 shrink-0 lg:sticky lg:top-0 lg:self-center">
              <motion.div
                initial={{ rotate: -12, scale: 0.85 }}
                animate={{ rotate: 0, scale: 1 }}
                transition={{ type: "spring", stiffness: 150, delay: 0.08 }}
                className={`size-20 md:size-28 lg:size-36 rounded-[2rem] lg:rounded-[2.5rem] bg-gradient-to-br ${slide.gradient} flex items-center justify-center text-white shadow-2xl ring-8 ring-white/5`}
              >
                <Icon size={48} className="lg:size-16" />
              </motion.div>
              <div>
                <h1 className={`font-heading text-3xl md:text-5xl xl:text-6xl font-black text-ink tracking-tight ${t("")}`}>
                  {content.title}
                </h1>
                <p className={`mt-2 md:mt-4 text-sm md:text-lg lg:text-xl font-extrabold tracking-wide uppercase bg-gradient-to-r ${slide.gradient} bg-clip-text text-transparent ${t("tracking-widest")}`}>
                  {content.subtitle}
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-4 w-full h-full lg:justify-center">
              {slide.id === 'team' ? (
                <div className="w-full flex-1 flex items-center justify-center pt-8">
                  <TeamShowcase />
                </div>
              ) : (
                content.points.map((point, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: 28 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.15 + (index * 0.1), type: "spring", stiffness: 160 }}
                    className="glass p-5 md:p-7 rounded-[1.5rem] md:rounded-[1.75rem] shadow-premium flex items-start gap-4 md:gap-5 border border-line/40 hover:border-accent/30 transition-all duration-300 group"
                  >
                    <div className={`mt-0.5 size-7 md:size-9 rounded-xl bg-gradient-to-br ${slide.gradient} flex items-center justify-center shrink-0 text-white font-black text-xs md:text-sm shadow-md group-hover:scale-110 transition-transform duration-300`}>
                      {index + 1}
                    </div>
                    <p className={`text-sm md:text-lg lg:text-xl text-ink font-medium md:font-semibold ${t("leading-snug")}`}>
                      {parseText(point)}
                    </p>
                  </motion.div>
                ))
              )}
              {currentSlide === slides.length - 2 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="mt-4 md:mt-6 flex justify-center lg:justify-start"
                >
                  <button 
                    onClick={() => window.location.href = '/pos'}
                    className={`px-6 py-3 md:px-8 md:py-4 rounded-full bg-gradient-to-br ${slide.gradient} text-white font-black text-base md:text-lg shadow-glow hover:scale-105 transition-transform active:scale-95 flex items-center gap-3`}
                  >
                    <Rocket size={20} className="md:size-6" />
                    {t(`Launch Live Demo`)}
                  </button>
                </motion.div>
              )}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>



      <AnimatePresence>
        {showControls && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="absolute bottom-0 inset-x-0 p-4 md:p-8 flex flex-col sm:flex-row gap-4 sm:gap-6 justify-between items-center z-20"
          >
            <div className="flex gap-2 flex-wrap justify-center order-2 sm:order-1">
              {slides.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentSlide(idx)}
                  className={`h-1.5 md:h-2 rounded-full transition-all duration-500 ${idx === currentSlide ? 'w-8 md:w-12 bg-accent' : 'w-1.5 md:w-2 bg-line hover:bg-accent/50'}`}
                  aria-label={`Slide ${idx + 1}`}
                />
              ))}
            </div>
            <div className="flex gap-3 order-1 sm:order-2">
              <button
                onClick={prevSlide}
                disabled={currentSlide === 0}
                className="size-12 md:size-14 rounded-full bg-surface-strong/80 hover:bg-surface-strong disabled:opacity-25 flex items-center justify-center text-ink shadow-sm transition-all border border-line active:scale-90"
              >
                <ChevronLeft size={24} className="md:size-7" />
              </button>
              <button
                onClick={nextSlide}
                disabled={currentSlide === slides.length - 1}
                className={`size-12 md:size-14 rounded-full bg-gradient-to-br ${slide.gradient} disabled:opacity-40 flex items-center justify-center text-white shadow-lg transition-all active:scale-90`}
              >
                <ChevronRight size={24} className="md:size-7" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {activeKeyword && (
          <KeywordPopup 
            keyword={activeKeyword} 
            onClose={() => setActiveKeyword(null)} 
          />
        )}
      </AnimatePresence>
    </div>
  );
}
