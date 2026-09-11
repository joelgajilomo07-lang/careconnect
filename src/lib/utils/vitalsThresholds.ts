/**
 * Client-side heuristic helper to detect raw vitals outside typical ranges.
 * 
 * IMPORTANT CLINICAL SAFETY NOTE ON TERMINOLOGY:
 * We intentionally do NOT use the terms "Warning" or "Critical" here.
 * Those terms are strictly reserved for the authoritative `patient_status`
 * assigned exclusively by licensed medical doctors in medical reviews.
 * 
 * Display flags here are labelled "Out of typical range" / "Flagged" to ensure
 * caregivers and family members never confuse heuristic chart coloring with an
 * official doctor's clinical evaluation.
 */

export interface VitalsRangeFlag {
  field: 'heart_rate' | 'spo2' | 'bp' | 'temperature_c'
  label: string
  message: string
}

export interface VitalsAssessment {
  isFlagged: boolean
  flags: VitalsRangeFlag[]
}

export function checkVitalsRanges(vitals: {
  heart_rate?: number | null
  spo2?: number | null
  bp_systolic?: number | null
  bp_diastolic?: number | null
  temperature_c?: number | null
}): VitalsAssessment {
  const flags: VitalsRangeFlag[] = []

  // SpO2 typical baseline is 95–100%
  if (vitals.spo2 !== null && vitals.spo2 !== undefined) {
    if (vitals.spo2 < 95) {
      flags.push({
        field: 'spo2',
        label: 'Low SpO2',
        message: `SpO2 ${vitals.spo2}% is below typical range (≥95%)`,
      })
    }
  }

  // Heart Rate typical resting baseline is 60–100 bpm
  if (vitals.heart_rate !== null && vitals.heart_rate !== undefined) {
    if (vitals.heart_rate < 60 || vitals.heart_rate > 100) {
      flags.push({
        field: 'heart_rate',
        label: 'Atypical Pulse',
        message: `Heart rate ${vitals.heart_rate} bpm is outside typical resting range (60–100 bpm)`,
      })
    }
  }

  // Blood Pressure typical baseline is ~120/80 mmHg
  if (
    vitals.bp_systolic !== null && vitals.bp_systolic !== undefined &&
    vitals.bp_diastolic !== null && vitals.bp_diastolic !== undefined
  ) {
    if (vitals.bp_systolic >= 130 || vitals.bp_diastolic >= 85 || vitals.bp_systolic < 90 || vitals.bp_diastolic < 60) {
      flags.push({
        field: 'bp',
        label: 'Atypical BP',
        message: `Blood pressure ${vitals.bp_systolic}/${vitals.bp_diastolic} mmHg is outside typical range`,
      })
    }
  }

  // Temperature typical baseline is 36.1–37.2 °C
  if (vitals.temperature_c !== null && vitals.temperature_c !== undefined) {
    if (vitals.temperature_c > 37.5 || vitals.temperature_c < 36.0) {
      flags.push({
        field: 'temperature_c',
        label: 'Atypical Temp',
        message: `Temperature ${vitals.temperature_c}°C is outside typical range (36.1–37.2°C)`,
      })
    }
  }

  return {
    isFlagged: flags.length > 0,
    flags,
  }
}
