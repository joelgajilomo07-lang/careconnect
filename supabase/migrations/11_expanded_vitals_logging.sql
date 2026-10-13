-- Migration 11: Expanded Vitals Logging & Patient Room Details
-- Adds expanded clinical fields to public.vitals_logs and room_bed to patient_profiles.

ALTER TABLE public.vitals_logs
  ADD COLUMN IF NOT EXISTS respiratory_rate smallint CHECK (respiratory_rate IS NULL OR (respiratory_rate BETWEEN 0 AND 100)),
  ADD COLUMN IF NOT EXISTS pain_score smallint CHECK (pain_score IS NULL OR (pain_score BETWEEN 0 AND 10)),
  ADD COLUMN IF NOT EXISTS weight_kg numeric(5, 2) CHECK (weight_kg IS NULL OR (weight_kg > 0 AND weight_kg <= 500)),
  ADD COLUMN IF NOT EXISTS height_cm numeric(5, 2) CHECK (height_cm IS NULL OR (height_cm > 20 AND height_cm <= 300)),
  ADD COLUMN IF NOT EXISTS bmi numeric(4, 1),
  ADD COLUMN IF NOT EXISTS measurement_position text DEFAULT 'Sitting',
  ADD COLUMN IF NOT EXISTS bp_arm text DEFAULT 'Left',
  ADD COLUMN IF NOT EXISTS temp_method text DEFAULT 'Oral',
  ADD COLUMN IF NOT EXISTS oxygen_device text DEFAULT 'Room Air',
  ADD COLUMN IF NOT EXISTS symptoms text[] DEFAULT ARRAY[]::text[],
  ADD COLUMN IF NOT EXISTS symptoms_other text,
  ADD COLUMN IF NOT EXISTS medication_taken text,
  ADD COLUMN IF NOT EXISTS recorded_by_name text,
  ADD COLUMN IF NOT EXISTS staff_id_code text,
  ADD COLUMN IF NOT EXISTS measured_at timestamptz DEFAULT now();

-- Add room_bed column to public.patient_profiles (nullable)
ALTER TABLE public.patient_profiles
  ADD COLUMN IF NOT EXISTS room_bed text;
