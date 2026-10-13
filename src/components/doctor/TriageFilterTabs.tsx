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
    <div className="flex flex-wrap items-center gap-2 border-b border-slate-200/80 pb-3">
      <button
        type="button"
        onClick={() => onFilterChange('needs_review')}
        className={`flex items-center gap-2 rounded-xl px-4 py-2.5 min-h-[44px] text-sm sm:text-base font-bold transition-all duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5B5FE8] focus-visible:ring-offset-2 ${
          activeFilter === 'needs_review'
            ? 'bg-[#5B5FE8] text-white shadow-sm shadow-[#5B5FE8]/25'
            : 'bg-white text-slate-700 hover:bg-[#EEF0FF]/40 hover:border-[#5B5FE8]/40 border border-slate-200/80'
        }`}
      >
        <Clock className="h-4 w-4" />
        <span>Needs Review</span>
        <span
          className={`rounded-full px-2.5 py-0.5 text-xs sm:text-sm font-bold ${
            activeFilter === 'needs_review'
              ? 'bg-white/20 text-white'
              : 'bg-[#EEF0FF] text-[#5B5FE8]'
          }`}
        >
          {counts.needsReview}
        </span>
      </button>

      <button
        type="button"
        onClick={() => onFilterChange('flagged')}
        className={`flex items-center gap-2 rounded-xl px-4 py-2.5 min-h-[44px] text-sm sm:text-base font-bold transition-all duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F5A524] focus-visible:ring-offset-2 ${
          activeFilter === 'flagged'
            ? 'bg-[#F5A524] text-white shadow-sm shadow-[#F5A524]/25'
            : 'bg-white text-slate-700 hover:bg-[#FFFBEB] hover:border-[#F5A524]/40 border border-slate-200/80'
        }`}
      >
        <AlertCircle className="h-4 w-4" />
        <span>Flagged Readings</span>
        <span
          className={`rounded-full px-2.5 py-0.5 text-xs sm:text-sm font-bold ${
            activeFilter === 'flagged'
              ? 'bg-white/20 text-white'
              : 'bg-[#FFFBEB] text-[#B45309]'
          }`}
        >
          {counts.flagged}
        </span>
      </button>

      <button
        type="button"
        onClick={() => onFilterChange('all')}
        className={`flex items-center gap-2 rounded-xl px-4 py-2.5 min-h-[44px] text-sm sm:text-base font-bold transition-all duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5B5FE8] focus-visible:ring-offset-2 ${
          activeFilter === 'all'
            ? 'bg-[#1E2243] text-white shadow-sm'
            : 'bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-300 border border-slate-200/80'
        }`}
      >
        <ListFilter className="h-4 w-4" />
        <span>All Logs</span>
        <span
          className={`rounded-full px-2.5 py-0.5 text-xs sm:text-sm font-bold ${
            activeFilter === 'all'
              ? 'bg-white/20 text-white'
              : 'bg-slate-100 text-slate-700'
          }`}
        >
          {counts.total}
        </span>
      </button>
    </div>
  )
}
