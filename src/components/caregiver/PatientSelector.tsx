'use client'

import Link from 'next/link'
import { Users } from 'lucide-react'

interface AssignedPatient {
  patientId: string
  fullName: string
  primaryCondition: string | null
  currentStatus: 'stable' | 'warning' | 'critical' | 'unassessed' | null
  relationshipLabel: string | null
}

interface PatientSelectorProps {
  patients: AssignedPatient[]
  currentPatientId: string
}

export function PatientSelector({ patients, currentPatientId }: PatientSelectorProps) {
  if (patients.length <= 1) {
    const p = patients[0]
    if (!p) return null

    return (
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs sm:text-sm font-bold uppercase tracking-wider text-[#5B5FE8]">
              Assigned Patient
            </span>
            {p.relationshipLabel && (
              <span className="text-sm text-slate-400 font-medium">
                • {p.relationshipLabel}
              </span>
            )}
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-[#1E2243] mt-0.5">{p.fullName}</h2>
          <p className="text-sm font-medium text-slate-500">
            Condition: {p.primaryCondition || 'None documented'}
          </p>
        </div>

        {p.currentStatus && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-400 font-medium">Doctor-set status:</span>
            <span
              className={`inline-flex items-center rounded-full px-3 py-1 text-xs sm:text-sm font-bold uppercase tracking-wider ${
                p.currentStatus === 'critical'
                  ? 'bg-[#F25F5C]/10 text-[#B91C1C] ring-1 ring-[#F25F5C]/30'
                  : p.currentStatus === 'warning'
                  ? 'bg-[#F5A524]/10 text-[#B45309] ring-1 ring-[#F5A524]/30'
                  : p.currentStatus === 'stable'
                  ? 'bg-[#2DD4BF]/10 text-[#0F766E] ring-1 ring-[#2DD4BF]/30'
                  : 'bg-slate-100 text-slate-600'
              }`}
            >
              {p.currentStatus}
            </span>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-sm space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
          <Users className="h-4 w-4 text-[#5B5FE8]" />
          Select Patient ({patients.length} Assigned)
        </label>
        <span className="text-sm text-slate-400 font-medium">Click to switch timeline</span>
      </div>

      <div className="flex flex-wrap gap-2">
        {patients.map((p) => {
          const isSelected = p.patientId === currentPatientId
          return (
            <Link
              key={p.patientId}
              href={`/history?patientId=${p.patientId}`}
              className={`flex items-center gap-2.5 rounded-xl border min-h-[44px] px-4 py-2 text-sm font-semibold transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5B5FE8] focus-visible:ring-offset-1 ${
                isSelected
                  ? 'border-2 border-[#5B5FE8] bg-[#EEF0FF] text-[#5B5FE8] shadow-xs ring-2 ring-[#5B5FE8]/20 font-bold'
                  : 'border border-slate-200 bg-slate-50 text-slate-700 hover:border-[#5B5FE8]/40 hover:bg-[#EEF0FF]/40'
              }`}
            >
              <span>{p.fullName}</span>
              {p.relationshipLabel && (
                <span className="text-xs text-slate-400">({p.relationshipLabel})</span>
              )}
              {p.currentStatus && (
                <span
                  className={`h-2 w-2 rounded-full ${
                    p.currentStatus === 'critical'
                      ? 'bg-[#F25F5C]'
                      : p.currentStatus === 'warning'
                      ? 'bg-[#F5A524]'
                      : p.currentStatus === 'stable'
                      ? 'bg-[#2DD4BF]'
                      : 'bg-slate-300'
                  }`}
                  title={`Status: ${p.currentStatus}`}
                />
              )}
            </Link>
          )
        })}
      </div>
    </div>
  )
}
