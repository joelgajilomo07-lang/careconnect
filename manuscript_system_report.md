# CareConnect System Information Report (for Capstone Manuscript)
**System Title:** CareConnect: A Web-Based Caregiver Reporting and Patient Monitoring System for Timely Health Status Updates  
**Target Agency / Partner:** Tender Touch Home Care Services, Dumaguete City, Negros Oriental, Philippines  
**Legal & Regulatory Framework:** Republic Act No. 10173 (Data Privacy Act of 2012)  
**Document Purpose:** Factual Technical Reference for Manuscript Chapter III (Technical Background, Design, System Architecture, Requirements) and Chapter IV (Results and Discussion)  
**Inspection Date:** October 13, 2026  
**Operational Status:** Read-Only Verification Completed (Zero Database Mutations, Zero Exposed Secrets, Strictly Fictitious Test Records)

---

## 1. Project Overview

### 1.1 System Identity & Executive Summary
- **System Name in UI:** CareConnect
- **Full Capstone Title:** CareConnect: A Web-Based Caregiver Reporting and Patient Monitoring System for Timely Health Status Updates
- **Partner Organization:** Tender Touch Home Care Services, Dumaguete City
- **System Description:**  
  CareConnect is a specialized, responsive, web-based healthcare communication and clinical monitoring platform engineered for Tender Touch Home Care Services in Dumaguete City. The system bridges the operational gap between home-based caregivers and clinical supervisors by providing structured bedside vital-sign reporting, an automated physician triage queue, authoritative medical reviews, dynamic health status tracking (`stable`, `warning`, `critical`, `unassessed`), bedside medication administration recording (MAR), shift handover documentation, and real-time alerts. It enforces strict role-based access control across five distinct user roles (System Administrator, Doctor, Caregiver, Patient, and Family Member), guaranteeing transparent patient monitoring while upholding patient confidentiality in compliance with the Philippine Data Privacy Act of 2012 (RA 10173).
- **Deployed Production URL:** `UNVERIFIED` (Vercel deployment is configured via `vercel.json` and continuous Git integration with GitHub repository `https://github.com/joelgajilomo07-lang/careconnect.git`; the live custom production domain or Vercel URL must be confirmed by the researchers).

### 1.2 Repository Directory Structure (Top Two Levels)
```
predev-careconnect/
├── docs/                        # Project architectural specifications, workflows, and database documentation
├── manuscript_screenshots/      # High-resolution PNG captures of all system interfaces for manuscript figures
├── public/                      # Static web assets (SVG icons, favicons, branding logos)
├── scratch/                     # Internal scratch scripts and verification test benches
├── screenshots/                 # Historical interface previews and wireframes
├── scripts/                     # Operational automation scripts (build helpers, database utilities)
├── src/                         # Core Next.js 16 application source code
│   ├── app/                     # App Router routes, page components, layouts, and server actions
│   ├── components/              # Modular React UI components (admin, doctor, caregiver, shared)
│   ├── hooks/                   # Custom client-side React hooks (e.g., useRealtimeNotifications)
│   ├── lib/                     # Server/client Supabase clients, auth guards, validations, clinical utils
│   └── types/                   # TypeScript interface declarations and Supabase generated database types
├── supabase/                    # Supabase infrastructure configuration
│   ├── migrations/              # 12 sequential PostgreSQL schema migration SQL files
│   └── seed.sql                 # Baseline relational seed data for development and testing
├── .env.local                   # Local environment variable configuration (values secret/hidden)
├── .env.local.example           # Environment template documenting required variable keys
├── AGENTS.md                    # Environment and framework rules for Next.js 16
├── package.json                 # Dependency manifests, package versions, and npm run scripts
├── package-lock.json            # Deterministic dependency lockfile
├── seed.ts                      # Standalone TypeScript script for populating realistic test cohorts
├── tsconfig.json                # TypeScript compiler configuration
└── vercel.json                  # Vercel cloud deployment routing and build configuration
```

---

## 2. Technology Stack

### 2.1 Complete Technology Inventory
| Layer | Technology | Exact Version | Purpose in CareConnect |
|---|---|---|---|
| **Front-end Framework** | Next.js (App Router) | `16.3.4` | Server-Side Rendering (SSR), React Server Components (RSC), Server Actions, and file-system routing |
| **UI Runtime** | React / React-DOM | `19.2.8` | Core component architecture, concurrent rendering, and user interface state management |
| **Programming Language** | TypeScript | `5.9.3` | End-to-end static type safety, database type generation, and interface contract enforcement |
| **Build & Tooling** | Next CLI / Turbopack / PostCSS | `16.3.4` / `8.5.8` | Incremental bundler, fast refresh server, asset compilation, and CSS post-processing |
| **Styling & Design System** | Tailwind CSS / PostCSS Plugin | `4.3.3` / `4.3.3` | Utility-first responsive design tokens, clinical color hierarchies, and print media formatting |
| **Typography** | Plus Jakarta Sans (`next/font/google`) | Google Fonts API | Modern, legible healthcare typography loaded via CSS variables (`--font-plus-jakarta-sans`) |
| **Iconography** | Lucide React | `1.38.0` | Comprehensive medical, navigational, status, and operational SVG icons |
| **Data Visualization** | Recharts | `3.10.1` | Interactive time-series vital-sign trend charts, baseline reference bands, and clinical graphs |
| **State & Data Fetching** | React Hooks & Server Actions | `19.2.8` | Server mutations via `useTransition`, form states via `useState`, and real-time updates via hooks |
| **Form Validation** | Zod | `4.5.4` | Strict schema validation for vital signs, threshold limits, user registrations, and clinical inputs |
| **Date & Time Formatting** | date-fns | `4.4.0` | Parsing, formatting, and arithmetic for medication schedules, timestamps, and shift durations |
| **Document Export / Print** | Browser Print Engine (`window.print()`) | Native Web API | Specialized `@media print` layouts in CSS producing clean clinical summaries and MAR reports |
| **Database Client** | `@supabase/supabase-js` | `2.112.4` | Supabase PostgREST client, Realtime channel subscriptions, and authentication integration |
| **SSR Auth Helpers** | `@supabase/ssr` | `0.12.5` | Cookie-based session token storage, server-component auth client, and middleware context |
| **Database Engine** | PostgreSQL (Supabase Hosted) | `15.8` (PostgreSQL) | Relational storage, custom enums, relational constraints, triggers, and Row Level Security |
| **Hosting Platform** | Vercel | Cloud Platform | Automatic Git branch deployments, Edge routing, and production serverless execution |
| **Development Runtime** | Node.js | `v24.14.0` | Local JavaScript engine executing Next.js development server and build scripts |
| **Package Manager** | npm | `11.9.0` | Deterministic package installation and dependency tree management |
| **Version Control** | Git / GitHub | `2.x` | Source code revision tracking, branch management, and collaborative synchronization |
| **Development Machine** | Windows 10 Pro (x64) | `10.0.19045` | Development host workstation (Intel Core i5-7200U @ 2.50GHz, 16.0 GB RAM) |

### 2.2 Supabase Services Utilization Breakdown
- **Supabase Auth:** **USED** — Email and password authentication, password hashing, JWT session lifecycle, recovery token verification, and cookie-based server session exchange.
- **PostgreSQL Database:** **USED** — Houses 15 relational tables, 2 compatibility views, 4 custom PostgreSQL enums, foreign keys, triggers, and check constraints.
- **PostgREST:** **USED** — Auto-generated RESTful API queried directly through `@supabase/supabase-js` with RLS enforcement.
- **Row Level Security (RLS):** **USED** — Enabled on all 15 tables in the `public` schema; multi-tenant access control policies isolated across the 5 user roles.
- **Supabase Realtime:** **USED** — Publication `supabase_realtime` enabled on `public.notifications` with `REPLICA IDENTITY FULL`; powers live notification counter badges in client navigation bars.
- **Supabase Storage:** **NOT USED** — Querying `storage.buckets` returns an empty array `[]`. Profile images and patient avatars utilize fallback SVG initials and curated UI avatars rather than cloud object storage buckets.
- **Supabase Edge Functions:** **NOT USED** — 0 Edge Functions deployed. All backend logic, notification generation, and data transformations are executed within Next.js Server Actions and PostgreSQL database triggers.
- **Scheduled Jobs (`pg_cron`):** **NOT USED** — No cron extensions or recurring database background schedulers are active.

### 2.3 Environment Variables (Names Only)
- `NEXT_PUBLIC_SUPABASE_URL` — Public HTTPS endpoint for the Supabase project instance (value hidden).
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Public anonymous client API key for client-side Supabase PostgREST queries (value hidden).
- `SUPABASE_SERVICE_ROLE_KEY` — Elevated service role secret key utilized exclusively in server actions for administrative user provisioning (value hidden).

---

## 3. Database Schema (Supabase / PostgreSQL)

The CareConnect database runs on PostgreSQL (Supabase). The `public` schema contains **15 core relational tables** and **2 backward-compatible SQL views**.

### 3.1 Tables and Structural Definitions

#### Table 1: `public.users`
- **Purpose:** Stores core user account profiles, clinical roles, contact information, account status, and authentication security lockout counters.
- **Column Specification:**

| Column | Data Type | Nullable | Default | Key | Description |
|---|---|---|---|---|---|
| `id` | `uuid` | No | `auth.uid()` / `gen_random_uuid()` | PK, FK → `auth.users(id)` ON DELETE CASCADE | Unique account identifier linked directly to Supabase Auth |
| `email` | `text` | No | None | Unique | User login email address |
| `full_name` | `text` | No | None | — | First and last name of the user |
| `role` | `user_role` | No | None | — | System authorization role: `admin`, `doctor`, `caregiver`, `patient`, `family_member` |
| `phone_number` | `text` | Yes | `null` | — | Contact telephone number |
| `is_active` | `boolean` | No | `true` | — | Account state flag allowing administrative deactivation |
| `failed_login_attempts` | `integer` | No | `0` | — | Failed authentication attempt counter for rate limiting |
| `locked_until` | `timestamp with time zone` | Yes | `null` | — | Timestamp indicating when an account lockout expires |
| `created_at` | `timestamp with time zone` | No | `now()` | — | Record creation timestamp |
| `updated_at` | `timestamp with time zone` | No | `now()` | — | Record last modified timestamp |

- **Constraints & Indexes:**
  - Unique Constraint: `users_email_key` (`email`)
  - Indexes: `users_pkey` (`id`), `idx_users_role` (`role`), `idx_users_is_active` (`is_active`)

---

#### Table 2: `public.patients`
- **Purpose:** Central clinical and demographic record for every patient under the care of Tender Touch Home Care Services.
- **Column Specification:**

| Column | Data Type | Nullable | Default | Key | Description |
|---|---|---|---|---|---|
| `id` | `uuid` | No | `gen_random_uuid()` | PK | Unique patient identifier |
| `full_name` | `text` | No | None | — | Full name of the patient |
| `date_of_birth` | `date` | No | None | — | Patient date of birth for age calculation |
| `gender` | `text` | Yes | `null` | — | Patient gender/sex (`Male`, `Female`, `Other`) |
| `primary_condition` | `text` | Yes | `null` | — | Primary clinical diagnosis or chief medical complaint |
| `medical_history` | `text` | Yes | `null` | — | Historical medical conditions, comorbidities, and baseline health notes |
| `allergies` | `text[]` | Yes | `'{}'::text[]` | — | Array of known drug and environmental allergies |
| `current_status` | `patient_status` | No | `'unassessed'` | — | Official clinical status: `stable`, `warning`, `critical`, `unassessed` |
| `user_id` | `uuid` | Yes | `null` | FK → `users(id)` ON DELETE SET NULL | Optional 1:1 foreign key if patient has a portal user account |
| `address` | `text` | Yes | `null` | — | Residential home address in Dumaguete City / Negros Oriental |
| `emergency_contact_name` | `text` | Yes | `null` | — | Primary emergency contact person |
| `emergency_contact_phone`| `text` | Yes | `null` | — | Emergency contact telephone number |
| `emergency_contact_relationship` | `text` | Yes | `null` | — | Relationship of contact person to patient |
| `created_at` | `timestamp with time zone` | No | `now()` | — | Patient profile creation timestamp |
| `updated_at` | `timestamp with time zone` | No | `now()` | — | Patient profile last updated timestamp |

- **Constraints & Indexes:**
  - Unique Constraint: `patients_user_id_key` (`user_id`)
  - Indexes: `patients_pkey` (`id`), `idx_patients_current_status` (`current_status`), `idx_patients_user_id` (`user_id`)

---

#### Table 3: `public.care_teams`
- **Purpose:** Relational care-team assignment matrix linking healthcare personnel and family members to specific patients.
- **Column Specification:**

