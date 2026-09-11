import { Users } from 'lucide-react'

export default function FamilyLoading() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-8 space-y-8 animate-pulse">
      <div className="border-b border-gray-200 pb-6 space-y-3">
        <div className="h-6 w-32 bg-amber-100 rounded-full" />
        <div className="h-8 w-64 bg-gray-200 rounded-lg" />
        <div className="h-4 w-80 bg-gray-100 rounded-md" />
      </div>
      <div className="h-28 bg-gray-50 rounded-2xl border border-gray-200" />
      <div className="h-56 bg-gray-50 rounded-2xl border border-gray-200" />
      <div className="h-48 bg-gray-50 rounded-2xl border border-gray-200" />
    </div>
  )
}
