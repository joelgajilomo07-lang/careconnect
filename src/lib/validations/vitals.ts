import { z } from 'zod'

/**
 * Client-side validation schema mirroring the exact Postgres check constraints:
 * - spo2: between 0 and 100 (or null / empty)
 * - heart_rate: between 0 and 300 (or null / empty)
 * - bp_systolic: positive integer (optional)
 * - bp_diastolic: positive integer (optional)
 * - temperature_c: decimal 1 place e.g. 37.2 (optional)
 * - notes: string (optional)
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
  notes: z.string().max(1000, 'Notes cannot exceed 1000 characters').optional().nullable(),
})

export type VitalsLogFormValues = z.infer<typeof vitalsLogSchema>
