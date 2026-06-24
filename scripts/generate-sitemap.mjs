import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const BASE_URL = 'https://smepulse.equisaas-bd.com'

// Static routes for public SEO
const routes = [
  '/',
  '/home',
  '/pitch-guide',
  '/presentation'
]

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  ${routes.map(route => `
  <url>
    <loc>${BASE_URL}${route === '/' ? '' : route}</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>${route === '/home' ? 'daily' : 'weekly'}</changefreq>
    <priority>${route === '/' || route === '/home' ? '1.0' : '0.8'}</priority>
  </url>
  `).join('')}
</urlset>`

const robotsTxt = `User-agent: *
Allow: /

Sitemap: ${BASE_URL}/sitemap.xml
`

// Output paths inside the 'public' directory
const publicDir = path.resolve(__dirname, '../public')

if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true })
}

fs.writeFileSync(path.join(publicDir, 'sitemap.xml'), sitemap.trim())
fs.writeFileSync(path.join(publicDir, 'robots.txt'), robotsTxt.trim())

console.log('✅ Generated sitemap.xml and robots.txt in /public directory')
