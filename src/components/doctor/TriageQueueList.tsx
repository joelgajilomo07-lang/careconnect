'use client'

import { useState, useMemo } from 'react'
import type { TriageQueueItem } from '@/services/vitalsLogsService'
import { checkVitalsRanges } from '@/lib/utils/vitalsThresholds'
import { TriageFilterTabs, type TriageFilter } from './TriageFilterTabs'
import { TriageQueueItemCard } from './TriageQueueItemCard'
import { Activity, CheckCircle2, AlertCircle } from 'lucide-react'

interface TriageQueueListProps {
  items: TriageQueueItem[]
}

export function TriageQueueList({ items }: TriageQueueListProps) {
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
    switch (filter) {
      case 'needs_review':
        return items.filter(
          (item) => !item.medical_reviews || item.medical_reviews.length === 0
        )
      case 'flagged':
        return items.filter((item) => {
          const assessment = checkVitalsRanges({
            heart_rate: item.heart_rate,
            spo2: item.spo2,
            bp_systolic: item.bp_systolic,
            bp_diastolic: item.bp_diastolic,
            temperature_c: item.temperature_c,
          })
          return assessment.isFlagged
        })
      case 'all':
      default:
        return items
    }
  }, [items, filter])

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
    <div className="space-y-5">
      {/* Interactive Filter Tabs */}
      <TriageFilterTabs
        activeFilter={filter}
        onFilterChange={setFilter}
        counts={counts}
      />

      {/* Triage Items List */}
      {filteredItems.length === 0 ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center shadow-sm">
          {filter === 'needs_review' ? (
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