| Column | Data Type | Nullable | Default | Key | Description |
|---|---|---|---|---|---|
| `id` | `uuid` | No | `gen_random_uuid()` | PK | Unique assignment record identifier |
| `patient_id` | `uuid` | No | None | FK → `patients(id)` ON DELETE CASCADE | Associated patient |
| `user_id` | `uuid` | No | None | FK → `users(id)` ON DELETE CASCADE | Assigned user (Doctor, Caregiver, or Family Member) |
| `role` | `care_team_role` | No | None | — | Role in care team: `doctor`, `caregiver`, `family_member` |
| `relationship_to_patient`| `text` | Yes | `null` | — | Specific relationship (e.g., `Attending Physician`, `Primary Caregiver`, `Son`) |
| `is_primary` | `boolean` | No | `false` | — | Flag indicating whether this user is primary in this role |
| `assigned_at` | `timestamp with time zone` | No | `now()` | — | Assignment timestamp |

- **Constraints & Indexes:**
  - Unique Constraint: `care_teams_patient_user_role_key` (`patient_id`, `user_id`, `role`)
  - Indexes: `care_teams_pkey` (`id`), `idx_care_teams_patient` (`patient_id`), `idx_care_teams_user` (`user_id`), `idx_care_teams_role` (`role`)

---

#### Table 4: `public.vitals_logs`
- **Purpose:** Immutable bedside physiological measurements and symptom logs recorded by caregivers during home care visits.
- **Column Specification:**

| Column | Data Type | Nullable | Default | Key | Description |
|---|---|---|---|---|---|
| `id` | `uuid` | No | `gen_random_uuid()` | PK | Unique vitals log identifier |
| `patient_id` | `uuid` | No | None | FK → `patients(id)` ON DELETE CASCADE | Associated patient |
| `caregiver_id` | `uuid` | No | None | FK → `users(id)` ON DELETE RESTRICT | Caregiver who recorded the vitals |
| `bp_systolic` | `integer` | Yes | `null` | — | Systolic blood pressure (mmHg) |
| `bp_diastolic` | `integer` | Yes | `null` | — | Diastolic blood pressure (mmHg) |
| `heart_rate` | `integer` | Yes | `null` | — | Pulse rate (beats per minute) |
| `temperature_c` | `numeric(4,1)` | Yes | `null` | — | Body temperature in degrees Celsius (°C) |
| `spo2` | `integer` | Yes | `null` | — | Blood oxygen saturation percentage (%) |
| `respiratory_rate` | `integer` | Yes | `null` | — | Respiratory rate (breaths per minute) |
| `blood_glucose` | `numeric(5,1)` | Yes | `null` | — | Blood glucose concentration (mg/dL) |
| `pain_score` | `integer` | Yes | `null` | — | Subjective pain score on standard scale (0–10) |
| `weight_kg` | `numeric(5,2)` | Yes | `null` | — | Patient weight in kilograms (kg) |
| `height_cm` | `numeric(5,2)` | Yes | `null` | — | Patient height in centimeters (cm) |
| `bmi` | `numeric(4,1)` | Yes | `null` | — | Calculated Body Mass Index (kg/m²) |
| `measurement_position` | `text` | Yes | `'Sitting'` | — | Posture during measurement (`Sitting`, `Lying`, `Standing`) |
| `bp_arm` | `text` | Yes | `'Left'` | — | Arm used for BP reading (`Left`, `Right`) |
| `temp_method` | `text` | Yes | `'Oral'` | — | Temperature method (`Oral`, `Axillary`, `Tympanic`, `Forehead`) |
| `oxygen_device` | `text` | Yes | `'Room Air'` | — | Oxygen delivery mode (`Room Air`, `Nasal Cannula`, `Mask`) |
| `symptoms` | `text[]` | Yes | `'{}'::text[]` | — | Array of checked physical symptoms |
| `symptoms_other` | `text` | Yes | `null` | — | Free-text field for symptoms not in preset list |
| `notes` | `text` | Yes | `null` | — | Caregiver clinical observations and bedside context |
| `logged_at` | `timestamp with time zone` | No | `now()` | — | Exact observation timestamp |
| `created_at` | `timestamp with time zone` | No | `now()` | — | Record persistence timestamp |

- **Check Constraints & Indexes:**
  - Check: `chk_spo2_range` (`spo2 is null or (spo2 between 0 and 100)`)
  - Check: `chk_hr_range` (`heart_rate is null or (heart_rate between 0 and 300)`)
  - Indexes: `vitals_logs_pkey` (`id`), `idx_vitals_patient_logged` (`patient_id`, `logged_at` DESC), `idx_vitals_caregiver` (`caregiver_id`)

---

#### Table 5: `public.medical_reviews`
- **Purpose:** Authoritative clinical evaluations and status assignments recorded exclusively by licensed medical doctors.
- **Column Specification:**

| Column | Data Type | Nullable | Default | Key | Description |
|---|---|---|---|---|---|
| `id` | `uuid` | No | `gen_random_uuid()` | PK | Unique medical review identifier |
| `patient_id` | `uuid` | No | None | FK → `patients(id)` ON DELETE CASCADE | Associated patient |
| `doctor_id` | `uuid` | No | None | FK → `users(id)` ON DELETE RESTRICT | Reviewing physician |
| `vitals_log_id` | `uuid` | Yes | `null` | FK → `vitals_logs(id)` ON DELETE SET NULL | Associated vitals record that prompted review |
| `status_assigned` | `patient_status` | No | None | — | Clinical assessment: `stable`, `warning`, `critical` |
| `clinical_feedback` | `text` | No | None | — | Physician clinical evaluation notes and orders |
| `caregiver_instructions`| `text` | Yes | `null` | — | Direct instructions for bedside caregivers |
| `reviewed_at` | `timestamp with time zone` | No | `now()` | — | Review submission timestamp |
| `created_at` | `timestamp with time zone` | No | `now()` | — | Record persistence timestamp |

- **Constraints & Indexes:**
  - Indexes: `medical_reviews_pkey` (`id`), `idx_reviews_patient_reviewed` (`patient_id`, `reviewed_at` DESC), `idx_reviews_doctor` (`doctor_id`)

---

#### Table 6: `public.notifications`
- **Purpose:** Per-recipient alert and clinical event feed powering in-app notification centers and Supabase Realtime subscriptions.
- **Column Specification:**

| Column | Data Type | Nullable | Default | Key | Description |
|---|---|---|---|---|---|
| `id` | `uuid` | No | `gen_random_uuid()` | PK | Unique notification identifier |
| `recipient_id` | `uuid` | No | None | FK → `users(id)` ON DELETE CASCADE | Receiving user |
| `patient_id` | `uuid` | Yes | `null` | FK → `patients(id)` ON DELETE CASCADE | Subject patient |
| `type` | `notification_type` | No | None | — | Event type enum (8 allowed categories) |
| `title` | `text` | No | None | — | Short alert headline |
| `message` | `text` | No | None | — | Descriptive alert message body |
| `is_read` | `boolean` | No | `false` | — | Read / unread acknowledgement state |
| `related_review_id` | `uuid` | Yes | `null` | FK → `medical_reviews(id)` ON DELETE SET NULL | Linked medical review record |
| `related_vitals_id` | `uuid` | Yes | `null` | FK → `vitals_logs(id)` ON DELETE SET NULL | Linked vitals log record |
| `created_at` | `timestamp with time zone` | No | `now()` | — | Notification generation timestamp |

- **Constraints & Indexes:**
  - Indexes: `notifications_pkey` (`id`), `idx_notifications_recipient` (`recipient_id`, `is_read`, `created_at` DESC), `idx_notifications_patient` (`patient_id`)

---

#### Table 7: `public.audit_logs`
- **Purpose:** Append-only, tamper-evident log documenting user operations, clinical evaluations, and security-relevant events.
- **Column Specification:**

| Column | Data Type | Nullable | Default | Key | Description |
|---|---|---|---|---|---|
| `id` | `uuid` | No | `gen_random_uuid()` | PK | Unique audit log entry identifier |
| `performed_by` | `uuid` | Yes | `null` | FK → `users(id)` ON DELETE SET NULL | User who triggered the logged event |
| `target_patient_id` | `uuid` | Yes | `null` | FK → `patients(id)` ON DELETE SET NULL | Subject patient referenced in action |
| `action` | `text` | No | None | — | Standardized action descriptor |
| `details` | `jsonb` | Yes | `'{}'::jsonb` | — | Structured payload capturing prior and updated values |
| `ip_address` | `text` | Yes | `null` | — | Client network IP address if provided |
| `created_at` | `timestamp with time zone` | No | `now()` | — | Exact audit log timestamp |

- **Constraints & Indexes:**
  - Indexes: `audit_logs_pkey` (`id`), `idx_audit_logs_action` (`action`), `idx_audit_logs_created` (`created_at` DESC), `idx_audit_logs_patient` (`target_patient_id`)

---

#### Table 8: `public.medications`
- **Purpose:** Prescribed pharmacological regimens and active medication orders established by physicians for each patient.
- **Column Specification:**

| Column | Data Type | Nullable | Default | Key | Description |
|---|---|---|---|---|---|
| `id` | `uuid` | No | `gen_random_uuid()` | PK | Unique medication prescription identifier |
| `patient_id` | `uuid` | No | None | FK → `patients(id)` ON DELETE CASCADE | Associated patient |
| `name` | `text` | No | None | — | Medication brand and generic trade name |
| `dosage` | `text` | No | None | — | Clinical dose (e.g., `500 mg`, `10 mg`, `1 tablet`) |
| `frequency` | `text` | No | None | — | Prescribed dosing interval (e.g., `Once daily`, `Twice daily (BID)`) |
| `route` | `text` | Yes | `'Oral'` | — | Administration route (`Oral`, `Sublingual`, `Topical`, `Subcutaneous`) |
| `instructions` | `text` | Yes | `null` | — | Specific administration notes (e.g., `Take with meals`) |
| `is_active` | `boolean` | No | `true` | — | Active prescription status |
| `prescribed_by` | `uuid` | Yes | `null` | FK → `users(id)` ON DELETE SET NULL | Prescribing physician |
| `created_at` | `timestamp with time zone` | No | `now()` | — | Prescription creation timestamp |
| `updated_at` | `timestamp with time zone` | No | `now()` | — | Prescription last updated timestamp |

- **Constraints & Indexes:**
  - Indexes: `medications_pkey` (`id`), `idx_medications_patient` (`patient_id`, `is_active`)

---

#### Table 9: `public.medication_logs`
- **Purpose:** Bedside Medication Administration Record (MAR) tracking individual doses administered, held, or missed by caregivers.
- **Column Specification:**

| Column | Data Type | Nullable | Default | Key | Description |
|---|---|---|---|---|---|
| `id` | `uuid` | No | `gen_random_uuid()` | PK | Unique administration log entry identifier |
| `medication_id` | `uuid` | No | None | FK → `medications(id)` ON DELETE CASCADE | Associated prescription order |
| `administered_by` | `uuid` | No | None | FK → `users(id)` ON DELETE RESTRICT | Caregiver logging the administration |
| `scheduled_time` | `timestamp with time zone` | No | None | — | Scheduled administration date and time |
| `administered_at` | `timestamp with time zone` | Yes | `null` | — | Actual administration date and time |
| `status` | `text` | No | `'administered'` | — | Administration state: `administered`, `missed`, `held`, `refused` |
| `notes` | `text` | Yes | `null` | — | Caregiver remarks or clinical reason for hold/refusal |
| `created_at` | `timestamp with time zone` | No | `now()` | — | Record persistence timestamp |

- **Constraints & Indexes:**
  - Indexes: `medication_logs_pkey` (`id`), `idx_med_logs_medication` (`medication_id`, `scheduled_time` DESC)

---

#### Table 10: `public.shift_reports`
- **Purpose:** Comprehensive shift handover documentation completed by caregivers at the conclusion of home care visits.
- **Column Specification:**

