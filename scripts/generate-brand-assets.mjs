import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const publicDir = path.join(rootDir, 'public')

const brand = {
  name: 'EquiPulse AI',
  owner: 'EquiSaaS BD',
  url: 'https://smepulse-equisaas-bd.web.app/',
  domain: 'smepulse-equisaas-bd.web.app',
  title: 'Offline-First AI Commerce Dashboard for Bangladesh',
  summary: 'Intelligent Baki Ledgers, Multi-LLM Analytics, and Offline Resilient Retail Operations.',
}

function markSvg(size = 512) {
  // A premium glassmorphic mark with deep green (Sundarban), terracotta, and golden fiber (Jute) accents.
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 512 512" role="img" aria-labelledby="title desc">
  <title id="title">${brand.name} logo mark</title>
  <desc id="desc">A premium pulse signal intertwined with cultural geometric patterns representing offline resilience.</desc>
  <defs>
    <!-- Deep Premium Dark Green/Slate Gradient -->
    <linearGradient id="markBg" x1="0" x2="512" y1="0" y2="512">
      <stop offset="0%" stop-color="#022c22"/> <!-- Deep Emerald -->
      <stop offset="50%" stop-color="#064e3b"/> <!-- Sundarban Green -->
      <stop offset="100%" stop-color="#020617"/> <!-- Deep Slate -->
    </linearGradient>
    
    <!-- Terracotta & Gold Pulse Gradient -->
    <linearGradient id="markPulse" x1="50" x2="450" y1="350" y2="150">
      <stop offset="0%" stop-color="#fb923c"/> <!-- Soft Orange -->
      <stop offset="40%" stop-color="#dc2626"/> <!-- Terracotta Red -->
      <stop offset="70%" stop-color="#fbbf24"/> <!-- Golden Fibre -->
      <stop offset="100%" stop-color="#10b981"/> <!-- Emerald -->
    </linearGradient>

    <!-- Cultural Geometric Nokshi Overlay -->
    <pattern id="nokshi" x="0" y="0" width="60" height="60" patternUnits="userSpaceOnUse">
      <path d="M30 0 L60 30 L30 60 L0 30 Z" fill="none" stroke="#ffffff" stroke-width="1.5" stroke-opacity="0.05"/>
      <circle cx="30" cy="30" r="10" fill="none" stroke="#ffffff" stroke-width="1" stroke-opacity="0.03"/>
    </pattern>

    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="8" stdDeviation="16" flood-color="#dc2626" flood-opacity="0.5"/>
    </filter>
  </defs>

  <!-- Base Plate -->
  <rect width="512" height="512" rx="120" fill="url(#markBg)"/>
  
  <!-- Subtle Cultural Overlay -->
  <rect width="512" height="512" rx="120" fill="url(#nokshi)"/>
  
  <!-- Abstract Pulse Geometry (Leaf + Pulse) -->
  <g transform="translate(48, 48)">
    <path d="M416 100 C300 -50, 100 0, 50 200 C0 400, 200 450, 416 416 C500 380, 500 150, 416 100 Z" fill="#10b981" opacity="0.1" filter="blur(20px)"/>
    <path d="M64 256 L150 256 L208 128 L272 384 L330 200 L380 256 L448 256" fill="none" stroke="url(#markPulse)" stroke-width="42" stroke-linecap="round" stroke-linejoin="round" filter="url(#glow)"/>
    
    <!-- Pulse Nodes (Data points) -->
    <circle cx="208" cy="128" r="30" fill="#f8fafc" opacity="0.9"/>
    <circle cx="272" cy="384" r="30" fill="#f8fafc" opacity="0.9"/>
    <circle cx="330" cy="200" r="26" fill="#f8fafc" opacity="0.9"/>
  </g>
</svg>`
}

function maskIconSvg() {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="120" fill="#000"/>
  <g transform="translate(48, 48)">
    <path d="M64 256 L150 256 L208 128 L272 384 L330 200 L380 256 L448 256" fill="none" stroke="#fff" stroke-width="42" stroke-linecap="round" stroke-linejoin="round"/>
    <circle cx="208" cy="128" r="30" fill="#fff"/>
    <circle cx="272" cy="384" r="30" fill="#fff"/>
    <circle cx="330" cy="200" r="26" fill="#fff"/>
  </g>
</svg>`
}

