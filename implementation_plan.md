# Implementation Plan: Phase 7 Admin Module — User Provisioning & Care Team Management

Deliver the administrative management interfaces for CareConnect: user creation/invitation (`/admin/invite`), care team pairings & deactivations (`/care-teams`), client-side and server-side role consistency enforcement, and deliberate admin privilege escalation controls.

## User Review Required

> [!IMPORTANT]
> **Email Invitation Safety**:
> `inviteUserAction` invokes `adminAuthClient.auth.admin.inviteUserByEmail(email)`. In local test environments, all test accounts will strictly use `@test.com` dummy addresses (e.g. `doctor_admin_test@test.com`, `patient_admin_test@test.com`) to prevent accidental email dispatch to real people. A prominent alert banner is also added to the UI reminding administrators that entering a live external email sends a real Supabase Auth invitation email.

> [!IMPORTANT]
> **Admin Privilege Escalation Confirmation**:
> When selecting the `admin` role in the user creation form, the UI displays an explicit security alert banner and requires a mandatory confirmation checkbox:
> *"I confirm that this individual is authorized for unrestricted system-wide administrative access across CareConnect."*
> The action button updates to "Provision System Administrator" to prevent accidental minting of administrative accounts through a routine dropdown misclick.

---

## Proposed Changes

### 1. Server Actions & Services
#### [MODIFY] [src/app/(admin)/actions.ts](file:///c:/Users/Admin/predev-careconnect/src/app/(admin)/actions.ts)
- Add `assignCareTeamMemberAction(params: { patientId: string; memberId: string; memberRole: 'doctor' | 'caregiver' | 'family_member'; relationshipLabel?: string })`:
  - Enforces `requireRole(['admin'])`.
  - Validates role consistency before database insert: verifies that the target member's `users.role` strictly matches `params.memberRole`. Throws a descriptive error if mismatched.
  - Calls `careTeamsService.assignMember(...)`.
  - Triggers `revalidatePath('/care-teams')` and `revalidatePath('/admin')`.
- Add `removeCareTeamMemberAction(careTeamId: string)`:
  - Enforces `requireRole(['admin'])`.
  - Calls `careTeamsService.removeMember(careTeamId)`.
  - Triggers `revalidatePath('/care-teams')` and `revalidatePath('/admin')`.

#### [MODIFY] [src/services/usersService.ts](file:///c:/Users/Admin/predev-careconnect/src/services/usersService.ts)
- Add `getAllUsers()`:
  - Fetches all users ordered by `created_at` descending, supporting admin directory listings and candidate selection.

---

### 2. User Provisioning UI (`/admin/invite`)
#### [NEW] [src/components/admin/InviteUserForm.tsx](file:///c:/Users/Admin/predev-careconnect/src/components/admin/InviteUserForm.tsx)
- Interactive client form powered by `inviteUserAction`:
  - Full Name, Email, Role selector, Phone.
  - **Conditional Patient Fields**: When `role === 'patient'`, reveals Date of Birth, Sex, and Primary Condition.
  - **Elevated Privilege Guard**: When `role === 'admin'`, reveals the security escalation warning and mandatory acknowledgment checkbox.
  - **Email Notice**: Highlights that an activation email will be dispatched.
  - Success banner with clear feedback and button to invite another user or return to dashboard.

#### [NEW] [src/app/(admin)/admin/invite/page.tsx](file:///c:/Users/Admin/predev-careconnect/src/app/(admin)/admin/invite/page.tsx)
- Server Component guarded by `requireRole(['admin'])`.
- Breadcrumb link back to `/admin`.
- Renders `InviteUserForm`.

#### [MODIFY] [src/app/(admin)/admin/page.tsx](file:///c:/Users/Admin/predev-careconnect/src/app/(admin)/admin/page.tsx)
- Add "Invite New User" action button in the dashboard header.
- Add "Provision New User" action card alongside Care Team Assignments.

#### [MODIFY] [src/app/(admin)/layout.tsx](file:///c:/Users/Admin/predev-careconnect/src/app/(admin)/layout.tsx)
- Add "Invite User" link in the top navigation header.

---

### 3. Care Team Management UI (`/care-teams`)
#### [NEW] [src/components/admin/CareTeamAssignmentForm.tsx](file:///c:/Users/Admin/predev-careconnect/src/components/admin/CareTeamAssignmentForm.tsx)
- Admin assignment panel to pair patients with care team members:
  - **Patient Selector**: Dropdown of enrolled patients.
  - **Role Selector**: `doctor`, `caregiver`, or `family_member`.
  - **Member Selector**: Dynamically filtered so only users whose `users.role` strictly matches the selected role are shown. (Prevents constructing invalid pairings in the UI).
  - **Relationship Label**: Text input with common presets ("Attending Physician", "Primary Cardiologist", "Bedside Nurse", "Daughter / Primary Contact", etc.).
  - Submits to `assignCareTeamMemberAction`.

#### [NEW] [src/components/admin/CareTeamsTable.tsx](file:///c:/Users/Admin/predev-careconnect/src/components/admin/CareTeamsTable.tsx)
- Client Component for the pairings table:
  - Renders patient, member, role badge, relationship label, active status, assigned date.
  - For active pairings: includes a "Deactivate" button with confirmation state, calling `removeCareTeamMemberAction` to soft-deactivate the pairing while preserving audit history.

#### [MODIFY] [src/app/(admin)/care-teams/page.tsx](file:///c:/Users/Admin/predev-careconnect/src/app/(admin)/care-teams/page.tsx)
- Fetches all care teams, active patients, and candidate staff members concurrently.
- Renders metrics, `CareTeamAssignmentForm`, and interactive `CareTeamsTable`.

---

## Verification Plan

### Automated Tests
1. **User Provisioning Verification (`scratch/test-admin-invite.js`)**:
   - Authenticate as `admin@test.com`.
   - Call `inviteUserAction` with a test dummy email `doctor_admin_test@test.com` (role: `doctor`).
   - Verify user row is created in `public.users` with correct role.
   - Call `inviteUserAction` with test dummy email `patient_admin_test@test.com` (role: `patient`, DOB, sex, condition).
   - Verify user row is created in `public.users` and profile in `public.patient_profiles`.
   - Clean up created test users.
2. **Care Team Pairing & Deactivation Verification (`scratch/test-admin-care-teams.js`)**:
   - Authenticate as `admin@test.com`.
   - Positive test: Assign `doctor@test.com` to `patient@test.com` with role `doctor`. Verify row created in `care_teams`.
   - Negative test (UI/Server Action role mismatch prevention): Attempt assigning `doctor@test.com` with role `caregiver`. Verify `assignCareTeamMemberAction` blocks the call before database submission.
   - Database trigger defense-in-depth: Verify `enforce_care_team_role` trigger raises exception if bypassed.
   - Soft-deactivation test: Call `removeCareTeamMemberAction(id)`. Verify `is_active` transitions to `false`.
3. **Build & Typecheck**:
   - `npx tsc --noEmit`
   - `npx next build`
