# CareConnect — Remote Patient Monitoring & Clinical Triage System

CareConnect is a multi-disciplinary remote patient monitoring (RPM) and clinical coordination platform built with Next.js 16 (App Router), Supabase (PostgreSQL, Row Level Security, Realtime), and Tailwind CSS. It connects patients, home caregivers, attending physicians, family members, and clinic administrators into a unified, secure care continuum.

---

## 🔒 Security Warnings (Must Read Before Deployment)

> [!CAUTION]
> **Default Seed Accounts**:
> The `seed.ts` script creates five demonstration accounts that share the default password `password123` (including an administrative account). These accounts **must be removed or their passwords rotated** prior to deploying to production or handling Protected Health Information (PHI).

> [!WARNING]
> **Service Role Key Isolation & Credential Hygiene**:
> The `SUPABASE_SERVICE_ROLE_KEY` bypasses all Row Level Security policies and must **never** be prefixed with `NEXT_PUBLIC_` or bundled into client-side code. If your `.env.local` has ever been exposed or transferred across unencrypted channels, rotate your project API keys immediately in the Supabase Dashboard.

---

## 👥 The 5 Role Portals

CareConnect implements strict role-based views and data isolation across five user roles:

1. **Caregiver (`/log-vitals`, `/history`)**
   - Bedside recording of heart rate, SpO2, systolic/diastolic blood pressure, and body temperature.
   - Instant visual range evaluation (Typical vs. Out of Typical Range).
   - Chronological measurement history with interactive multi-metric trend charts.
   - Real-time notification bell when physicians issue directives on recorded logs.

2. **Doctor (`/triage`, `/review/[vitalsLogId]`, `/patients/[patientId]`)**
   - Real-time clinical triage queue prioritizing out-of-range vital measurements.
   - Clear visual separation between vital observation flags and official patient clinical status (`stable`, `warning`, `critical`).
   - Structured medical review submissions with feedback notes, urgency level, and clinical status updates.

3. **Patient (`/patient`)**
   - Personal health dashboard displaying attending physician's clinical assessment and latest instructions.
   - Interactive vital signs trend visualizer and read-only chronological records.
   - Verified care team contact roster with centralized clinic desk routing.

4. **Family Member (`/family`)**
   - Multi-patient switcher supporting family members overseeing multiple loved ones (e.g., elderly parents).
   - High-level clinical status banners (with urgent clinical alerts when a physician marks critical status).
   - Physician clinical updates, vitals history, and direct emergency contacts.

5. **Administrator (`/admin`, `/admin/invite`, `/care-teams`)**
   - User provisioning and invitations across all roles.
   - Multi-disciplinary care team assignments and active relationship management.
   - System-level role verification and account management.

---

## 🛠️ Local Development Setup

### Prerequisites
- **Node.js**: 20.x or later
- **npm**: 10.x or later
- **Supabase**: Active Supabase project (cloud or local instance)

### 1. Clone & Install
```bash
git clone https://github.com/your-org/careconnect.git
cd careconnect
npm install
```

### 2. Environment Variables
Copy the example environment file and populate your project credentials:
```bash
cp .env.local.example .env.local
```

Inside `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
```

### 3. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to view the application.

---

## 🗄️ Database Migrations

CareConnect requires 10 migrations executed in sequential order.

### Sequential Migration Order
| # | Migration File | Description |
|---|----------------|-------------|
| **01** | `01_schema.sql` | Core schema defining enums, tables (`users`, `patient_profiles`, `care_teams`, `vitals_logs`, `medical_reviews`, `notifications`), indexes, and foreign keys. |
| **02** | `02_rls_policies.sql` | Row Level Security policies establishing strict role-based data isolation across all application tables. |
| **03** | `03_functions_triggers.sql` | Core database triggers automating role enforcement, caregiver notifications, clinical status propagation, and urgent fanouts. |
| **04** | `04_admin_functions.sql` | Security-definer RPC functions for atomic user profile provisioning and care team management. |
| **05** | `05_user_protection.sql` | Protective triggers preventing unauthorized user deletion or role self-escalation. |
| **06** | `06_realtime.sql` | Configures Supabase Realtime publication for instant WebSocket delivery of user notifications. |
| **07** | `07_care_team_visibility.sql` | Care team visibility policies enabling cross-disciplinary discovery while preventing data leakage. |
| **08** | `08_medical_reviews_patient_consistency.sql` | Clinical integrity constraint trigger ensuring medical review patient IDs strictly match referenced vitals logs. |
| **09** | `09_patient_care_team_visibility.sql` | RLS policy extension permitting patients to view their assigned care team roster. |
| **10** | `10_enforce_status_via_medical_reviews.sql` | Restricts direct modifications to `patient_profiles.current_status` and atomically synchronizes review timestamps. |

> [!IMPORTANT]
> **Manual Migration Notice for Migrations 05+**:
> In environments where the Supabase MCP token is scoped to a different organization than project `pssdhalhqsnfnexzdtde`, migrations **05 through 10** must be applied manually via the **Supabase Dashboard SQL Editor** (SQL Editor -> New query -> Paste file contents -> Run).

