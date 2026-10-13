import type { CareTeamMemberWithUser } from '@/services/careTeamsService'
import { Stethoscope, HeartHandshake, Users, Phone, Mail, Clock, ShieldCheck, AlertCircle } from 'lucide-react'

interface PatientCareTeamRosterProps {
  members: CareTeamMemberWithUser[]
}

export function PatientCareTeamRoster({ members }: PatientCareTeamRosterProps) {
  const activeMembers = members.filter((m) => m.is_active === true && m.member)

  const doctors = activeMembers.filter((m) => m.member_role === 'doctor')
  const caregivers = activeMembers.filter((m) => m.member_role === 'caregiver')
  const familyContacts = activeMembers.filter((m) => m.member_role === 'family_member')

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-xs space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-100 pb-4">
        <div>
          <h2 className="text-lg sm:text-xl font-black text-[#1E2243] flex items-center gap-2">
            <Users className="h-5 w-5 text-[#5B5FE8]" />
            My Care Team & Support Contacts
          </h2>
          <p className="text-sm font-medium text-slate-500 mt-0.5">
            Your designated clinical care providers and registered emergency family contacts
          </p>
        </div>
        <div className="flex items-center gap-1.5 text-xs sm:text-sm text-[#0F766E] bg-[#2DD4BF]/10 px-3.5 py-1.5 rounded-xl border border-[#2DD4BF]/30 font-bold">
          <ShieldCheck className="h-4 w-4 shrink-0 text-[#2DD4BF]" />
          <span>Verified Care Team</span>
        </div>
      </div>

      {/* Clinical Boundary Notification Notice */}
      <div className="rounded-xl border border-[#5B5FE8]/20 bg-[#EEF0FF]/50 p-4 sm:p-5 text-sm text-[#1E2243] flex items-start gap-3">
        <Clock className="h-5 w-5 text-[#5B5FE8] shrink-0 mt-0.5" />
        <div className="space-y-1">
          <span className="font-black text-[#1E2243] text-sm sm:text-base">Centralized Clinical Communication Notice:</span>
          <p className="text-slate-700 leading-relaxed font-medium">
            Direct clinical inquiries are managed via the Central Clinic Station and 24/7 Nurses&apos; Desk. 
            For life-threatening emergencies, please call <strong className="font-black text-[#1E2243]">911</strong> immediately.
          </p>
        </div>
      </div>

      {activeMembers.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white py-8 text-center text-sm font-medium text-slate-500">
          <AlertCircle className="h-8 w-8 mx-auto mb-2 text-slate-300" />
          No care team members assigned yet. Please contact your clinic administration.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Attending Physicians */}
          {doctors.map((doc) => (
            <div
              key={doc.id}
              className="flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs hover:border-[#5B5FE8]/40 hover:shadow-sm transition"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#EEF0FF] text-[#5B5FE8] font-bold">
                      <Stethoscope className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-black text-[#1E2243] leading-tight">
                        {doc.member?.full_name || 'Attending Physician'}
                      </h3>
                      <span className="text-xs font-bold text-[#5B5FE8] bg-[#EEF0FF] border border-[#5B5FE8]/20 px-2.5 py-0.5 rounded-md inline-block mt-0.5">
                        Attending Physician
                      </span>
                    </div>
                  </div>
                </div>

                {doc.relationship_label && (
                  <p className="text-xs sm:text-sm text-slate-500 italic font-medium">
                    Focus: {doc.relationship_label}
                  </p>
                )}

                <div className="rounded-xl border border-slate-200/60 bg-slate-50/60 p-3 text-sm space-y-1.5">
                  <div className="flex items-center gap-2 text-slate-700">
                    <Phone className="h-4 w-4 text-[#5B5FE8] shrink-0" />
                    <span className="font-bold text-[#1E2243]">Clinic Desk: (555) 019-2834</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-500 text-xs font-medium">
                    <Clock className="h-4 w-4 text-slate-400 shrink-0" />
                    <span>Mon–Fri, 8:00 AM – 5:00 PM</span>
                  </div>
                </div>
              </div>
              <p className="mt-3 text-xs text-slate-400 border-t border-slate-100 pt-2 font-medium">
                Routine messages & prescriptions routed via Clinic Desk
              </p>
            </div>
          ))}

          {/* Primary Caregivers */}
          {caregivers.map((cg) => (
            <div
              key={cg.id}
              className="flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs hover:border-[#2DD4BF]/50 hover:shadow-sm transition"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#2DD4BF]/15 text-[#0F766E] font-bold">
                      <HeartHandshake className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-black text-[#1E2243] leading-tight">
                        {cg.member?.full_name || 'Caregiver'}
                      </h3>
                      <span className="text-xs font-bold text-[#0F766E] bg-[#2DD4BF]/10 border border-[#2DD4BF]/30 px-2.5 py-0.5 rounded-md inline-block mt-0.5">
                        Primary Caregiver
                      </span>
                    </div>
                  </div>
                </div>

                {cg.relationship_label && (
                  <p className="text-xs sm:text-sm text-slate-500 italic font-medium">
                    Assignment: {cg.relationship_label}
                  </p>
                )}

                <div className="rounded-xl border border-slate-200/60 bg-slate-50/60 p-3 text-sm space-y-1.5">
                  <div className="flex items-center gap-2 text-slate-700">
                    <Phone className="h-4 w-4 text-[#2DD4BF] shrink-0" />
                    <span className="font-bold text-[#1E2243]">Nurses&apos; Station: (555) 019-2835</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-500 text-xs font-medium">
                    <Clock className="h-4 w-4 text-slate-400 shrink-0" />
                    <span>24/7 Floor Duty & Immediate Inquiries</span>
                  </div>
                </div>
              </div>
              <p className="mt-3 text-xs text-slate-400 border-t border-slate-100 pt-2 font-medium">
                Care requests managed via Central Nursing Desk
              </p>
            </div>
          ))}

          {/* Family & Emergency Contacts */}
          {familyContacts.map((fc) => (
            <div
              key={fc.id}
              className="flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs hover:border-[#F5A524]/50 hover:shadow-sm transition"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F5A524]/15 text-[#B45309] font-bold">
                      <Users className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-black text-[#1E2243] leading-tight">
                        {fc.member?.full_name || 'Family Contact'}
                      </h3>
                      <span className="text-xs font-bold text-[#B45309] bg-[#F5A524]/10 border border-[#F5A524]/30 px-2.5 py-0.5 rounded-md inline-block mt-0.5">
                        {fc.relationship_label || 'Emergency Contact / Kin'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200/60 bg-slate-50/60 p-3 text-sm space-y-2">
                  <div className="flex items-center gap-2 text-slate-700">
                    <Phone className="h-4 w-4 text-[#F5A524] shrink-0" />
                    <span className="font-bold text-[#1E2243]">
                      {fc.member?.phone ? (
                        <a href={`tel:${fc.member.phone}`} className="hover:underline text-[#1E2243]">
                          {fc.member.phone}
                        </a>
                      ) : (
                        <span className="text-slate-400 font-normal">No direct phone listed</span>
                      )}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-700">
                    <Mail className="h-4 w-4 text-[#F5A524] shrink-0" />
                    <span className="truncate text-slate-700 font-medium">
                      {fc.member?.email ? (
                        <a href={`mailto:${fc.member.email}`} className="hover:underline text-[#1E2243]">
                          {fc.member.email}
                        </a>
                      ) : (
                        <span className="text-slate-400 font-normal">No email listed</span>
                      )}
                    </span>
                  </div>
                </div>
              </div>
              <p className="mt-3 text-xs text-[#B45309] font-bold border-t border-slate-100 pt-2">
                Emergency Kin Contact
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
