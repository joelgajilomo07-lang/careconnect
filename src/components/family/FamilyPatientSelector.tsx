'use client'

import Link from 'next/link'
import type { FamilyPatientItem } from '@/services/careTeamsService'
import { User, CheckCircle2, AlertTriangle, AlertCircle, Info } from 'lucide-react'

interface FamilyPatientSelectorProps {
  patients: FamilyPatientItem[]
  selectedPatientId: string
}

export function FamilyPatientSelector({
  patients,
  selectedPatientId,
}: FamilyPatientSelectorProps) {
  if (patients.length <= 1) {
    // If only 1 patient, show a clean header indicator rather than a switcher
    const p = patients[0]
    if (!p) return null

    return (
      <div className="flex items-center gap-3 rounded-2xl border border-amber-200/80 bg-amber-50/40 p-4 sm:p-5">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-100 text-amber-800 font-bold">
          <User className="h-6 w-6" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-base font-black text-[#1E2243]">{p.fullName}</span>
            {p.relationshipLabel && (
              <span className="rounded-md bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-800">
                {p.relationshipLabel}
              </span>
            )}
          </div>
          {p.primaryCondition && (
            <p className="text-sm font-medium text-slate-500 mt-0.5">Condition: {p.primaryCondition}</p>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-500">
          Select Loved One ({patients.length} active profiles)
        </span>
        <span className="text-xs text-slate-400 font-medium">
          Switch patient view
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {patients.map((p) => {
          const isSelected = p.patientId === selectedPatientId
          const status = p.currentStatus || 'unassessed'

          const statusBadge = {
            stable: {
              label: 'Stable',
              icon: CheckCircle2,
              className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
            },
            warning: {
              label: 'Warning',
              icon: AlertTriangle,
              className: 'bg-amber-50 text-amber-700 border-amber-200',
            },
            critical: {
              label: 'Critical',
              icon: AlertCircle,
              className: 'bg-red-50 text-red-700 border-red-200',
            },
            unassessed: {
              label: 'Monitoring',
              icon: Info,
              className: 'bg-gray-50 text-gray-600 border-gray-200',
            },
          }[status]

          const StatusIcon = statusBadge.icon

          return (
            <Link
              key={p.patientId}
              href={`/family?patientId=${p.patientId}`}
              className={`flex items-start justify-between rounded-xl border p-4 sm:p-5 transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 ${
                isSelected
                  ? 'border-amber-500 bg-amber-50/60 shadow-sm ring-1 ring-amber-500'
                  : 'border-gray-200 bg-white hover:border-amber-300 hover:bg-amber-50/30'
              }`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl font-bold transition-colors ${
                    isSelected
                      ? 'bg-amber-600 text-white shadow-sm'
                      : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  <User className="h-6 w-6" />
                </div>
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-base font-black text-[#1E2243] leading-snug">
                      {p.fullName}
                    </span>
                    {isSelected && (
                      <span className="rounded-full bg-amber-200 px-2.5 py-0.5 text-xs font-bold text-amber-900">
                        Active View
                      </span>
                    )}
                  </div>
                  {p.relationshipLabel && (
                    <span className="inline-block text-xs font-bold text-amber-800 bg-amber-100/70 px-2 py-0.5 rounded">
                      {p.relationshipLabel}
                    </span>
                  )}
                  {p.primaryCondition && (
                    <p className="text-sm text-slate-500 line-clamp-1 font-medium">
                      {p.primaryCondition}
                    </p>
                  )}
                </div>
              </div>

              <span
                className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-bold border ${statusBadge.className}`}
              >
                <StatusIcon className="h-3.5 w-3.5" />
                <span className="capitalize">{statusBadge.label}</span>
              </span>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