function siteLogoSvg() {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="900" height="200" viewBox="0 0 900 200" role="img" aria-labelledby="title desc">
  <title id="title">${brand.name} site logo</title>
  <desc id="desc">${brand.title} by ${brand.owner}.</desc>
  <defs>
    <linearGradient id="textGrad" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#064e3b" />
      <stop offset="100%" stop-color="#020617" />
    </linearGradient>
  </defs>
  
  <rect width="900" height="200" rx="36" fill="#ffffff" stroke="#e2e8f0" stroke-width="2"/>
  <g transform="translate(34 24) scale(.296875)">
    ${markSvg().replace(/^[\s\S]*?<defs>/, '<defs>').replace('</svg>', '')}
  </g>
  <text x="214" y="90" fill="url(#textGrad)" font-family="Arial, Helvetica, sans-serif" font-size="64" font-weight="900" letter-spacing="-1">${brand.name}</text>
  <text x="216" y="134" fill="#dc2626" font-family="Arial, Helvetica, sans-serif" font-size="24" font-weight="800" letter-spacing="1">BY EQUISAAS BD</text>
  <text x="216" y="168" fill="#64748b" font-family="Arial, Helvetica, sans-serif" font-size="21" font-weight="600">${brand.title}</text>
</svg>`
}

function ogImageSvg() {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630" role="img" aria-labelledby="title desc">
  <title id="title">${brand.name} social preview</title>
  <desc id="desc">${brand.summary}</desc>
  <defs>
    <linearGradient id="ogBg" x1="0" x2="1200" y1="0" y2="630">
      <stop offset="0%" stop-color="#022c22"/>
      <stop offset="100%" stop-color="#0f172a"/>
    </linearGradient>
    <linearGradient id="textGlow" x1="0" x2="1" y1="0" y2="0">
      <stop offset="0%" stop-color="#fbbf24"/>
      <stop offset="100%" stop-color="#fb923c"/>
    </linearGradient>
    <pattern id="nokshiOg" x="0" y="0" width="120" height="120" patternUnits="userSpaceOnUse">
      <path d="M60 0 L120 60 L60 120 L0 60 Z" fill="none" stroke="#ffffff" stroke-width="2" stroke-opacity="0.03"/>
      <circle cx="60" cy="60" r="20" fill="none" stroke="#ffffff" stroke-width="2" stroke-opacity="0.02"/>
    </pattern>
    <filter id="dropShadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="20" stdDeviation="30" flood-color="#000000" flood-opacity="0.6"/>
    </filter>
  </defs>
  
  <rect width="1200" height="630" fill="url(#ogBg)"/>
  <rect width="1200" height="630" fill="url(#nokshiOg)"/>
  
  <!-- Floating App Window Mockup -->
  <rect x="500" y="100" width="800" height="500" rx="24" fill="#ffffff" filter="url(#dropShadow)" opacity="0.95"/>
  <rect x="500" y="100" width="800" height="60" rx="24" fill="#f1f5f9"/>
  <circle cx="530" cy="130" r="8" fill="#ef4444"/>
  <circle cx="560" cy="130" r="8" fill="#f59e0b"/>
  <circle cx="590" cy="130" r="8" fill="#10b981"/>
  
  <!-- Inner Mockup UI elements -->
  <rect x="540" y="200" width="200" height="300" rx="16" fill="#f8fafc" stroke="#e2e8f0" stroke-width="2"/>
  <rect x="560" y="230" width="160" height="40" rx="8" fill="#e2e8f0"/>
  <rect x="560" y="290" width="160" height="20" rx="4" fill="#cbd5e1"/>
  <rect x="560" y="330" width="160" height="20" rx="4" fill="#cbd5e1"/>
  
  <rect x="780" y="200" width="380" height="180" rx="16" fill="#10b981" opacity="0.1" stroke="#10b981" stroke-width="2"/>
  <path d="M 820 320 Q 880 250 920 300 T 1100 220" fill="none" stroke="#10b981" stroke-width="8" stroke-linecap="round"/>
  
  <rect x="780" y="410" width="380" height="120" rx="16" fill="#f59e0b" opacity="0.1" stroke="#f59e0b" stroke-width="2"/>

  <!-- Brand Section Left -->
  <g transform="translate(80 180) scale(.35)">
    ${markSvg().replace(/^[\s\S]*?<defs>/, '<defs>').replace('</svg>', '')}
  </g>
  
  <text x="80" y="400" fill="#ffffff" font-family="Arial, Helvetica, sans-serif" font-size="52" font-weight="900" letter-spacing="-1">${brand.name}</text>
  <text x="80" y="460" fill="url(#textGlow)" font-family="Arial, Helvetica, sans-serif" font-size="36" font-weight="800">The Offline AI Brain</text>
  <text x="80" y="510" fill="#94a3b8" font-family="Arial, Helvetica, sans-serif" font-size="26" font-weight="600">Built for Bangladesh MSMEs</text>
</svg>`
}

