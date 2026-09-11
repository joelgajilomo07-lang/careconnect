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
      <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center">
        <Activity className="mx-auto h-12 w-12 text-gray-300" />
        <h3 className="mt-3 text-base font-bold text-gray-900">No Vitals Logs Recorded</h3>
        <p className="mt-1 text-xs text-gray-500">
          No historical measurements have been recorded for this patient yet.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-bold text-gray-900">
          Measurement History ({logs.length})
        </h3>
        <span className="text-xs text-gray-500">Newest first</span>
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
              className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm space-y-3 hover:border-gray-300 hover:shadow-md transition-all duration-150"
            >
              <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                <span className="text-xs font-semibold text-gray-800">
                  {format(new Date(log.logged_at), 'MMM dd, yyyy • HH:mm')}
                </span>
                {assessment.isFlagged && (
                  <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-800 ring-1 ring-inset ring-amber-600/20">
                    <AlertCircle className="h-3 w-3 text-amber-600" />
                    Flagged
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-lg bg-gray-50 p-2">
                  <span className="text-gray-500 flex items-center gap-1">
                    <Activity className="h-3.5 w-3.5 text-blue-600" />
                    BP
                  </span>
                  <p className="mt-0.5 font-bold text-gray-900">
                    {log.bp_systolic && log.bp_diastolic
                      ? `${log.bp_systolic}/${log.bp_diastolic}`
                      : '—'} <span className="text-[10px] font-normal text-gray-500">mmHg</span>
                  </p>
                </div>

                <div className="rounded-lg bg-gray-50 p-2">
                  <span className="text-gray-500 flex items-center gap-1">
                    <Heart className="h-3.5 w-3.5 text-rose-500" />
                    Heart Rate
                  </span>
                  <p className="mt-0.5 font-bold text-gray-900">
                    {log.heart_rate ?? '—'} <span className="text-[10px] font-normal text-gray-500">bpm</span>
                  </p>
                </div>

                <div className="rounded-lg bg-gray-50 p-2">
                  <span className="text-gray-500 flex items-center gap-1">
                    <Droplets className="h-3.5 w-3.5 text-cyan-600" />
                    SpO2
                  </span>
                  <p className="mt-0.5 font-bold text-gray-900">
                    {log.spo2 !== null ? `${log.spo2}%` : '—'}
                  </p>
                </div>

                <div className="rounded-lg bg-gray-50 p-2">
                  <span className="text-gray-500 flex items-center gap-1">
                    <Thermometer className="h-3.5 w-3.5 text-amber-600" />
                    Temp
                  </span>
                  <p className="mt-0.5 font-bold text-gray-900">
                    {log.temperature_c !== null ? `${log.temperature_c}°C` : '—'}
                  </p>
                </div>
              </div>

              {assessment.isFlagged && (
                <div className="rounded-lg bg-amber-50/60 p-2 text-[11px] text-amber-800 space-y-0.5">
                  <span className="font-semibold">Out of typical range:</span>
                  <ul className="list-disc list-inside">
                    {assessment.flags.map((f, i) => (
                      <li key={i}>{f.message}</li>
                    ))}
                  </ul>
                </div>
              )}

              {log.notes && (
                <div className="text-xs text-gray-600 border-t border-gray-100 pt-2 flex items-start gap-1.5">
                  <FileText className="h-3.5 w-3.5 text-gray-400 shrink-0 mt-0.5" />
                  <p className="italic">{log.notes}</p>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Desktop / Tablet Table View (sm+) */}
      <div className="hidden sm:block overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-left text-xs">
            <thead className="bg-gray-50 text-gray-600 font-semibold">
              <tr>
                <th scope="col" className="px-4 py-3.5">Logged At</th>
                <th scope="col" className="px-4 py-3.5">Blood Pressure</th>
                <th scope="col" className="px-4 py-3.5">Heart Rate</th>
                <th scope="col" className="px-4 py-3.5">SpO2</th>
                <th scope="col" className="px-4 py-3.5">Temp</th>
                <th scope="col" className="px-4 py-3.5">Observations / Range</th>
                <th scope="col" className="px-4 py-3.5">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-gray-900 font-medium">
              {logs.map((log) => {
                const assessment = checkVitalsRanges({
                  heart_rate: log.heart_rate,
                  spo2: log.spo2,
                  bp_systolic: log.bp_systolic,
                  bp_diastolic: log.bp_diastolic,
                  temperature_c: log.temperature_c,
                })

                return (
                  <tr key={log.id} className="hover:bg-gray-50/80 transition-colors duration-150">
                    <td className="whitespace-nowrap px-4 py-3 text-gray-600 font-normal">
                      {format(new Date(log.logged_at), 'MMM dd, yyyy HH:mm')}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 font-semibold">
                      {log.bp_systolic && log.bp_diastolic
                        ? `${log.bp_systolic}/${log.bp_diastolic} mmHg`
                        : '—'}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 font-semibold">
                      {log.heart_rate ? `${log.heart_rate} bpm` : '—'}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 font-semibold">
                      {log.spo2 !== null ? `${log.spo2}%` : '—'}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 font-semibold">
                      {log.temperature_c !== null ? `${log.temperature_c} °C` : '—'}
                    </td>
                    <td className="px-4 py-3">
                      {assessment.isFlagged ? (
                        <span
                          className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-800 ring-1 ring-inset ring-amber-600/20"
                          title={assessment.flags.map(f => f.message).join('; ')}
                        >
                          <AlertCircle className="h-3 w-3 text-amber-600" />
                          Out of typical range
                        </span>
                      ) : (
                        <span className="text-emerald-700 text-[11px] font-semibold">
                          Typical
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-500 font-normal max-w-xs truncate">
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
