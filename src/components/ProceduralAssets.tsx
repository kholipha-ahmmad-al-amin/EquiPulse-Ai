import { useId, type SVGProps } from 'react'

type SvgBaseProps = Omit<SVGProps<SVGSVGElement>, 'role'>

function svgId(prefix: string, reactId: string) {
  return `${prefix}-${reactId.replace(/:/g, '')}`
}

export function EquiMascot({
  className,
  title = 'EquiPulse cooperative mascot',
  ...props
}: SvgBaseProps & { title?: string }) {
  const reactId = useId()
  const titleId = svgId('mascot-title', reactId)
  const bodyGradientId = svgId('mascot-body', reactId)
  const signalGradientId = svgId('mascot-signal', reactId)

  return (
    <svg
      aria-labelledby={titleId}
      className={className}
      role="img"
      viewBox="0 0 220 220"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <title id={titleId}>{title}</title>
      <defs>
        <linearGradient id={bodyGradientId} x1="50" x2="170" y1="42" y2="178">
          <stop stopColor="rgb(var(--color-success))" />
          <stop offset="0.52" stopColor="rgb(var(--color-accent))" />
          <stop offset="1" stopColor="rgb(var(--color-ink))" />
        </linearGradient>
        <radialGradient id={signalGradientId} cx="50%" cy="50%" r="50%">
          <stop stopColor="rgb(var(--color-accent))" stopOpacity="0.75" />
          <stop offset="1" stopColor="rgb(var(--color-accent))" stopOpacity="0" />
        </radialGradient>
      </defs>

      <circle cx="110" cy="110" fill="rgb(var(--color-muted))" r="96" />
      <circle cx="110" cy="110" fill={`url(#${signalGradientId})`} r="74">
        <animate attributeName="r" dur="2.8s" repeatCount="indefinite" values="58;78;58" />
        <animate
          attributeName="opacity"
          dur="2.8s"
          repeatCount="indefinite"
          values="0.42;0.12;0.42"
        />
      </circle>

      <g className="animate-float">
        <path
          d="M66 120c0-36 20-64 44-64s44 28 44 64v22c0 20-18 36-44 36s-44-16-44-36v-22Z"
          fill={`url(#${bodyGradientId})`}
        />
        <circle cx="110" cy="80" fill="rgb(var(--color-surface))" r="34" />
        <path
          d="M84 78c8-18 19-28 34-30 17 4 28 16 34 35-20-8-43-10-68-5Z"
          fill="rgb(var(--color-ink))"
        />
        <circle cx="98" cy="84" fill="rgb(var(--color-ink))" r="4" />
        <circle cx="122" cy="84" fill="rgb(var(--color-ink))" r="4" />
        <path
          d="M101 100c5 5 13 5 18 0"
          fill="none"
          stroke="rgb(var(--color-ink))"
          strokeLinecap="round"
          strokeWidth="5"
        />
        <path
          d="M71 126c-16-8-26-20-30-36"
          fill="none"
          stroke="rgb(var(--color-success))"
          strokeLinecap="round"
          strokeWidth="10"
        />
        <path
          d="M149 126c16-8 26-20 30-36"
          fill="none"
          stroke="rgb(var(--color-success))"
          strokeLinecap="round"
          strokeWidth="10"
        />
        <rect
          fill="rgb(var(--color-surface))"
          height="38"
          rx="8"
          stroke="rgb(var(--color-line))"
          strokeWidth="3"
          width="76"
          x="72"
          y="120"
        />
        <path
          d="M92 140h36"
          stroke="rgb(var(--color-focus))"
          strokeLinecap="round"
          strokeWidth="6"
        />
      </g>

      {[
        [58, 58],
        [162, 58],
        [45, 160],
        [175, 160],
      ].map(([cx, cy], index) => (
        <g key={`${cx}-${cy}`}>
          <circle
            cx={cx}
            cy={cy}
            fill="rgb(var(--color-accent))"
            r="7"
            className={index % 2 === 0 ? 'animate-pulse-soft' : undefined}
          />
          <path
            d={`M${cx} ${cy} L110 110`}
            stroke="rgb(var(--color-line))"
            strokeDasharray="3 7"
            strokeLinecap="round"
            strokeWidth="2"
          />
        </g>
      ))}
    </svg>
  )
}

export type ShelfLevel = {
  capacity: number
  filled: number
  label: string
}

const defaultShelfLevels: ShelfLevel[] = [
  { label: 'Rice', capacity: 6, filled: 5 },
  { label: 'Oil', capacity: 6, filled: 3 },
  { label: 'Feed', capacity: 6, filled: 2 },
  { label: 'Seed', capacity: 6, filled: 4 },
]

