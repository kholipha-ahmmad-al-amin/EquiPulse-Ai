import { useId, type SVGProps } from 'react'

function scopedId(prefix: string, id: string) {
  return `${prefix}-${id.replace(/:/g, '')}`
}

export function BrandMark({
  className,
  title = 'SME Pulse brand mark',
  ...props
}: SVGProps<SVGSVGElement> & { title?: string }) {
  const id = useId()
  const titleId = scopedId('brand-mark-title', id)
  const bgId = scopedId('brand-mark-bg', id)
  const pulseId = scopedId('brand-mark-pulse', id)
  const shadowId = scopedId('brand-mark-shadow', id)

  return (
    <svg
      aria-labelledby={titleId}
      className={className}
      role="img"
      viewBox="0 0 512 512"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <title id={titleId}>{title}</title>
      <defs>
        <linearGradient id={bgId} x1="64" x2="448" y1="48" y2="464">
          <stop stopColor="#0f172a" />
          <stop offset="0.58" stopColor="#14233f" />
          <stop offset="1" stopColor="#052e1a" />
        </linearGradient>
        <linearGradient id={pulseId} x1="96" x2="426" y1="344" y2="156">
          <stop stopColor="#22c55e" />
          <stop offset="0.52" stopColor="#facc15" />
          <stop offset="1" stopColor="#38bdf8" />
        </linearGradient>
        <filter id={shadowId} x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow
            dx="0"
            dy="18"
            floodColor="#020617"
            floodOpacity="0.42"
            stdDeviation="18"
          />
        </filter>
      </defs>
      <rect fill={`url(#${bgId})`} height="512" rx="112" width="512" />
      <circle cx="120" cy="300" fill="#22c55e" opacity="0.22" r="52" />
      <circle cx="394" cy="184" fill="#38bdf8" opacity="0.18" r="72" />
      <path
        d="M86 322h63l38-94 68 161 72-238 38 126h62"
        fill="none"
        filter={`url(#${shadowId})`}
        stroke={`url(#${pulseId})`}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="34"
      />
      <circle cx="149" cy="322" fill="#f8fafc" r="24" />
      <circle cx="255" cy="389" fill="#facc15" r="24" />
      <circle cx="365" cy="277" fill="#22c55e" r="24" />
      <path
        d="M160 150c38-32 93-46 146-30 41 12 72 39 92 74"
        fill="none"
        opacity="0.88"
        stroke="#f8fafc"
        strokeLinecap="round"
        strokeWidth="18"
      />
      <path
        d="M132 388c70 58 174 60 246 4"
        fill="none"
        opacity="0.74"
        stroke="#f8fafc"
        strokeLinecap="round"
        strokeWidth="18"
      />
    </svg>
  )
}

import { PackageSearch } from 'lucide-react'

export function BrandLogo({ className = '' }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="relative flex h-8 w-8 items-center justify-center rounded-lg bg-accent shadow-sm">
        <PackageSearch className="text-surface" size={18} strokeWidth={2.5} />
      </div>
      <div className="flex flex-col">
        <span className="font-heading text-lg font-black tracking-tight leading-none text-ink">
          Equi<span className="text-accent">Pulse</span>
        </span>
        <span className="text-[10px] font-bold tracking-widest text-ink-soft uppercase mt-0.5">
          Enterprise ERP
        </span>
      </div>
    </div>
  )
}
