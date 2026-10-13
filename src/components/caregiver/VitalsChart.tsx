'use client'

import { useState, useMemo } from 'react'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts'
import { format } from 'date-fns'
import type { VitalsLogRow } from '@/services/vitalsLogsService'
import { Activity, Heart, Droplets, Thermometer } from 'lucide-react'

interface VitalsChartProps {
  logs: VitalsLogRow[]
}

type MetricView = 'all' | 'hr_spo2' | 'bp' | 'temp'

export function VitalsChart({ logs }: VitalsChartProps) {
  const [activeView, setActiveView] = useState<MetricView>('all')

  // Prepare chronological data points (oldest first for time series)
  const chartData = useMemo(() => {
    return [...logs]
      .sort((a, b) => new Date(a.logged_at).getTime() - new Date(b.logged_at).getTime())
      .map((log) => {
        const d = new Date(log.logged_at)
        return {
          id: log.id,
          timestamp: d.getTime(),
          timeLabel: format(d, 'MMM dd, HH:mm'),
          shortTime: format(d, 'MM/dd HH:mm'),
          heart_rate: log.heart_rate ?? null,
          spo2: log.spo2 ?? null,
          bp_systolic: log.bp_systolic ?? null,
          bp_diastolic: log.bp_diastolic ?? null,
          temperature_c: log.temperature_c ?? null,
        }
      })
  }, [logs])

  if (logs.length === 0) {
    return null
  }

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-6 shadow-sm space-y-4">
      {/* Header & Metric View Switcher */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg sm:text-xl font-black text-[#1E2243] flex items-center gap-2">
            <Activity className="h-5 w-5 text-[#5B5FE8]" />
            Vitals Trends Over Time
          </h3>
          <p className="text-sm font-medium text-slate-500">
            Visualizing {logs.length} measurement{logs.length > 1 ? 's' : ''} chronologically
          </p>
        </div>

        {/* Metric Selector Tabs */}
        <div className="flex overflow-x-auto no-scrollbar gap-1.5 rounded-xl bg-slate-100 p-1 text-sm font-semibold">
          <button
            type="button"
            onClick={() => setActiveView('all')}
            className={`min-h-[44px] min-w-[48px] rounded-lg px-3.5 py-2 transition-all duration-150 cursor-pointer flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5B5FE8] focus-visible:ring-offset-1 ${
              activeView === 'all'
                ? 'bg-white text-[#1E2243] shadow-sm font-bold'
                : 'text-slate-600 hover:bg-white/70 hover:text-[#1E2243]'
            }`}
          >
            All
          </button>
          <button
            type="button"
            onClick={() => setActiveView('hr_spo2')}
            className={`flex items-center justify-center gap-1.5 min-h-[44px] rounded-lg px-3 py-2 transition-all duration-150 cursor-pointer whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F25F5C] focus-visible:ring-offset-1 ${
              activeView === 'hr_spo2'
                ? 'bg-white text-[#F25F5C] shadow-sm font-bold'
                : 'text-slate-600 hover:bg-white/70 hover:text-[#1E2243]'
            }`}
          >
            <Heart className="h-3.5 w-3.5 text-[#F25F5C]" />
            <span>HR & SpO2</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveView('bp')}
            className={`flex items-center justify-center gap-1.5 min-h-[44px] min-w-[48px] rounded-lg px-3 py-2 transition-all duration-150 cursor-pointer whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5B5FE8] focus-visible:ring-offset-1 ${
              activeView === 'bp'
                ? 'bg-white text-[#5B5FE8] shadow-sm font-bold'
                : 'text-slate-600 hover:bg-white/70 hover:text-[#1E2243]'
            }`}
          >
            <Activity className="h-3.5 w-3.5 text-[#5B5FE8]" />
            <span>BP</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveView('temp')}
            className={`flex items-center justify-center gap-1.5 min-h-[44px] min-w-[48px] rounded-lg px-3 py-2 transition-all duration-150 cursor-pointer whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F5A524] focus-visible:ring-offset-1 ${
              activeView === 'temp'
                ? 'bg-white text-[#F5A524] shadow-sm font-bold'
                : 'text-slate-600 hover:bg-white/70 hover:text-[#1E2243]'
            }`}
          >
            <Thermometer className="h-3.5 w-3.5 text-[#F5A524]" />
            <span>Temp</span>
          </button>
        </div>
      </div>

      {/* Recharts Container */}
      <div className="h-72 w-full pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 25 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis
              dataKey="shortTime"
              stroke="#94a3b8"
              fontSize={12}
              tickLine={false}
              minTickGap={28}
              interval="preserveStartEnd"
            />
            <YAxis
              stroke="#94a3b8"
              fontSize={12}
              tickLine={false}
              domain={['auto', 'auto']}
            />
            <Tooltip
              content={({ active, payload, label }) => {
                if (active && payload && payload.length) {
                  return (
                    <div className="rounded-xl border border-slate-200/80 bg-white/95 backdrop-blur-sm p-3 shadow-xl text-sm space-y-1.5 ring-1 ring-black/5">
                      <p className="font-bold text-[#1E2243] border-b border-slate-100 pb-1">{label}</p>
                      {payload.map((entry, index) => (
                        <div key={`item-${index}`} className="flex items-center justify-between gap-4">
                          <span className="flex items-center gap-1.5 font-medium" style={{ color: entry.color }}>
                            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: entry.color }} />
                            {entry.name}:
                          </span>
                          <span className="font-bold text-[#1E2243]">
                            {entry.value} {entry.unit}
                          </span>
                        </div>
                      ))}
                    </div>
                  )
                }
                return null
              }}
            />
            <Legend
              wrapperStyle={{ fontSize: '13px', paddingTop: '10px' }}
            />

            {/* Heart Rate Line - Soft Red */}
            {(activeView === 'all' || activeView === 'hr_spo2') && (
              <Line
                type="monotone"
                dataKey="heart_rate"
                name="Heart Rate"
                unit="bpm"
                stroke="#F25F5C"
                strokeWidth={2.5}
                dot={{ r: 3, fill: '#F25F5C' }}
                activeDot={{ r: 5 }}
                connectNulls
              />
            )}

            {/* SpO2 Line - Mint */}
            {(activeView === 'all' || activeView === 'hr_spo2') && (
              <Line
                type="monotone"
                dataKey="spo2"
                name="SpO2"
                unit="%"
                stroke="#2DD4BF"
                strokeWidth={2.5}
                dot={{ r: 3, fill: '#2DD4BF' }}
                activeDot={{ r: 5 }}
                connectNulls
              />
            )}

            {/* Blood Pressure Systolic Line - Primary Indigo */}
            {(activeView === 'all' || activeView === 'bp') && (
              <Line
                type="monotone"
                dataKey="bp_systolic"
                name="BP Systolic"
                unit="mmHg"
                stroke="#5B5FE8"
                strokeWidth={2}
                dot={{ r: 3, fill: '#5B5FE8' }}
                activeDot={{ r: 5 }}
                connectNulls
              />
            )}

            {/* Blood Pressure Diastolic Line - Dashed Primary Indigo */}
            {(activeView === 'all' || activeView === 'bp') && (
              <Line
                type="monotone"
                dataKey="bp_diastolic"
                name="BP Diastolic"
                unit="mmHg"
                stroke="#5B5FE8"
                strokeDasharray="4 4"
                strokeWidth={2}
                dot={{ r: 3, fill: '#5B5FE8' }}
                activeDot={{ r: 5 }}
                connectNulls
              />
            )}

            {/* Temperature Line - Amber */}
            {(activeView === 'all' || activeView === 'temp') && (
              <Line
                type="monotone"
                dataKey="temperature_c"
                name="Temperature"
                unit="°C"
                stroke="#F5A524"
                strokeWidth={2}
                dot={{ r: 3, fill: '#F5A524' }}
                activeDot={{ r: 5 }}
                connectNulls
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
