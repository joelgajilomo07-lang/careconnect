import { Stethoscope } from 'lucide-react'

export default function DoctorLoading() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 space-y-6 animate-pulse">
      <div className="flex items-center gap-3">
        <div className="h-11 w-11 rounded-xl bg-purple-100 flex items-center justify-center text-purple-700">
          <Stethoscope className="h-6 w-6" />
        </div>
        <div className="space-y-2">
          <div className="h-6 w-52 bg-gray-200 rounded-md" />
          <div className="h-3 w-72 bg-gray-100 rounded-md" />
        </div>
      </div>
      <div className="flex gap-2">
        <div className="h-10 w-28 bg-gray-100 rounded-xl" />
        <div className="h-10 w-28 bg-gray-100 rounded-xl" />
        <div className="h-10 w-28 bg-gray-100 rounded-xl" />
      </div>
      <div className="space-y-3">
        <div className="h-32 bg-gray-50 rounded-2xl border border-gray-100" />
        <div className="h-32 bg-gray-50 rounded-2xl border border-gray-100" />
        <div className="h-32 bg-gray-50 rounded-2xl border border-gray-100" />
      </div>
    </div>
  )
}
