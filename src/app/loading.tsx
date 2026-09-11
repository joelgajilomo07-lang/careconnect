import { Loader2 } from 'lucide-react'

export default function RootLoading() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 space-y-4">
      <div className="relative">
        <div className="h-12 w-12 rounded-2xl bg-blue-100 flex items-center justify-center text-blue-600">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      </div>
      <div className="text-center space-y-1">
        <p className="text-sm font-semibold text-gray-800">Loading CareConnect</p>
        <p className="text-xs text-gray-400">Verifying session and fetching clinical data...</p>
      </div>
    </div>
  )
}
