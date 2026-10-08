'use client'

import { useState, useMemo } from 'react'
import type { TriageQueueItem } from '@/services/vitalsLogsService'
import { checkVitalsRanges } from '@/lib/utils/vitalsThresholds'
import { TriageFilterTabs, type TriageFilter } from './TriageFilterTabs'
import { TriageQueueItemCard } from './TriageQueueItemCard'
import { Activity, CheckCircle2, AlertCircle, Search, X } from 'lucide-react'

interface TriageQueueListProps {
  items: TriageQueueItem[]
}

export function TriageQueueList({ items }: TriageQueueListProps) {
  const [searchQuery, setSearchQuery] = useState('')

  const counts = useMemo(() => {
    const needsReview = items.filter(
      (item) => !item.medical_reviews || item.medical_reviews.length === 0
    ).length

    const flagged = items.filter((item) => {
      const assessment = checkVitalsRanges({
        heart_rate: item.heart_rate,
        spo2: item.spo2,
        bp_systolic: item.bp_systolic,
        bp_diastolic: item.bp_diastolic,
        temperature_c: item.temperature_c,
      })
      return assessment.isFlagged
    }).length

    return {
      total: items.length,
      needsReview,
      flagged,
    }
  }, [items])

  const [filter, setFilter] = useState<TriageFilter>(
    counts.needsReview > 0 ? 'needs_review' : 'all'
  )

  const filteredItems = useMemo(() => {
    let result = items

    // 1. Filter by category tab
    switch (filter) {
      case 'needs_review':
        result = result.filter(
          (item) => !item.medical_reviews || item.medical_reviews.length === 0
        )
        break
      case 'flagged':
        result = result.filter((item) => {
          const assessment = checkVitalsRanges({
            heart_rate: item.heart_rate,
            spo2: item.spo2,
            bp_systolic: item.bp_systolic,
            bp_diastolic: item.bp_diastolic,
            temperature_c: item.temperature_c,
          })
          return assessment.isFlagged
        })
        break
      case 'all':
      default:
        break
    }

    // 2. Filter by search query (patient name, caregiver name, or clinical notes)
    const q = searchQuery.trim().toLowerCase()
    if (q) {
      result = result.filter((item) => {
        const patientName = item.patient?.full_name?.toLowerCase() || ''
        const caregiverName = item.caregiver?.full_name?.toLowerCase() || ''
        const notes = item.notes?.toLowerCase() || ''
        return patientName.includes(q) || caregiverName.includes(q) || notes.includes(q)
      })
    }

    return result
  }, [items, filter, searchQuery])

  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-12 text-center shadow-sm">
        <Activity className="mx-auto h-12 w-12 text-gray-300" />
        <h3 className="mt-3 text-base font-bold text-gray-900">No Vitals in Triage Queue</h3>
        <p className="mt-1 text-xs text-gray-500 max-w-sm mx-auto">
          There are currently no vitals logs recorded for patients on your active care teams.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Search Input */}
      <div className="relative">
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-gray-400">
          <Search className="h-4 w-4" />
        </div>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by patient name, caregiver, or clinical notes..."
          className="w-full rounded-xl border border-gray-300 bg-white pl-10 pr-10 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 shadow-xs transition-colors"
          aria-label="Search triage queue"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            aria-label="Clear search"
            className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Interactive Filter Tabs */}
      <TriageFilterTabs
        activeFilter={filter}
        onFilterChange={setFilter}
        counts={counts}
      />

      {/* Triage Items List */}
      {filteredItems.length === 0 ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center shadow-sm">
          {searchQuery.trim().length > 0 ? (
            <div className="space-y-3">
              <Search className="mx-auto h-10 w-10 text-gray-300" />
              <div>
                <h3 className="text-sm font-bold text-gray-900">No matching triage logs</h3>
                <p className="mt-1 text-xs text-gray-500 max-w-sm mx-auto">
                  No vitals logs found matching &ldquo;{searchQuery}&rdquo;. Try checking the spelling or clearing your search.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
                <span>Clear search</span>
              </button>
            </div>
          ) : filter === 'needs_review' ? (
            <>
              <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-500" />
              <h3 className="mt-2 text-sm font-bold text-gray-900">Queue is Clear!</h3>
              <p className="mt-0.5 text-xs text-gray-500">
                All patient vitals logs in your queue have been clinically reviewed.
              </p>
            </>
          ) : filter === 'flagged' ? (
            <>
              <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-500" />
              <h3 className="mt-2 text-sm font-bold text-gray-900">No Flagged Measurements</h3>
              <p className="mt-0.5 text-xs text-gray-500">
                No recent vitals measurements currently fall outside typical baseline ranges.
              </p>
            </>
          ) : (
            <>
              <AlertCircle className="mx-auto h-10 w-10 text-gray-300" />
              <h3 className="mt-2 text-sm font-bold text-gray-900">No Logs Found</h3>
            </>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredItems.map((item) => (
            <TriageQueueItemCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  )
}
