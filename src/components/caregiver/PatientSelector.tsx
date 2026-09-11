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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-gray-200 bg-white p-4 sm:p-5 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-blue-600">
              Assigned Patient
            </span>
            {p.relationshipLabel && (
              <span className="text-xs text-gray-500 font-medium">
                • {p.relationshipLabel}
              </span>
            )}
          </div>
          <h2 className="text-lg font-bold text-gray-900 mt-0.5">{p.fullName}</h2>
          <p className="text-xs text-gray-500">
            Condition: {p.primaryCondition || 'None documented'}
          </p>
        </div>

        {p.currentStatus && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">Doctor-set status:</span>
            <span
              className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider ${
                p.currentStatus === 'critical'
                  ? 'bg-red-100 text-red-800 ring-1 ring-inset ring-red-600/20'
                  : p.currentStatus === 'warning'
                  ? 'bg-amber-100 text-amber-800 ring-1 ring-inset ring-amber-600/20'
                  : p.currentStatus === 'stable'
                  ? 'bg-emerald-100 text-emerald-800 ring-1 ring-inset ring-emerald-600/20'
                  : 'bg-gray-100 text-gray-700'
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
    <div className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-5 shadow-sm space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-xs font-bold uppercase tracking-wider text-gray-500 flex items-center gap-1.5">
          <Users className="h-4 w-4 text-blue-600" />
          Select Patient ({patients.length} Assigned)
        </label>
        <span className="text-xs text-gray-400">Click to switch timeline</span>
      </div>

      <div className="flex flex-wrap gap-2">
        {patients.map((p) => {
          const isSelected = p.patientId === currentPatientId
          return (
            <Link
              key={p.patientId}
              href={`/history?patientId=${p.patientId}`}
              className={`flex items-center gap-2.5 rounded-xl border min-h-[44px] px-4 py-2 text-xs font-semibold transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1 ${
                isSelected
                  ? 'border-blue-600 bg-blue-50 text-blue-900 shadow-sm ring-2 ring-blue-500/20'
                  : 'border-gray-200 bg-gray-50/50 text-gray-700 hover:border-gray-300 hover:bg-gray-100'
              }`}
            >
              <span>{p.fullName}</span>
              {p.relationshipLabel && (
                <span className="text-[10px] text-gray-400">({p.relationshipLabel})</span>
              )}
              {p.currentStatus && (
                <span
                  className={`h-2 w-2 rounded-full ${
                    p.currentStatus === 'critical'
                      ? 'bg-red-500'
                      : p.currentStatus === 'warning'
                      ? 'bg-amber-500'
                      : p.currentStatus === 'stable'
                      ? 'bg-emerald-500'
                      : 'bg-gray-400'
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
