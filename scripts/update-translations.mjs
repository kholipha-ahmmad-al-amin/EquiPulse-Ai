import fs from 'fs'
import path from 'path'

const localesDir = path.join(process.cwd(), 'public', 'locales')
const locales = fs.readdirSync(localesDir).filter(f => fs.statSync(path.join(localesDir, f)).isDirectory())

const guideTranslations = {
  en: {
    welcome: { title: "Welcome to EquiPulse!", desc: "Your simple, all-in-one assistant for running your shop smoothly. Try pressing Cmd + K (or Ctrl + K) to quickly jump anywhere, or change the language!", prompt: "👉 Change the language to continue" },
    pos: { title: "Fast POS Checkout", desc: "Create bills in seconds. Add items to the cart, easily search for products, and speed up your customer checkout even if the internet is down.", prompt: "👉 Add an item to continue" },
    ocr: { title: "Smart Memo Scanner", desc: "No need to type everything! Just snap or upload a picture of a handwritten receipt, and we will automatically extract the items and prices for you.", prompt: "👉 Upload a demo receipt" },
    advice: { title: "Smart Business Advice", desc: "Get daily tips on what to restock or how to increase profits. Swipe right to accept or tap 'Why?' to see a simple explanation.", prompt: "👉 Swipe to accept" },
    metrics: { title: "Clear Sales Reports", desc: "Easily understand how your business is doing. See your daily sales, profit growth, and stock levels in simple, colorful charts.", prompt: "👉 Explore the charts" },
    done: { title: "Ready to Grow!", desc: "You have seen how easy it is to manage your store. Start using the features today to save time, reduce mistakes, and earn more profit!", prompt: "👉 Tap 'Done' to finalize" }
  },
  bn: {
    welcome: { title: "ইকুইপালস-এ স্বাগতম!", desc: "আপনার দোকান চালানোর সবচেয়ে সহজ ও স্মার্ট সহকারী। যেকোনো ফিচারে দ্রুত যেতে Cmd + K চাপুন, অথবা অ্যাপের ভাষা পরিবর্তন করুন!", prompt: "👉 ভাষা পরিবর্তন করুন" },
    pos: { title: "দ্রুত পিওএস চেকআউট", desc: "কাস্টমারকে চোখের পলকে বিল দিন। ইন্টারনেট না থাকলেও কার্টে পণ্য যোগ করে সহজেই চেকআউট সম্পন্ন করুন।", prompt: "👉 কার্টে পণ্য যোগ করুন" },
    ocr: { title: "স্মার্ট মেমো স্ক্যানার", desc: "সবকিছু টাইপ করার দরকার নেই! হাতে লেখা মেমোর ছবি আপলোড করলেই আমরা স্বয়ংক্রিয়ভাবে পণ্য ও দাম বের করে আনবো।", prompt: "👉 ডেমো রসিদ আপলোড করুন" },
    advice: { title: "স্মার্ট ব্যবসায়িক পরামর্শ", desc: "কী কিনলে বা কীভাবে ব্যবসা চালালে লাভ বাড়বে, তার প্রতিদিনের পরামর্শ পান। সোয়াইপ করে গ্রহণ করুন।", prompt: "👉 সোয়াইপ করুন" },
    metrics: { title: "সহজ বেচাকেনার রিপোর্ট", desc: "আপনার ব্যবসা কেমন চলছে তা খুব সহজেই বুঝুন। প্রতিদিনের বেচাকেনা, লাভ ও স্টকের পরিমাণ সুন্দর চার্টে দেখে নিন।", prompt: "👉 চার্টগুলো দেখুন" },
    done: { title: "ব্যবসা বাড়াতে প্রস্তুত!", desc: "অভিনন্দন! আপনি দেখেছেন দোকান চালানো কতটা সহজ। সময় বাঁচাতে ও লাভ বাড়াতে আজই কাজ শুরু করুন!", prompt: "👉 'সম্পন্ন' বাটনটি চাপুন" }
  }
}

// Map specific locales, fallback to english for the others as a baseline to be updated later by native speakers
for (const locale of locales) {
  const filePath = path.join(localesDir, locale, 'translation.json')
  if (fs.existsSync(filePath)) {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'))
    
    // Choose BN for BN, otherwise EN
    const source = locale === 'bn' ? guideTranslations.bn : guideTranslations.en;
    
    data.guide = source;
    
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2))
    console.log(`Updated translations for ${locale}`)
  }
}
