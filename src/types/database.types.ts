export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.17"
  }
  public: {
    Tables: {
      appointments: {
        Row: {
          appointment_date: string
          created_at: string
          doctor_id: string | null
          id: string
          location: string | null
          notes: string | null
          patient_id: string
          status: string
          type: string
          updated_at: string
        }
        Insert: {
          appointment_date: string
          created_at?: string
          doctor_id?: string | null
          id?: string
          location?: string | null
          notes?: string | null
          patient_id: string
          status?: string
          type?: string
          updated_at?: string
        }
        Update: {
          appointment_date?: string
          created_at?: string
          doctor_id?: string | null
          id?: string
          location?: string | null
          notes?: string | null
          patient_id?: string
          status?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointments_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          id: string
          ip_address: string | null
          record_id: string | null
          record_type: string | null
          user_id: string | null
          user_name: string | null
          user_role: string | null
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: string | null
          record_id?: string | null
          record_type?: string | null
          user_id?: string | null
          user_name?: string | null
          user_role?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: string | null
          record_id?: string | null
          record_type?: string | null
          user_id?: string | null
          user_name?: string | null
          user_role?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      care_notes: {
        Row: {
          created_at: string
          doctor_id: string
          id: string
          note: string
          patient_id: string
          priority: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          doctor_id: string
          id?: string
          note: string
          patient_id: string
          priority?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          doctor_id?: string
          id?: string
          note?: string
          patient_id?: string
          priority?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "care_notes_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "care_notes_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      care_teams: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          id: string
          is_active: boolean
          member_id: string
          member_role: Database["public"]["Enums"]["care_team_role"]
          patient_id: string
          relationship_label: string | null
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          id?: string
          is_active?: boolean
          member_id: string
          member_role: Database["public"]["Enums"]["care_team_role"]
          patient_id: string
          relationship_label?: string | null
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          id?: string
          is_active?: boolean
          member_id?: string
          member_role?: Database["public"]["Enums"]["care_team_role"]
          patient_id?: string
          relationship_label?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "care_teams_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "care_teams_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "care_teams_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      medical_reviews: {
        Row: {
          doctor_id: string
          feedback_notes: string
          id: string
          is_urgent: boolean
          new_status: Database["public"]["Enums"]["patient_status"]
          patient_id: string
          reviewed_at: string
          vitals_log_id: string | null
        }
        Insert: {
          doctor_id: string
          feedback_notes: string
          id?: string
          is_urgent?: boolean
          new_status: Database["public"]["Enums"]["patient_status"]
          patient_id: string
          reviewed_at?: string
          vitals_log_id?: string | null
        }
        Update: {
          doctor_id?: string
          feedback_notes?: string
          id?: string
          is_urgent?: boolean
          new_status?: Database["public"]["Enums"]["patient_status"]
          patient_id?: string
          reviewed_at?: string
          vitals_log_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "medical_reviews_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medical_reviews_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medical_reviews_vitals_log_id_fkey"
            columns: ["vitals_log_id"]
            isOneToOne: false
            referencedRelation: "vital_signs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medical_reviews_vitals_log_id_fkey"
            columns: ["vitals_log_id"]
            isOneToOne: false
            referencedRelation: "vitals_logs"
            referencedColumns: ["id"]
          },
        ]
      }
      medication_logs: {
        Row: {
          administered_at: string | null
          caregiver_id: string | null
          created_at: string
          id: string
          medication_id: string | null
          patient_id: string
          remarks: string | null
          scheduled_time: string
          status: string
        }
        Insert: {
          administered_at?: string | null
          caregiver_id?: string | null
          created_at?: string
          id?: string
          medication_id?: string | null
          patient_id: string
          remarks?: string | null
          scheduled_time: string
          status?: string
        }
        Update: {
          administered_at?: string | null
          caregiver_id?: string | null
          created_at?: string
          id?: string
          medication_id?: string | null
          patient_id?: string
          remarks?: string | null
          scheduled_time?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "medication_logs_caregiver_id_fkey"
            columns: ["caregiver_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medication_logs_medication_id_fkey"
            columns: ["medication_id"]
            isOneToOne: false
            referencedRelation: "medications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medication_logs_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      medications: {
        Row: {
          created_at: string
          doctor_id: string | null
          dosage: string
          end_date: string | null
          frequency: string
          id: string
          instructions: string | null
          name: string
          patient_id: string
          route: string | null
          schedule_times: string[] | null
          start_date: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          doctor_id?: string | null
          dosage: string
          end_date?: string | null
          frequency: string
          id?: string
          instructions?: string | null
          name: string
          patient_id: string
          route?: string | null
          schedule_times?: string[] | null
          start_date?: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          doctor_id?: string | null
          dosage?: string
          end_date?: string | null
          frequency?: string
          id?: string
          instructions?: string | null
          name?: string
          patient_id?: string
          route?: string | null
          schedule_times?: string[] | null
          start_date?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "medications_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medications_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          created_at: string
          id: string
          patient_id: string
          sender_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          patient_id: string
          sender_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          patient_id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          link: string | null
          message: string
          patient_id: string
          priority: string
          recipient_id: string
          related_review_id: string | null
          related_vitals_log_id: string | null
          title: string
          type: Database["public"]["Enums"]["notification_type"]
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          message: string
          patient_id: string
          priority?: string
          recipient_id: string
          related_review_id?: string | null
          related_vitals_log_id?: string | null
          title: string
          type: Database["public"]["Enums"]["notification_type"]
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          message?: string
          patient_id?: string
          priority?: string
          recipient_id?: string
          related_review_id?: string | null
          related_vitals_log_id?: string | null
          title?: string
          type?: Database["public"]["Enums"]["notification_type"]
        }
        Relationships: [
          {
            foreignKeyName: "notifications_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_related_review_id_fkey"
            columns: ["related_review_id"]
            isOneToOne: false
            referencedRelation: "medical_reviews"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_related_vitals_log_id_fkey"
            columns: ["related_vitals_log_id"]
            isOneToOne: false
            referencedRelation: "vital_signs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_related_vitals_log_id_fkey"
            columns: ["related_vitals_log_id"]
            isOneToOne: false
            referencedRelation: "vitals_logs"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_profiles: {
        Row: {
          created_at: string
          current_status: Database["public"]["Enums"]["patient_status"]
          date_of_birth: string | null
          primary_condition: string | null
          room_bed: string | null
          sex: string | null
          status_updated_at: string | null
          status_updated_by: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_status?: Database["public"]["Enums"]["patient_status"]
          date_of_birth?: string | null
          primary_condition?: string | null
          room_bed?: string | null
          sex?: string | null
          status_updated_at?: string | null
          status_updated_by?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_status?: Database["public"]["Enums"]["patient_status"]
          date_of_birth?: string | null
          primary_condition?: string | null
          room_bed?: string | null
          sex?: string | null
          status_updated_at?: string | null
          status_updated_by?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "patient_profiles_status_updated_by_fkey"
            columns: ["status_updated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      patients: {
        Row: {
          address: string | null
          allergies: string | null
          birth_date: string | null
          created_at: string
          diagnosis: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          full_name: string
          id: string
          medical_history: string | null
          sex: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          address?: string | null
          allergies?: string | null
          birth_date?: string | null
          created_at?: string
          diagnosis?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          full_name: string
          id?: string
          medical_history?: string | null
          sex?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          address?: string | null
          allergies?: string | null
          birth_date?: string | null
          created_at?: string
          diagnosis?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          full_name?: string
          id?: string
          medical_history?: string | null
          sex?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "patients_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      shift_reports: {
        Row: {
          activities_care: string | null
          behavior_mood: string | null
          caregiver_id: string
          created_at: string
          elimination: string | null
          food_fluid_intake: string | null
          general_condition: string | null
          id: string
          incident_description: string | null
          incidents: boolean
          patient_id: string
          shift: string
          sleep: string | null
          status: string
          submitted_at: string
          updated_at: string
          vital_signs: Json | null
        }
        Insert: {
          activities_care?: string | null
          behavior_mood?: string | null
          caregiver_id: string
          created_at?: string
          elimination?: string | null
          food_fluid_intake?: string | null
          general_condition?: string | null
          id?: string
          incident_description?: string | null
          incidents?: boolean
          patient_id: string
          shift?: string
          sleep?: string | null
          status?: string
          submitted_at?: string
          updated_at?: string
          vital_signs?: Json | null
        }
        Update: {
          activities_care?: string | null
          behavior_mood?: string | null
          caregiver_id?: string
          created_at?: string
          elimination?: string | null
          food_fluid_intake?: string | null
          general_condition?: string | null
          id?: string
          incident_description?: string | null
          incidents?: boolean
          patient_id?: string
          shift?: string
          sleep?: string | null
          status?: string
          submitted_at?: string
          updated_at?: string
          vital_signs?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "shift_reports_caregiver_id_fkey"
            columns: ["caregiver_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shift_reports_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          failed_login_attempts: number
          full_name: string
          id: string
          is_active: boolean
          locked_until: string | null
          phone: string | null
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          failed_login_attempts?: number
          full_name: string
          id: string
          is_active?: boolean
          locked_until?: string | null
          phone?: string | null
          role: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          failed_login_attempts?: number
          full_name?: string
          id?: string
          is_active?: boolean
          locked_until?: string | null
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Relationships: []
      }
      vital_sign_thresholds: {
        Row: {
          blood_glucose_max: number
          blood_glucose_min: number
          bp_diastolic_max: number
          bp_diastolic_min: number
          bp_systolic_max: number
          bp_systolic_min: number
          created_at: string
          id: string
          patient_id: string
          pulse_rate_max: number
          pulse_rate_min: number
          respiratory_rate_max: number
          respiratory_rate_min: number
          spo2_max: number
          spo2_min: number
          temperature_max: number
          temperature_min: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          blood_glucose_max?: number
          blood_glucose_min?: number
          bp_diastolic_max?: number
          bp_diastolic_min?: number
          bp_systolic_max?: number
          bp_systolic_min?: number
          created_at?: string
          id?: string
          patient_id: string
          pulse_rate_max?: number
          pulse_rate_min?: number
          respiratory_rate_max?: number
          respiratory_rate_min?: number
          spo2_max?: number
          spo2_min?: number
          temperature_max?: number
          temperature_min?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          blood_glucose_max?: number
          blood_glucose_min?: number
          bp_diastolic_max?: number
          bp_diastolic_min?: number
          bp_systolic_max?: number
          bp_systolic_min?: number
          created_at?: string
          id?: string
          patient_id?: string
          pulse_rate_max?: number
          pulse_rate_min?: number
          respiratory_rate_max?: number
          respiratory_rate_min?: number
          spo2_max?: number
          spo2_min?: number
          temperature_max?: number
          temperature_min?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vital_sign_thresholds_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: true
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vital_sign_thresholds_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      vitals_logs: {
        Row: {
          bmi: number | null
          bp_arm: string | null
          bp_diastolic: number | null
          bp_systolic: number | null
          caregiver_id: string
          created_at: string
          heart_rate: number | null
          height_cm: number | null
          id: string
          logged_at: string
          measured_at: string | null
          measurement_position: string | null
          medication_taken: string | null
          notes: string | null
          oxygen_device: string | null
          pain_score: number | null
          patient_id: string
          recorded_by_name: string | null
          respiratory_rate: number | null
          spo2: number | null
          staff_id_code: string | null
          symptoms: string[] | null
          symptoms_other: string | null
          temp_method: string | null
          temperature_c: number | null
          weight_kg: number | null
        }
        Insert: {
          bmi?: number | null
          bp_arm?: string | null
          bp_diastolic?: number | null
          bp_systolic?: number | null
          caregiver_id: string
          created_at?: string
          heart_rate?: number | null
          height_cm?: number | null
          id?: string
          logged_at?: string
          measured_at?: string | null
          measurement_position?: string | null
          medication_taken?: string | null
          notes?: string | null
          oxygen_device?: string | null
          pain_score?: number | null
          patient_id: string
          recorded_by_name?: string | null
          respiratory_rate?: number | null
          spo2?: number | null
          staff_id_code?: string | null
          symptoms?: string[] | null
          symptoms_other?: string | null
          temp_method?: string | null
          temperature_c?: number | null
          weight_kg?: number | null
        }
        Update: {
          bmi?: number | null
          bp_arm?: string | null
          bp_diastolic?: number | null
          bp_systolic?: number | null
          caregiver_id?: string
          created_at?: string
          heart_rate?: number | null
          height_cm?: number | null
          id?: string
          logged_at?: string
          measured_at?: string | null
          measurement_position?: string | null
          medication_taken?: string | null
          notes?: string | null
          oxygen_device?: string | null
          pain_score?: number | null
          patient_id?: string
          recorded_by_name?: string | null
          respiratory_rate?: number | null
          spo2?: number | null
          staff_id_code?: string | null
          symptoms?: string[] | null
          symptoms_other?: string | null
          temp_method?: string | null
          temperature_c?: number | null
          weight_kg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "vitals_logs_caregiver_id_fkey"
            columns: ["caregiver_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vitals_logs_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      care_assignments: {
        Row: {
          assigned_role: Database["public"]["Enums"]["care_team_role"] | null
          id: string | null
          is_active: boolean | null
          patient_id: string | null
          relationship_label: string | null
          start_date: string | null
          user_id: string | null
        }
        Insert: {
          assigned_role?: Database["public"]["Enums"]["care_team_role"] | null
          id?: string | null
          is_active?: boolean | null
          patient_id?: string | null
          relationship_label?: string | null
          start_date?: string | null
          user_id?: string | null
        }
        Update: {
          assigned_role?: Database["public"]["Enums"]["care_team_role"] | null
          id?: string | null
          is_active?: boolean | null
          patient_id?: string | null
          relationship_label?: string | null
          start_date?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "care_teams_member_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "care_teams_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      vital_signs: {
        Row: {
          bmi: number | null
          bp_arm: string | null
          bp_diastolic: number | null
          bp_systolic: number | null
          caregiver_id: string | null
          created_at: string | null
          heart_rate: number | null
          height_cm: number | null
          id: string | null
          logged_at: string | null
          measured_at: string | null
          measurement_position: string | null
          medication_taken: string | null
          notes: string | null
          oxygen_device: string | null
          pain_score: number | null
          patient_id: string | null
          recorded_by_name: string | null
          respiratory_rate: number | null
          spo2: number | null
          staff_id_code: string | null
          symptoms: string[] | null
          symptoms_other: string | null
          temp_method: string | null
          temperature_c: number | null
          weight_kg: number | null
        }
        Insert: {
          bmi?: number | null
          bp_arm?: string | null
          bp_diastolic?: number | null
          bp_systolic?: number | null
          caregiver_id?: string | null
          created_at?: string | null
          heart_rate?: number | null
          height_cm?: number | null
          id?: string | null
          logged_at?: string | null
          measured_at?: string | null
          measurement_position?: string | null
          medication_taken?: string | null
          notes?: string | null
          oxygen_device?: string | null
          pain_score?: number | null
          patient_id?: string | null
          recorded_by_name?: string | null
          respiratory_rate?: number | null
          spo2?: number | null
          staff_id_code?: string | null
          symptoms?: string[] | null
          symptoms_other?: string | null
          temp_method?: string | null
          temperature_c?: number | null
          weight_kg?: number | null
        }
        Update: {
          bmi?: number | null
          bp_arm?: string | null
          bp_diastolic?: number | null
          bp_systolic?: number | null
          caregiver_id?: string | null
          created_at?: string | null
          heart_rate?: number | null
          height_cm?: number | null
          id?: string | null
          logged_at?: string | null
          measured_at?: string | null
          measurement_position?: string | null
          medication_taken?: string | null
          notes?: string | null
          oxygen_device?: string | null
          pain_score?: number | null
          patient_id?: string | null
          recorded_by_name?: string | null
          respiratory_rate?: number | null
          spo2?: number | null
          staff_id_code?: string | null
          symptoms?: string[] | null
          symptoms_other?: string | null
          temp_method?: string | null
          temperature_c?: number | null
          weight_kg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "vitals_logs_caregiver_id_fkey"
            columns: ["caregiver_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vitals_logs_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      admin_create_user_profile: {
        Args: {
          p_condition?: string
          p_dob?: string
          p_email: string
          p_full_name: string
          p_phone?: string
          p_role: Database["public"]["Enums"]["user_role"]
          p_sex?: string
          p_user_id: string
        }
        Returns: undefined
      }
      current_user_role: {
        Args: never
        Returns: Database["public"]["Enums"]["user_role"]
      }
      has_patient_access: { Args: { p_patient_id: string }; Returns: boolean }
      is_admin: { Args: never; Returns: boolean }
      is_on_care_team: {
        Args: {
          p_patient_id: string
          p_role?: Database["public"]["Enums"]["care_team_role"]
        }
        Returns: boolean
      }
    }
    Enums: {
      care_team_role: "doctor" | "caregiver" | "family_member"
      notification_type:
        | "new_vitals_log"
        | "status_update"
        | "feedback_issued"
        | "critical_alert"
        | "message"
        | "urgent_update"
        | "medication_alert"
        | "appointment_reminder"
      patient_status: "stable" | "warning" | "critical" | "unassessed"
      user_role: "admin" | "doctor" | "caregiver" | "patient" | "family_member"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      care_team_role: ["doctor", "caregiver", "family_member"],
      notification_type: [
        "new_vitals_log",
        "status_update",
        "feedback_issued",
        "critical_alert",
        "message",
        "urgent_update",
        "medication_alert",
        "appointment_reminder",
      ],
      patient_status: ["stable", "warning", "critical", "unassessed"],
      user_role: ["admin", "doctor", "caregiver", "patient", "family_member"],
    },
  },
} as const