---

## 🌱 Seeding Initial Test Accounts

To seed initial test accounts with pre-configured roles and sample patient profiles:

```bash
npm run seed
```

This provisions the following test accounts:
- **Admin**: `admin@test.com` (`password123`)
- **Doctor**: `doctor@test.com` (`password123`)
- **Caregiver**: `caregiver@test.com` (`password123`)
- **Patient**: `patient@test.com` (`password123`)
- **Family Member**: `family_member@test.com` (`password123`)

*(Remember the security notice above: do not use default passwords in production environments.)*

---

## 🏛️ Core Architectural Decisions

1. **Row Level Security (RLS) as the Definitive Boundary**
   Application security is enforced directly at the PostgreSQL layer. Frontend guards and layout checks provide UX convenience, but PostgreSQL RLS policies guarantee zero unauthorized data access even if client-side code is manipulated.

2. **Isolated Service-Role Client**
   The elevated Supabase client (`createAdminClient`) is strictly isolated to [`src/lib/supabase/admin.ts`](file:///c:/Users/Admin/predev-careconnect/src/lib/supabase/admin.ts) and is only invoked for administrative actions (e.g., user invites, care team configuration) and database seeding.

3. **`server-only` Service Layer**
   All service files under `src/services/` import `'server-only'` to guarantee that backend database queries and administrative credentials cannot be leaked into client JavaScript bundles.

4. **Server-Side Identity Binding**
   On all writes (submitting vitals, submitting medical evaluations), identity fields such as `caregiver_id` and `doctor_id` are derived server-side from the authenticated session (`supabase.auth.getUser()`), preventing identity spoofing.

5. **Immutable Append-Only Clinical Records**
   Tables holding medical data (`vitals_logs`, `medical_reviews`) are append-only. There are no `UPDATE` or `DELETE` RLS policies exposed to normal users, ensuring an unalterable clinical audit trail.

6. **Status Changes Strictly via `process_medical_review()`**
   Direct updates to `patient_profiles.current_status` are locked down by trigger (`pg_trigger_depth() > 1`). The patient's clinical status can only change when an attending physician submits an official medical review, ensuring timestamps and status history remain synchronized.

---

## ⚠️ Scope and Limitations

CareConnect is intentionally built as a **clinical reporting and monitoring system**:
- **What it does**: It records the doctor's clinical determinations, updates patient health status across all authenticated role portals, and delivers realtime in-app notifications to the care team, patient, and family.
- **What it does NOT do**: It does **not** send SMS text messages, does **not** place phone calls or trigger pagers, does **not** track whether critical alerts were seen or received, and does **not** escalate unread alerts.

### Clinical Escalation Boundary
Urgent and emergency clinical responses follow existing institutional protocols:
- **Bedside & Inpatient Immediate Concerns**: Staff must follow standard institutional protocol, contacting the Nurses' Station directly.
- **Life-Threatening Situations**: Contact emergency services (911) immediately, as explicitly surfaced throughout the Patient and Family portals.

### Design Rationale
Guaranteed alert delivery requires redundant out-of-band communication channels, delivery confirmations, and escalation chains that a web application cannot provide alone. A system that appears to guarantee emergency response without actually doing so would be significantly more dangerous than one that clearly defines its operational boundaries. Clinical safety relies on transparent capabilities and adherence to proven life-safety procedures.

---

## 🔮 Future Work

The following features represent architectural roadmap priorities scoped for subsequent development phases:

1. **Acknowledgment Tracking on Critical Alerts**
   - Add an `acknowledged_at` column and recipient signature metadata to the `notifications` table.
   - Present a mandatory confirmation prompt for recipients upon opening urgent or critical notifications.
   - Provide an unacknowledged-alerts view for attending physicians and administrators to identify unread clinical warnings.

2. **Secondary Communication Channels (SMS)**
   - Introduce SMS notifications as an automated secondary delivery channel for urgent and critical events.

3. **View-Access Audit Logging**
   - Maintain a tamper-evident audit log recording who viewed which patient charts, history tables, and clinical records to satisfy compliance standards.

4. **Automated Test Suite**
   - Establish an end-to-end automated testing suite (e.g., Playwright / Vitest) to replace current one-off verification scripts and validate RLS policies, role access boundaries, and critical flows continuously.

---

## 🚀 Deployment to Vercel

The project is configured for seamless deployment on Vercel:

1. Import the repository in [Vercel](https://vercel.com/new).
2. Configure Project Name: `careconnect`.
3. Add the following **Environment Variables**:
   - `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase Project URL.
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Your Supabase Anonymous Public Key.
   - `SUPABASE_SERVICE_ROLE_KEY`: Your Supabase Service Role Key (kept private, **never** prefixed with `NEXT_PUBLIC_`).
4. Deploy. The Next.js build pipeline will compile static assets and server-side routes automatically.

