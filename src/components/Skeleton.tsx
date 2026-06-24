import { motion } from 'framer-motion'

export function Skeleton({ className }: { className?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0.5 }}
      animate={{ opacity: 1 }}
      transition={{ repeat: Infinity, duration: 1, ease: 'easeInOut', repeatType: 'reverse' }}
      className={`bg-surface-strong/80 rounded-xl ${className}`}
    />
  )
}

export function SkeletonCard() {
  return (
    <div className="rounded-2xl border border-line bg-surface p-6 shadow-sm">
      <Skeleton className="h-5 w-1/3 mb-4" />
      <Skeleton className="h-8 w-1/2 mb-6" />
      <div className="space-y-3">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-4 w-4/6" />
      </div>
    </div>
  )
}
