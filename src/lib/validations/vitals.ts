import { z } from 'zod'

/**
 * Client-side validation schema mirroring the exact Postgres check constraints:
 * - spo2: between 0 and 100 (or null / empty)
 * - heart_rate: between 0 and 300 (or null / empty)
 * - bp_systolic: positive integer 30–300 (optional)
 * - bp_diastolic: positive integer 20–200 (optional)
 * - temperature_c: decimal 1 place 25–45 (optional)
 * - respiratory_rate: integer 0–100 (optional)
 * - pain_score: integer 0–10 (optional)
 * - weight_kg: number 1.0–500.0 (optional)
 * - height_cm: number 20.0–300.0 (optional)
 * - bmi: number (optional)
 * - measurement_position: string (optional, default 'Sitting')
 * - bp_arm: string (optional, default 'Left')
 * - temp_method: string (optional, default 'Oral')
 * - oxygen_device: string (optional, default 'Room Air')
 * - symptoms: array of strings
 * - symptoms_other: string (optional)
 * - notes: max 1500 chars (optional)
 * - medication_taken: string (optional)
 * - recorded_by_name: string (optional)
 * - staff_id_code: string (optional)
 * - measured_at: string/date (optional)
 * - patient_id: uuid (required)
 */
export const vitalsLogSchema = z.object({
  patient_id: z.string().uuid('Please select a valid assigned patient'),
  bp_systolic: z.preprocess(
    (val) => (val === '' || val === undefined || val === null ? null : Number(val)),
    z.number().int().min(30, 'Systolic BP typically at least 30').max(300, 'Systolic BP must be <= 300').nullable()
  ),
  bp_diastolic: z.preprocess(
    (val) => (val === '' || val === undefined || val === null ? null : Number(val)),
    z.number().int().min(20, 'Diastolic BP typically at least 20').max(200, 'Diastolic BP must be <= 200').nullable()
  ),
  heart_rate: z.preprocess(
    (val) => (val === '' || val === undefined || val === null ? null : Number(val)),
    z.number().int().min(0, 'Heart rate cannot be negative').max(300, 'Heart rate must be between 0 and 300 bpm').nullable()
  ),
  temperature_c: z.preprocess(
    (val) => (val === '' || val === undefined || val === null ? null : Number(val)),
    z.number().min(25, 'Temperature must be >= 25°C').max(45, 'Temperature must be <= 45°C').nullable()
  ),
  spo2: z.preprocess(
    (val) => (val === '' || val === undefined || val === null ? null : Number(val)),
    z.number().int().min(0, 'SpO2 must be at least 0%').max(100, 'SpO2 must be between 0% and 100%').nullable()
  ),
  respiratory_rate: z.preprocess(
    (val) => (val === '' || val === undefined || val === null ? null : Number(val)),
    z.number().int().min(0, 'Respiratory rate cannot be negative').max(100, 'Respiratory rate must be <= 100').nullable()
  ),
  pain_score: z.preprocess(
    (val) => (val === '' || val === undefined || val === null ? null : Number(val)),
    z.number().int().min(0, 'Pain score must be between 0 and 10').max(10, 'Pain score must be between 0 and 10').nullable()
  ),
  weight_kg: z.preprocess(
    (val) => (val === '' || val === undefined || val === null ? null : Number(val)),
    z.number().min(1.0, 'Weight must be at least 1.0 kg').max(500.0, 'Weight must be <= 500.0 kg').nullable()
  ),
  height_cm: z.preprocess(
    (val) => (val === '' || val === undefined || val === null ? null : Number(val)),
    z.number().min(20.0, 'Height must be at least 20.0 cm').max(300.0, 'Height must be <= 300.0 cm').nullable()
  ),
  bmi: z.preprocess(
    (val) => (val === '' || val === undefined || val === null ? null : Number(val)),
    z.number().nullable()
  ),
  measurement_position: z.string().optional().default('Sitting'),
  bp_arm: z.string().optional().default('Left'),
  temp_method: z.string().optional().default('Oral'),
  oxygen_device: z.string().optional().default('Room Air'),
  symptoms: z.array(z.string()).optional().default([]),
  symptoms_other: z.string().optional().nullable(),
  notes: z.string().max(1500, 'Notes cannot exceed 1500 characters').optional().nullable(),
  medication_taken: z.string().optional().nullable(),
  recorded_by_name: z.string().optional().nullable(),
  staff_id_code: z.string().optional().nullable(),
  measured_at: z.string().optional().nullable(),
})

export type VitalsLogFormValues = z.infer<typeof vitalsLogSchema>

