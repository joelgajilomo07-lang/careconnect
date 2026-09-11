'use client'

import { AlertCircle, Clock, ListFilter } from 'lucide-react'

export type TriageFilter = 'needs_review' | 'flagged' | 'all'

interface TriageFilterTabsProps {
  activeFilter: TriageFilter
  onFilterChange: (filter: TriageFilter) => void
  counts: {
    total: number
    needsReview: number
    flagged: number
  }
}

export function TriageFilterTabs({
  activeFilter,
  onFilterChange,
  counts,
}: TriageFilterTabsProps) {
  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-gray-200 pb-3">
      <button
        type="button"
        onClick={() => onFilterChange('needs_review')}
        className={`flex items-center gap-2 rounded-xl px-4 py-2.5 min-h-[44px] text-xs sm:text-sm font-bold transition-all duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2 ${
          activeFilter === 'needs_review'
            ? 'bg-blue-600 text-white shadow-sm'
            : 'bg-white text-gray-700 hover:bg-gray-100 hover:border-gray-300 border border-gray-200'
        }`}
      >
        <Clock className="h-4 w-4" />
        <span>Needs Review</span>
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
            activeFilter === 'needs_review'
              ? 'bg-blue-500 text-white'
              : 'bg-blue-50 text-blue-700'
          }`}
        >
          {counts.needsReview}
        </span>
      </button>

      <button
        type="button"
        onClick={() => onFilterChange('flagged')}
        className={`flex items-center gap-2 rounded-xl px-4 py-2.5 min-h-[44px] text-xs sm:text-sm font-bold transition-all duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2 ${
          activeFilter === 'flagged'
            ? 'bg-amber-600 text-white shadow-sm'
            : 'bg-white text-gray-700 hover:bg-gray-100 hover:border-gray-300 border border-gray-200'
        }`}
      >
        <AlertCircle className="h-4 w-4" />
        <span>Flagged Readings</span>
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
            activeFilter === 'flagged'
              ? 'bg-amber-500 text-white'
              : 'bg-amber-50 text-amber-800'
          }`}
        >
          {counts.flagged}
        </span>
      </button>

      <button
        type="button"
        onClick={() => onFilterChange('all')}
        className={`flex items-center gap-2 rounded-xl px-4 py-2.5 min-h-[44px] text-xs sm:text-sm font-bold transition-all duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2 ${
          activeFilter === 'all'
            ? 'bg-gray-900 text-white shadow-sm'
            : 'bg-white text-gray-700 hover:bg-gray-100 hover:border-gray-300 border border-gray-200'
        }`}
      >
        <ListFilter className="h-4 w-4" />
        <span>All Logs</span>
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
            activeFilter === 'all'
              ? 'bg-gray-700 text-white'
              : 'bg-gray-100 text-gray-700'
          }`}
        >
          {counts.total}
        </span>
      </button>
    </div>
  )
}
