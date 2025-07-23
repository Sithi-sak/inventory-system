import type { Metadata } from 'next'
import { Suspense } from 'react'
import { ReportsContent } from '@/components/reports-content'

export const metadata: Metadata = {
  title: 'Reports - LSTS',
}

export default function ReportsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Reports</h1>
        <p className="text-muted-foreground">
          Monthly summaries and business analytics
        </p>
      </div>
      
      <Suspense fallback={<ReportsSkeleton />}>
        <ReportsContent />
      </Suspense>
    </div>
  )
}

function ReportsSkeleton() {
  return (
    <div className="space-y-6">
      {/* Month Selector Skeleton */}
      <div className="flex items-center gap-4">
        <div className="h-10 w-48 bg-muted animate-pulse rounded" />
        <div className="h-10 w-24 bg-muted animate-pulse rounded" />
      </div>
      
      {/* Summary Cards Skeleton */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-lg border bg-card p-6">
            <div className="h-4 w-20 bg-muted animate-pulse rounded mb-2" />
            <div className="h-8 w-24 bg-muted animate-pulse rounded mb-2" />
            <div className="h-3 w-16 bg-muted animate-pulse rounded" />
          </div>
        ))}
      </div>
      
      {/* Charts Skeleton */}
      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-lg border bg-card p-6">
          <div className="h-6 w-32 bg-muted animate-pulse rounded mb-4" />
          <div className="h-64 bg-muted animate-pulse rounded" />
        </div>
        <div className="rounded-lg border bg-card p-6">
          <div className="h-6 w-32 bg-muted animate-pulse rounded mb-4" />
          <div className="h-64 bg-muted animate-pulse rounded" />
        </div>
      </div>
    </div>
  )
}