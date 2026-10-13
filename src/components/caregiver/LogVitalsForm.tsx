'use client'

import { useState, useMemo, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { submitVitalsLog } from '@/app/(caregiver)/actions'
import { vitalsLogSchema } from '@/lib/validations/vitals'
import { checkVitalsRanges } from '@/lib/utils/vitalsThresholds'
import {
  Activity,
  Heart,
  HeartPulse,
  Thermometer,
  Droplets,
  Wind,
  Smile,
  Scale,
  Compass,
  FileText,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Loader2,
  User,
  Plus,
  Check,
  ShieldCheck,
  Clock,
  ChevronDown,
  Calendar,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'

export interface AssignedPatient {
  patientId: string
  fullName: string
  primaryCondition: string | null
  currentStatus: 'stable' | 'warning' | 'critical' | 'unassessed' | null
  relationshipLabel: string | null
  dateOfBirth?: string | null
  age?: number | null
  sex?: string | null
  roomBed?: string | null
}

export interface CaregiverInfo {
  id?: string
  fullName: string
  staffId?: string
}

interface LogVitalsFormProps {
  patients: AssignedPatient[]
  defaultPatientId?: string
  currentCaregiver?: CaregiverInfo
}

const WEIGHT_OPTIONS = Array.from({ length: 200 - 30 + 1 }, (_, i) => 30 + i)
const HEIGHT_OPTIONS = Array.from({ length: 220 - 100 + 1 }, (_, i) => 100 + i)

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]
const HOURS_12 = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12']
const MINUTES_60 = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'))

function getCalendarDays(year: number, month: number) {
  const firstDayOfWeek = new Date(year, month - 1, 1).getDay()
  const daysInCurrentMonth = new Date(year, month, 0).getDate()
  const daysInPrevMonth = new Date(year, month - 1, 0).getDate()

  const days: Array<{ year: number; month: number; day: number; isCurrentMonth: boolean }> = []

  for (let i = firstDayOfWeek - 1; i >= 0; i--) {
    const prevMonth = month === 1 ? 12 : month - 1
    const prevYear = month === 1 ? year - 1 : year
    days.push({
      year: prevYear,
      month: prevMonth,
      day: daysInPrevMonth - i,
      isCurrentMonth: false,
    })
  }

  for (let d = 1; d <= daysInCurrentMonth; d++) {
    days.push({
      year,
      month,
      day: d,
      isCurrentMonth: true,
    })
  }

  const totalSlots = days.length <= 35 ? 35 : 42
  const remaining = totalSlots - days.length
  for (let d = 1; d <= remaining; d++) {
    const nextMonth = month === 12 ? 1 : month + 1
    const nextYear = month === 12 ? year + 1 : year
    days.push({
      year: nextYear,
      month: nextMonth,
      day: d,
      isCurrentMonth: false,
    })
  }

  return days
}

function parseIsoToParts(isoString: string) {
  if (!isoString) {
    const now = new Date()
    return {
      year: now.getFullYear(),
      month: now.getMonth() + 1,
      day: now.getDate(),
      hour: now.getHours(),
      minute: now.getMinutes(),
    }
  }
  const match = isoString.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/)
  if (match) {
    return {
      year: parseInt(match[1], 10),
      month: parseInt(match[2], 10),
      day: parseInt(match[3], 10),
      hour: parseInt(match[4], 10),
      minute: parseInt(match[5], 10),
    }
  }
  const d = new Date(isoString)
  if (!isNaN(d.getTime())) {
    return {
      year: d.getFullYear(),
      month: d.getMonth() + 1,
      day: d.getDate(),
      hour: d.getHours(),
      minute: d.getMinutes(),
    }
  }
  const now = new Date()
  return {
    year: now.getFullYear(),
    month: now.getMonth() + 1,
    day: now.getDate(),
    hour: now.getHours(),
    minute: now.getMinutes(),
  }
}

function formatPartsToDisplay(parts: { year: number; month: number; day: number; hour: number; minute: number }): string {
  const dd = String(parts.day).padStart(2, '0')
  const mm = String(parts.month).padStart(2, '0')
  const yyyy = String(parts.year)

  let h12 = parts.hour % 12
  if (h12 === 0) h12 = 12
  const hh = String(h12).padStart(2, '0')
  const min = String(parts.minute).padStart(2, '0')
  const ampm = parts.hour >= 12 ? 'pm' : 'am'

  return `${dd}/${mm}/${yyyy} ${hh}:${min} ${ampm}`
}

