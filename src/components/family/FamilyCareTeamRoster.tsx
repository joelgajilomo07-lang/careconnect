import type { CareTeamMemberWithUser } from '@/services/careTeamsService'
import { Stethoscope, HeartHandshake, Users, Phone, Mail, Clock, ShieldCheck, AlertCircle } from 'lucide-react'

interface FamilyCareTeamRosterProps {
  members: CareTeamMemberWithUser[]
  patientName: string
}

export function FamilyCareTeamRoster({ members, patientName }: FamilyCareTeamRosterProps) {
  const activeMembers = members.filter((m) => m.is_active === true && m.member)

  const doctors = activeMembers.filter((m) => m.member_role === 'doctor')
  const caregivers = activeMembers.filter((m) => m.member_role === 'caregiver')
  const familyContacts = activeMembers.filter((m) => m.member_role === 'family_member')

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6 shadow-sm space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-gray-100 pb-4">
        <div>
          <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
            <Users className="h-5 w-5 text-amber-600" />
            {patientName}&apos;s Care Team & Family Directory
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Clinical team and emergency family contacts coordinated for {patientName}
          </p>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-amber-800 bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-200/60 font-medium">
          <ShieldCheck className="h-4 w-4 shrink-0 text-amber-600" />
          <span>Care Network</span>
        </div>
      </div>

      {/* Clinical Privacy Notice */}
      <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-4 text-xs text-blue-900 flex items-start gap-3">
        <Clock className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <span className="font-bold text-blue-950">Clinical Provider Contact Policy:</span>
          <p className="text-blue-800/90 leading-relaxed">
            Attending physicians and floor caregivers are contacted through centralized clinic stations to ensure 24/7 record coverage and medical triage. Fellow family contacts have direct telephone and email listed below for kin coordination.
          </p>
        </div>
      </div>

      {activeMembers.length === 0 ? (
        <div className="py-8 text-center text-sm text-gray-400">
          <AlertCircle className="h-8 w-8 mx-auto mb-2 text-gray-300" />
          No care team members assigned to {patientName} yet.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Attending Physicians */}
          {doctors.map((doc) => (
            <div
              key={doc.id}
              className="flex flex-col justify-between rounded-xl border border-purple-100 bg-gradient-to-b from-purple-50/30 to-white p-4 shadow-sm hover:border-purple-200 transition"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-100 text-purple-700 font-bold">
                      <Stethoscope className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-gray-900 leading-tight">
                        {doc.member?.full_name || 'Attending Physician'}
                      </h3>
                      <span className="text-[11px] font-semibold text-purple-700 bg-purple-100/70 px-1.5 py-0.5 rounded inline-block mt-0.5">
                        Attending Physician
                      </span>
                    </div>
                  </div>
                </div>

                {doc.relationship_label && (
                  <p className="text-xs text-gray-600 italic">
                    Focus: {doc.relationship_label}
                  </p>
                )}

                <div className="rounded-lg border border-purple-100/70 bg-white p-2.5 text-xs space-y-1.5">
                  <div className="flex items-center gap-2 text-gray-700">
                    <Phone className="h-3.5 w-3.5 text-purple-600 shrink-0" />
                    <span className="font-medium text-gray-900">Clinic Desk: (555) 019-2834</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-500 text-[11px]">
                    <Clock className="h-3.5 w-3.5 text-purple-400 shrink-0" />
                    <span>Mon–Fri, 8:00 AM – 5:00 PM</span>
                  </div>
                </div>
              </div>
              <p className="mt-3 text-[10px] text-gray-400 border-t border-gray-100 pt-2">
                Clinical updates & inquiries managed via Central Clinic Desk
              </p>
            </div>
          ))}

          {/* Primary Caregivers */}
          {caregivers.map((cg) => (
            <div
              key={cg.id}
              className="flex flex-col justify-between rounded-xl border border-teal-100 bg-gradient-to-b from-teal-50/30 to-white p-4 shadow-sm hover:border-teal-200 transition"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-100 text-teal-700 font-bold">
                      <HeartHandshake className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-gray-900 leading-tight">
                        {cg.member?.full_name || 'Caregiver'}
                      </h3>
                      <span className="text-[11px] font-semibold text-teal-700 bg-teal-100/70 px-1.5 py-0.5 rounded inline-block mt-0.5">
                        Primary Caregiver
                      </span>
                    </div>
                  </div>
                </div>

                {cg.relationship_label && (
                  <p className="text-xs text-gray-600 italic">
                    Assignment: {cg.relationship_label}
                  </p>
                )}

                <div className="rounded-lg border border-teal-100/70 bg-white p-2.5 text-xs space-y-1.5">
                  <div className="flex items-center gap-2 text-gray-700">
                    <Phone className="h-3.5 w-3.5 text-teal-600 shrink-0" />
                    <span className="font-medium text-gray-900">Nurses&apos; Station: (555) 019-2835</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-500 text-[11px]">
                    <Clock className="h-3.5 w-3.5 text-teal-400 shrink-0" />
                    <span>24/7 Floor Support & Vital Monitoring</span>
                  </div>
                </div>
              </div>
              <p className="mt-3 text-[10px] text-gray-400 border-t border-gray-100 pt-2">
                Daily assistance & checks coordinated with Nurses&apos; Station
              </p>
            </div>
          ))}

          {/* Fellow Family Contacts */}
          {familyContacts.map((fc) => (
            <div
              key={fc.id}
              className="flex flex-col justify-between rounded-xl border border-amber-100 bg-gradient-to-b from-amber-50/30 to-white p-4 shadow-sm hover:border-amber-200 transition"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-100 text-amber-700 font-bold">
                      <Users className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-gray-900 leading-tight">
                        {fc.member?.full_name || 'Family Member'}
                      </h3>
                      <span className="text-[11px] font-semibold text-amber-800 bg-amber-100/70 px-1.5 py-0.5 rounded inline-block mt-0.5">
                        {fc.relationship_label || 'Family Kin'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="rounded-lg border border-amber-100/70 bg-white p-2.5 text-xs space-y-1.5">
                  <div className="flex items-center gap-2 text-gray-700">
                    <Phone className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                    <span className="font-medium text-gray-900">
                      {fc.member?.phone ? (
                        <a href={`tel:${fc.member.phone}`} className="hover:underline text-amber-900">
                          {fc.member.phone}
                        </a>
                      ) : (
                        <span className="text-gray-400">No phone on file</span>
                      )}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-700">
                    <Mail className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                    <span className="truncate text-gray-600">
                      {fc.member?.email ? (
                        <a href={`mailto:${fc.member.email}`} className="hover:underline text-amber-900">
                          {fc.member.email}
                        </a>
                      ) : (
                        <span className="text-gray-400">No email on file</span>
                      )}
                    </span>
                  </div>
                </div>
              </div>
              <p className="mt-3 text-[10px] text-amber-700 font-medium border-t border-gray-100 pt-2">
                Emergency & Kin Contact
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