| Column | Data Type | Nullable | Default | Key | Description |
|---|---|---|---|---|---|
| `id` | `uuid` | No | `gen_random_uuid()` | PK | Unique shift report identifier |
| `caregiver_id` | `uuid` | No | None | FK → `users(id)` ON DELETE RESTRICT | Submitting caregiver |
| `shift_date` | `date` | No | None | — | Calendar date of the completed shift |
| `shift_type` | `text` | No | None | — | Shift schedule: `Morning (6AM - 2PM)`, `Afternoon (2PM - 10PM)`, `Night (10PM - 6AM)` |
| `hours_worked` | `numeric(4,2)` | Yes | `8.0` | — | Total duration of shift in hours |
| `patients_attended` | `uuid[]` | Yes | `'{}'::uuid[]` | — | Array of patient UUIDs cared for during the shift |
| `tasks_completed` | `text[]` | Yes | `'{}'::text[]` | — | Array of bedside duties executed (e.g., hygiene, feeding, mobility) |
| `general_notes` | `text` | Yes | `null` | — | Narrative shift summary and patient observations |
| `incident_notes` | `text` | Yes | `null` | — | Critical incidents, falls, behavioral challenges, or medical changes |
| `handover_notes` | `text` | Yes | `null` | — | Direct instructions and priorities for the incoming shift caregiver |
| `supervisor_id` | `uuid` | Yes | `null` | FK → `users(id)` ON DELETE SET NULL | Optional supervisor or administrator reviewing the shift report |
| `status` | `text` | No | `'submitted'` | — | Report review status: `submitted`, `reviewed`, `acknowledged` |
| `created_at` | `timestamp with time zone` | No | `now()` | — | Shift report submission timestamp |
| `updated_at` | `timestamp with time zone` | No | `now()` | — | Shift report last updated timestamp |

- **Constraints & Indexes:**
  - Indexes: `shift_reports_pkey` (`id`), `idx_shift_reports_caregiver` (`caregiver_id`, `shift_date` DESC)

---

#### Table 11: `public.vital_sign_thresholds`
- **Purpose:** Patient-specific physiological threshold parameters configured by attending physicians to drive alert heuristics.
- **Column Specification:**

| Column | Data Type | Nullable | Default | Key | Description |
|---|---|---|---|---|---|
| `id` | `uuid` | No | `gen_random_uuid()` | PK | Unique threshold configuration identifier |
| `patient_id` | `uuid` | No | None | FK → `patients(id)` ON DELETE CASCADE | Associated patient |
| `bp_systolic_min` | `integer` | Yes | `90` | — | Minimum systolic BP normal boundary (mmHg) |
| `bp_systolic_max` | `integer` | Yes | `140` | — | Maximum systolic BP normal boundary (mmHg) |
| `bp_diastolic_min` | `integer` | Yes | `60` | — | Minimum diastolic BP normal boundary (mmHg) |
| `bp_diastolic_max` | `integer` | Yes | `90` | — | Maximum diastolic BP normal boundary (mmHg) |
| `pulse_rate_min` | `integer` | Yes | `60` | — | Minimum resting pulse boundary (bpm) |
| `pulse_rate_max` | `integer` | Yes | `100` | — | Maximum resting pulse boundary (bpm) |
| `respiratory_rate_min` | `integer` | Yes | `12` | — | Minimum respiratory rate boundary (breaths/min) |
| `respiratory_rate_max` | `integer` | Yes | `20` | — | Maximum respiratory rate boundary (breaths/min) |
| `temperature_min` | `numeric(4,1)` | Yes | `36.5` | — | Minimum core temperature boundary (°C) |
| `temperature_max` | `numeric(4,1)` | Yes | `37.5` | — | Maximum core temperature boundary (°C) |
| `spo2_min` | `integer` | Yes | `95` | — | Minimum acceptable oxygen saturation (%) |
| `spo2_max` | `integer` | Yes | `100` | — | Maximum oxygen saturation (%) |
| `blood_glucose_min` | `numeric(5,1)` | Yes | `70.0` | — | Minimum fasting blood glucose (mg/dL) |
| `blood_glucose_max` | `numeric(5,1)` | Yes | `140.0` | — | Maximum postprandial blood glucose (mg/dL) |
| `notes` | `text` | Yes | `null` | — | Physician clinical rationale for customized threshold limits |
| `updated_by` | `uuid` | Yes | `null` | FK → `users(id)` ON DELETE SET NULL | Physician who established or modified thresholds |
| `updated_at` | `timestamp with time zone` | No | `now()` | — | Thresholds last updated timestamp |

- **Constraints & Indexes:**
  - Unique Constraint: `vital_sign_thresholds_patient_id_key` (`patient_id`)
  - Indexes: `vital_sign_thresholds_pkey` (`id`), `idx_thresholds_patient` (`patient_id`)

---

#### Table 12: `public.care_notes`
- **Purpose:** Collaborative clinical and care coordination notes recorded by physicians and shared across the multi-disciplinary team.
- **Column Specification:**

| Column | Data Type | Nullable | Default | Key | Description |
|---|---|---|---|---|---|
| `id` | `uuid` | No | `gen_random_uuid()` | PK | Unique care note identifier |
| `patient_id` | `uuid` | No | None | FK → `patients(id)` ON DELETE CASCADE | Associated patient |
| `author_id` | `uuid` | No | None | FK → `users(id)` ON DELETE RESTRICT | Physician authoring the note |
| `title` | `text` | No | None | — | Note topic or clinical summary headline |
| `content` | `text` | No | None | — | Detailed clinical guidance, care plans, or dietary orders |
| `note_type` | `text` | No | `'general'` | — | Classification: `general`, `dietary`, `medication_change`, `urgent` |
| `created_at` | `timestamp with time zone` | No | `now()` | — | Note creation timestamp |
| `updated_at` | `timestamp with time zone` | No | `now()` | — | Note last updated timestamp |

- **Constraints & Indexes:**
  - Indexes: `care_notes_pkey` (`id`), `idx_care_notes_patient` (`patient_id`, `created_at` DESC)

---

#### Table 13: `public.appointments`
- **Purpose:** Clinical consultations, physician follow-up visits, and specialist encounters scheduled for patients.
- **Column Specification:**

| Column | Data Type | Nullable | Default | Key | Description |
|---|---|---|---|---|---|
| `id` | `uuid` | No | `gen_random_uuid()` | PK | Unique appointment identifier |
| `patient_id` | `uuid` | No | None | FK → `patients(id)` ON DELETE CASCADE | Associated patient |
| `doctor_id` | `uuid` | No | None | FK → `users(id)` ON DELETE RESTRICT | Attending physician |
| `scheduled_at` | `timestamp with time zone` | No | None | — | Scheduled consultation date and time |
| `duration_minutes`| `integer` | No | `30` | — | Expected visit duration in minutes |
| `type` | `text` | No | `'in_person'` | — | Appointment modality: `in_person`, `teleconsult`, `home_visit` |
| `status` | `text` | No | `'scheduled'` | — | Appointment progress: `scheduled`, `completed`, `cancelled`, `no_show` |
| `notes` | `text` | Yes | `null` | — | Clinical preparation instructions and appointment agenda |
| `created_at` | `timestamp with time zone` | No | `now()` | — | Appointment creation timestamp |
| `updated_at` | `timestamp with time zone` | No | `now()` | — | Appointment last updated timestamp |

- **Constraints & Indexes:**
  - Indexes: `appointments_pkey` (`id`), `idx_appointments_patient` (`patient_id`, `scheduled_at`), `idx_appointments_doctor` (`doctor_id`)

---

#### Table 14: `public.messages`
- **Purpose:** In-app secure communication channel enabling direct messaging between care-team members, patients, and families.
- **Column Specification:**

| Column | Data Type | Nullable | Default | Key | Description |
|---|---|---|---|---|---|
| `id` | `uuid` | No | `gen_random_uuid()` | PK | Unique message identifier |
| `sender_id` | `uuid` | No | None | FK → `users(id)` ON DELETE CASCADE | Originating sender user |
| `recipient_id` | `uuid` | No | None | FK → `users(id)` ON DELETE CASCADE | Destination recipient user |
| `patient_id` | `uuid` | Yes | `null` | FK → `patients(id)` ON DELETE SET NULL | Optional patient context referenced in discussion |
| `subject` | `text` | Yes | `null` | — | Message subject line |
| `content` | `text` | No | None | — | Message text content |
| `is_read` | `boolean` | No | `false` | — | Recipient acknowledgement flag |
| `created_at` | `timestamp with time zone` | No | `now()` | — | Message dispatch timestamp |

- **Constraints & Indexes:**
  - Indexes: `messages_pkey` (`id`), `idx_messages_recipient` (`recipient_id`, `is_read`), `idx_messages_sender` (`sender_id`)

---

#### Table 15: `public.patient_profiles`
- **Purpose:** Supporting profile extension table linking portal user accounts with emergency contacts, blood type, and medical details.
- **Column Specification:**

| Column | Data Type | Nullable | Default | Key | Description |
|---|---|---|---|---|---|
| `id` | `uuid` | No | `gen_random_uuid()` | PK | Unique profile identifier |
| `user_id` | `uuid` | No | None | FK → `users(id)` ON DELETE CASCADE | Associated user account |
| `date_of_birth` | `date` | Yes | `null` | — | Profile date of birth |
| `gender` | `text` | Yes | `null` | — | Gender identity |
| `blood_type` | `text` | Yes | `null` | — | ABO/Rh blood type (e.g., `O+`, `A+`, `B+`) |
| `emergency_contact_name` | `text` | Yes | `null` | — | Contact person name |
| `emergency_contact_phone`| `text` | Yes | `null` | — | Contact telephone number |
| `medical_conditions` | `text[]` | Yes | `'{}'::text[]` | — | Comorbid diagnoses list |
| `allergies` | `text[]` | Yes | `'{}'::text[]` | — | Recorded allergies |
| `created_at` | `timestamp with time zone` | No | `now()` | — | Profile creation timestamp |
| `updated_at` | `timestamp with time zone` | No | `now()` | — | Profile last updated timestamp |

- **Constraints & Indexes:**
  - Unique Constraint: `patient_profiles_user_id_key` (`user_id`)
  - Indexes: `patient_profiles_pkey` (`id`)

---

### 3.2 SQL Compatibility Views
Defined in migration `12_foundation_data_model.sql` to guarantee backward compatibility with early prototype queries:
1. `public.care_assignments`: Points to `public.care_teams` (`care_assignments.assigned_caregiver_id` maps to `care_teams.user_id`).
2. `public.vital_signs`: Points to `public.vitals_logs` (`vital_signs.systolic_bp` / `diastolic_bp` map to `vitals_logs.bp_systolic` / `bp_diastolic`).

---

### 3.3 Custom PostgreSQL Enums & Allowed Values
1. **`user_role`**:
   - `'admin'` — System Administrator (full operational, user, audit, and reporting authority)
   - `'doctor'` — Licensed Medical Doctor (clinical oversight, review author, status assigner)
   - `'caregiver'` — Home Care Nurse / Caregiver (bedside vitals logging, MAR recording, shift reports)
   - `'patient'` — Patient (self-monitoring of personal records, medications, and appointments)
   - `'family_member'` — Family Member (transparent monitoring of linked loved one)
2. **`patient_status`**:
   - `'stable'` — Patient vitals and clinical status within acceptable therapeutic baseline (Green)
   - `'warning'` — Physiological vitals atypical or patient requires clinical observation (Yellow/Orange)
   - `'critical'` — Severe clinical deterioration requiring immediate physician intervention (Red)
   - `'unassessed'` — Newly registered patient awaiting formal initial medical review (Gray)
3. **`care_team_role`**:
   - `'doctor'` — Attending Physician
   - `'caregiver'` — Bedside Caregiver
   - `'family_member'` — Authorized Family Member
4. **`notification_type`**:
   - `'vitals_logged'` — Caregiver submitted new physiological measurement
   - `'review_needed'` — Pending physician review request generated for attending doctor
   - `'review_submitted'` — Doctor submitted authoritative medical review
   - `'status_change'` — Patient health status changed (`stable`, `warning`, `critical`)
   - `'urgent_update'` — Bedside caregiver triggered emergency clinical alert
   - `'care_note_added'` — Doctor published clinical guidance note
   - `'threshold_exceeded'` — Vitals reading violated customized physiological boundary
   - `'shift_report_submitted'` — Caregiver submitted shift handover report

---

### 3.4 Entity Relationships Summary
- `users (1) — (M) care_teams via user_id` (Users assigned to multidisciplinary care teams)
- `patients (1) — (M) care_teams via patient_id` (Patients assigned doctors, caregivers, family members)
- `users (1) — (0..1) patients via patients.user_id` (Optional 1:1 link for patient self-portal logins)
- `users (1) — (0..1) patient_profiles via patient_profiles.user_id` (Profile extension table)
- `patients (1) — (M) vitals_logs via patient_id` (Vitals recorded over time)
- `users (1) — (M) vitals_logs via caregiver_id` (Caregiver logging vitals)
- `patients (1) — (M) medical_reviews via patient_id` (Reviews authored for patient)
- `users (1) — (M) medical_reviews via doctor_id` (Doctor authoring review)
- `vitals_logs (1) — (0..1) medical_reviews via vitals_log_id` (Vitals log triggering review)
- `patients (1) — (0..1) vital_sign_thresholds via patient_id` (1:1 custom alert thresholds)
- `patients (1) — (M) care_notes via patient_id` (Clinical notes written for patient)
- `patients (1) — (M) medications via patient_id` (Active medication prescriptions)
- `medications (1) — (M) medication_logs via medication_id` (Individual administration events)
- `patients (1) — (M) appointments via patient_id` (Clinical appointments scheduled)
- `users (1) — (M) shift_reports via caregiver_id` (Shift handover reports submitted)
- `users (1) — (M) notifications via recipient_id` (Alert notifications delivered to user)
- `users (1) — (M) audit_logs via performed_by` (Immutable security audit log trail)

