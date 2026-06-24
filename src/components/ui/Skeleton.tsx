import { motion } from 'framer-motion'

export function Skeleton({ className = '' }: { className?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0.5 }}
      animate={{ opacity: 1 }}
      transition={{
        repeat: Infinity,
        repeatType: 'reverse',
        duration: 1,
        ease: 'easeInOut'
      }}
      className={`bg-surface-strong/50 rounded-xl overflow-hidden relative ${className}`}
    >
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-surface-strong/40 to-transparent z-10" />
    </motion.div>
  )
}

export function DashboardSkeleton() {
  return (
    <div className="w-full h-[calc(100vh-140px)] flex flex-col lg:flex-row gap-6 p-4 animate-fade-in">
      {/* Sidebar/Main Area Skeleton */}
      <div className="flex-1 flex flex-col gap-4">
        {/* Top Banner Skeleton */}
        <Skeleton className="h-20 w-full rounded-2xl" />
        
        {/* Grid Area Skeleton */}
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 flex-1">
          {Array.from({ length: 12 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-2xl" />
          ))}
        </div>
      </div>

      {/* Right Panel Skeleton (e.g. Cart/Summary) */}
      <div className="w-full lg:w-[400px] flex flex-col gap-4 shrink-0">
        <Skeleton className="h-16 w-full rounded-2xl" />
        <Skeleton className="flex-1 rounded-2xl" />
        <Skeleton className="h-40 w-full rounded-2xl" />
      </div>
    </div>
  )
}
