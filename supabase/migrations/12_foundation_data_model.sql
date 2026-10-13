-- =====================================================================
-- CARECONNECT — FOUNDATION DATA MODEL & ACCESS CONTROLS (Prompt 0)
-- Migration: 12_foundation_data_model.sql
-- =====================================================================

-- 1. EXTEND USERS TABLE FOR ACCOUNT LOCKOUT & STATUS
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS failed_login_attempts integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS locked_until timestamptz DEFAULT NULL;

-- 2. CREATE PATIENTS TABLE
CREATE TABLE IF NOT EXISTS public.patients (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name               text NOT NULL,
  birth_date              date,
  sex                     text,
  address                 text,
  diagnosis               text,
  medical_history         text,
  allergies               text,
  emergency_contact_name  text,
  emergency_contact_phone text,
  user_id                 uuid UNIQUE REFERENCES public.users(id) ON DELETE SET NULL,
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_patients_user_id ON public.patients(user_id);
CREATE INDEX IF NOT EXISTS idx_patients_full_name ON public.patients(full_name);

-- Populate patients from existing patient_profiles & users if any exist
INSERT INTO public.patients (id, full_name, birth_date, sex, diagnosis, user_id, created_at, updated_at)
SELECT 
  u.id,
  u.full_name,
  pp.date_of_birth,
  pp.sex,
  pp.primary_condition,
  u.id,
  COALESCE(pp.created_at, u.created_at),
  COALESCE(pp.updated_at, u.updated_at)
FROM public.users u
LEFT JOIN public.patient_profiles pp ON pp.user_id = u.id
WHERE u.role = 'patient'
ON CONFLICT (id) DO NOTHING;

-- 3. ADJUST CARE_TEAMS TO REFERENCE PATIENTS
-- Ensure existing care_teams patient_ids exist in patients table
INSERT INTO public.patients (id, full_name, user_id)
SELECT DISTINCT ct.patient_id, COALESCE(u.full_name, 'Patient Record'), u.id
FROM public.care_teams ct
LEFT JOIN public.users u ON u.id = ct.patient_id
WHERE ct.patient_id NOT IN (SELECT id FROM public.patients)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.care_teams
  DROP CONSTRAINT IF EXISTS care_teams_patient_id_fkey;

ALTER TABLE public.care_teams
  ADD CONSTRAINT care_teams_patient_id_fkey 
  FOREIGN KEY (patient_id) REFERENCES public.patients(id) ON DELETE CASCADE;

-- Provide care_assignments view as synonym
CREATE OR REPLACE VIEW public.care_assignments AS
SELECT 
  id,
  patient_id,
  member_id AS user_id,
  member_role AS assigned_role,
  assigned_at AS start_date,
  relationship_label,
  is_active
FROM public.care_teams;

-- 4. ADJUST VITALS_LOGS & MEDICAL_REVIEWS FOREIGN KEYS
ALTER TABLE public.vitals_logs
  DROP CONSTRAINT IF EXISTS vitals_logs_patient_id_fkey;

ALTER TABLE public.vitals_logs
  ADD CONSTRAINT vitals_logs_patient_id_fkey 
  FOREIGN KEY (patient_id) REFERENCES public.patients(id) ON DELETE CASCADE;

ALTER TABLE public.medical_reviews
  DROP CONSTRAINT IF EXISTS medical_reviews_patient_id_fkey;

ALTER TABLE public.medical_reviews
  ADD CONSTRAINT medical_reviews_patient_id_fkey 
  FOREIGN KEY (patient_id) REFERENCES public.patients(id) ON DELETE CASCADE;

-- Provide vital_signs view as synonym for vitals_logs
CREATE OR REPLACE VIEW public.vital_signs AS
SELECT * FROM public.vitals_logs;

-- 5. SHIFT_REPORTS TABLE
CREATE TABLE IF NOT EXISTS public.shift_reports (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id            uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  caregiver_id          uuid NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  shift                 text NOT NULL DEFAULT 'Day', -- Morning, Afternoon, Night, Day
  vital_signs           jsonb,
  general_condition     text,
  activities_care       text,
  food_fluid_intake     text,
  elimination           text,
  sleep                 text,
  behavior_mood         text,
  incidents             boolean NOT NULL DEFAULT false,
  incident_description  text,
  status                text NOT NULL DEFAULT 'submitted',
  submitted_at          timestamptz NOT NULL DEFAULT now(),
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_shift_reports_patient ON public.shift_reports(patient_id, submitted_at DESC);
CREATE INDEX IF NOT EXISTS idx_shift_reports_caregiver ON public.shift_reports(caregiver_id, submitted_at DESC);

-- 6. MEDICATIONS TABLE
CREATE TABLE IF NOT EXISTS public.medications (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id      uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  doctor_id       uuid REFERENCES public.users(id) ON DELETE SET NULL,
  name            text NOT NULL,
  dosage          text NOT NULL,
  route           text DEFAULT 'Oral',
  frequency       text NOT NULL, -- Once daily, Every 8 hours, etc.
  schedule_times  text[] DEFAULT ARRAY[]::text[], -- e.g. ['08:00', '16:00', '00:00']
  start_date      date NOT NULL DEFAULT CURRENT_DATE,
  end_date        date,
  instructions    text,
  status          text NOT NULL DEFAULT 'active', -- active, discontinued, completed
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_medications_patient ON public.medications(patient_id, status);

-- 7. MEDICATION_LOGS TABLE
CREATE TABLE IF NOT EXISTS public.medication_logs (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  medication_id     uuid REFERENCES public.medications(id) ON DELETE CASCADE,
  patient_id        uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  caregiver_id      uuid REFERENCES public.users(id) ON DELETE SET NULL,
  scheduled_time    timestamptz NOT NULL,
  administered_at   timestamptz,
  status            text NOT NULL DEFAULT 'Pending', -- Given, Missed, Refused, Pending, Overdue
  remarks           text,
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_medication_logs_patient ON public.medication_logs(patient_id, scheduled_time DESC);
CREATE INDEX IF NOT EXISTS idx_medication_logs_status ON public.medication_logs(status);

-- 8. CARE_NOTES TABLE
CREATE TABLE IF NOT EXISTS public.care_notes (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id  uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  doctor_id   uuid NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  note        text NOT NULL,
  priority    text NOT NULL DEFAULT 'routine', -- routine, important, urgent
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_care_notes_patient ON public.care_notes(patient_id, created_at DESC);

-- 9. APPOINTMENTS TABLE
CREATE TABLE IF NOT EXISTS public.appointments (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id        uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  doctor_id         uuid REFERENCES public.users(id) ON DELETE SET NULL,
  type              text NOT NULL DEFAULT 'check-up', -- check-up, laboratory test, therapy, other
  appointment_date  timestamptz NOT NULL,
  location          text,
  notes             text,
  status            text NOT NULL DEFAULT 'scheduled', -- scheduled, completed, cancelled
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_appointments_patient ON public.appointments(patient_id, appointment_date);

-- 10. VITAL_SIGN_THRESHOLDS TABLE
CREATE TABLE IF NOT EXISTS public.vital_sign_thresholds (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id            uuid NOT NULL UNIQUE REFERENCES public.patients(id) ON DELETE CASCADE,
  bp_systolic_min       smallint NOT NULL DEFAULT 90,
  bp_systolic_max       smallint NOT NULL DEFAULT 140,
  bp_diastolic_min      smallint NOT NULL DEFAULT 60,
  bp_diastolic_max      smallint NOT NULL DEFAULT 90,
  pulse_rate_min        smallint NOT NULL DEFAULT 60,
  pulse_rate_max        smallint NOT NULL DEFAULT 100,
  respiratory_rate_min  smallint NOT NULL DEFAULT 12,
  respiratory_rate_max  smallint NOT NULL DEFAULT 20,
  temperature_min       numeric(4,1) NOT NULL DEFAULT 36.1,
  temperature_max       numeric(4,1) NOT NULL DEFAULT 37.5,
  spo2_min              smallint NOT NULL DEFAULT 95,
  spo2_max              smallint NOT NULL DEFAULT 100,
  blood_glucose_min     numeric(5,1) NOT NULL DEFAULT 70.0,
  blood_glucose_max     numeric(5,1) NOT NULL DEFAULT 140.0,
  updated_by            uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

-- 11. NOTIFICATIONS ENHANCEMENTS
ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS priority text NOT NULL DEFAULT 'normal',
  ADD COLUMN IF NOT EXISTS link text;

-- 12. MESSAGES TABLE
CREATE TABLE IF NOT EXISTS public.messages (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id  uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  sender_id   uuid NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  content     text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_messages_patient ON public.messages(patient_id, created_at ASC);

-- 13. AUDIT_LOGS TABLE
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid REFERENCES public.users(id) ON DELETE SET NULL,
  user_name   text,
  user_role   text,
  action      text NOT NULL, -- login, logout, failed_login, lockout, create, update, delete, etc.
  record_type text,          -- patient, user, report, vitals, medication, note, appointment
  record_id   text,
  ip_address  text,
  details     jsonb,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON public.audit_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs(action, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON public.audit_logs(created_at DESC);

-- 14. ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shift_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medication_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.care_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vital_sign_thresholds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Helper function: is current user an admin?
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role = 'admin' AND is_active = true
  );
$$;

-- Helper function: can user access patient?
CREATE OR REPLACE FUNCTION public.has_patient_access(p_patient_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    -- Admin has access to all
    SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin' AND is_active = true
    UNION
    -- Care team member (doctor, caregiver, family)
    SELECT 1 FROM public.care_teams 
    WHERE patient_id = p_patient_id AND member_id = auth.uid() AND is_active = true
    UNION
    -- Patient's own account
    SELECT 1 FROM public.patients 
    WHERE id = p_patient_id AND user_id = auth.uid()
  );
$$;

-- PATIENTS POLICIES
DROP POLICY IF EXISTS "patients_select" ON public.patients;
CREATE POLICY "patients_select" ON public.patients
  FOR SELECT TO authenticated
  USING (public.has_patient_access(id));

DROP POLICY IF EXISTS "patients_admin_all" ON public.patients;
CREATE POLICY "patients_admin_all" ON public.patients
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- SHIFT_REPORTS POLICIES
DROP POLICY IF EXISTS "shift_reports_select" ON public.shift_reports;
CREATE POLICY "shift_reports_select" ON public.shift_reports
  FOR SELECT TO authenticated
  USING (public.has_patient_access(patient_id));

DROP POLICY IF EXISTS "shift_reports_insert_caregiver" ON public.shift_reports;
CREATE POLICY "shift_reports_insert_caregiver" ON public.shift_reports
  FOR INSERT TO authenticated
  WITH CHECK (
    caregiver_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.care_teams 
      WHERE patient_id = shift_reports.patient_id AND member_id = auth.uid() AND member_role = 'caregiver' AND is_active = true
    )
  );

-- MEDICATIONS POLICIES
DROP POLICY IF EXISTS "medications_select" ON public.medications;
CREATE POLICY "medications_select" ON public.medications
  FOR SELECT TO authenticated
  USING (public.has_patient_access(patient_id));

DROP POLICY IF EXISTS "medications_write_doctor_admin" ON public.medications;
CREATE POLICY "medications_write_doctor_admin" ON public.medications
  FOR ALL TO authenticated
  USING (
    public.is_admin() OR
    EXISTS (
      SELECT 1 FROM public.care_teams 
      WHERE patient_id = medications.patient_id AND member_id = auth.uid() AND member_role = 'doctor' AND is_active = true
    )
  )
  WITH CHECK (
    public.is_admin() OR
    EXISTS (
      SELECT 1 FROM public.care_teams 
      WHERE patient_id = medications.patient_id AND member_id = auth.uid() AND member_role = 'doctor' AND is_active = true
    )
  );

-- MEDICATION_LOGS POLICIES
DROP POLICY IF EXISTS "medication_logs_select" ON public.medication_logs;
CREATE POLICY "medication_logs_select" ON public.medication_logs
  FOR SELECT TO authenticated
  USING (public.has_patient_access(patient_id));

DROP POLICY IF EXISTS "medication_logs_write_caregiver" ON public.medication_logs;
CREATE POLICY "medication_logs_write_caregiver" ON public.medication_logs
  FOR ALL TO authenticated
  USING (
    public.is_admin() OR
    EXISTS (
      SELECT 1 FROM public.care_teams 
      WHERE patient_id = medication_logs.patient_id AND member_id = auth.uid() AND member_role = 'caregiver' AND is_active = true
    )
  )
  WITH CHECK (
    public.is_admin() OR
    EXISTS (
      SELECT 1 FROM public.care_teams 
      WHERE patient_id = medication_logs.patient_id AND member_id = auth.uid() AND member_role = 'caregiver' AND is_active = true
    )
  );

-- CARE_NOTES POLICIES
DROP POLICY IF EXISTS "care_notes_select" ON public.care_notes;
CREATE POLICY "care_notes_select" ON public.care_notes
  FOR SELECT TO authenticated
  USING (public.has_patient_access(patient_id));

DROP POLICY IF EXISTS "care_notes_write_doctor" ON public.care_notes;
CREATE POLICY "care_notes_write_doctor" ON public.care_notes
  FOR ALL TO authenticated
  USING (
    public.is_admin() OR
    EXISTS (
      SELECT 1 FROM public.care_teams 
      WHERE patient_id = care_notes.patient_id AND member_id = auth.uid() AND member_role = 'doctor' AND is_active = true
    )
  )
  WITH CHECK (
    public.is_admin() OR
    EXISTS (
      SELECT 1 FROM public.care_teams 
      WHERE patient_id = care_notes.patient_id AND member_id = auth.uid() AND member_role = 'doctor' AND is_active = true
    )
  );

-- APPOINTMENTS POLICIES
DROP POLICY IF EXISTS "appointments_select" ON public.appointments;
CREATE POLICY "appointments_select" ON public.appointments
  FOR SELECT TO authenticated
  USING (public.has_patient_access(patient_id));

DROP POLICY IF EXISTS "appointments_write_doctor_admin" ON public.appointments;
CREATE POLICY "appointments_write_doctor_admin" ON public.appointments
  FOR ALL TO authenticated
  USING (
    public.is_admin() OR
    EXISTS (
      SELECT 1 FROM public.care_teams 
      WHERE patient_id = appointments.patient_id AND member_id = auth.uid() AND member_role = 'doctor' AND is_active = true
    )
  )
  WITH CHECK (
    public.is_admin() OR
    EXISTS (
      SELECT 1 FROM public.care_teams 
      WHERE patient_id = appointments.patient_id AND member_id = auth.uid() AND member_role = 'doctor' AND is_active = true
    )
  );

-- VITAL_SIGN_THRESHOLDS POLICIES
DROP POLICY IF EXISTS "vital_sign_thresholds_select" ON public.vital_sign_thresholds;
CREATE POLICY "vital_sign_thresholds_select" ON public.vital_sign_thresholds
  FOR SELECT TO authenticated
  USING (public.has_patient_access(patient_id));

DROP POLICY IF EXISTS "vital_sign_thresholds_write_doctor" ON public.vital_sign_thresholds;
CREATE POLICY "vital_sign_thresholds_write_doctor" ON public.vital_sign_thresholds
  FOR ALL TO authenticated
  USING (
    public.is_admin() OR
    EXISTS (
      SELECT 1 FROM public.care_teams 
      WHERE patient_id = vital_sign_thresholds.patient_id AND member_id = auth.uid() AND member_role = 'doctor' AND is_active = true
    )
  )
  WITH CHECK (
    public.is_admin() OR
    EXISTS (
      SELECT 1 FROM public.care_teams 
      WHERE patient_id = vital_sign_thresholds.patient_id AND member_id = auth.uid() AND member_role = 'doctor' AND is_active = true
    )
  );

-- MESSAGES POLICIES
DROP POLICY IF EXISTS "messages_select" ON public.messages;
CREATE POLICY "messages_select" ON public.messages
  FOR SELECT TO authenticated
  USING (public.has_patient_access(patient_id));

DROP POLICY IF EXISTS "messages_insert" ON public.messages;
CREATE POLICY "messages_insert" ON public.messages
  FOR INSERT TO authenticated
  WITH CHECK (
    sender_id = auth.uid() AND
    public.has_patient_access(patient_id)
  );

-- AUDIT_LOGS POLICIES
DROP POLICY IF EXISTS "audit_logs_admin_select" ON public.audit_logs;
CREATE POLICY "audit_logs_admin_select" ON public.audit_logs
  FOR SELECT TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS "audit_logs_insert_all" ON public.audit_logs;
CREATE POLICY "audit_logs_insert_all" ON public.audit_logs
  FOR INSERT TO authenticated
  WITH CHECK (true);