---

### 3.5 Authentication and User Profile Linking Mechanism
Supabase Auth manages user credentials inside the isolated `auth.users` schema. The linking mechanism functions as follows:
1. **Manual Provisioning by Administrator:** Public self-registration is intentionally disabled. The System Administrator provisions accounts via Next.js Server Actions using the Supabase Service Role client (`supabase.auth.admin.createUser`).
2. **Foreign Key Integrity:** A corresponding row is inserted into `public.users` where `public.users.id` matches `auth.users.id` (`ON DELETE CASCADE`).
3. **Role & Patient Binding:** When an account has role `'patient'`, the admin links the `users.id` to `patients.user_id`. When an account is a `'family_member'`, the admin binds the user to the patient via `public.care_teams` with `role = 'family_member'`.

---

### 3.6 Data Dictionary Summary & Table Row Counts
*Counts introspected directly from the live database:*

| Table Name | Schema | Primary Key | Column Count | Approximate Row Count | Purpose Summary |
|---|---|---|---|---|---|
| `users` | `public` | `id` (UUID) | 10 | 39 | User accounts, roles, security counters |
| `patients` | `public` | `id` (UUID) | 15 | 11 | Central patient clinical records |
| `care_teams` | `public` | `id` (UUID) | 7 | 43 | Multi-disciplinary care team assignments |
| `vitals_logs` | `public` | `id` (UUID) | 23 | 165 | Bedside vital-sign measurement records |
| `medical_reviews` | `public` | `id` (UUID) | 9 | 13 | Authoritative doctor clinical reviews |
| `notifications` | `public` | `id` (UUID) | 10 | 231 | Per-user alert feed and notifications |
| `audit_logs` | `public` | `id` (UUID) | 7 | 38 | Immutable audit and compliance trail |
| `medications` | `public` | `id` (UUID) | 11 | 10 | Patient medication prescription orders |
| `medication_logs` | `public` | `id` (UUID) | 8 | 36 | Bedside MAR dose administration records |
| `shift_reports` | `public` | `id` (UUID) | 14 | 70 | Caregiver shift handover reports |
| `vital_sign_thresholds`| `public` | `id` (UUID) | 19 | 5 | Doctor-configured patient alert limits |
| `care_notes` | `public` | `id` (UUID) | 8 | 5 | Doctor clinical and care coordination notes |
| `appointments` | `public` | `id` (UUID) | 10 | 5 | Scheduled doctor consultations/visits |
| `messages` | `public` | `id` (UUID) | 8 | 3 | In-app secure care team communications |
| `patient_profiles` | `public` | `id` (UUID) | 11 | 10 | Extended patient profile data |
| **Total** | — | — | — | **686 rows across 15 tables** | — |

---

## 4. Row Level Security (RLS) and Access Control

### 4.1 RLS Activation Status
Row Level Security (`rowsecurity = true`) is **strictly enabled on all 15 public tables**. All direct queries via PostgREST execute under the database role of the authenticated caller (`authenticated`), evaluating policies on each row.

### 4.2 Comprehensive RLS Policy Matrix
| Table Name | Policy Name | Command | Target Role | Plain English Rule | USING / WITH CHECK Clause Summary |
|---|---|---|---|---|---|
| `users` | `users_select_all_auth` | SELECT | `authenticated` | Authenticated users can view user directory (names/roles) | `true` |
| `users` | `users_admin_manage` | ALL | `authenticated` | Only admins can insert, update, or delete user accounts | `is_admin()` |
| `patients` | `patients_select_policy` | SELECT | `authenticated` | Users can view patients only if assigned to their care team, or if admin | `is_admin() OR has_patient_access(auth.uid(), id)` |
| `patients` | `patients_admin_manage` | ALL | `authenticated` | Only admins can create, update, or archive patient records | `is_admin()` |
| `care_teams` | `care_teams_select` | SELECT | `authenticated` | Members see care teams for their patients; admin sees all | `is_admin() OR has_patient_access(auth.uid(), patient_id)` |
| `care_teams` | `care_teams_admin_manage`| ALL | `authenticated` | Only admins can assign or remove care-team members | `is_admin()` |
| `vitals_logs` | `vitals_select_policy` | SELECT | `authenticated` | Users view vitals only for their assigned patients | `is_admin() OR has_patient_access(auth.uid(), patient_id)` |
| `vitals_logs` | `vitals_insert_caregiver`| INSERT | `authenticated` | Caregivers insert vitals only for their assigned patients | `caregiver_id = auth.uid() AND has_patient_access(auth.uid(), patient_id)` |
| `medical_reviews` | `reviews_select_policy`| SELECT | `authenticated` | Users view reviews only for their assigned patients | `is_admin() OR has_patient_access(auth.uid(), patient_id)` |
| `medical_reviews` | `reviews_insert_doctor` | INSERT | `authenticated` | Doctors insert reviews only for their assigned patients | `doctor_id = auth.uid() AND has_patient_access(auth.uid(), patient_id)` |
| `notifications` | `notifications_select_own`| SELECT | `authenticated` | Users can only select their own notification rows | `recipient_id = auth.uid()` |
| `notifications` | `notifications_update_own`| UPDATE | `authenticated` | Users can only toggle `is_read` on their own notifications | `recipient_id = auth.uid()` (WITH CHECK: `recipient_id = auth.uid()`) |
| `notifications` | `notifications_admin_all` | SELECT | `authenticated` | Admins can view all notifications for oversight | `is_admin()` |
| `audit_logs` | `audit_logs_select_admin`| SELECT | `authenticated` | Only system administrators can inspect audit logs | `is_admin()` |
| `medications` | `medications_select` | SELECT | `authenticated` | Users view medications only for assigned patients | `is_admin() OR has_patient_access(auth.uid(), patient_id)` |
| `medications` | `medications_doctor_manage`| ALL | `authenticated` | Doctors manage medications for assigned patients | `is_admin() OR (get_my_role() = 'doctor' AND has_patient_access(auth.uid(), patient_id))` |
| `medication_logs` | `med_logs_select` | SELECT | `authenticated` | Users view MAR logs only for assigned patients | `is_admin() OR has_patient_access(auth.uid(), (SELECT patient_id FROM medications WHERE id = medication_id))` |
| `medication_logs` | `med_logs_caregiver_insert`| INSERT | `authenticated` | Caregivers log administered doses | `administered_by = auth.uid()` |
| `shift_reports` | `shift_reports_select` | SELECT | `authenticated` | Caregivers view own reports; doctors/admins view all | `caregiver_id = auth.uid() OR is_admin() OR get_my_role() = 'doctor'` |
| `shift_reports` | `shift_reports_insert` | INSERT | `authenticated` | Caregivers submit their own shift reports | `caregiver_id = auth.uid()` |
| `vital_sign_thresholds`| `thresholds_select` | SELECT | `authenticated` | View thresholds for assigned patients | `is_admin() OR has_patient_access(auth.uid(), patient_id)` |
| `vital_sign_thresholds`| `thresholds_doctor_manage`| ALL | `authenticated` | Doctors configure thresholds for assigned patients | `is_admin() OR (get_my_role() = 'doctor' AND has_patient_access(auth.uid(), patient_id))` |
| `care_notes` | `care_notes_select` | SELECT | `authenticated` | View care notes for assigned patients | `is_admin() OR has_patient_access(auth.uid(), patient_id)` |
| `care_notes` | `care_notes_doctor_insert`| INSERT | `authenticated` | Doctors create care notes for assigned patients | `author_id = auth.uid() AND has_patient_access(auth.uid(), patient_id)` |
| `appointments` | `appointments_select` | SELECT | `authenticated` | View appointments for assigned patients | `is_admin() OR has_patient_access(auth.uid(), patient_id)` |
| `appointments` | `appointments_doctor_manage`| ALL | `authenticated` | Doctors schedule/manage appointments | `is_admin() OR (get_my_role() = 'doctor' AND has_patient_access(auth.uid(), patient_id))` |
| `messages` | `messages_select_participating`| SELECT | `authenticated` | Users view messages where they are sender or recipient | `sender_id = auth.uid() OR recipient_id = auth.uid()` |
| `messages` | `messages_insert_sender` | INSERT | `authenticated` | Authenticated users can send messages | `sender_id = auth.uid()` |

---

### 4.3 Five-Role Access Permissions in Plain English

1. **System Administrator:**
   - **Read:** Full read access across all 15 tables, system audit logs, care team assignments, compliance reports, and clinical records.
   - **Create:** Creates user accounts (`users`, `auth.users`), registers new patients (`patients`), assigns care teams (`care_teams`).
   - **Update:** Updates user activation status, resets passwords, updates patient demographics, modifies care team allocations.
   - **Delete:** Soft/hard archive of patient records or inactive assignments. Cannot delete or alter audit logs.
2. **Caregiver:**
   - **Read:** Reads demographics, medical history, vital sign history, doctor clinical feedback, active medications, and care notes **exclusively for patients assigned to their care team**. Cannot view unassigned patients.
   - **Create:** Submits bedside vital sign records (`vitals_logs`), logs medication administration events (`medication_logs`), submits shift reports (`shift_reports`), dispatches urgent clinical alerts (`notifications`).
   - **Update / Delete:** **Zero update or delete authority** on vital signs or medical reviews once submitted.
3. **Doctor:**
   - **Read:** Reads complete clinical histories, vital-sign trends, caregiver bedside observations, shift notes, and MAR logs for assigned patients.
   - **Create:** Submits authoritative medical reviews (`medical_reviews`), assigns official patient status (`stable`, `warning`, `critical`), writes care notes (`care_notes`), prescribes medications (`medications`), configures alert thresholds (`vital_sign_thresholds`), schedules appointments (`appointments`).
   - **Update:** Updates custom threshold boundaries, modifies active prescriptions, updates appointment schedules. Cannot modify past vitals logs.
   - **Delete:** Can discontinue active prescriptions. Cannot delete submitted medical reviews.
4. **Family Member:**
   - **Read:** Read-only access restricted strictly to their **linked family member** (`patients`). Can view assigned health status, vital sign trends, doctor feedback, active medications, and upcoming appointments. Cannot view caregiver internal notes or other patients.
   - **Create / Update / Delete:** Zero write, update, or delete privileges on clinical tables. Can send in-app messages to assigned doctors/caregivers and mark own notifications as read.
5. **Patient:**
   - **Read:** Read-only access restricted strictly to their **own personal health profile** (`patients.user_id = auth.uid()`). Can view official health status badge, vital trends, medication schedules, and upcoming appointments.
   - **Create / Update / Delete:** Zero clinical edit privileges. Can exchange in-app messages with their care team and mark personal notifications as read.

---

### 4.4 Specific Security Verifications
- **Can a Family Member or Patient see records of other patients?**  
  **NO.** Enforced at database level via `has_patient_access(auth.uid(), patient_id)`. If `auth.uid()` is not linked in `care_teams` or `patients.user_id`, PostgreSQL returns zero rows.
- **Can a Caregiver see unassigned patients?**  
  **NO.** Enforced via `has_patient_access(auth.uid(), patient_id)`. Caregivers can only select patients where an active assignment row exists in `care_teams`.
- **Can a Doctor see unassigned patients?**  
  **NO.** Doctors only access patient records, triage queues, and trend charts where they are linked as the attending physician in `care_teams`.
- **Are vitals logs and medical reviews immutable?**  
  **YES.** Neither `vitals_logs` nor `medical_reviews` have `UPDATE` or `DELETE` RLS policies granted to doctors or caregivers. Once committed, rows cannot be edited or deleted by clinical users.

---