function formatPartsToIso(parts: { year: number; month: number; day: number; hour: number; minute: number }): string {
  const yyyy = String(parts.year).padStart(4, '0')
  const mm = String(parts.month).padStart(2, '0')
  const dd = String(parts.day).padStart(2, '0')
  const hh = String(parts.hour).padStart(2, '0')
  const min = String(parts.minute).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}T${hh}:${min}`
}

function parseDisplayToParts(str: string): { year: number; month: number; day: number; hour: number; minute: number } | null {
  const trimmed = str.trim()
  const regex = /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})\s+(\d{1,2}):(\d{2})(?:\s*([ap]m))?$/i
  const match = trimmed.match(regex)
  if (!match) return null

  const day = parseInt(match[1], 10)
  const month = parseInt(match[2], 10)
  const year = parseInt(match[3], 10)
  let hour = parseInt(match[4], 10)
  const minute = parseInt(match[5], 10)
  const ampm = match[6] ? match[6].toLowerCase() : null

  if (month < 1 || month > 12 || day < 1 || day > 31 || minute < 0 || minute > 59) return null

  if (ampm) {
    if (hour < 1 || hour > 12) return null
    if (ampm === 'am' && hour === 12) hour = 0
    else if (ampm === 'pm' && hour < 12) hour += 12
  } else {
    if (hour < 0 || hour > 23) return null
  }

  return { year, month, day, hour, minute }
}

const CLINICAL_SYMPTOMS = [
  'Dizziness',
  'Headache',
  'Shortness of Breath',
  'Chest Discomfort',
  'Nausea',
  'Weakness',
  'Other',
]

const QUICK_OBSERVATIONS = [
  'No complaints',
  'Mild dizziness',
  'Shortness of breath',
  'Headache',
  'Fatigued',
  'Post-medication',
]

const PAIN_LEVELS = [
  { score: 0, label: '0 - None', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  { score: 1, label: '1 - Minimal', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  { score: 2, label: '2 - Mild', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  { score: 3, label: '3 - Uncomfortable', color: 'bg-lime-50 text-lime-700 border-lime-200' },
  { score: 4, label: '4 - Moderate', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  { score: 5, label: '5 - Distracting', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  { score: 6, label: '6 - Distressing', color: 'bg-orange-50 text-orange-700 border-orange-200' },
  { score: 7, label: '7 - Severe', color: 'bg-rose-50 text-rose-700 border-rose-200' },
  { score: 8, label: '8 - Intense', color: 'bg-rose-50 text-rose-700 border-rose-200' },
  { score: 9, label: '9 - Excruciating', color: 'bg-rose-100 text-rose-800 border-rose-300' },
  { score: 10, label: '10 - Worst Possible', color: 'bg-rose-200 text-rose-900 border-rose-400 font-bold' },
]

function calculateAge(dobStr?: string | null): number | null {
  if (!dobStr) return null
  const dob = new Date(dobStr)
  if (isNaN(dob.getTime())) return null
  const today = new Date()
  let age = today.getFullYear() - dob.getFullYear()
  const m = today.getMonth() - dob.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
    age--
  }
  return age >= 0 ? age : null
}

function getPatientDisplayName(patient: AssignedPatient): string {
  const name = patient.fullName.trim()
  if (/\(.*\)/.test(name)) {
    return name
  }

  if (patient.relationshipLabel) {
    const roleLower = patient.relationshipLabel.toLowerCase()
    const isCaregiverStaffRole = [
      'home health aide',
      'primary day caregiver',
      'night shift nurse',
      'physical therapy assistant',
      'caregiver',
      'nurse',
      'aide',
    ].some((role) => roleLower.includes(role))

    if (!isCaregiverStaffRole) {
      return `${name} (${patient.relationshipLabel})`
    }
  }

  return name
}

const getStatusBadgeConfig = (status: string | null | undefined) => {
  switch (status?.toLowerCase()) {
    case 'stable':
      return {
        label: 'STABLE',
        pillBg: 'bg-[#2DD4BF]/10 border-[#2DD4BF]/30',
        iconBg: 'bg-[#2DD4BF]',
        textColor: 'text-[#0F766E]',
        dividerColor: 'bg-[#2DD4BF]/40',
        Icon: HeartPulse,
      }
    case 'warning':
      return {
        label: 'WARNING',
        pillBg: 'bg-[#F5A524]/10 border-[#F5A524]/30',
        iconBg: 'bg-[#F5A524]',
        textColor: 'text-[#B45309]',
        dividerColor: 'bg-[#F5A524]/40',
        Icon: AlertTriangle,
      }
    case 'critical':
      return {
        label: 'CRITICAL',
        pillBg: 'bg-[#F25F5C]/10 border-[#F25F5C]/30',
        iconBg: 'bg-[#F25F5C]',
        textColor: 'text-[#B91C1C]',
        dividerColor: 'bg-[#F25F5C]/40',
        Icon: AlertCircle,
      }
    case 'unassessed':
    default:
      return {
        label: 'UNASSESSED',
        pillBg: 'bg-slate-100 border-slate-200',
        iconBg: 'bg-slate-400',
        textColor: 'text-slate-600',
        dividerColor: 'bg-slate-300',
        Icon: Clock,
      }
  }
}

interface CustomSelectOption {
  value: string
  label: string
}

interface CustomSelectProps {
  id?: string
  name?: string
  value: string
  onChange: (value: string) => void
  options: CustomSelectOption[]
  placeholder?: string
  ariaLabel?: string
}

function CustomSelect({
  id,
  name,
  value,
  onChange,
  options,
  placeholder,
  ariaLabel,
}: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)

  const selectedIndex = options.findIndex((o) => o.value === value)
  const [highlightedIndex, setHighlightedIndex] = useState(() =>
    selectedIndex >= 0 ? selectedIndex : 0
  )

  // Sync highlighted index when opened or value changes
  useEffect(() => {
    if (isOpen) {
      const idx = options.findIndex((o) => o.value === value)
      setHighlightedIndex(idx >= 0 ? idx : 0)
    }
  }, [isOpen, value, options])

  // Center or scroll active/highlighted item into view
  useEffect(() => {
    if (isOpen && listRef.current) {
      requestAnimationFrame(() => {
        const activeItem = listRef.current?.children[highlightedIndex] as HTMLElement | undefined
        if (activeItem) {
          activeItem.scrollIntoView({ block: 'nearest' })
        }
      })
    }
  }, [isOpen, highlightedIndex])

  // Click outside and Escape key handler
  useEffect(() => {
    if (!isOpen) return

    const handlePointerDown = (e: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false)
        triggerRef.current?.focus()
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen])

  const handleTriggerKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (!isOpen) {
        setIsOpen(true)
      } else {
        setHighlightedIndex((prev) => (prev + 1) % options.length)
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      if (!isOpen) {
        setIsOpen(true)
      } else {
        setHighlightedIndex((prev) => (prev - 1 + options.length) % options.length)
      }
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      if (isOpen) {
        const opt = options[highlightedIndex]
        if (opt) {
          onChange(opt.value)
          setIsOpen(false)
        }
      } else {
        setIsOpen(true)
      }
    } else if (e.key === 'Tab') {
      if (isOpen) {
        setIsOpen(false)
      }
    }
  }

  const selectedOption = options.find((o) => o.value === value)

  return (
    <div className="relative w-full" ref={containerRef}>
      {name && <input type="hidden" name={name} value={value} />}
      <button
        ref={triggerRef}
        id={id}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={ariaLabel}
        onClick={() => setIsOpen((prev) => !prev)}
        onKeyDown={handleTriggerKeyDown}
        className={`w-full min-h-[56px] py-3.5 px-4 text-base sm:text-lg font-bold text-[#1E2243] rounded-2xl border bg-slate-50/50 focus:outline-none transition-all cursor-pointer flex items-center justify-between gap-2 text-left ${
          isOpen
            ? 'border-[#5B5FE8] bg-white ring-4 ring-[#5B5FE8]/15'
            : 'border-slate-200 hover:border-[#5B5FE8]/50 focus:border-[#5B5FE8] focus:bg-white focus:ring-4 focus:ring-[#5B5FE8]/15'
        }`}
      >
        <span className="truncate">
          {selectedOption ? selectedOption.label : placeholder || ''}
        </span>
        <ChevronDown
          className={`h-5 w-5 text-slate-400 shrink-0 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-[#5B5FE8]' : ''
          }`}
        />
      </button>

      {isOpen && (
        <div
          ref={listRef}
          role="listbox"
          tabIndex={-1}
          className="absolute z-50 left-0 right-0 top-full mt-2 max-h-60 overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-xl py-1.5 focus:outline-none animate-in fade-in zoom-in-95 duration-100"
        >
          {options.map((opt, idx) => {
            const isSelected = opt.value === value
            const isHighlighted = idx === highlightedIndex
            return (
              <button
                key={opt.value}
                type="button"
                role="option"
                aria-selected={isSelected}
                onClick={() => {
                  onChange(opt.value)
                  setIsOpen(false)
                  triggerRef.current?.focus()
                }}
                onMouseEnter={() => setHighlightedIndex(idx)}
                className={`w-full text-left px-4 py-3 text-base sm:text-lg transition-colors cursor-pointer flex items-center justify-between ${
                  isSelected
                    ? 'bg-[#EEF0FF] text-[#5B5FE8] font-black'
                    : isHighlighted
                    ? 'bg-slate-50 text-[#1E2243] font-bold'
                    : 'text-[#1E2243] font-bold hover:bg-[#EEF0FF] hover:text-[#5B5FE8]'
                }`}
              >
                <span className="truncate">{opt.label}</span>
                {isSelected && (
                  <Check className="h-4 w-4 text-[#5B5FE8] stroke-[2.5] shrink-0 ml-2" />
                )}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

export function LogVitalsForm({
  patients,
  defaultPatientId,
  currentCaregiver,
}: LogVitalsFormProps) {
  const router = useRouter()

  const [selectedPatientId, setSelectedPatientId] = useState<string>(
    defaultPatientId || (patients.length > 0 ? patients[0].patientId : '')
  )

  const [formData, setFormData] = useState({
    bp_systolic: '',
    bp_diastolic: '',
    heart_rate: '',
    temperature_c: '',
    spo2: '',
    respiratory_rate: '',
    pain_score: '' as string,
    weight_kg: '',
    height_cm: '',
    measurement_position: 'Sitting',
    bp_arm: 'Left',
    temp_method: 'Oral',
    oxygen_device: 'Room Air',
    symptoms: [] as string[],
    symptoms_other: '',
    medication_taken: '',
    measured_at: new Date().toISOString().slice(0, 16),
    notes: '',
  })

  // Unit toggle state for Temperature (°C vs °F)
  const [tempUnit, setTempUnit] = useState<'C' | 'F'>('C')
  const [tempDisplay, setTempDisplay] = useState<string>('')

  // Collapsible toggle for patient details card
  const [showPatientDetails, setShowPatientDetails] = useState(false)

  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})
  const [serverError, setServerError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Dropdown states for Weight and Height pickers
  const [isWeightOpen, setIsWeightOpen] = useState(false)
  const [isHeightOpen, setIsHeightOpen] = useState(false)
  const weightContainerRef = useRef<HTMLDivElement>(null)
  const heightContainerRef = useRef<HTMLDivElement>(null)
  const weightListRef = useRef<HTMLDivElement>(null)
  const heightListRef = useRef<HTMLDivElement>(null)

  // Close dropdown on outside click or Escape key
  useEffect(() => {
    if (!isWeightOpen && !isHeightOpen) return

    const handlePointerDown = (e: MouseEvent | TouchEvent) => {
      if (
        isWeightOpen &&
        weightContainerRef.current &&
        !weightContainerRef.current.contains(e.target as Node)
      ) {
        setIsWeightOpen(false)
      }
      if (
        isHeightOpen &&
        heightContainerRef.current &&
        !heightContainerRef.current.contains(e.target as Node)
      ) {
        setIsHeightOpen(false)
      }
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsWeightOpen(false)
        setIsHeightOpen(false)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isWeightOpen, isHeightOpen])

  // Scroll to current value when Weight dropdown opens
  useEffect(() => {
    if (isWeightOpen && weightListRef.current) {
      const container = weightListRef.current
      const activeItem = container.querySelector('[data-selected="true"]') as HTMLElement | null
      if (activeItem) {
        requestAnimationFrame(() => {
          if (!weightListRef.current) return
          const containerRect = container.getBoundingClientRect()
          const itemRect = activeItem.getBoundingClientRect()
          const targetScrollTop =
            container.scrollTop +
            (itemRect.top - containerRect.top) -
            container.clientHeight / 2 +
            itemRect.height / 2
          container.scrollTop = Math.max(0, targetScrollTop)
        })
      }
    }
  }, [isWeightOpen])

  // Scroll to current value when Height dropdown opens
  useEffect(() => {
    if (isHeightOpen && heightListRef.current) {
      const container = heightListRef.current
      const activeItem = container.querySelector('[data-selected="true"]') as HTMLElement | null
      if (activeItem) {
        requestAnimationFrame(() => {
          if (!heightListRef.current) return
          const containerRect = container.getBoundingClientRect()
          const itemRect = activeItem.getBoundingClientRect()
          const targetScrollTop =
            container.scrollTop +
            (itemRect.top - containerRect.top) -
            container.clientHeight / 2 +
            itemRect.height / 2
          container.scrollTop = Math.max(0, targetScrollTop)
        })
      }
    }
  }, [isHeightOpen])

  const handleSelectWeight = (val: number) => {
    setFormData((prev) => ({ ...prev, weight_kg: String(val) }))
    if (validationErrors.weight_kg) {
      setValidationErrors((prev) => {
        const next = { ...prev }
        delete next.weight_kg
        return next
      })
    }
    setIsWeightOpen(false)
  }

  const handleSelectHeight = (val: number) => {
    setFormData((prev) => ({ ...prev, height_cm: String(val) }))
    if (validationErrors.height_cm) {
      setValidationErrors((prev) => {
        const next = { ...prev }
        delete next.height_cm
        return next
      })
    }
    setIsHeightOpen(false)
  }

  // Custom Date & Time Picker states
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false)
  const datePickerContainerRef = useRef<HTMLDivElement>(null)
  const hourColRef = useRef<HTMLDivElement>(null)
  const minColRef = useRef<HTMLDivElement>(null)
  const ampmColRef = useRef<HTMLDivElement>(null)

  const selectedDateParts = useMemo(() => {
    return parseIsoToParts(formData.measured_at)
  }, [formData.measured_at])

  const [displayDateInput, setDisplayDateInput] = useState(() => {
    return formData.measured_at ? formatPartsToDisplay(parseIsoToParts(formData.measured_at)) : ''
  })

  const [viewYear, setViewYear] = useState(() => selectedDateParts.year)
  const [viewMonth, setViewMonth] = useState(() => selectedDateParts.month)

  // Sync display input when formData.measured_at changes externally
  useEffect(() => {
    if (formData.measured_at) {
      setDisplayDateInput(formatPartsToDisplay(parseIsoToParts(formData.measured_at)))
    } else {
      setDisplayDateInput('')
    }
  }, [formData.measured_at])

  // Sync view year/month when picker opens
  useEffect(() => {
    if (isDatePickerOpen) {
      setViewYear(selectedDateParts.year)
      setViewMonth(selectedDateParts.month)
    }
  }, [isDatePickerOpen, selectedDateParts.year, selectedDateParts.month])

  // Center selected time items when picker opens or selection updates
  useEffect(() => {
    if (isDatePickerOpen) {
      requestAnimationFrame(() => {
        const centerActive = (container: HTMLElement | null) => {
          if (!container) return
          const activeItem = container.querySelector('[data-selected="true"]') as HTMLElement | null
          if (activeItem) {
            const containerRect = container.getBoundingClientRect()
            const itemRect = activeItem.getBoundingClientRect()
            const targetScrollTop =
              container.scrollTop +
              (itemRect.top - containerRect.top) -
              container.clientHeight / 2 +
              itemRect.height / 2
            container.scrollTop = Math.max(0, targetScrollTop)
          }
        }

        centerActive(hourColRef.current)
        centerActive(minColRef.current)
        centerActive(ampmColRef.current)
      })
    }
  }, [isDatePickerOpen, selectedDateParts.hour, selectedDateParts.minute])

  // Dismiss Date Picker on outside click or Escape
  useEffect(() => {
    if (!isDatePickerOpen) return

    const handlePointerDown = (e: MouseEvent | TouchEvent) => {
      if (
        datePickerContainerRef.current &&
        !datePickerContainerRef.current.contains(e.target as Node)
      ) {
        setIsDatePickerOpen(false)
      }
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsDatePickerOpen(false)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isDatePickerOpen])

  const handleDateInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setDisplayDateInput(val)

    if (!val.trim()) {
      setFormData((prev) => ({ ...prev, measured_at: '' }))
      return
    }

    const parsed = parseDisplayToParts(val)
    if (parsed) {
      const iso = formatPartsToIso(parsed)
      setFormData((prev) => ({ ...prev, measured_at: iso }))
      setViewYear(parsed.year)
      setViewMonth(parsed.month)
    }
  }

  const handleDateInputBlur = () => {
    if (!displayDateInput.trim()) {
      setFormData((prev) => ({ ...prev, measured_at: '' }))
      return
    }
    const parsed = parseDisplayToParts(displayDateInput)
    if (parsed) {
      const iso = formatPartsToIso(parsed)
      setFormData((prev) => ({ ...prev, measured_at: iso }))
      setDisplayDateInput(formatPartsToDisplay(parsed))
    } else if (formData.measured_at) {
      const parts = parseIsoToParts(formData.measured_at)
      setDisplayDateInput(formatPartsToDisplay(parts))
    }
  }

  const handlePrevMonth = () => {
    setViewMonth((prev) => {
      if (prev === 1) {
        setViewYear((y) => y - 1)
        return 12
      }
      return prev - 1
    })
  }

  const handleNextMonth = () => {
    setViewMonth((prev) => {
      if (prev === 12) {
        setViewYear((y) => y + 1)
        return 1
      }
      return prev + 1
    })
  }

  const handleSelectDate = (year: number, month: number, day: number) => {
    const updated = {
      ...selectedDateParts,
      year,
      month,
      day,
    }
    const iso = formatPartsToIso(updated)
    setFormData((prev) => ({ ...prev, measured_at: iso }))
    setDisplayDateInput(formatPartsToDisplay(updated))
    if (month !== viewMonth || year !== viewYear) {
      setViewYear(year)
      setViewMonth(month)
    }
  }

  const handleSelectHour = (hour12: number) => {
    const isPm = selectedDateParts.hour >= 12
    let hour24 = hour12 % 12
    if (isPm) hour24 += 12
    const updated = {
      ...selectedDateParts,
      hour: hour24,
    }
    const iso = formatPartsToIso(updated)
    setFormData((prev) => ({ ...prev, measured_at: iso }))
    setDisplayDateInput(formatPartsToDisplay(updated))
  }

  const handleSelectMinute = (minute: number) => {
    const updated = {
      ...selectedDateParts,
      minute,
    }
    const iso = formatPartsToIso(updated)
    setFormData((prev) => ({ ...prev, measured_at: iso }))
    setDisplayDateInput(formatPartsToDisplay(updated))
  }

  const handleSelectAmPm = (period: 'am' | 'pm') => {
    let hour24 = selectedDateParts.hour
    if (period === 'pm' && hour24 < 12) {
      hour24 += 12
    } else if (period === 'am' && hour24 >= 12) {
      hour24 -= 12
    }
    const updated = {
      ...selectedDateParts,
      hour: hour24,
    }
    const iso = formatPartsToIso(updated)
    setFormData((prev) => ({ ...prev, measured_at: iso }))
    setDisplayDateInput(formatPartsToDisplay(updated))
  }

  const handleTodayDate = () => {
    const now = new Date()
    const updated = {
      year: now.getFullYear(),
      month: now.getMonth() + 1,
      day: now.getDate(),
      hour: now.getHours(),
      minute: now.getMinutes(),
    }
    setViewYear(updated.year)
    setViewMonth(updated.month)
    const iso = formatPartsToIso(updated)
    setFormData((prev) => ({ ...prev, measured_at: iso }))
    setDisplayDateInput(formatPartsToDisplay(updated))
  }

  const handleClearDate = () => {
    setFormData((prev) => ({ ...prev, measured_at: '' }))
    setDisplayDateInput('')
  }

  const selectedPatient = patients.find((p) => p.patientId === selectedPatientId)

  // Real-time BMI calculation
  const bmiAssessment = useMemo(() => {
    const w = parseFloat(formData.weight_kg)
    const h = parseFloat(formData.height_cm)
    if (!w || !h || w <= 0 || h <= 0) {
      return { bmi: null, classification: '', pillColor: '' }
    }
    const heightM = h / 100
    const val = parseFloat((w / (heightM * heightM)).toFixed(1))
    if (val < 18.5) {
      return { bmi: val, classification: 'Underweight', pillColor: 'bg-[#EEF0FF] text-[#5B5FE8]' }
    }
    if (val < 25) {
      return { bmi: val, classification: 'Normal', pillColor: 'bg-[#2DD4BF]/20 text-[#0F766E]' }
    }
    if (val < 30) {
      return { bmi: val, classification: 'Overweight', pillColor: 'bg-[#F5A524]/20 text-[#B45309]' }
    }
    return { bmi: val, classification: 'Obese', pillColor: 'bg-[#F25F5C]/20 text-[#B91C1C]' }
  }, [formData.weight_kg, formData.height_cm])

  // Real-time heuristic vitals check
  const numSys = formData.bp_systolic ? Number(formData.bp_systolic) : null
  const numDia = formData.bp_diastolic ? Number(formData.bp_diastolic) : null
  const numHr = formData.heart_rate ? Number(formData.heart_rate) : null
  const numSpo2 = formData.spo2 ? Number(formData.spo2) : null
  const numTempC = formData.temperature_c ? Number(formData.temperature_c) : null

  const vitalsAssessment = checkVitalsRanges({
    bp_systolic: numSys,
    bp_diastolic: numDia,
    heart_rate: numHr,
    spo2: numSpo2,
    temperature_c: numTempC,
  })

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target

    if (name === 'temperature_c') {
      setTempDisplay(value)
      if (value.trim() === '') {
        setFormData((prev) => ({ ...prev, temperature_c: '' }))
      } else {
        const numVal = parseFloat(value)
        if (isNaN(numVal)) {
          setFormData((prev) => ({ ...prev, temperature_c: value }))
        } else if (tempUnit === 'F') {
          const cVal = (((numVal - 32) * 5) / 9).toFixed(1)
          setFormData((prev) => ({ ...prev, temperature_c: cVal }))
        } else {
          setFormData((prev) => ({ ...prev, temperature_c: value }))
        }
      }
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }))
    }

    if (validationErrors[name]) {
      setValidationErrors((prev) => {
        const next = { ...prev }
        delete next[name]
        return next
      })
    }
  }

  const handleUnitToggle = (unit: 'C' | 'F') => {
    if (unit === tempUnit) return

    if (unit === 'F') {
      setTempUnit('F')
      if (tempDisplay.trim() !== '') {
        const numC = parseFloat(tempDisplay)
        if (!isNaN(numC)) {
          const fVal = ((numC * 9) / 5 + 32).toFixed(1)
          setTempDisplay(fVal)
        }
      }
    } else {
      setTempUnit('C')
      if (formData.temperature_c) {
        setTempDisplay(formData.temperature_c)
      } else if (tempDisplay.trim() !== '') {
        const numF = parseFloat(tempDisplay)
        if (!isNaN(numF)) {
          const cVal = (((numF - 32) * 5) / 9).toFixed(1)
          setTempDisplay(cVal)
          setFormData((prev) => ({ ...prev, temperature_c: cVal }))
        }
      }
    }
  }

  const handleSymptomToggle = (symptom: string) => {
    setFormData((prev) => {
      const exists = prev.symptoms.includes(symptom)
      const newSymptoms = exists
        ? prev.symptoms.filter((s) => s !== symptom)
        : [...prev.symptoms, symptom]
      return { ...prev, symptoms: newSymptoms }
    })
  }

  const handleQuickObservationClick = (chip: string) => {
    setFormData((prev) => {
      const current = prev.notes.trim()
      if (!current) {
        return { ...prev, notes: chip }
      }
      if (current.includes(chip)) {
        const parts = current
          .split(',')
          .map((s) => s.trim())
          .filter((s) => s && s.toLowerCase() !== chip.toLowerCase())
        return { ...prev, notes: parts.join(', ') }
      }
      return { ...prev, notes: `${current}, ${chip}` }
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setServerError(null)
    setSuccessMessage(null)
    setValidationErrors({})

    if (!selectedPatientId) {
      setServerError('Please select an assigned patient to log vitals for.')
      return
    }

    const validationResult = vitalsLogSchema.safeParse({
      patient_id: selectedPatientId,
      bp_systolic: formData.bp_systolic,
      bp_diastolic: formData.bp_diastolic,
      heart_rate: formData.heart_rate,
      temperature_c: formData.temperature_c,
      spo2: formData.spo2,
      respiratory_rate: formData.respiratory_rate,
      pain_score: formData.pain_score,
      weight_kg: formData.weight_kg,
      height_cm: formData.height_cm,
      bmi: bmiAssessment.bmi,
      measurement_position: formData.measurement_position,
      bp_arm: formData.bp_arm,
      temp_method: formData.temp_method,
      oxygen_device: formData.oxygen_device,
      symptoms: formData.symptoms,
      symptoms_other: formData.symptoms_other,
      notes: formData.notes,
      medication_taken: formData.medication_taken,
      recorded_by_name: currentCaregiver?.fullName,
      staff_id_code: currentCaregiver?.staffId,
      measured_at: formData.measured_at ? new Date(formData.measured_at).toISOString() : new Date().toISOString(),
    })

    if (!validationResult.success) {
      const fieldErrors: Record<string, string> = {}
      validationResult.error.issues.forEach((issue) => {
        const path = issue.path[0] as string
        fieldErrors[path] = issue.message
      })
      setValidationErrors(fieldErrors)
      return
    }

    setIsSubmitting(true)

    const validatedData = validationResult.data
    const res = await submitVitalsLog({
      patient_id: validatedData.patient_id,
      bp_systolic: validatedData.bp_systolic,
      bp_diastolic: validatedData.bp_diastolic,
      heart_rate: validatedData.heart_rate,
      temperature_c: validatedData.temperature_c,
      spo2: validatedData.spo2,
      respiratory_rate: validatedData.respiratory_rate,
      pain_score: validatedData.pain_score,
      weight_kg: validatedData.weight_kg,
      height_cm: validatedData.height_cm,
      bmi: validatedData.bmi,
      measurement_position: validatedData.measurement_position,
      bp_arm: validatedData.bp_arm,
      temp_method: validatedData.temp_method,
      oxygen_device: validatedData.oxygen_device,
      symptoms: validatedData.symptoms,
      symptoms_other: validatedData.symptoms_other || null,
      notes: validatedData.notes || null,
      medication_taken: validatedData.medication_taken || null,
      recorded_by_name: currentCaregiver?.fullName || null,
      staff_id_code: currentCaregiver?.staffId || null,
      measured_at: validatedData.measured_at || new Date().toISOString(),
    })

    setIsSubmitting(false)

    if (res.error) {
      setServerError(
        `Database Error (${res.code || 'RLS'}): ${res.error}${res.details ? ` — ${res.details}` : ''}`
      )
      return
    }

    setSuccessMessage(
      `Clinical observation and vitals successfully logged for ${selectedPatient ? getPatientDisplayName(selectedPatient) : 'patient'}!`
    )
    setFormData({
      bp_systolic: '',
      bp_diastolic: '',
      heart_rate: '',
      temperature_c: '',
      spo2: '',
      respiratory_rate: '',
      pain_score: '',
      weight_kg: '',
      height_cm: '',
      measurement_position: 'Sitting',
      bp_arm: 'Left',
      temp_method: 'Oral',
      oxygen_device: 'Room Air',
      symptoms: [],
      symptoms_other: '',
      medication_taken: '',
      measured_at: new Date().toISOString().slice(0, 16),
      notes: '',
    })
    setTempDisplay('')

    router.refresh()
  }

  // Range Badges
  const renderBpBadge = () => {
    if (!formData.bp_systolic && !formData.bp_diastolic) return null
    if (numSys !== null && numDia !== null && !isNaN(numSys) && !isNaN(numDia)) {
      if (numSys >= 140 || numDia >= 90) {
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#F25F5C]/10 border border-[#F25F5C]/30 px-3 py-1 text-sm font-black uppercase tracking-wider text-[#B91C1C]">
            <AlertTriangle className="h-4 w-4 text-[#F25F5C]" /> Elevated (High)
          </span>
        )
      }
      if (numSys >= 130 || numDia >= 85) {
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#F5A524]/10 border border-[#F5A524]/30 px-3 py-1 text-sm font-black uppercase tracking-wider text-[#B45309]">
            <AlertTriangle className="h-4 w-4 text-[#F5A524]" /> Elevated
          </span>
        )
      }
      if (numSys < 90 || numDia < 60) {
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#F5A524]/10 border border-[#F5A524]/30 px-3 py-1 text-sm font-black uppercase tracking-wider text-[#B45309]">
            <AlertTriangle className="h-4 w-4 text-[#F5A524]" /> Low
          </span>
        )
      }
      if (numSys >= 90 && numSys <= 120 && numDia >= 60 && numDia <= 80) {
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#2DD4BF]/10 border border-[#2DD4BF]/30 px-3 py-1 text-sm font-black uppercase tracking-wider text-[#0F766E]">
            <CheckCircle2 className="h-4 w-4 text-[#2DD4BF]" /> Normal
          </span>
        )
      }
    }
    return null
  }

  const renderHrBadge = () => {
    if (!formData.heart_rate || numHr === null || isNaN(numHr) || numHr <= 0) return null
    if (numHr > 120) {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#F25F5C]/10 border border-[#F25F5C]/30 px-3 py-1 text-sm font-black uppercase tracking-wider text-[#B91C1C]">
          <AlertTriangle className="h-4 w-4 text-[#F25F5C]" /> High ({numHr} bpm)
        </span>
      )
    }
    if (numHr > 100) {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#F5A524]/10 border border-[#F5A524]/30 px-3 py-1 text-sm font-black uppercase tracking-wider text-[#B45309]">
          <AlertTriangle className="h-4 w-4 text-[#F5A524]" /> Elevated
        </span>
      )
    }
    if (numHr < 60) {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#F5A524]/10 border border-[#F5A524]/30 px-3 py-1 text-sm font-black uppercase tracking-wider text-[#B45309]">
          <AlertTriangle className="h-4 w-4 text-[#F5A524]" /> Low
        </span>
      )
    }
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-[#2DD4BF]/10 border border-[#2DD4BF]/30 px-3 py-1 text-sm font-black uppercase tracking-wider text-[#0F766E]">
        <CheckCircle2 className="h-4 w-4 text-[#2DD4BF]" /> Normal
      </span>
    )
  }

  const renderSpo2Badge = () => {
    if (!formData.spo2 || numSpo2 === null || isNaN(numSpo2) || numSpo2 <= 0) return null
    if (numSpo2 < 90) {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#F25F5C]/10 border border-[#F25F5C]/30 px-3 py-1 text-sm font-black uppercase tracking-wider text-[#B91C1C]">
          <AlertTriangle className="h-4 w-4 text-[#F25F5C]" /> Critical Low
        </span>
      )
    }
    if (numSpo2 < 95) {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#F5A524]/10 border border-[#F5A524]/30 px-3 py-1 text-sm font-black uppercase tracking-wider text-[#B45309]">
          <AlertTriangle className="h-4 w-4 text-[#F5A524]" /> Low (&lt;95%)
        </span>
      )
    }
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-[#2DD4BF]/10 border border-[#2DD4BF]/30 px-3 py-1 text-sm font-black uppercase tracking-wider text-[#0F766E]">
        <CheckCircle2 className="h-4 w-4 text-[#2DD4BF]" /> Normal
      </span>
    )
  }

  const renderTempBadge = () => {
    if (!formData.temperature_c || numTempC === null || isNaN(numTempC) || numTempC <= 0) return null
    if (numTempC >= 38.0) {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#F25F5C]/10 border border-[#F25F5C]/30 px-3 py-1 text-sm font-black uppercase tracking-wider text-[#B91C1C]">
          <AlertTriangle className="h-4 w-4 text-[#F25F5C]" /> High Fever
        </span>
      )
    }
    if (numTempC > 37.5) {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#F5A524]/10 border border-[#F5A524]/30 px-3 py-1 text-sm font-black uppercase tracking-wider text-[#B45309]">
          <AlertTriangle className="h-4 w-4 text-[#F5A524]" /> Elevated
        </span>
      )
    }
    if (numTempC < 36.0) {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#F5A524]/10 border border-[#F5A524]/30 px-3 py-1 text-sm font-black uppercase tracking-wider text-[#B45309]">
          <AlertTriangle className="h-4 w-4 text-[#F5A524]" /> Low
        </span>
      )
    }
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-[#2DD4BF]/10 border border-[#2DD4BF]/30 px-3 py-1 text-sm font-black uppercase tracking-wider text-[#0F766E]">
        <CheckCircle2 className="h-4 w-4 text-[#2DD4BF]" /> Normal
      </span>
    )
  }

  const renderRespBadge = () => {
    if (!formData.respiratory_rate) return null
    const rr = Number(formData.respiratory_rate)
    if (isNaN(rr) || rr <= 0) return null
    if (rr > 24) {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#F25F5C]/10 border border-[#F25F5C]/30 px-3 py-1 text-sm font-black uppercase tracking-wider text-[#B91C1C]">
          <AlertTriangle className="h-4 w-4 text-[#F25F5C]" /> Tachypnea ({rr})
        </span>
      )
    }
    if (rr > 20) {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#F5A524]/10 border border-[#F5A524]/30 px-3 py-1 text-sm font-black uppercase tracking-wider text-[#B45309]">
          <AlertTriangle className="h-4 w-4 text-[#F5A524]" /> Elevated
        </span>
      )
    }
    if (rr < 12) {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#F5A524]/10 border border-[#F5A524]/30 px-3 py-1 text-sm font-black uppercase tracking-wider text-[#B45309]">
          <AlertTriangle className="h-4 w-4 text-[#F5A524]" /> Low (&lt;12)
        </span>
      )
    }
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-[#2DD4BF]/10 border border-[#2DD4BF]/30 px-3 py-1 text-sm font-black uppercase tracking-wider text-[#0F766E]">
        <CheckCircle2 className="h-4 w-4 text-[#2DD4BF]" /> Normal
      </span>
    )
  }

  if (patients.length === 0) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-xs">
        <AlertCircle className="mx-auto h-12 w-12 text-[#5B5FE8]" />
        <h3 className="mt-4 text-xl font-black text-[#1E2243]">No Assigned Patients</h3>
        <p className="mt-2 text-base font-semibold text-slate-500">
          You are not currently assigned to any active patient care teams. Please contact an administrator to assign you to a patient.
        </p>
      </div>
    )
  }

  const patientAge = selectedPatient?.age ?? calculateAge(selectedPatient?.dateOfBirth)
  const bmiValue = bmiAssessment.bmi
  const bmiCategory = bmiAssessment.classification

  const currentWeightNum = formData.weight_kg ? Math.round(parseFloat(formData.weight_kg)) : null
  const currentHeightNum = formData.height_cm ? Math.round(parseFloat(formData.height_cm)) : null

  const calendarDays = useMemo(() => getCalendarDays(viewYear, viewMonth), [viewYear, viewMonth])
  const today = useMemo(() => new Date(), [])

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* SECTION 1: Patient Information Card */}
      <div className="rounded-3xl border border-slate-200/80 bg-white p-6 sm:p-8 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h2 className="text-xl sm:text-2xl font-black text-[#1E2243] flex items-center gap-2.5">
            <User className="h-6 w-6 text-[#5B5FE8] shrink-0" />
            1. Patient Information
          </h2>
          {selectedPatient && (() => {
            const statusConfig = getStatusBadgeConfig(selectedPatient.currentStatus)
            const StatusIcon = statusConfig.Icon

            return (
              <div className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 shadow-xs self-start sm:self-auto ${statusConfig.pillBg}`}>
                {/* Status Icon Circle */}
                <div className={`flex h-6 w-6 items-center justify-center rounded-full text-white ${statusConfig.iconBg}`}>
                  <StatusIcon className="h-3.5 w-3.5" />
                </div>

                {/* Vertical Divider */}
                <span className={`h-4 w-px ${statusConfig.dividerColor}`} />

                {/* Status Label */}
                <span className={`text-xs sm:text-sm font-black uppercase tracking-wider pr-1 ${statusConfig.textColor}`}>
                  {statusConfig.label}
                </span>
              </div>
            )
          })()}
        </div>

        <div>
          <label htmlFor="patient_id" className="block text-xs sm:text-sm font-bold uppercase tracking-wide text-slate-500 mb-2">
            Select Patient
          </label>
          <CustomSelect
            id="patient_id"
            name="patient_id"
            value={selectedPatientId}
            onChange={(val) => setSelectedPatientId(val)}
            options={patients.map((p) => ({
              value: p.patientId,
              label: getPatientDisplayName(p),
            }))}
            ariaLabel="Select Patient"
          />
        </div>

        {/* Compact Summary Row & Toggle */}
        {selectedPatient && (
          <div className="mt-4 flex items-center justify-between pt-4 border-t border-slate-100">
            <p className="text-sm font-bold text-slate-500">
              MRN: <span className="font-black text-[#1E2243]">{selectedPatient?.patientId ? `MRN-${selectedPatient.patientId.slice(0, 8).toUpperCase()}` : 'N/A'}</span>
            </p>
            <button
              type="button"
              onClick={() => setShowPatientDetails((prev) => !prev)}
              className="inline-flex items-center gap-1.5 text-sm sm:text-base font-bold text-[#5B5FE8] hover:text-[#4A4ED4] transition-colors cursor-pointer"
            >
              <span>{showPatientDetails ? 'Hide Patient Details' : 'View Patient Details'}</span>
              <ChevronDown
                className={`h-5 w-5 transform transition-transform duration-200 ${
                  showPatientDetails ? 'rotate-180' : ''
                }`}
              />
            </button>
          </div>
        )}

        {/* Collapsible Full Patient Details */}
        {showPatientDetails && selectedPatient && (
          <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-4 gap-3.5 animate-in fade-in duration-200">
            {/* Patient MRN */}
            <div className="rounded-2xl border border-slate-200/80 bg-slate-50/60 p-4">
              <span className="block text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-500 mb-1">
                Patient MRN
              </span>
              <span className="block text-base sm:text-lg font-black text-[#1E2243]">
                {selectedPatient?.patientId ? `MRN-${selectedPatient.patientId.slice(0, 8).toUpperCase()}` : 'N/A'}
              </span>
            </div>

            {/* Age & Sex */}
            <div className="rounded-2xl border border-slate-200/80 bg-slate-50/60 p-4">
              <span className="block text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-500 mb-1">
                Age & Sex
              </span>
              <span className="block text-base sm:text-lg font-black text-[#1E2243]">
                {patientAge !== null ? `${patientAge} yrs • ` : ''}{selectedPatient?.sex || 'N/A'}
              </span>
            </div>

            {/* Room / Bed */}
            <div className="rounded-2xl border border-slate-200/80 bg-slate-50/60 p-4">
              <span className="block text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-500 mb-1">
                Room / Bed
              </span>
              <span className="block text-base sm:text-lg font-black text-[#1E2243]">
                {selectedPatient?.roomBed || 'General Care'}
              </span>
            </div>

            {/* Primary Condition */}
            <div className="rounded-2xl border border-slate-200/80 bg-slate-50/60 p-4">
              <span className="block text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-500 mb-1">
                Primary Condition
              </span>
              <span className="block text-base sm:text-lg font-black text-[#1E2243] break-words">
                {selectedPatient?.primaryCondition || 'None documented'}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* SECTION 2: Vital Signs Measurements Card */}
      <div className="rounded-3xl border border-slate-200/80 bg-white p-6 sm:p-8 shadow-xs space-y-7">
        <h2 className="text-xl sm:text-2xl font-black text-[#1E2243] flex items-center gap-2.5">
          <Activity className="h-6 w-6 text-[#5B5FE8] shrink-0" />
          2. Vital Signs Measurements
        </h2>

        {/* Blood Pressure Duo */}
        <div>
          <div className="flex items-center justify-between mb-2.5">
            <label className="flex items-center gap-2 text-base sm:text-lg font-extrabold text-[#1E2243]">
              <Activity className="h-5 w-5 text-[#5B5FE8]" />
              Blood Pressure
              <span className="text-xs sm:text-sm font-bold px-3 py-0.5 rounded-full bg-[#EEF0FF] text-[#5B5FE8] border border-[#5B5FE8]/20">mmHg</span>
            </label>
            {renderBpBadge()}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="text-xs sm:text-sm font-bold uppercase tracking-wide text-slate-500 mb-1.5 block">
                Systolic (Top)
              </span>
              <input
                type="number"
                name="bp_systolic"
                inputMode="numeric"
                placeholder="120"
                value={formData.bp_systolic}
                onChange={handleChange}
                className={`mt-1 block w-full min-h-[64px] py-4 px-5 text-2xl sm:text-3xl font-black text-[#1E2243] tracking-tight rounded-2xl border bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-4 transition-all ${
                  validationErrors.bp_systolic
                    ? 'border-[#F25F5C] focus:ring-[#F25F5C]/20 bg-[#F25F5C]/5 text-[#F25F5C]'
                    : 'border-slate-200 focus:border-[#5B5FE8] focus:ring-[#5B5FE8]/15'
                }`}
              />
              <span className="mt-2 inline-block text-xs sm:text-sm font-semibold text-slate-500 bg-slate-100 px-3 py-1 rounded-xl">
                Normal range: 90–120 mmHg
              </span>
              {validationErrors.bp_systolic && (
                <p className="mt-1.5 text-sm text-[#F25F5C] font-bold">{validationErrors.bp_systolic}</p>
              )}
            </div>
            <div>
              <span className="text-xs sm:text-sm font-bold uppercase tracking-wide text-slate-500 mb-1.5 block">
                Diastolic (Bottom)
              </span>
              <input
                type="number"
                name="bp_diastolic"
                inputMode="numeric"
                placeholder="80"
                value={formData.bp_diastolic}
                onChange={handleChange}
                className={`mt-1 block w-full min-h-[64px] py-4 px-5 text-2xl sm:text-3xl font-black text-[#1E2243] tracking-tight rounded-2xl border bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-4 transition-all ${
                  validationErrors.bp_diastolic
                    ? 'border-[#F25F5C] focus:ring-[#F25F5C]/20 bg-[#F25F5C]/5 text-[#F25F5C]'
                    : 'border-slate-200 focus:border-[#5B5FE8] focus:ring-[#5B5FE8]/15'
                }`}
              />
              <span className="mt-2 inline-block text-xs sm:text-sm font-semibold text-slate-500 bg-slate-100 px-3 py-1 rounded-xl">
                Normal range: 60–80 mmHg
              </span>
              {validationErrors.bp_diastolic && (
                <p className="mt-1.5 text-sm text-[#F25F5C] font-bold">{validationErrors.bp_diastolic}</p>
              )}
            </div>
          </div>
          <p className="mt-3 text-sm font-medium text-slate-400">Normal clinical baseline: 90–120 / 60–80 mmHg</p>
        </div>

        {/* Heart Rate & SpO2 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div>
            <div className="flex items-center justify-between mb-2">
              <label htmlFor="heart_rate" className="flex items-center gap-2 text-base sm:text-lg font-extrabold text-[#1E2243]">
                <Heart className="h-5 w-5 text-[#5B5FE8]" />
                Heart Rate
                <span className="text-xs sm:text-sm font-bold px-3 py-0.5 rounded-full bg-[#EEF0FF] text-[#5B5FE8] border border-[#5B5FE8]/20">bpm</span>
              </label>
              {renderHrBadge()}
            </div>
            <input
              id="heart_rate"
              type="number"
              name="heart_rate"
              inputMode="numeric"
              placeholder="72"
              value={formData.heart_rate}
              onChange={handleChange}
              className={`block w-full min-h-[64px] py-4 px-5 text-2xl sm:text-3xl font-black text-[#1E2243] tracking-tight rounded-2xl border bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-4 transition-all ${
                validationErrors.heart_rate
                  ? 'border-[#F25F5C] focus:ring-[#F25F5C]/20 bg-[#F25F5C]/5 text-[#F25F5C]'
                  : 'border-slate-200 focus:border-[#5B5FE8] focus:ring-[#5B5FE8]/15'
              }`}
            />
            <span className="mt-2 inline-block text-xs sm:text-sm font-semibold text-slate-500 bg-slate-100 px-3 py-1 rounded-xl">
              Normal range: 60–100 bpm (resting)
            </span>
            {validationErrors.heart_rate && (
              <p className="mt-1.5 text-sm text-[#F25F5C] font-bold">{validationErrors.heart_rate}</p>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label htmlFor="spo2" className="flex items-center gap-2 text-base sm:text-lg font-extrabold text-[#1E2243]">
                <Droplets className="h-5 w-5 text-[#5B5FE8]" />
                Oxygen SpO₂
                <span className="text-xs sm:text-sm font-bold px-3 py-0.5 rounded-full bg-[#EEF0FF] text-[#5B5FE8] border border-[#5B5FE8]/20">%</span>
              </label>
              {renderSpo2Badge()}
            </div>
            <input
              id="spo2"
              type="number"
              name="spo2"
              inputMode="numeric"
              placeholder="98"
              value={formData.spo2}
              onChange={handleChange}
              className={`block w-full min-h-[64px] py-4 px-5 text-2xl sm:text-3xl font-black text-[#1E2243] tracking-tight rounded-2xl border bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-4 transition-all ${
                validationErrors.spo2
                  ? 'border-[#F25F5C] focus:ring-[#F25F5C]/20 bg-[#F25F5C]/5 text-[#F25F5C]'
                  : 'border-slate-200 focus:border-[#5B5FE8] focus:ring-[#5B5FE8]/15'
              }`}
            />
            <span className="mt-2 inline-block text-xs sm:text-sm font-semibold text-slate-500 bg-slate-100 px-3 py-1 rounded-xl">
              Normal range: 95%–100%
            </span>
            {validationErrors.spo2 && (
              <p className="mt-1.5 text-sm text-[#F25F5C] font-bold">{validationErrors.spo2}</p>
            )}
          </div>
        </div>

        {/* Temperature & Respiratory Rate */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <label htmlFor="temperature_c" className="flex items-center gap-1.5 text-base sm:text-lg font-extrabold text-[#1E2243]">
                  <Thermometer className="h-5 w-5 text-[#5B5FE8]" />
                  Body Temperature
                </label>
                <div role="group" aria-label="Temperature unit selection" className="inline-flex rounded-xl border border-slate-200 bg-slate-100 p-0.5 text-sm font-bold">
                  <button
                    type="button"
                    onClick={() => handleUnitToggle('C')}
                    className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                      tempUnit === 'C' ? 'bg-[#5B5FE8] text-white shadow-xs' : 'text-slate-500 hover:text-[#1E2243]'
                    }`}
                  >
                    °C
                  </button>
                  <button
                    type="button"
                    onClick={() => handleUnitToggle('F')}
                    className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                      tempUnit === 'F' ? 'bg-[#5B5FE8] text-white shadow-xs' : 'text-slate-500 hover:text-[#1E2243]'
                    }`}
                  >
                    °F
                  </button>
                </div>
              </div>
              {renderTempBadge()}
            </div>
            <input
              id="temperature_c"
              type="number"
              step="0.1"
              name="temperature_c"
              inputMode="decimal"
              placeholder={tempUnit === 'C' ? '36.8' : '98.2'}
              value={tempDisplay}
              onChange={handleChange}
              className={`block w-full min-h-[64px] py-4 px-5 text-2xl sm:text-3xl font-black text-[#1E2243] tracking-tight rounded-2xl border bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-4 transition-all ${
                validationErrors.temperature_c
                  ? 'border-[#F25F5C] focus:ring-[#F25F5C]/20 bg-[#F25F5C]/5 text-[#F25F5C]'
                  : 'border-slate-200 focus:border-[#5B5FE8] focus:ring-[#5B5FE8]/15'
              }`}
            />
            <span className="mt-2 inline-block text-xs sm:text-sm font-semibold text-slate-500 bg-slate-100 px-3 py-1 rounded-xl">
              Normal range: 36.1°C–37.2°C (97.0°F–99.0°F)
            </span>
            {validationErrors.temperature_c && (
              <p className="mt-1.5 text-sm text-[#F25F5C] font-bold">{validationErrors.temperature_c}</p>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label htmlFor="respiratory_rate" className="flex items-center gap-2 text-base sm:text-lg font-extrabold text-[#1E2243]">
                <Wind className="h-5 w-5 text-[#5B5FE8]" />
                Respiration
                <span className="text-xs sm:text-sm font-bold px-3 py-0.5 rounded-full bg-[#EEF0FF] text-[#5B5FE8] border border-[#5B5FE8]/20">breaths/min</span>
              </label>
              {renderRespBadge()}
            </div>
            <input
              id="respiratory_rate"
              type="number"
              name="respiratory_rate"
              inputMode="numeric"
              placeholder="16"
              value={formData.respiratory_rate}
              onChange={handleChange}
              className={`block w-full min-h-[64px] py-4 px-5 text-2xl sm:text-3xl font-black text-[#1E2243] tracking-tight rounded-2xl border bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-4 transition-all ${
                validationErrors.respiratory_rate
                  ? 'border-[#F25F5C] focus:ring-[#F25F5C]/20 bg-[#F25F5C]/5 text-[#F25F5C]'
                  : 'border-slate-200 focus:border-[#5B5FE8] focus:ring-[#5B5FE8]/15'
              }`}
            />
            <span className="mt-2 inline-block text-xs sm:text-sm font-semibold text-slate-500 bg-slate-100 px-3 py-1 rounded-xl">
              Normal range: 12–20 breaths/min
            </span>
            {validationErrors.respiratory_rate && (
              <p className="mt-1.5 text-sm text-[#F25F5C] font-bold">{validationErrors.respiratory_rate}</p>
            )}
          </div>
        </div>

        {/* Pain Score (0–10 Scale) with color-coded touch tiles */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <label className="flex items-center gap-2 text-base sm:text-lg font-extrabold text-[#1E2243]">
              <Smile className="h-5 w-5 text-[#5B5FE8]" />
              Pain Score (0–10 Scale)
            </label>
            {formData.pain_score !== '' && (
              <span className="text-xs sm:text-sm font-bold uppercase tracking-wider text-[#5B5FE8] bg-[#EEF0FF] border border-[#5B5FE8]/30 px-3.5 py-1 rounded-full">
                Selected: {PAIN_LEVELS[Number(formData.pain_score)]?.label}
              </span>
            )}
          </div>
          <div className="grid grid-cols-6 sm:grid-cols-11 gap-2 sm:gap-2.5">
            {PAIN_LEVELS.map((level) => {
              const isSelected = formData.pain_score === String(level.score)
              const isLow = level.score <= 3
              const isMid = level.score >= 4 && level.score <= 6

              let selectedClass = ''
              let subLabelColor = ''
              if (isSelected) {
                if (isLow) {
                  selectedClass = 'bg-[#2DD4BF] border-[#2DD4BF] text-white shadow-md scale-105'
                  subLabelColor = 'text-white'
                } else if (isMid) {
                  selectedClass = 'bg-[#F5A524] border-[#F5A524] text-white shadow-md scale-105'
                  subLabelColor = 'text-white'
                } else {
                  selectedClass = 'bg-[#F25F5C] border-[#F25F5C] text-white shadow-md scale-105'
                  subLabelColor = 'text-white'
                }
              } else {
                selectedClass = 'border border-slate-200 bg-slate-50 text-[#1E2243] hover:border-[#5B5FE8]/50 font-black'
                subLabelColor = 'text-slate-400'
              }

              return (
                <button
                  key={level.score}
                  type="button"
                  onClick={() =>
                    setFormData((prev) => ({
                      ...prev,
                      pain_score: isSelected ? '' : String(level.score),
                    }))
                  }
                  className={`min-h-[68px] min-w-[50px] sm:min-w-[58px] rounded-2xl font-black border transition-all flex flex-col items-center justify-center p-1.5 cursor-pointer ${selectedClass}`}
                >
                  <span className="text-xl sm:text-2xl font-black leading-none">{level.score}</span>
                  <span className={`text-xs sm:text-sm font-black uppercase tracking-tight truncate w-full text-center mt-0.5 ${subLabelColor}`}>
                    {level.score === 0 ? 'None' : level.score === 5 ? 'Mod' : level.score === 10 ? 'Worst' : ''}
                  </span>
                </button>
              )
            })}
          </div>
          {validationErrors.pain_score && (
            <p className="mt-2 text-sm text-[#F25F5C] font-bold">{validationErrors.pain_score}</p>
          )}
        </div>
      </div>

      {/* SECTION 3: Body Measurements & BMI */}
      <div className="rounded-3xl border border-slate-200/80 bg-white p-6 sm:p-8 shadow-xs space-y-4">
        {/* Scoped CSS to eliminate native number spinner arrows */}
        <style>{`
          #weight_kg::-webkit-outer-spin-button,
          #weight_kg::-webkit-inner-spin-button,
          #height_cm::-webkit-outer-spin-button,
          #height_cm::-webkit-inner-spin-button {
            -webkit-appearance: none;
            margin: 0;
          }
          #weight_kg,
          #height_cm {
            -moz-appearance: textfield;
          }
        `}</style>

        <h2 className="text-xl sm:text-2xl font-black text-[#1E2243] flex items-center gap-2.5">
          <Scale className="h-6 w-6 text-[#5B5FE8]" />
          3. Body Measurements & BMI
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
          {/* Column 1: Weight */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label htmlFor="weight_kg" className="text-xs sm:text-sm font-bold uppercase tracking-wide text-slate-500">
                Weight
              </label>
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-[#EEF0FF] text-[#5B5FE8] border border-[#5B5FE8]/20">
                KG
              </span>
            </div>
            <div className="relative" ref={weightContainerRef}>
              <input
                id="weight_kg"
                type="number"
                step="0.1"
                name="weight_kg"
                inputMode="decimal"
                placeholder="70"
                value={formData.weight_kg}
                onChange={handleChange}
                className={`block w-full min-h-[64px] rounded-2xl border bg-slate-50/50 pl-5 pr-14 py-3.5 text-2xl sm:text-3xl font-black tracking-tight text-[#1E2243] focus:border-[#5B5FE8] focus:bg-white focus:outline-none focus:ring-4 focus:ring-[#5B5FE8]/15 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:m-0 [&::-webkit-inner-spin-button]:m-0 ${
                  validationErrors.weight_kg
                    ? 'border-[#F25F5C] focus:ring-[#F25F5C]/20 bg-[#F25F5C]/5 text-[#F25F5C]'
                    : 'border-slate-200'
                }`}
              />
              <button
                type="button"
                onClick={() => setIsWeightOpen((prev) => !prev)}
                aria-label="Toggle weight options dropdown"
                aria-expanded={isWeightOpen}
                className="absolute right-2 top-1/2 -translate-y-1/2 h-11 w-11 flex items-center justify-center rounded-xl text-slate-400 hover:text-[#5B5FE8] hover:bg-[#EEF0FF] active:bg-[#EEF0FF]/80 transition-colors cursor-pointer"
              >
                <ChevronDown
                  className={`h-5 w-5 transform transition-transform duration-200 ${
                    isWeightOpen ? 'rotate-180 text-[#5B5FE8]' : ''
                  }`}
                />
              </button>

              {isWeightOpen && (
                <div
                  ref={weightListRef}
                  className="absolute z-50 left-0 right-0 top-full mt-2 max-h-60 overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-xl py-1.5 focus:outline-none"
                >
                  {WEIGHT_OPTIONS.map((val) => {
                    const isSelected = currentWeightNum === val
                    return (
                      <button
                        key={val}
                        type="button"
                        data-selected={isSelected ? 'true' : undefined}
                        onClick={() => handleSelectWeight(val)}
                        className={`w-full text-left px-5 py-2.5 text-base sm:text-lg font-bold transition-colors cursor-pointer flex items-center justify-between ${
                          isSelected
                            ? 'bg-[#EEF0FF] text-[#5B5FE8]'
                            : 'text-[#1E2243] hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-baseline gap-1.5">
                          <span>{val}</span>
                          <span className="text-xs font-semibold text-slate-400">kg</span>
                        </div>
                        {isSelected && <Check className="h-4 w-4 text-[#5B5FE8] shrink-0" />}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
            {validationErrors.weight_kg && (
              <p className="mt-1.5 text-sm text-[#F25F5C] font-bold">{validationErrors.weight_kg}</p>
            )}
          </div>

          {/* Column 2: Height */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label htmlFor="height_cm" className="text-xs sm:text-sm font-bold uppercase tracking-wide text-slate-500">
                Height
              </label>
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-[#EEF0FF] text-[#5B5FE8] border border-[#5B5FE8]/20">
                CM
              </span>
            </div>
            <div className="relative" ref={heightContainerRef}>
              <input
                id="height_cm"
                type="number"
                step="0.5"
                name="height_cm"
                inputMode="decimal"
                placeholder="170"
                value={formData.height_cm}
                onChange={handleChange}
                className={`block w-full min-h-[64px] rounded-2xl border bg-slate-50/50 pl-5 pr-14 py-3.5 text-2xl sm:text-3xl font-black tracking-tight text-[#1E2243] focus:border-[#5B5FE8] focus:bg-white focus:outline-none focus:ring-4 focus:ring-[#5B5FE8]/15 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:m-0 [&::-webkit-inner-spin-button]:m-0 ${
                  validationErrors.height_cm
                    ? 'border-[#F25F5C] focus:ring-[#F25F5C]/20 bg-[#F25F5C]/5 text-[#F25F5C]'
                    : 'border-slate-200'
                }`}
              />
              <button
                type="button"
                onClick={() => setIsHeightOpen((prev) => !prev)}
                aria-label="Toggle height options dropdown"
                aria-expanded={isHeightOpen}
                className="absolute right-2 top-1/2 -translate-y-1/2 h-11 w-11 flex items-center justify-center rounded-xl text-slate-400 hover:text-[#5B5FE8] hover:bg-[#EEF0FF] active:bg-[#EEF0FF]/80 transition-colors cursor-pointer"
              >
                <ChevronDown
                  className={`h-5 w-5 transform transition-transform duration-200 ${
                    isHeightOpen ? 'rotate-180 text-[#5B5FE8]' : ''
                  }`}
                />
              </button>

              {isHeightOpen && (
                <div
                  ref={heightListRef}
                  className="absolute z-50 left-0 right-0 top-full mt-2 max-h-60 overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-xl py-1.5 focus:outline-none"
                >
                  {HEIGHT_OPTIONS.map((val) => {
                    const isSelected = currentHeightNum === val
                    return (
                      <button
                        key={val}
                        type="button"
                        data-selected={isSelected ? 'true' : undefined}
                        onClick={() => handleSelectHeight(val)}
                        className={`w-full text-left px-5 py-2.5 text-base sm:text-lg font-bold transition-colors cursor-pointer flex items-center justify-between ${
                          isSelected
                            ? 'bg-[#EEF0FF] text-[#5B5FE8]'
                            : 'text-[#1E2243] hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-baseline gap-1.5">
                          <span>{val}</span>
                          <span className="text-xs font-semibold text-slate-400">cm</span>
                        </div>
                        {isSelected && <Check className="h-4 w-4 text-[#5B5FE8] shrink-0" />}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
            {validationErrors.height_cm && (
              <p className="mt-1.5 text-sm text-[#F25F5C] font-bold">{validationErrors.height_cm}</p>
            )}
          </div>

          {/* Column 3: Auto-Calculated BMI Card */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs sm:text-sm font-bold uppercase tracking-wide text-slate-500">
                Calculated BMI
              </span>
              <span className="text-xs font-medium text-slate-400">
                kg/m²
              </span>
            </div>
            <div className="min-h-[64px] rounded-2xl bg-[#1E2243] px-5 py-3 text-white flex items-center justify-between shadow-sm border border-slate-800">
              <div className="flex flex-col justify-center">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  BMI Score
                </span>
                <span className="text-2xl sm:text-3xl font-black tracking-tight text-white leading-none mt-0.5">
                  {bmiValue ? bmiValue : '—'}
                </span>
              </div>

              {/* Dynamic Category Pill */}
              {bmiCategory && (
                <span
                  className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider shadow-sm ${
                    bmiCategory === 'Normal'
                      ? 'bg-[#2DD4BF] text-[#0F766E]'
                      : bmiCategory === 'Overweight'
                      ? 'bg-[#F5A524] text-white'
                      : bmiCategory === 'Underweight'
                      ? 'bg-[#EEF0FF] text-[#5B5FE8]'
                      : 'bg-[#F25F5C] text-white'
                  }`}
                >
                  {bmiCategory}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 4: Clinical Measurement Details */}
      <div className="rounded-3xl border border-slate-200/80 bg-white p-6 sm:p-8 shadow-xs space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl sm:text-2xl font-black text-[#1E2243] flex items-center gap-2.5">
            <Compass className="h-6 w-6 text-[#5B5FE8] shrink-0" />
            4. Clinical Measurement Details
          </h2>
          <span className="text-xs sm:text-sm font-medium text-slate-400">Defaulted for routine rounds</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          <div>
            <label htmlFor="measured_at" className="block text-xs sm:text-sm font-bold uppercase tracking-wide text-slate-500 mb-2 flex items-center gap-2">
              <Clock className="h-4 w-4 text-[#5B5FE8]" /> Date & Time Taken
            </label>
            <div className="relative" ref={datePickerContainerRef}>
              <input
                id="measured_at"
                type="text"
                name="measured_at"
                value={displayDateInput}
                onChange={handleDateInputChange}
                onBlur={handleDateInputBlur}
                onClick={() => {
                  if (!isDatePickerOpen) setIsDatePickerOpen(true)
                }}
                placeholder="DD/MM/YYYY hh:mm am/pm"
                className="w-full min-h-[56px] py-3.5 pl-4 pr-12 text-base sm:text-lg font-bold text-[#1E2243] rounded-2xl border border-slate-200 bg-slate-50/50 focus:border-[#5B5FE8] focus:bg-white focus:ring-4 focus:ring-[#5B5FE8]/15 focus:outline-none transition-all cursor-pointer"
              />
              <button
                type="button"
                onClick={() => setIsDatePickerOpen((prev) => !prev)}
                aria-label="Toggle custom date & time picker"
                className="absolute right-2 top-1/2 -translate-y-1/2 h-10 w-10 flex items-center justify-center rounded-xl text-slate-400 hover:text-[#5B5FE8] hover:bg-[#EEF0FF] transition-colors cursor-pointer"
              >
                <Calendar className="h-5 w-5" />
              </button>

              {isDatePickerOpen && (
                <div className="absolute z-50 left-0 top-full mt-2 w-[calc(100vw-2.5rem)] sm:w-[450px] max-w-[450px] rounded-3xl border border-slate-200 bg-white p-4 sm:p-5 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
                  <div className="flex flex-col sm:flex-row gap-4 sm:gap-5 items-stretch">
                    {/* Calendar Portion */}
                    <div className="flex-1 min-w-[230px]">
                      {/* Month/Year Header */}
                      <div className="flex items-center justify-between mb-2.5 px-1">
                        <span className="text-sm sm:text-base font-black text-[#1E2243]">
                          {MONTH_NAMES[viewMonth - 1]} {viewYear}
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={handlePrevMonth}
                            aria-label="Previous month"
                            className="h-8 w-8 flex items-center justify-center rounded-xl text-slate-500 hover:text-[#5B5FE8] hover:bg-[#EEF0FF] transition-colors cursor-pointer"
                          >
                            <ChevronLeft className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={handleNextMonth}
                            aria-label="Next month"
                            className="h-8 w-8 flex items-center justify-center rounded-xl text-slate-500 hover:text-[#5B5FE8] hover:bg-[#EEF0FF] transition-colors cursor-pointer"
                          >
                            <ChevronRight className="h-4 w-4" />
                          </button>
                        </div>
                      </div>

                      {/* Day of Week Headers */}
                      <div className="grid grid-cols-7 gap-1 text-center mb-1.5">
                        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
                          <span key={d} className="text-xs font-bold uppercase tracking-wider text-slate-400 py-0.5">
                            {d}
                          </span>
                        ))}
                      </div>

                      {/* Calendar Days Grid */}
                      <div className="grid grid-cols-7 gap-1">
                        {calendarDays.map((cell, idx) => {
                          const isSelected =
                            selectedDateParts.year === cell.year &&
                            selectedDateParts.month === cell.month &&
                            selectedDateParts.day === cell.day
                          const isToday =
                            today.getFullYear() === cell.year &&
                            today.getMonth() + 1 === cell.month &&
                            today.getDate() === cell.day

                          let cellStyle = 'text-[#1E2243] font-bold hover:bg-[#EEF0FF]'
                          if (isSelected) {
                            cellStyle = 'bg-[#5B5FE8] text-white font-black shadow-sm'
                          } else if (isToday) {
                            cellStyle = 'border-2 border-[#5B5FE8] bg-[#EEF0FF] text-[#5B5FE8] font-black'
                          } else if (!cell.isCurrentMonth) {
                            cellStyle = 'text-slate-300 font-medium hover:bg-slate-50'
                          }

                          return (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => handleSelectDate(cell.year, cell.month, cell.day)}
                              className={`h-8 w-8 sm:h-8.5 sm:w-8.5 flex items-center justify-center rounded-xl text-xs sm:text-sm transition-colors cursor-pointer ${cellStyle}`}
                            >
                              {cell.day}
                            </button>
                          )
                        })}
                      </div>

                      {/* Clear & Today Actions */}
                      <div className="flex items-center justify-between pt-3 mt-3 border-t border-slate-100">
                        <button
                          type="button"
                          onClick={handleClearDate}
                          className="text-xs sm:text-sm font-bold text-slate-400 hover:text-[#F25F5C] transition-colors cursor-pointer"
                        >
                          Clear
                        </button>
                        <button
                          type="button"
                          onClick={handleTodayDate}
                          className="text-xs sm:text-sm font-bold text-[#5B5FE8] hover:text-[#4A4ED4] transition-colors cursor-pointer"
                        >
                          Today
                        </button>
                      </div>
                    </div>

                    {/* Divider: vertical on desktop, horizontal on mobile */}
                    <div className="hidden sm:block w-px bg-slate-200 self-stretch my-1" />
                    <div className="sm:hidden h-px bg-slate-200 w-full my-1" />

                    {/* Time Selection Portion */}
                    <div className="flex flex-col justify-between">
                      <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 sm:mb-2.5 text-center sm:text-left">
                        Time Selection
                      </div>
                      <div className="flex gap-2 justify-center flex-1 items-start">
                        {/* Hours Column (01-12) */}
                        <div className="flex flex-col items-center">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Hr</span>
                          <div
                            ref={hourColRef}
                            className="w-10 sm:w-11 max-h-[165px] sm:max-h-[195px] overflow-y-auto space-y-1 py-1 px-0.5 rounded-xl border border-slate-200 bg-slate-50/60"
                          >
                            {HOURS_12.map((hStr) => {
                              const hNum = parseInt(hStr, 10)
                              const currentH12 = selectedDateParts.hour % 12 || 12
                              const isSelected = currentH12 === hNum
                              return (
                                <button
                                  key={hStr}
                                  type="button"
                                  data-selected={isSelected ? 'true' : undefined}
                                  onClick={() => handleSelectHour(hNum)}
                                  className={`w-full py-1.5 rounded-lg text-xs sm:text-sm font-black transition-colors cursor-pointer text-center ${
                                    isSelected
                                      ? 'bg-[#5B5FE8] text-white shadow-xs'
                                      : 'text-[#1E2243] hover:bg-[#EEF0FF]'
                                  }`}
                                >
                                  {hStr}
                                </button>
                              )
                            })}
                          </div>
                        </div>

                        {/* Minutes Column (00-59) */}
                        <div className="flex flex-col items-center">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Min</span>
                          <div
                            ref={minColRef}
                            className="w-10 sm:w-11 max-h-[165px] sm:max-h-[195px] overflow-y-auto space-y-1 py-1 px-0.5 rounded-xl border border-slate-200 bg-slate-50/60"
                          >
                            {MINUTES_60.map((mStr) => {
                              const mNum = parseInt(mStr, 10)
                              const isSelected = selectedDateParts.minute === mNum
                              return (
                                <button
                                  key={mStr}
                                  type="button"
                                  data-selected={isSelected ? 'true' : undefined}
                                  onClick={() => handleSelectMinute(mNum)}
                                  className={`w-full py-1.5 rounded-lg text-xs sm:text-sm font-black transition-colors cursor-pointer text-center ${
                                    isSelected
                                      ? 'bg-[#5B5FE8] text-white shadow-xs'
                                      : 'text-[#1E2243] hover:bg-[#EEF0FF]'
                                  }`}
                                >
                                  {mStr}
                                </button>
                              )
                            })}
                          </div>
                        </div>

                        {/* AM/PM Column */}
                        <div className="flex flex-col items-center">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">AM/PM</span>
                          <div
                            ref={ampmColRef}
                            className="w-10 sm:w-11 max-h-[165px] sm:max-h-[195px] overflow-y-auto space-y-1 py-1 px-0.5 rounded-xl border border-slate-200 bg-slate-50/60"
                          >
                            {['am', 'pm'].map((pStr) => {
                              const isSelected = pStr === 'pm' ? selectedDateParts.hour >= 12 : selectedDateParts.hour < 12
                              return (
                                <button
                                  key={pStr}
                                  type="button"
                                  data-selected={isSelected ? 'true' : undefined}
                                  onClick={() => handleSelectAmPm(pStr as 'am' | 'pm')}
                                  className={`w-full py-1.5 rounded-lg text-xs sm:text-sm font-black uppercase transition-colors cursor-pointer text-center ${
                                    isSelected
                                      ? 'bg-[#5B5FE8] text-white shadow-xs'
                                      : 'text-[#1E2243] hover:bg-[#EEF0FF]'
                                  }`}
                                >
                                  {pStr}
                                </button>
                              )
                            })}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div>
            <label htmlFor="measurement_position" className="block text-xs sm:text-sm font-bold uppercase tracking-wide text-slate-500 mb-2">
              Position
            </label>
            <CustomSelect
              id="measurement_position"
              name="measurement_position"
              value={formData.measurement_position}
              onChange={(val) => setFormData((prev) => ({ ...prev, measurement_position: val }))}
              options={[
                { value: 'Sitting', label: 'Sitting' },
                { value: 'Standing', label: 'Standing' },
                { value: 'Lying', label: 'Lying' },
                { value: 'Supine', label: 'Supine' },
              ]}
              ariaLabel="Position"
            />
          </div>

          <div>
            <label htmlFor="bp_arm" className="block text-xs sm:text-sm font-bold uppercase tracking-wide text-slate-500 mb-2">
              BP Arm
            </label>
            <CustomSelect
              id="bp_arm"
              name="bp_arm"
              value={formData.bp_arm}
              onChange={(val) => setFormData((prev) => ({ ...prev, bp_arm: val }))}
              options={[
                { value: 'Left', label: 'Left Arm' },
                { value: 'Right', label: 'Right Arm' },
              ]}
              ariaLabel="BP Arm"
            />
          </div>

          <div>
            <label htmlFor="temp_method" className="block text-xs sm:text-sm font-bold uppercase tracking-wide text-slate-500 mb-2">
              Temperature Method
            </label>
            <CustomSelect
              id="temp_method"
              name="temp_method"
              value={formData.temp_method}
              onChange={(val) => setFormData((prev) => ({ ...prev, temp_method: val }))}
              options={[
                { value: 'Oral', label: 'Oral' },
                { value: 'Axillary', label: 'Axillary' },
                { value: 'Tympanic', label: 'Tympanic' },
                { value: 'Forehead', label: 'Forehead' },
              ]}
              ariaLabel="Temperature Method"
            />
          </div>

          <div className="sm:col-span-2">
            <label htmlFor="oxygen_device" className="block text-xs sm:text-sm font-bold uppercase tracking-wide text-slate-500 mb-2">
              Oxygen Device
            </label>
            <CustomSelect
              id="oxygen_device"
              name="oxygen_device"
              value={formData.oxygen_device}
              onChange={(val) => setFormData((prev) => ({ ...prev, oxygen_device: val }))}
              options={[
                { value: 'Room Air', label: 'Room Air' },
                { value: 'Nasal Cannula', label: 'Nasal Cannula' },
                { value: 'Simple Mask', label: 'Simple Mask' },
                { value: 'Non-Rebreather', label: 'Non-Rebreather' },
                { value: 'Other', label: 'Other' },
              ]}
              ariaLabel="Oxygen Device"
            />
          </div>
        </div>
      </div>

      {/* SECTION 5: Symptoms & Clinical Observations */}
      <div className="rounded-3xl border border-slate-200/80 bg-white p-6 sm:p-8 shadow-sm space-y-6">
        <h2 className="text-xl sm:text-2xl font-bold text-[#1E2243] flex items-center gap-2.5">
          <FileText className="h-6 w-6 text-[#5B5FE8] shrink-0" />
          5. Symptoms & Clinical Observations
        </h2>

        {/* Symptoms checklist chips */}
        <div>
          <label className="block text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-500 mb-2.5">
            Reported Symptoms (Select all that apply)
          </label>
          <div className="flex flex-wrap gap-2.5">
            {CLINICAL_SYMPTOMS.map((symptom) => {
              const isChecked = formData.symptoms.includes(symptom)
              return (
                <button
                  key={symptom}
                  type="button"
                  onClick={() => handleSymptomToggle(symptom)}
                  className={`py-2.5 px-4 rounded-xl cursor-pointer transition-all inline-flex items-center gap-2 shadow-xs ${
                    isChecked
                      ? 'border-2 border-[#5B5FE8] bg-[#EEF0FF] text-[#5B5FE8] ring-2 ring-[#5B5FE8]/20 font-bold text-sm sm:text-base'
                      : 'border border-slate-200 bg-slate-50 text-slate-700 hover:border-[#5B5FE8]/40 hover:bg-[#EEF0FF]/40 font-semibold text-sm sm:text-base'
                  }`}
                >
                  {isChecked ? (
                    <Check className="h-4 w-4 text-[#5B5FE8] stroke-[3]" />
                  ) : (
                    <Plus className="h-4 w-4 text-slate-400" />
                  )}
                  <span>{symptom}</span>
                </button>
              )
            })}
          </div>

          {formData.symptoms.includes('Other') && (
            <div className="mt-3">
              <input
                type="text"
                name="symptoms_other"
                placeholder="Specify other symptoms reported by patient..."
                value={formData.symptoms_other}
                onChange={handleChange}
                className="w-full min-h-[56px] rounded-2xl border border-slate-200 px-4 py-3.5 text-base sm:text-lg font-semibold text-[#1E2243] bg-slate-50/50 focus:border-[#5B5FE8] focus:bg-white focus:ring-4 focus:ring-[#5B5FE8]/15 focus:outline-none transition-all placeholder:text-slate-400 placeholder:text-base placeholder:font-normal"
              />
            </div>
          )}
        </div>

        {/* Medication taken before measurement */}
        <div>
          <label htmlFor="medication_taken" className="block text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-500 mb-2.5">
            Medication Taken Before Measurement (Optional)
          </label>
          <input
            id="medication_taken"
            type="text"
            name="medication_taken"
            placeholder="e.g. Amlodipine 5mg at 8:00 AM, Paracetamol 500mg"
            value={formData.medication_taken}
            onChange={handleChange}
            className="w-full min-h-[56px] rounded-2xl border border-slate-200 px-4 py-3.5 text-base sm:text-lg font-semibold text-[#1E2243] bg-slate-50/50 focus:border-[#5B5FE8] focus:bg-white focus:ring-4 focus:ring-[#5B5FE8]/15 focus:outline-none transition-all placeholder:text-slate-400 placeholder:text-base placeholder:font-normal"
          />
        </div>

        {/* Clinical Notes & Quick Observations */}
        <div>
          <div className="flex items-center justify-between mb-2.5">
            <label htmlFor="notes" className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-500">
              Clinical Notes & Bedside Observations
            </label>
            {formData.notes && (
              <button
                type="button"
                onClick={() => setFormData((prev) => ({ ...prev, notes: '' }))}
                className="text-xs sm:text-sm font-semibold text-slate-500 hover:text-[#F25F5C] transition-colors cursor-pointer"
              >
                Clear notes
              </button>
            )}
          </div>

          {/* Quick-tap observations */}
          <div className="mb-3 flex flex-wrap gap-2.5">
            {QUICK_OBSERVATIONS.map((chip) => {
              const isAdded = formData.notes.toLowerCase().includes(chip.toLowerCase())
              return (
                <button
                  key={chip}
                  type="button"
                  onClick={() => handleQuickObservationClick(chip)}
                  className={`py-2.5 px-4 rounded-xl cursor-pointer transition-all inline-flex items-center gap-2 shadow-xs ${
                    isAdded
                      ? 'border-2 border-[#5B5FE8] bg-[#EEF0FF] text-[#5B5FE8] ring-2 ring-[#5B5FE8]/20 font-bold text-sm sm:text-base'
                      : 'border border-slate-200 bg-slate-50 text-slate-700 hover:border-[#5B5FE8]/40 hover:bg-[#EEF0FF]/40 font-semibold text-sm sm:text-base'
                  }`}
                >
                  {isAdded ? (
                    <Check className="h-4 w-4 text-[#5B5FE8] stroke-[3]" />
                  ) : (
                    <Plus className="h-4 w-4 text-slate-400" />
                  )}
                  <span>{chip}</span>
                </button>
              )
            })}
          </div>

          <textarea
            id="notes"
            name="notes"
            rows={3}
            placeholder="Patient reported mild dizziness after morning medication. Alert and responsive..."
            value={formData.notes}
            onChange={handleChange}
            className="block w-full rounded-2xl border border-slate-200 p-4 text-base sm:text-lg font-semibold text-[#1E2243] min-h-[130px] bg-slate-50/50 focus:border-[#5B5FE8] focus:bg-white focus:ring-4 focus:ring-[#5B5FE8]/15 focus:outline-none transition-all placeholder:text-slate-400 placeholder:text-base placeholder:font-normal"
          />
          {validationErrors.notes && (
            <p className="mt-2 text-sm text-[#F25F5C] font-semibold">{validationErrors.notes}</p>
          )}
        </div>
      </div>

      {/* Real-time Atypical Vitals Warning Banner */}
      {vitalsAssessment.isFlagged && (
        <div className="rounded-2xl border border-[#F5A524]/40 bg-[#FFFBEB] p-5 text-amber-950 flex items-start gap-3.5 transition-all shadow-sm">
          <div className="rounded-xl bg-[#F5A524]/20 p-2.5 text-[#D97706] shrink-0 mt-0.5">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <div>
            <p className="text-base font-bold text-amber-950">Atypical Clinical Baseline Flagged</p>
            <p className="mt-1 text-sm font-medium text-amber-800">
              {vitalsAssessment.flags.map((f) => f.message).join(' • ')}. This record will be automatically highlighted in the physician triage queue.
            </p>
          </div>
        </div>
      )}

      {/* Inline Feedback Alerts */}
      {serverError && (
        <div className="rounded-2xl border border-[#F25F5C]/40 bg-[#FFF1F2] p-5 text-rose-950 flex items-start gap-3.5 shadow-sm">
          <AlertCircle className="h-6 w-6 text-[#F25F5C] shrink-0 mt-0.5" />
          <div>
            <p className="text-base font-bold text-rose-950">Submission Failed</p>
            <p className="mt-1 text-sm font-medium text-rose-800">{serverError}</p>
          </div>
        </div>
      )}

      {successMessage && (
        <div className="rounded-2xl border border-[#2DD4BF]/40 bg-[#F0FDFA] p-5 text-teal-950 flex items-center gap-3.5 shadow-sm">
          <CheckCircle2 className="h-6 w-6 text-[#0D9488] shrink-0" />
          <p className="text-base font-bold text-teal-900">{successMessage}</p>
        </div>
      )}

      {/* SECTION 6: Staff Information & Primary Submit Button */}
      <div className="rounded-2xl bg-white border border-slate-200/80 p-4 text-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
        <div className="flex items-center gap-2.5">
          <ShieldCheck className="h-6 w-6 text-[#5B5FE8] shrink-0" />
          <span className="text-sm sm:text-base font-medium text-slate-600">
            Recorded By:{' '}
            <strong className="text-[#1E2243] font-bold text-base sm:text-lg">
              {currentCaregiver?.fullName || 'Bedside Caregiver'}
            </strong>{' '}
            <span className="text-sm sm:text-base font-medium text-slate-400">({currentCaregiver?.staffId || 'STF-CAREGIVER'})</span>
          </span>
        </div>
        <span className="text-xs sm:text-sm font-medium text-slate-500">
          Timestamp logged automatically upon submission
        </span>
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full min-h-[60px] rounded-2xl bg-[#5B5FE8] hover:bg-[#4A4ED4] active:bg-[#3D41BD] text-white font-bold text-lg sm:text-xl shadow-md shadow-[#5B5FE8]/25 hover:shadow-lg hover:shadow-[#5B5FE8]/30 transition-all flex items-center justify-center gap-3 cursor-pointer disabled:opacity-50"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="h-6 w-6 animate-spin text-white" />
            <span>Submitting Clinical Log...</span>
          </>
        ) : (
          <>
            <Activity className="h-6 w-6 text-white stroke-[2.5]" />
            <span>Submit Vitals Log</span>
          </>
        )}
      </button>
    </form>
  )
}