export function AnimatedInventoryShelf({
  className,
  levels = defaultShelfLevels,
  title = 'Dynamic inventory shelf',
  ...props
}: SvgBaseProps & { levels?: ShelfLevel[]; title?: string }) {
  const reactId = useId()
  const titleId = svgId('shelf-title', reactId)
  const fillGradientId = svgId('shelf-fill', reactId)
  const safeLevels = levels.map((level) => ({
    ...level,
    capacity: Math.max(1, level.capacity),
    filled: Math.min(Math.max(0, level.filled), Math.max(1, level.capacity)),
  }))

  return (
    <svg
      aria-labelledby={titleId}
      className={className}
      role="img"
      viewBox="0 0 280 190"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <title id={titleId}>{title}</title>
      <defs>
        <linearGradient id={fillGradientId} x1="0" x2="1" y1="1" y2="0">
          <stop stopColor="rgb(var(--color-success))" />
          <stop offset="1" stopColor="rgb(var(--color-accent))" />
        </linearGradient>
      </defs>

      <rect fill="rgb(var(--color-surface-strong))" height="174" rx="10" width="264" x="8" y="8" />
      <path
        d="M24 150h232M24 112h232M24 74h232M24 36h232"
        stroke="rgb(var(--color-line))"
        strokeLinecap="round"
        strokeWidth="2"
      />

      {safeLevels.map((level, shelfIndex) => {
        const x = 33 + shelfIndex * 58
        const cellHeight = 16
        const gap = 4

        return (
          <g key={level.label}>
            {Array.from({ length: level.capacity }, (_, cellIndex) => {
              const y = 142 - cellIndex * (cellHeight + gap)
              const isFilled = cellIndex < level.filled

              return (
                <rect
                  fill={isFilled ? `url(#${fillGradientId})` : 'rgb(var(--color-surface))'}
                  height={cellHeight}
                  key={`${level.label}-${cellIndex}`}
                  opacity={isFilled ? 1 : 0.62}
                  rx="4"
                  stroke="rgb(var(--color-line))"
                  width="34"
                  x={x}
                  y={y}
                >
                  {isFilled ? (
                    <animate
                      attributeName="opacity"
                      begin={`${shelfIndex * 0.18}s`}
                      dur="1.8s"
                      repeatCount="indefinite"
                      values="0.72;1;0.72"
                    />
                  ) : null}
                </rect>
              )
            })}
            <text
              fill="rgb(var(--color-ink-soft))"
              fontSize="10"
              fontWeight="700"
              textAnchor="middle"
              x={x + 17}
              y="170"
            >
              {level.label}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

export type MedalTone = 'gold' | 'green' | 'blue'

export type Medal = {
  label: string
  score: string
  tone: MedalTone
}

const toneStops: Record<MedalTone, [string, string]> = {
  gold: ['rgb(var(--color-accent))', 'rgb(var(--color-warning))'],
  green: ['rgb(var(--color-success))', 'rgb(var(--color-accent))'],
  blue: ['rgb(var(--color-focus))', 'rgb(var(--color-ink))'],
}

export function AchievementMedal({
  className,
  label,
  score,
  tone,
  ...props
}: SvgBaseProps & Medal) {
  const reactId = useId()
  const titleId = svgId('medal-title', reactId)
  const medalGradientId = svgId('medal-gradient', reactId)
  const shineGradientId = svgId('medal-shine', reactId)
  const [start, end] = toneStops[tone]

  return (
    <svg
      aria-labelledby={titleId}
      className={`group overflow-visible ${className ?? ''}`}
      role="img"
      viewBox="0 0 120 140"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <title id={titleId}>
        {label}: {score}
      </title>
      <defs>
        <linearGradient id={medalGradientId} x1="20" x2="100" y1="16" y2="118">
          <stop stopColor={start} />
          <stop offset="1" stopColor={end} />
        </linearGradient>
        <linearGradient id={shineGradientId} x1="0" x2="1" y1="0" y2="0">
          <stop stopColor="white" stopOpacity="0" />
          <stop offset="0.5" stopColor="white" stopOpacity="0.62" />
          <stop offset="1" stopColor="white" stopOpacity="0" />
        </linearGradient>
      </defs>

      <path
        d="M42 14h36l-10 34H52L42 14Z"
        fill="rgb(var(--color-ink))"
        opacity="0.9"
      />
      <circle
        className="transition duration-base ease-standard group-hover:scale-105"
        cx="60"
        cy="74"
        fill={`url(#${medalGradientId})`}
        r="42"
        stroke="rgb(var(--color-surface))"
        strokeWidth="5"
      />
      <path
        className="transition duration-base ease-standard group-hover:opacity-100"
        d="M32 45h56v58H32z"
        fill={`url(#${shineGradientId})`}
        opacity="0"
      />
      <path
        d="m60 47 8 17 18 3-13 13 3 18-16-9-16 9 3-18-13-13 18-3 8-17Z"
        fill="rgb(var(--color-surface))"
        opacity="0.9"
      />
      <text
        fill="rgb(var(--color-ink))"
        fontSize="13"
        fontWeight="800"
        textAnchor="middle"
        x="60"
        y="126"
      >
        {score}
      </text>
      <text
        fill="rgb(var(--color-ink-soft))"
        fontSize="9"
        fontWeight="700"
        textAnchor="middle"
        x="60"
        y="138"
      >
        {label}
      </text>
    </svg>
  )
}

export function AchievementMedals({
  className,
  medals,
}: {
  className?: string
  medals: Medal[]
}) {
  return (
    <div className={`grid grid-cols-3 gap-3 ${className ?? ''}`}>
      {medals.map((medal) => (
        <AchievementMedal
          className="h-auto w-full cursor-default transition duration-base ease-standard hover:-translate-y-1"
          key={`${medal.label}-${medal.score}`}
          {...medal}
        />
      ))}
    </div>
  )
}
