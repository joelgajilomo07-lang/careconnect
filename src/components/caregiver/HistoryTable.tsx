import { format } from 'date-fns'
import type { VitalsLogRow } from '@/services/vitalsLogsService'
import { checkVitalsRanges } from '@/lib/utils/vitalsThresholds'
import { Heart, Activity, Droplets, Thermometer, FileText, AlertCircle } from 'lucide-react'

interface HistoryTableProps {
  logs: VitalsLogRow[]
}

export function HistoryTable({ logs }: HistoryTableProps) {
  if (logs.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200/80 bg-white p-8 sm:p-10 text-center">
        <Activity className="mx-auto h-12 w-12 text-slate-300" />
        <h3 className="mt-3 text-lg sm:text-xl font-black text-[#1E2243]">No Vitals Logs Recorded</h3>
        <p className="mt-1 text-sm font-medium text-slate-500">
          No historical measurements have been recorded for this patient yet.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg sm:text-xl font-black text-[#1E2243]">
          Measurement History ({logs.length})
        </h3>
        <span className="text-xs sm:text-sm text-slate-500 font-semibold">Newest first</span>
      </div>

      {/* Mobile Card View (< sm) */}
      <div className="block sm:hidden space-y-3">
        {logs.map((log) => {
          const assessment = checkVitalsRanges({
            heart_rate: log.heart_rate,
            spo2: log.spo2,
            bp_systolic: log.bp_systolic,
            bp_diastolic: log.bp_diastolic,
            temperature_c: log.temperature_c,
          })

          return (
            <div
              key={log.id}
              className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm space-y-3 hover:border-slate-300 hover:shadow-md transition-all duration-150"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="text-sm font-bold text-[#1E2243]">
                  {format(new Date(log.logged_at), 'MMM dd, yyyy • HH:mm')}
                </span>
                {assessment.isFlagged && (
                  <span className="inline-flex items-center gap-1.5 rounded-lg bg-[#F5A524]/10 px-2.5 py-1 text-xs font-bold text-[#B45309] ring-1 ring-inset ring-[#F5A524]/30">
                    <AlertCircle className="h-3.5 w-3.5 text-[#F5A524]" />
                    Flagged
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2.5 text-sm">
                <div className="rounded-xl bg-slate-50 p-2.5">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                    <Activity className="h-3.5 w-3.5 text-[#5B5FE8]" />
                    BP
                  </span>
                  <p className="mt-1 text-base font-black text-[#1E2243]">
                    {log.bp_systolic && log.bp_diastolic
                      ? `${log.bp_systolic}/${log.bp_diastolic}`
                      : '—'} <span className="text-xs font-semibold text-slate-400">mmHg</span>
                  </p>
                </div>

                <div className="rounded-xl bg-slate-50 p-2.5">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                    <Heart className="h-3.5 w-3.5 text-[#F25F5C]" />
                    Heart Rate
                  </span>
                  <p className="mt-1 text-base font-black text-[#1E2243]">
                    {log.heart_rate ?? '—'} <span className="text-xs font-semibold text-slate-400">bpm</span>
                  </p>
                </div>

                <div className="rounded-xl bg-slate-50 p-2.5">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                    <Droplets className="h-3.5 w-3.5 text-[#2DD4BF]" />
                    SpO2
                  </span>
                  <p className="mt-1 text-base font-black text-[#1E2243]">
                    {log.spo2 !== null ? `${log.spo2}%` : '—'}
                  </p>
                </div>

                <div className="rounded-xl bg-slate-50 p-2.5">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                    <Thermometer className="h-3.5 w-3.5 text-[#F5A524]" />
                    Temp
                  </span>
                  <p className="mt-1 text-base font-black text-[#1E2243]">
                    {log.temperature_c !== null ? `${log.temperature_c}°C` : '—'}
                  </p>
                </div>
              </div>

              {assessment.isFlagged && (
                <div className="rounded-xl bg-[#FFFBEB] border border-[#F5A524]/30 p-2.5 text-xs text-amber-900 space-y-1">
                  <span className="font-bold">Out of typical range:</span>
                  <ul className="list-disc list-inside space-y-0.5">
                    {assessment.flags.map((f, i) => (
                      <li key={i}>{f.message}</li>
                    ))}
                  </ul>
                </div>
              )}

              {log.notes && (
                <div className="text-sm text-slate-600 border-t border-slate-100 pt-2 flex items-start gap-1.5">
                  <FileText className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
                  <p className="italic">{log.notes}</p>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Desktop / Tablet Table View (sm+) */}
      <div className="hidden sm:block overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200/80 text-left text-sm">
            <thead className="bg-slate-50/80 text-slate-500 font-semibold border-b border-slate-200/80">
              <tr>
                <th scope="col" className="px-4 py-3.5 text-xs font-bold uppercase tracking-wider text-slate-500">Logged At</th>
                <th scope="col" className="px-4 py-3.5 text-xs font-bold uppercase tracking-wider text-slate-500">Blood Pressure</th>
                <th scope="col" className="px-4 py-3.5 text-xs font-bold uppercase tracking-wider text-slate-500">Heart Rate</th>
                <th scope="col" className="px-4 py-3.5 text-xs font-bold uppercase tracking-wider text-slate-500">SpO2</th>
                <th scope="col" className="px-4 py-3.5 text-xs font-bold uppercase tracking-wider text-slate-500">Temp</th>
                <th scope="col" className="px-4 py-3.5 text-xs font-bold uppercase tracking-wider text-slate-500">Observations / Range</th>
                <th scope="col" className="px-4 py-3.5 text-xs font-bold uppercase tracking-wider text-slate-500">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-[#1E2243] font-medium">
              {logs.map((log) => {
                const assessment = checkVitalsRanges({
                  heart_rate: log.heart_rate,
                  spo2: log.spo2,
                  bp_systolic: log.bp_systolic,
                  bp_diastolic: log.bp_diastolic,
                  temperature_c: log.temperature_c,
                })

                return (
                  <tr key={log.id} className="hover:bg-[#EEF0FF]/40 transition-colors duration-150">
                    <td className="whitespace-nowrap px-4 py-3.5 text-sm text-slate-600 font-medium">
                      {format(new Date(log.logged_at), 'MMM dd, yyyy HH:mm')}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3.5 text-sm sm:text-base font-black text-[#1E2243]">
                      {log.bp_systolic && log.bp_diastolic
                        ? `${log.bp_systolic}/${log.bp_diastolic} mmHg`
                        : '—'}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3.5 text-sm sm:text-base font-black text-[#1E2243]">
                      {log.heart_rate ? `${log.heart_rate} bpm` : '—'}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3.5 text-sm sm:text-base font-black text-[#1E2243]">
                      {log.spo2 !== null ? `${log.spo2}%` : '—'}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3.5 text-sm sm:text-base font-black text-[#1E2243]">
                      {log.temperature_c !== null ? `${log.temperature_c} °C` : '—'}
                    </td>
                    <td className="px-4 py-3.5">
                      {assessment.isFlagged ? (
                        <span
                          className="inline-flex items-center gap-1.5 rounded-lg bg-[#F5A524]/10 px-2.5 py-1 text-xs font-bold text-[#B45309] ring-1 ring-inset ring-[#F5A524]/30"
                          title={assessment.flags.map(f => f.message).join('; ')}
                        >
                          <AlertCircle className="h-3.5 w-3.5 text-[#F5A524]" />
                          Out of typical range
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 rounded-lg bg-[#2DD4BF]/10 px-2.5 py-1 text-xs font-bold text-[#0F766E] ring-1 ring-inset ring-[#2DD4BF]/30">
                          Typical
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-sm text-slate-600 font-normal max-w-xs truncate">
                      {log.notes || '—'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
