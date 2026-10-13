import { redirect } from 'next/navigation'

export default function CareTeamsRedirect() {
  redirect('/admin/patients')
}