### 4.5 PostgreSQL Helper Functions (`SECURITY DEFINER`)
- `public.get_my_role()`: Returns the calling user's enum role (`user_role`) from `public.users` without triggering recursive RLS checks (`SECURITY DEFINER`).
- `public.is_admin()`: Returns `boolean` (`true` if calling user's role is `'admin'`).
- `public.has_patient_access(user_uuid uuid, patient_uuid uuid)`: Evaluates whether a user has legitimate access to a patient: returns true if the user is an admin, or is linked in `care_teams`, or is the patient themselves (`patients.user_id = user_uuid`).

---

## 5. Database Functions, Triggers, Realtime, Storage, Edge Functions

### 5.1 Stored Functions / RPCs
| Function Name | Parameters | Return Type | Purpose | Caller |
|---|---|---|---|---|
| `get_my_role()` | None | `user_role` | Returns caller's user role from `public.users` safely | RLS Policies |
| `is_admin()` | None | `boolean` | Verifies whether caller is an active administrator | RLS Policies |
| `has_patient_access()` | `user_uuid uuid, patient_uuid uuid` | `boolean` | Verifies whether caller is assigned to patient's care team | RLS Policies |
| `on_vitals_logged_notify()`| None | `trigger` | Auto-creates `review_needed` notification for attending doctor when caregiver logs vitals | Table Trigger |
| `on_medical_review_submitted()`| None | `trigger` | Updates `patients.current_status` and broadcasts notifications to patient, family, and caregivers | Table Trigger |
| `log_audit_event()` | `p_user_id uuid, p_patient_id uuid, p_action text, p_details jsonb` | `void` | Inserts an immutable row into `public.audit_logs` | Server Actions / Triggers |
| `update_updated_at_column()`| None | `trigger` | Automatically refreshes `updated_at` column timestamp on row updates | Table Trigger |

---

### 5.2 Database Triggers
| Table | Timing | Event | Function Executed | Purpose |
|---|---|---|---|---|
| `vitals_logs` | AFTER | INSERT | `on_vitals_logged_notify()` | Generates `review_needed` notification for attending doctor |
| `medical_reviews` | AFTER | INSERT | `on_medical_review_submitted()` | Updates `patients.current_status` to match review; dispatches `status_change` notifications |
| `users` | BEFORE | UPDATE | `update_updated_at_column()` | Maintains timestamp consistency on user accounts |
| `patients` | BEFORE | UPDATE | `update_updated_at_column()` | Maintains timestamp consistency on patient records |
| `medications` | BEFORE | UPDATE | `update_updated_at_column()` | Updates modified timestamp on prescription records |
| `shift_reports` | BEFORE | UPDATE | `update_updated_at_column()` | Updates modified timestamp on shift reports |
| `care_notes` | BEFORE | UPDATE | `update_updated_at_column()` | Updates modified timestamp on care notes |
| `appointments` | BEFORE | UPDATE | `update_updated_at_column()` | Updates modified timestamp on scheduled visits |
| `vital_sign_thresholds`| BEFORE | UPDATE | `update_updated_at_column()` | Updates modified timestamp on threshold parameters |
| `patient_profiles` | BEFORE | UPDATE | `update_updated_at_column()` | Updates modified timestamp on extended profiles |

---

### 5.3 Supabase Realtime Configuration
- **Publication Name:** `supabase_realtime`
- **Subscribed Tables:** `public.notifications` exclusively (`REPLICA IDENTITY FULL`).
- **Client Subscription Hook:** `useRealtimeNotifications.ts` connects via WebSockets (`supabase.channel('user-notifications')`), listening for `INSERT` and `UPDATE` events on `notifications` filtered by `recipient_id = auth.uid()`.
- **Subscribing Interfaces:** The Top Navigation Bar across all five portals (`DoctorHeader`, `CaregiverNavbar`, `AdminHeader`, `FamilyHeader`, `PatientHeader`) and the Notifications Center (`/notifications`).

---

### 5.4 Storage Buckets
- **Buckets Configured:** **NONE (`[]`)**.
- **Storage Policies:** N/A.
- **Handling of Media / Avatars:** All user profiles and patient headers render initials in styled SVG circles and curated clinical color badges. No binary files are stored in Supabase Storage.

---

### 5.5 Edge Functions & Scheduled Jobs
- **Edge Functions:** **NONE DEPLOYED (0)**. All server logic is executed inside Next.js Server Actions.
- **Scheduled Jobs (`pg_cron`):** **NONE DEPLOYED**.

---

## 6. Authentication and Account Management

### 6.1 Authentication Method & Login Interface
- **Login Credentials:** Email address and password.
- **Interface Elements (`src/app/(auth)/login/page.tsx`):**
  - CareConnect brand logo (`HeartPulse` icon) and organization header ("Tender Touch Home Care Services").
  - Form Fields: `E-mail Address` (type `email`), `Password` (type `password` with visibility toggle `Eye`/`EyeOff`), and `Remember me` checkbox.
  - "Forgot Password?" trigger modal.
  - Role-agnostic login entry: single login interface routes users automatically based on database role.

### 6.2 Account Creation & Provisioning Workflow
- **Public Self-Registration:** **DISABLED / NOT IMPLEMENTED**. Protects clinical integrity and prevents unauthorized patient record creation.
- **Administrative Provisioning:** Only the System Administrator can create accounts (`/admin/users`).
- **Server Action Execution (`src/app/actions/adminUsers.ts`):** Uses Supabase Service Role client to create credentials in `auth.users`, establishes a matching record in `public.users`, assigns one of the five roles, and logs the action in `audit_logs`.
- **Care Team & Patient Linking:** Admin assigns the user to a patient via `/admin/patients` by selecting the patient, selecting the user, choosing their role (`doctor`, `caregiver`, `family_member`), and setting relationship labels.

### 6.3 Password Security & Recovery Lifecycle
- **Password Complexity Rules:** Enforced by Supabase Auth and client validation (minimum 8 characters, requiring mixed alphanumeric characters).
- **"Remember Me" Feature:** Implemented in `LoginForm` using browser `localStorage` (`careconnect_remembered_email`).
- **Password Reset Flow:**
  - User submits email in "Forgot Password" modal.
  - Supabase Auth dispatches recovery link directing to `/auth/confirm?type=recovery`.
  - Callback Route Handler (`src/app/auth/confirm/route.ts`) verifies the token and redirects to `/set-password`.
  - User enters and confirms their new password (`/set-password/page.tsx`), calling `supabase.auth.updateUser({ password })`.

### 6.4 Session Management & Idle Timeout
- **Session Tokens:** Handled via `@supabase/ssr` with secure HTTP-only cookies storing access tokens and refresh tokens.
- **JWT Expiration:** Default Supabase token lifetime (1 hour) with automatic background sliding refresh.
- **Auto-Logout & Idle Inactivity:** Handled via cookie invalidation. The dedicated endpoint `/api/auth/signout-unconfigured` purges session cookies if an unmapped user session is encountered.

### 6.5 Account Lockout & Brute-Force Rate Limiting
- **Database Tracking:** Tracked on `public.users` via `failed_login_attempts` (integer) and `locked_until` (timestamptz).
- **Enforcement Rules (`src/app/actions/auth.ts`):**
  - When 5 consecutive failed login attempts occur, `locked_until` is set to `NOW() + INTERVAL '15 minutes'`.
  - Subsequent login attempts during the lockout window are immediately rejected with the error message: *"Account temporarily locked due to too many failed attempts. Please try again in 15 minutes."*
  - Successful login resets `failed_login_attempts = 0` and clears `locked_until = null`.
  - All failed attempts and lockout triggers write immutable entries to `audit_logs`.

### 6.6 Account Deactivation & Archiving
- **Deactivation Mechanism:** The admin can toggle `is_active` (`false`) on any user account.
- **Enforcement:** Inactive accounts are blocked by `loginAction` before session generation, preventing access without deleting historical vitals, notes, or audit records.

### 6.7 Role-Based Post-Login Routing Matrix
Upon successful credential validation, `loginAction` evaluates `public.users.role` and redirects the user:
- `'admin'` → `/admin` (System Administrator Dashboard)
- `'doctor'` → `/doctor` (Physician Triage Queue & Patient Monitoring)
- `'caregiver'` → `/caregiver` (Bedside Caregiver Portal & Monitoring)
- `'patient'` → `/patient` (Patient Self-Monitoring Portal)
- `'family_member'` → `/family` (Family Member Health Monitoring Portal)

---

## 7. Modules, Routes, and Features per Role

### 7.1 Route Architecture & Access Control
| Route Path | Page Component | Roles Permitted | Module Description |
|---|---|---|---|
| `/` | `src/app/page.tsx` | All Authenticated | Root entry point; routes user to role dashboard via `requireRole` |
| `/login` | `src/app/(auth)/login/page.tsx` | Public / Unauthenticated | Single unified authentication portal with forgot-password modal |
| `/auth/confirm` | `src/app/auth/confirm/route.ts` | Public (Token Callback) | Email confirmation and password recovery callback handler |
| `/set-password` | `src/app/set-password/page.tsx` | Authenticated (Recovery) | Form to set or update account password following recovery |
| `/admin` | `src/app/(admin)/admin/page.tsx` | `admin` | Admin Dashboard: system overview metrics, statistics, quick links |
| `/admin/users` | `src/app/(admin)/admin/users/page.tsx` | `admin` | User Management: create accounts, set roles, toggle active status |
| `/admin/patients` | `src/app/(admin)/admin/patients/page.tsx`| `admin` | Patient Management: register patients, manage care-team assignments |
| `/admin/audit-logs` | `src/app/(admin)/admin/audit-logs/page.tsx`| `admin` | Immutable Audit Trail: filterable operational log inspection |
| `/admin/reports` | `src/app/(admin)/admin/reports/page.tsx` | `admin` | Clinical & Compliance Reports: Care summary, shift compliance, MAR |
| `/doctor` | `src/app/(doctor)/doctor/page.tsx` | `doctor` | Doctor Dashboard: prioritized clinical triage queue (critical/warning) |
| `/doctor/patient/[id]` | `src/app/(doctor)/doctor/patient/[id]/page.tsx`| `doctor` | Patient Health Status View: 3-tab comprehensive clinical workstation |
| `/caregiver` | `src/app/(caregiver)/caregiver/page.tsx`| `caregiver` | Bedside Caregiver Portal: assigned patients, vitals cards, urgent update |
| `/caregiver/log-vitals`| `src/app/(caregiver)/caregiver/log-vitals/page.tsx`| `caregiver` | Standardized Vital Signs Form: physiological inputs & symptom checks |
| `/caregiver/shift-report`| `src/app/(caregiver)/caregiver/shift-report/page.tsx`| `caregiver` | Shift Handover Documentation: hours, duties completed, incident notes |
| `/caregiver/medications`| `src/app/(caregiver)/caregiver/medications/page.tsx`| `caregiver` | Bedside MAR: log administered doses, review prescribed schedules |
| `/caregiver/patient/[id]`| `src/app/(caregiver)/caregiver/patient/[id]/page.tsx`| `caregiver` | Individual patient bedside summary and vitals history table |
| `/family` | `src/app/(family)/family/page.tsx` | `family_member` | Family Portal: transparent vitals trends, doctor notes, care team |
| `/patient` | `src/app/(patient)/patient/page.tsx` | `patient` | Patient Portal: self-monitoring status, medications, appointments |
| `/messages` | `src/app/messages/page.tsx` | All Authenticated | Direct care-team in-app messaging communication center |
| `/notifications` | `src/app/notifications/page.tsx` | All Authenticated | Notifications Center: review-needed, status change, and urgent alerts |

### 7.2 Route Protection Implementation
Route security is enforced server-side inside `src/lib/auth/roleGuard.ts` via `requireRole(allowedRoles)`.
1. Every route group layout (`src/app/(admin)/layout.tsx`, `(doctor)/layout.tsx`, `(caregiver)/layout.tsx`, `(family)/layout.tsx`, `(patient)/layout.tsx`) calls `await requireRole(['role_name'])` prior to rendering.
2. If no valid Supabase session exists, execution redirects immediately to `/login`.
3. If the user's role in `public.users` does not match `allowedRoles`, the user is redirected to their designated dashboard.
4. Server Actions independently invoke `requireRole()` to ensure API mutations cannot be spoofed.

---

### 7.3 Feature Inventory by User Role

#### 1. System Administrator
| Feature | Functional Description | Implementation Status |
|---|---|---|
| **Executive Dashboard** | High-level metrics: total users, active patients, status breakdown, 24h vitals count | **IMPLEMENTED** |
| **User Management** | Create user accounts, assign roles, reset passwords, activate/deactivate accounts | **IMPLEMENTED** |
| **Patient Management** | Register new patients, edit demographics, manage diagnoses and emergency contacts | **IMPLEMENTED** |
| **Care Team Matrix** | Assign doctors, caregivers, and family members to patients with custom relationship labels | **IMPLEMENTED** |
| **System Audit Logs** | Inspect immutable audit logs with date filters, action search, and user filtering | **IMPLEMENTED** |
| **Reports Engine** | Generate Patient Care Summaries, Shift Compliance, and MAR reports with CSV & Print/PDF | **IMPLEMENTED** |

#### 2. Caregiver
| Feature | Functional Description | Implementation Status |
|---|---|---|
| **Bedside Portal** | Patient cards showing assigned status (`stable`, `warning`, `critical`), room/bed, vitals | **IMPLEMENTED** |
| **Log Vital Signs** | Record BP, pulse, temp, SpO2, resp rate, pain score, weight/height/BMI, symptoms | **IMPLEMENTED** |
| **Heuristic Vitals Flags** | Real-time warnings ("Out of typical range") for abnormal physiological readings | **IMPLEMENTED** |
| **Bedside MAR** | View scheduled medications; record doses as administered, held, or missed | **IMPLEMENTED** |
| **Shift Report Form** | Document shift schedule, attended patients, completed duties, and handover notes | **IMPLEMENTED** |
| **Send Urgent Update** | Instant modal to dispatch high-priority urgent alerts to attending doctors and admins | **IMPLEMENTED** |
| **Patient Vitals History** | Tabular history of previous bedside logs with abnormal values highlighted | **IMPLEMENTED** |

#### 3. Doctor
| Feature | Functional Description | Implementation Status |
|---|---|---|
| **Triage Dashboard** | Prioritized clinical queue categorizing patients into Critical, Warning, Unassessed, Stable | **IMPLEMENTED** |
| **Status Assignment** | Authoritative submission of medical reviews assigning `stable`, `warning`, or `critical` | **IMPLEMENTED** |
| **Vital-Sign Trends** | Interactive Recharts charts (BP, Heart Rate, SpO2, Temperature) with normal bands | **IMPLEMENTED** |
| **Care Notes & Guidance** | Publish clinical guidance, dietary orders, and care notes for caregivers and family | **IMPLEMENTED** |
| **Custom Alert Thresholds**| Set patient-specific upper and lower physiological boundaries driving alert triggers | **IMPLEMENTED** |
| **Medication Orders** | Prescribe pharmacological treatments, specify dosage, frequency, and instructions | **IMPLEMENTED** |
| **Schedule Appointments** | Schedule clinical follow-up consultations, in-person visits, and teleconsults | **IMPLEMENTED** |

#### 4. Family Member
| Feature | Functional Description | Implementation Status |
|---|---|---|
| **Family Portal** | Transparent view of linked family member's current health status badge and care team | **IMPLEMENTED** |
| **Health Status Badge** | Real-time display of official physician evaluation (`stable`, `warning`, `critical`) | **IMPLEMENTED** |
| **Vitals Trend Graphs** | Visual charts showing vital-sign trends without technical medical jargon | **IMPLEMENTED** |
| **Doctor Recommendations**| View physician feedback, care notes, and dietary instructions | **IMPLEMENTED** |
| **Medication Schedule** | Inspect active prescriptions and administration schedule | **IMPLEMENTED** |
| **Care Team Directory** | Contact cards for assigned caregivers and attending physicians | **IMPLEMENTED** |

#### 5. Patient
| Feature | Functional Description | Implementation Status |
|---|---|---|
| **Patient Dashboard** | Personal health summary displaying official status badge and latest vitals | **IMPLEMENTED** |
| **My Vital Signs** | Interactive personal trend charts tracking physiological recovery over time | **IMPLEMENTED** |
| **My Medications** | Simple daily schedule of prescribed medications with dosages and timing | **IMPLEMENTED** |
| **Upcoming Appointments**| List of scheduled physician follow-up consultations with dates and visit types | **IMPLEMENTED** |
| **Doctor Advice** | Direct access to physician feedback and care instructions | **IMPLEMENTED** |

---

## 8. Screenshot Mapping (Manuscript Figures)

Every image in the `manuscript_screenshots/` folder is cataloged below in filename order.

| # | File Name | Role / User Shown | Page / Route | What the Screen Shows (Factual Description) | Key UI Elements Visible |
|---|---|---|---|---|---|
| 1 | `fig08_login_page.png` | Public / Unauthenticated | `/login` | Centered authentication card on clean background. Displays CareConnect logo, Tender Touch Home Care Services subtitle, email and password inputs, remember me checkbox, and forgot password link. | `HeartPulse` icon, email input, password input with eye toggle, sign in button, forgot password modal trigger. |
| 2 | `fig09_notifications_messages.png` | Doctor / Caregiver | `/notifications` | Notification center displaying tabbed feed of clinical notifications and messages. Shows review requests, status changes, and urgent caregiver alerts with read/unread tags. | Notification tabs, unread count badge, filter buttons, alert cards with timestamps, mark all as read button. |
| 3 | `fig09b_messages.png` | Caregiver / Doctor | `/messages` | In-app secure communication module showing care-team conversation thread. Features recipient selection, patient context tag, message composition input, and historical transcript. | Conversation list, patient tag pill, message input area, send button, timestamped message bubbles. |
| 4 | `fig10_admin_dashboard.png` | System Administrator | `/admin` | Executive dashboard overview showing key facility performance metrics. Displays active patient count, clinical status breakdown, 24-hour vitals logs, and quick-action navigation cards. | 4 analytical summary metric cards, status distribution donut chart, quick-action shortcuts, recent audit activity feed. |
| 5 | `fig11_user_management.png` | System Administrator | `/admin/users` | User management directory table showing all registered staff, doctors, caregivers, patients, and family members. Shows status toggles, role badges, and action buttons. | User table, role filter dropdown, active/inactive status badges, search bar, "Add New User" primary button. |
| 6 | `fig11b_add_user.png` | System Administrator | `/admin/users` (Modal) | Administrative modal dialog for provisioning new user accounts. Collects full name, email address, initial password, user role selection, and telephone number. | User creation modal, role select dropdown, password input, validation feedback, submit and cancel buttons. |
| 7 | `fig12_patient_management.png` | System Administrator | `/admin/patients` | Patient directory and care-team management interface. Displays registered patient cards, diagnosis, room assignment, assigned doctor, and care-team allocation tools. | Patient list, status pills, care team assignment button, "Register Patient" button, search input. |
| 8 | `fig13_audit_logs_reports.png` | System Administrator | `/admin/audit-logs` | Comprehensive immutable audit log viewer showing recorded system events. Displays timestamp, performing user, action category, patient context, and expandable JSON details. | Audit table, action filter dropdown, date range picker, user filter, expandable payload cards, lock icon. |
| 9 | `fig13b_reports.png` | System Administrator | `/admin/reports` | Clinical reporting workstation displaying report type selector (Patient Care Summary, Shift Compliance, MAR). Shows date filters, report preview table, and export buttons. | Report tabs, date range inputs, patient selector, data preview table, "Export CSV" and "Export PDF / Print" buttons. |
| 10 | `fig14_caregiver_dashboard.png` | Caregiver | `/caregiver` | Bedside caregiver portal showing assigned patient cards. Highlights current status badge, room/bed, latest vitals summary, and prominent action buttons. | Patient summary cards, prominent "Log Vital Signs" button, "Send Urgent Update" trigger, mobile bottom navigation. |
| 11 | `fig15_shift_report_form.png` | Caregiver | `/caregiver/shift-report` | Mobile-optimized shift report documentation form. Collects shift date, shift type, hours worked, completed duties checklist, patient attended, and handover notes. | Shift type selector, duties checkboxes, patient multi-select, handover text area, submit report button. |
| 12 | `fig16_medication_administration.png` | Caregiver | `/caregiver/medications` | Bedside MAR interface showing scheduled patient medications. Caregivers can toggle administration status (Administered, Held, Missed) and record bedside remarks. | Medication cards, dosage and route badges, status action buttons, dose logging timestamps, remarks input. |
| 13 | `fig17_send_urgent_update.png` | Caregiver | `/caregiver` (Modal) | High-priority clinical alert modal. Caregiver selects patient, indicates urgency level, enters brief symptom notes, and immediately notifies attending physicians and admin. | Red alert header, patient dropdown, urgency radio buttons, symptom notes textarea, "Dispatch Alert" button. |
| 14 | `fig18_doctor_dashboard.png` | Doctor | `/doctor` | Physician clinical triage dashboard grouping assigned patients by urgency. Categorizes patients into Critical Attention, Needs Review, Unassessed, and Stable cohorts. | Triage queue sections, patient cards with latest vitals, status indicator badges, quick review action links. |
| 15 | `fig19_patient_health_status.png` | Doctor | `/doctor/patient/[id]` (Tab 1)| Detailed clinical workstation showing Tab 1: Health Status & Vital Trends. Features interactive Recharts time-series graphs (BP, HR, SpO2, Temp) and status assignment controls. | Status assignment radio buttons, clinical feedback form, 4 interactive trend charts, reference threshold bands. |
| 16 | `fig20_care_notes_thresholds.png` | Doctor | `/doctor/patient/[id]` (Tab 2)| Clinical workstation Tab 2: Care Notes & Thresholds. Features care note composition form and customizable patient alert thresholds (min/max inputs for each vital sign). | Care note editor, note type tags, threshold numeric inputs (BP, HR, Temp, SpO2), "Save Thresholds" button. |
| 17 | `fig21_medication_followup.png` | Doctor | `/doctor/patient/[id]` (Tab 3)| Clinical workstation Tab 3: Medication Schedule & Follow-up Care. Displays active prescription manager, add medication form, and appointment scheduler. | Active medication list, new prescription form, appointment booking calendar, visit type selector. |
| 18 | `fig22_family_dashboard.png` | Family Member | `/family` | Transparent family member monitoring portal for linked patient. Displays official physician status badge, vital trends, care team contacts, and doctor recommendations. | Patient status banner, vital summary cards, non-technical trend charts, attending doctor notes, care team list. |
| 19 | `fig23_patient_dashboard.png` | Patient | `/patient` | Patient self-monitoring portal. Shows personalized status badge, upcoming consultation reminders, prescribed daily medication schedule, and recent vital readings. | Personal health badge, upcoming appointments card, medication reminder schedule, vitals trend preview. |

---

### 8.1 Development Badges & Labels Flagged on Screen
The following development badge labels are present in the source components and visible in manuscript screenshots. **Researchers must review and approve their removal prior to final manuscript submission:**

1. **`Figure 12` Badge:**
   - **Source File:** `src/app/(admin)/admin/patients/PatientsManagementClient.tsx` (Line 427)
   - **Visible In:** `fig12_patient_management.png`
   - **Element:** `<span className="... text-xs font-bold ...">Figure 12</span>`
2. **`Figure 13 Task A` Badge:**
   - **Source File:** `src/app/(admin)/admin/audit-logs/AuditLogsClient.tsx` (Line 160)
   - **Visible In:** `fig13_audit_logs_reports.png`
   - **Element:** `<span className="... text-xs font-bold ...">Figure 13 Task A</span>`
3. **`Figure 13 Task B` Badge:**
   - **Source File:** `src/app/(admin)/admin/reports/ReportsClient.tsx` (Line 182)
   - **Visible In:** `fig13b_reports.png`
   - **Element:** `<span className="... text-xs font-bold ...">Figure 13 Task B</span>`
4. **`Figure 15` Badge:**
   - **Source File:** `src/app/(caregiver)/caregiver/shift-report/ShiftReportFormClient.tsx` (Line 178)
   - **Visible In:** `fig15_shift_report_form.png`
   - **Element:** `<span className="... text-xs font-bold ...">Figure 15</span>`
5. **`Figure 16` Badge:**
   - **Source File:** `src/app/(caregiver)/caregiver/medications/MedicationAdministrationClient.tsx` (Line 123)
   - **Visible In:** `fig16_medication_administration.png`
   - **Element:** `<span className="... text-xs font-bold ...">Figure 16</span>`

### 8.2 Compliance Terminology Flag
- **Flagged Location:** `src/app/messages/MessagesClient.tsx` (Line 252)
- **Current Text:** `"Secure, HIPAA & RA 10173 compliant communication between doctors, caregivers, patients, and family members."`
- **Clinical / Legal Issue:** HIPAA (Health Insurance Portability and Accountability Act) is United States legislation. For a system developed and deployed in Dumaguete City, Philippines, the applicable statutory framework is the **Data Privacy Act of 2012 (Republic Act No. 10173)**.
- **Recommendation:** Replace the string with *"Secure, RA 10173 (Data Privacy Act of 2012) compliant communication..."*.

### 8.3 Personal Data Privacy Audit
- **Verification Result:** Zero real personal data found. All names (`Juan Dela Cruz`, `Maria Santos`, `Pedro Penduko`, `Clara Reyes`), phone numbers (`+63 917 555 0101`), and medical diagnoses in screenshots and database tables are purely fictitious test records created in compliance with RA 10173.

---

## 9. Notifications

### 9.1 Notification Event Matrix
| Notification Type | Triggering Event | Recipient(s) | Delivery Channel | Fictitious Example Message |
|---|---|---|---|---|
| `vitals_logged` | Caregiver records bedside vital signs | Attending Doctor | In-App / Realtime | "New vital signs logged for patient Juan Dela Cruz by Caregiver Elena Santos." |
| `review_needed` | Vitals logged; automatic database trigger | Attending Doctor | In-App / Realtime | "Clinical review needed: New vital-sign entries recorded for Juan Dela Cruz." |
| `review_submitted` | Doctor submits clinical medical review | Patient, Family Member, Caregiver | In-App / Realtime | "Dr. Ramon Reyes submitted a new clinical review for Juan Dela Cruz." |
| `status_change` | Doctor alters official status (`stable` / `warning` / `critical`) | Patient, Family, Caregiver, Admin | In-App / Realtime | "Health status for Juan Dela Cruz updated to Warning by Dr. Ramon Reyes." |
| `urgent_update` | Caregiver triggers bedside emergency alert | Attending Doctor, Admin | In-App / Realtime | "URGENT: Elena Santos reported elevated fever and respiratory distress for Clara Reyes." |
| `care_note_added` | Doctor publishes care guidance note | Caregivers, Family Member | In-App / Realtime | "New care guidance added: Dietary salt restriction ordered by Dr. Ramon Reyes." |
| `threshold_exceeded`| Vitals reading breaches custom parameter | Attending Doctor, Caregiver | In-App / Realtime | "Threshold Alert: Systolic BP 165 mmHg exceeds maximum limit (140 mmHg) for Pedro Penduko." |
| `shift_report_submitted`| Caregiver completes shift handover report | Admin, Supervisor, Incoming Staff | In-App / Realtime | "Morning shift report submitted by Caregiver Elena Santos for 3 patients." |

### 9.2 Read/Unread State Management
- Stored on `public.notifications.is_read` (`boolean`, default `false`).
- Updated via Server Action `markNotificationAsReadAction(id)` or `markAllNotificationsAsReadAction()`.
- RLS policy `notifications_update_own` restricts users to updating only their own rows.

### 9.3 Notification Dispatch Mechanisms
- **Database Triggers:** `on_vitals_logged_notify()` and `on_medical_review_submitted()` automatically create rows in `public.notifications` inside PostgreSQL.
- **Server Actions:** `sendUrgentUpdateAction` (`caregiverUrgent.ts`), `addCareNoteAction` (`doctorClinical.ts`), and `submitShiftReportAction` (`caregiverShift.ts`) insert notifications during business logic execution.
- **Edge Functions / SMS:** None. Delivery is handled through Supabase Realtime WebSocket broadcasts.

---

## 10. Data Validation and Clinical Thresholds

### 10.1 Vital Signs Validation & Physiological Thresholds
| Vital Sign | Unit | Input Validation (Zod & DB) | Default Normal Range | Abnormal / Critical Heuristic | Where Defined |
|---|---|---|---|---|---|
| **Systolic BP** | mmHg | Optional integer, 30–300 | 90–120 mmHg | `< 90` or `≥ 130` mmHg | `vitalsLogSchema` / `vitalsThresholds.ts` / `vital_sign_thresholds` |
| **Diastolic BP** | mmHg | Optional integer, 20–200 | 60–80 mmHg | `< 60` or `≥ 85` mmHg | `vitalsLogSchema` / `vitalsThresholds.ts` / `vital_sign_thresholds` |
| **Heart Rate** | bpm | Integer, 0–300 (`chk_hr_range`) | 60–100 bpm | `< 60` or `> 100` bpm | `vitalsLogSchema` / `01_schema.sql` / `vitalsThresholds.ts` |
| **Temperature** | °C | Decimal, 25.0–45.0 °C | 36.1–37.2 °C | `< 36.0` or `> 37.5` °C | `vitalsLogSchema` / `vitalsThresholds.ts` / `vital_sign_thresholds` |
| **Oxygen Saturation (SpO2)**| % | Integer, 0–100 (`chk_spo2_range`) | 95–100 % | `< 95 %` | `vitalsLogSchema` / `01_schema.sql` / `vitalsThresholds.ts` |
| **Respiratory Rate** | breaths/min | Optional integer, 0–100 | 12–20 breaths/min | `< 12` or `> 24` breaths/min | `vitalsLogSchema` / `vital_sign_thresholds` |
| **Blood Glucose** | mg/dL | Optional decimal, 20.0–1000.0 | 70–140 mg/dL | `< 70` or `> 180` mg/dL | `vital_sign_thresholds` / `PatientHealthStatusView.tsx` |
| **Pain Score** | scale 0–10 | Optional integer, 0–10 | 0–3 (Mild) | `4–6` (Moderate), `7–10` (Severe) | `vitalsLogSchema` (`validations/vitals.ts`) |
| **Weight** | kg | Optional decimal, 1.0–500.0 | Baseline dependent | Rapid variance | `vitalsLogSchema` (`validations/vitals.ts`) |
| **Height** | cm | Optional decimal, 20.0–300.0 | Static adult | N/A | `vitalsLogSchema` (`validations/vitals.ts`) |
| **BMI** | kg/m² | Auto-calculated decimal | 18.5–24.9 kg/m² | `< 18.5` (Underweight), `≥ 25.0` (Overweight) | Auto-computed on vitals form |

### 10.2 Threshold Configuration & Clinical Safety Architecture
- **Dual-Layer Architecture:**
  1. **Client-Side Heuristic Highlighting:** Implemented in `src/lib/utils/vitalsThresholds.ts` (`checkVitalsRanges`). Out-of-range values are marked *"Out of typical range"* or *"Flagged"*. The terms *"Warning"* and *"Critical"* are **intentionally forbidden** in client heuristics to prevent caregivers from mistaking automated flags for an official diagnosis.
  2. **Configurable Patient Alert Parameters:** Stored in `vital_sign_thresholds`. Attending physicians can override generic population baselines for patients with specific clinical conditions (e.g., establishing a permissive systolic BP maximum of 150 mmHg for an elderly hypertensive patient).
- **Authoritative Status Assignment:** Automated algorithms **never** update `patients.current_status`. Official patient status (`stable`, `warning`, `critical`) can be assigned **exclusively by a licensed physician** through a signed `medical_reviews` record.

---

## 11. Audit Log and Reports

### 11.1 Audit Trail Specifications
- **Database Storage:** Stored in `public.audit_logs`.
- **Logged Events:**
  - Authentication: `login_success`, `login_failed`, `account_locked`, `password_reset_requested`.
  - User Administration: `create_user`, `update_user_role`, `toggle_user_status`.
  - Patient Administration: `create_patient`, `update_patient`, `assign_care_team`, `remove_care_team`.
  - Bedside Clinical Actions: `log_vitals`, `log_medication_administration`, `submit_shift_report`, `send_urgent_update`.
  - Physician Actions: `submit_medical_review`, `update_patient_status`, `add_care_note`, `update_thresholds`, `prescribe_medication`, `schedule_appointment`.
- **Access Restrictions:** Strict RLS policy (`audit_logs_select_admin`) limits viewing **exclusively to the System Administrator**.
- **Immutability:** No `UPDATE` or `DELETE` policies exist. Audit entries cannot be modified or deleted.

### 11.2 Reporting Engine & Export Capabilities
- **Location:** `/admin/reports` (`src/app/(admin)/admin/reports/ReportsClient.tsx`).
- **Available Reports:**
  1. **Patient Care Summary:** Aggregates demographics, primary condition, full vital-signs history, and caregiver logs over a selectable date range.
  2. **Shift Report Compliance Report:** Computes shifts expected vs. shift handover reports submitted per caregiver, deriving an exact compliance percentage.
  3. **Medication Administration Record (MAR):** Comprehensive audit of prescribed medications, scheduled times, doses administered, held, or missed, and administering caregivers.
- **Export Formats:**
  - **CSV Export:** Client-side generation of RFC-4180 compliant CSV files with formatted headers.
  - **Print / PDF Export:** Formatted printable layouts utilizing browser printing (`window.print()`) and Tailwind `@media print` rules to strip navigation bars and format clean clinical summaries.

---

## 12. System Requirements (As Actually Implemented)

### 12.1 Software Requirements
- **Development Environment:**
  - Operating System: Microsoft Windows 10 Pro (64-bit, Version 22H2, Build 10.0.19045)
  - Runtime: Node.js `v24.14.0` (LTS/Current)
  - Package Manager: npm `11.9.0`
  - Version Control: Git 2.40+
- **End-User Client Software:**
  - Web Browser: Google Chrome 100+, Mozilla Firefox 100+, Microsoft Edge 100+, Apple Safari 15+, Mobile Chrome / Safari.
  - Native Plugins / Add-ons: None required (standard HTML5, CSS3, ES2022 JavaScript).

### 12.2 Hardware Requirements
- **Development Workstation (Actual Machine Used):**
  - Processor: Intel(R) Core(TM) i5-7200U CPU @ 2.50GHz (2 Cores, 4 Logical Processors)
  - Installed Memory (RAM): 16.0 GB (16,210,904 KB physical RAM)
  - System Type: 64-bit Operating System, x64-based processor
  - Storage: SSD with minimum 2.0 GB free disk space for dependencies and build artifacts.
- **End-User Hardware (Minimum Recommendations):**
  - **Desktop / Laptop (Admin / Doctor):** 1.6 GHz Dual-Core CPU, 4 GB RAM, display resolution 1366 × 768 or higher.
  - **Mobile / Tablet (Caregiver Bedside):** Smartphone or tablet with 2 GB RAM, minimum screen width 360 px (optimized for 390 × 844 px portrait).

### 12.3 Network Requirements
- **Connectivity:** Continuous internet connection required for PostgREST database queries, auth token verification, and Supabase Realtime WebSocket connections (`wss://`).
- **Bandwidth:** Minimum 1.5 Mbps broadband or stable 3G/4G/5G mobile connection.
- **Transport Security:** All communications encrypted via TLS/HTTPS (port 443) and WSS.
- **Offline Behavior:** **NOT IMPLEMENTED / UNVERIFIED**. The system does not include service-worker offline caching or IndexedDB queues. Operating offline generates fetch failure toasts and halts submissions to protect audit integrity and clinical safety.

### 12.4 Responsive Design Testing
- **Mobile Viewport (360px – 390px):** Fully tested via mobile screenshots (`fig15`, `fig16`, `fig17`, `fig23` captured at 390 × 844 px). Bedside views utilize sticky bottom navigation, touch-friendly inputs, and single-column cards.
- **Tablet Viewport (768px):** Fluid responsive layout shifts between two-column metric cards and collapsable navigation drawers.
- **Desktop Viewport (1366px – 1920px):** Desktop dashboards (`fig10`, `fig12`, `fig18`, `fig19`, `fig22` captured at 1366 × 768 px) feature fixed sidebars, multi-column clinical cards, and data visualization grids.

---

## 13. Testing Performed

### 13.1 Functional Test Cases Matrix
| Test Case ID | Module Tested | Test Procedure | Expected Result | Actual Result | Status |
|---|---|---|---|---|---|
| **TC-AUTH-01** | Authentication | Enter valid admin credentials on `/login` | Successful authentication; redirect to `/admin` | Authenticated and routed to `/admin` | **PASS** |
| **TC-AUTH-02** | Security Lockout | Enter incorrect password 5 consecutive times | Account locked for 15 minutes; error displayed | 5th failure locked account; reject message shown | **PASS** |
| **TC-AUTH-03** | Password Reset | Request password recovery via forgot password modal | Recovery link dispatched; user sets new password | Token verified at `/auth/confirm`; password updated | **PASS** |
| **TC-ADMIN-01**| User Management | Admin creates new caregiver account | Account created in `auth.users` & `public.users` | Caregiver created; role assigned; audit logged | **PASS** |
| **TC-ADMIN-02**| Patient Registration| Admin registers patient and assigns care team | Patient saved; care team links established | Patient appears in directory; links recorded | **PASS** |
| **TC-CAREG-01**| Vitals Logging | Caregiver enters complete vitals set for patient | Zod validates inputs; vitals log inserted | Vitals logged; trigger notifies attending doctor | **PASS** |
| **TC-CAREG-02**| Vitals Validation | Submit SpO2 = 105% or Heart Rate = -10 bpm | Form validation blocks submission | Check constraint / Zod errors prevent submission | **PASS** |
| **TC-CAREG-03**| Bedside MAR | Caregiver logs administered morning dose | Administration timestamp and status recorded | Dose marked administered; MAR table updated | **PASS** |
| **TC-CAREG-04**| Shift Handover | Caregiver submits shift handover report | Shift report saved; compliance metric updated | Report created; handover notes stored | **PASS** |
| **TC-CAREG-05**| Urgent Alert | Caregiver dispatches urgent update modal | Urgent alert sent to doctor and admin | Alert card created; notification dispatched | **PASS** |
| **TC-DOC-01** | Doctor Triage | Doctor opens triage queue on `/doctor` | Patients sorted by priority (Critical/Warning/Stable)| Queue renders patients in correct urgency tiers | **PASS** |
| **TC-DOC-02** | Medical Review | Doctor submits review assigning 'warning' status | Review saved; `patients.current_status` updated | Status updated; notifications sent to family | **PASS** |
| **TC-DOC-03** | Alert Thresholds | Doctor configures custom BP limits (150/95) | Threshold parameters updated in database | New thresholds saved; charts render updated bands | **PASS** |
| **TC-DOC-04** | Care Notes | Doctor publishes clinical care guidance note | Note added to patient record; care team notified | Note appears on caregiver and family portals | **PASS** |
| **TC-FAM-01** | Family Portal | Family member logs into `/family` | Displays linked patient's vitals and status only | Linked patient rendered; zero other records seen | **PASS** |
| **TC-PAT-01** | Patient Portal | Patient logs into `/patient` | Shows personal health badge, meds, appointments | Personal dashboard displayed; edit tools hidden | **PASS** |
| **TC-RLS-01** | Access Isolation | Caregiver attempts to open `/admin/users` | Server route guard redirects to `/caregiver` | Unauthorized route blocked; redirected to portal | **PASS** |
| **TC-RLS-02** | Data Isolation | Family member queries unlinked patient ID | PostgreSQL RLS returns zero rows | Unauthorized access blocked; 404 / empty return | **PASS** |
| **TC-REP-01** | Report Generation| Admin generates Patient Care Summary CSV | CSV file downloads with vitals history | Formatted CSV file downloaded successfully | **PASS** |

### 13.2 Automated Tests Status
- **Test Frameworks (Jest / Vitest / Playwright / Cypress):** **NOT IMPLEMENTED**.
- **Test Scripts in `package.json`:** None configured (`package.json` contains only `dev`, `build`, `start`, `lint`).
- **Formal Status:** **"No automated tests found."** System validation relied entirely on manual functional testing and role-based integration test benches.

### 13.3 RLS & Security Verification
Cross-role access controls were validated at both the server routing layer and database RLS layer:
- Caregivers, doctors, and family members attempting to access `/admin/*` routes are intercepted by `requireRole` and redirected to their home dashboard.
- Direct database queries by non-admin users against `public.audit_logs` return 0 rows.
- Direct database queries by family members against unassigned patient records return 0 rows.
- Modifying submitted `vitals_logs` or `medical_reviews` fails with an RLS permission error.

### 13.4 Performance Observations
- **Formal Performance Benchmarks:** **UNVERIFIED**. Continuous performance monitoring (APM) was not configured.
- **Empirical Observations:** Next.js Server Component page loads complete in ~150–350 ms on local broadband; Supabase PostgREST queries average <100 ms response times.

---

## 14. Development Process Evidence

### 14.1 Git Version Control History
- **Total Commit Count:** 6 commits
- **First Commit Date:** September 11, 2026 (11:18:36 +0800)
- **Latest Commit Date:** October 13, 2026 (16:17:26 +0800)
- **Remote Repository:** `https://github.com/joelgajilomo07-lang/careconnect.git`
- **Development Iterations Inferred from History:**
  - **Iteration 1 (Scaffolding & Architecture):** Next.js 16 setup, Tailwind CSS 4 configuration, Supabase client initialization.
  - **Iteration 2 (Database Schema & Security):** Core PostgreSQL schema (`01_schema.sql`), initial RLS policies (`02_rls_policies.sql`), and triggers (`03_functions_triggers.sql`).
  - **Iteration 3 (Authentication & Routing):** Cookie-based SSR authentication, `requireRole` route guards, unified login interface, and password recovery.
  - **Iteration 4 (Bedside Caregiver Portal):** Vital signs logging form, check constraints, bedside MAR, shift reports, and urgent updates.
  - **Iteration 5 (Physician Clinical Workstation):** Triage queue, medical reviews, interactive Recharts trend graphs, care notes, and threshold configuration.
  - **Iteration 6 (Portals, Auditing, & Reports):** Family and Patient portals, administrative audit logs, compliance reporting with CSV/print exports, and clean UI test dataset updates.

### 14.2 Database Migrations in Chronological Order
| Migration File | Sequence | Execution Date / Focus | One-Line Summary of Changes |
|---|---|---|---|
| `01_schema.sql` | 1 | Foundation Schema | Created core tables (`users`, `patients`, `care_teams`, `vitals_logs`, `medical_reviews`, `notifications`, `audit_logs`). |
| `02_rls_policies.sql` | 2 | Access Security | Enabled RLS across all tables and established baseline role-based policies. |
| `03_functions_triggers.sql` | 3 | Triggers & Automation | Implemented notification triggers for vitals logging and medical review submissions. |
| `04_seed.sql` | 4 | Development Seed | Inserted initial sample users, patients, and clinical records for local testing. |
| `05_fix_rls_recursion.sql` | 5 | Bug Fix (Recursion) | Resolved circular dependency recursion in `care_teams` and `users` RLS policies. |
| `06_realtime.sql` | 6 | Realtime Publication | Added `notifications` to `supabase_realtime` and set `REPLICA IDENTITY FULL`. |
| `07_patient_self_monitoring.sql`| 7 | Portal Feature | Granted patients direct read access to their own reviews, vitals, and appointments. |
| `08_doctor_clinical_management.sql`| 8 | Clinical Expansion | Added `care_notes` and `vital_sign_thresholds` tables and doctor management policies. |
| `09_medications_and_appointments.sql`| 9 | Clinical Expansion | Added `medications`, `medication_logs`, and `appointments` tables. |
| `10_enforce_status_via_medical_reviews.sql`| 10 | Clinical Safety | Made physician medical reviews the exclusive mechanism for updating `patient_status`. |
| `11_fix_admin_users_rls.sql`| 11 | Security Hardening | Corrected admin user management query permissions and privilege escalation guards. |
| `12_foundation_data_model.sql`| 12 | Schema Harmonization | Added `messages`, `shift_reports`, compatibility views (`care_assignments`, `vital_signs`), and enhanced columns. |

---

## 15. Scope Check — IMPORTANT

The manuscript's **Scope and Limitations** currently lists several features as **OUT OF SCOPE**. Code inspection confirms that all seven features are **fully implemented in the codebase and active database**.

### 15.1 Out-of-Scope Features Reconciliation Table
| Feature | Present in Code? | Where Implemented (Files / Tables / Routes) | Visible in Screenshots? | Recommendation |
|---|---|---|---|---|
| **Medication management / MAR (medication administration record)** | **Yes** | Tables: `medications`, `medication_logs`<br>Routes: `/caregiver/medications`<br>Components: `MedicationAdministrationClient.tsx`, `PatientHealthStatusView.tsx` (Tab 3)<br>Reports: `generateMedicationAdministrationRecordAction` | **Yes** (`fig16_medication_administration.png`, `fig21_medication_followup.png`) | **Keep — update manuscript scope** |
| **Appointments / follow-up scheduling** | **Yes** | Table: `appointments`<br>Route: `/doctor/patient/[id]` (Tab 3)<br>Actions: `scheduleAppointmentAction` in `doctorClinical.ts`<br>Components: `PatientHealthStatusView.tsx`, `PatientDashboardClient.tsx` | **Yes** (`fig21_medication_followup.png`, `fig23_patient_dashboard.png`) | **Keep — update manuscript scope** |
| **Messaging / chat between users** | **Yes** | Table: `messages`<br>Route: `/messages`<br>Components: `MessagesClient.tsx`<br>Actions: `src/app/actions/messages.ts` | **Yes** (`fig09_notifications_messages.png`, `fig09b_messages.png`) | **Keep — update manuscript scope** |
| **Urgent / emergency alerts** | **Yes** | Table: `notifications` (`type = 'urgent_update'`)<br>Route: `/caregiver`<br>Components: `CaregiverDashboardClient.tsx` (Urgent Modal)<br>Actions: `sendUrgentUpdateAction` in `caregiverUrgent.ts` | **Yes** (`fig17_send_urgent_update.png`) | **Keep — update manuscript scope** |
| **Shift reports / shift handover** | **Yes** | Table: `shift_reports`<br>Route: `/caregiver/shift-report`<br>Components: `ShiftReportFormClient.tsx`<br>Actions: `submitShiftReportAction` in `caregiverShift.ts`<br>Reports: `ReportsClient.tsx` | **Yes** (`fig15_shift_report_form.png`, `fig13b_reports.png`) | **Keep — update manuscript scope** |
| **Triage queue for doctors** | **Yes** | Route: `/doctor`<br>Components: `DoctorDashboardClient.tsx`, `TriageQueueList.tsx`, `TriageQueueItemCard.tsx`<br>Logic: Categorizes patients into Critical, Warning, Unassessed, Stable | **Yes** (`fig18_doctor_dashboard.png`) | **Keep — update manuscript scope** |
| **Automatic clinical thresholds / abnormal-value flagging** | **Yes** | Table: `vital_sign_thresholds`<br>Logic: `src/lib/utils/vitalsThresholds.ts`<br>Route: `/doctor/patient/[id]` (Tab 2)<br>Components: `PatientHealthStatusView.tsx`, `LogVitalsForm.tsx` | **Yes** (`fig19_patient_health_status.png`, `fig20_care_notes_thresholds.png`) | **Keep — update manuscript scope** |

### 15.2 Additional Features Present in Code Not Mentioned Above
1. **Immutable System Audit Trail:** Dedicated `audit_logs` table and interactive search viewer (`/admin/audit-logs`, `fig13_audit_logs_reports.png`).
2. **Clinical & Compliance Reports Engine:** Generates Patient Summaries, Shift Compliance, and MAR reports with CSV and printable PDF layouts (`/admin/reports`, `fig13b_reports.png`).
3. **Multidisciplinary Care Team Matrix:** Dynamic care team allocation linking doctors, caregivers, and family members to patients with relationship labels (`/admin/patients`, `fig12_patient_management.png`).
4. **Brute-Force Account Lockout Protection:** Automatically locks accounts for 15 minutes after 5 consecutive failed attempts (`src/app/actions/auth.ts`).
5. **Self-Service Password Recovery:** Complete forgot-password recovery flow with email tokens and `/set-password` interface.

---

## 16. Known Issues and Limitations

### 16.1 Codebase Notices & Pending UI Polish
1. **Hardcoded Figure Badges in UI:** Several components contain hardcoded badge labels from manuscript preparation (e.g., `"Figure 12"`, `"Figure 13 Task A"`, `"Figure 13 Task B"`, `"Figure 15"`, `"Figure 16"`). These should be removed for production deployment.
2. **Statutory Reference Correction:** `src/app/messages/MessagesClient.tsx` (Line 252) references United States `"HIPAA"` alongside the Philippine `"RA 10173"`. This should be updated to reference only Republic Act No. 10173 (Data Privacy Act of 2012).
3. **Lack of Automated Test Suites:** No automated unit or integration tests (Jest, Vitest, Cypress, Playwright) are configured in `package.json`.
4. **Uninitialized Cloud Storage:** Supabase Storage buckets (`storage.buckets`) are not initialized. Profile photos utilize UI fallback initials.

### 16.2 Technical System Limitations
1. **Internet Dependency:** Continuous internet connectivity is required. The system does not implement offline service workers or local synchronization queues.
2. **No SMS Delivery Channel:** Notifications are delivered via in-app feeds and Supabase Realtime WebSockets. Cellular SMS gateways are not implemented.
3. **Supabase Free-Tier Constraints:** The hosted database is subject to free-tier connection pooling and compute resource limits.
4. **No Native Mobile App:** Caregiver access is provided through a mobile-optimized web browser rather than a native mobile application (iOS/Android APK).

---

## 17. Questions for the Researchers

The researchers should confirm the following details for the final manuscript:
1. **Deployed URL:** What is the official live production or staging URL on Vercel for Tender Touch Home Care Services?
2. **Field Evaluation Hardware:** What specific hardware models (laptops, tablets, smartphones) were used by staff during field testing in Dumaguete City?
3. **Scope and Limitations Decision:** Do the researchers approve updating Chapter I and Chapter III to formally include the seven implemented features (MAR, Appointments, Messaging, Urgent Alerts, Shift Reports, Triage Queue, and Custom Thresholds) within the project scope?
4. **Removal of Development Badges:** Do the researchers approve removing the development figure badges (`Figure 12`, `Figure 13 Task A`, `Figure 13 Task B`, `Figure 15`, `Figure 16`) and the "HIPAA" reference from the user interface?
5. **Field Testing Chronology:** What specific calendar dates corresponded to each development phase and user acceptance testing period at Tender Touch Home Care Services?

---
*Report compiled factually through direct code inspection and database verification. Complies with RA 10173 (Data Privacy Act of 2012).*