async function writeText(name, content) {
  await writeFile(path.join(publicDir, name), content, 'utf8')
}

async function pngBufferFromSvg(svg, width, height = width) {
  return sharp(Buffer.from(svg)).resize(width, height).png().toBuffer()
}

async function writePngFromSvg(name, svg, width, height = width) {
  await writeFile(path.join(publicDir, name), await pngBufferFromSvg(svg, width, height))
}

function icoFromPngBuffers(images) {
  const headerSize = 6
  const directorySize = images.length * 16
  const header = Buffer.alloc(headerSize + directorySize)
  header.writeUInt16LE(0, 0)
  header.writeUInt16LE(1, 2)
  header.writeUInt16LE(images.length, 4)

  let offset = headerSize + directorySize
  images.forEach(({ size, buffer }, index) => {
    const entryOffset = headerSize + index * 16
    header.writeUInt8(size >= 256 ? 0 : size, entryOffset)
    header.writeUInt8(size >= 256 ? 0 : size, entryOffset + 1)
    header.writeUInt8(0, entryOffset + 2)
    header.writeUInt8(0, entryOffset + 3)
    header.writeUInt16LE(1, entryOffset + 4)
    header.writeUInt16LE(32, entryOffset + 6)
    header.writeUInt32LE(buffer.length, entryOffset + 8)
    header.writeUInt32LE(offset, entryOffset + 12)
    offset += buffer.length
  })

  return Buffer.concat([header, ...images.map((image) => image.buffer)])
}

async function main() {
  await mkdir(publicDir, { recursive: true })

  const icon = markSvg()
  const logo = siteLogoSvg()
  const og = ogImageSvg()

  await writeText('favicon.svg', icon)
  await writeText('safari-pinned-tab.svg', maskIconSvg())
  await writeText('site-logo.svg', logo)
  await writeText('og-image.svg', og)

  await writePngFromSvg('favicon-16x16.png', icon, 16)
  await writePngFromSvg('favicon-32x32.png', icon, 32)
  await writePngFromSvg('favicon-48x48.png', icon, 48)
  await writeFile(
    path.join(publicDir, 'favicon.ico'),
    icoFromPngBuffers([
      { size: 16, buffer: await pngBufferFromSvg(icon, 16) },
      { size: 32, buffer: await pngBufferFromSvg(icon, 32) },
      { size: 48, buffer: await pngBufferFromSvg(icon, 48) },
    ]),
  )
  await writePngFromSvg('apple-touch-icon.png', icon, 180)
  await writePngFromSvg('android-chrome-192x192.png', icon, 192)
  await writePngFromSvg('android-chrome-512x512.png', icon, 512)
  await writePngFromSvg('mstile-150x150.png', icon, 150)
  await writePngFromSvg('og-image.png', og, 1200, 630)

  console.log('Generated Premium EquiPulse AI brand assets in public/.')
}

await main()
