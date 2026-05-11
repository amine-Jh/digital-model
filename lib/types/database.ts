/**
 * Database type definitions.
 *
 * These types match the schema in supabase/schema.sql (and
 * supabase/migrations/0001_baseline.sql). Once the project
 * is connected to Supabase you should regenerate them with:
 *
 *   npx supabase gen types typescript \
 *     --project-id <your-project-ref> > lib/types/database.ts
 *
 * Insert/Update shapes are written explicitly (no `Partial<Database[...]>`)
 * so TypeScript does not resolve them to `never` while `Database` is still
 * being defined.
 */

export type UserRole = 'admin' | 'super_admin' | 'teacher' | 'student'
export type SessionStatus = 'in-progress' | 'completed' | 'abandoned'

export type GradeLevel =
  | '3ème année collège'
  | 'Tronc commun scientifique'
  | '1ère année Baccalauréat – Sciences expérimentales'
  | '1ère année Baccalauréat – Sciences mathématiques'

export type Json = string | number | boolean | null | { [k: string]: Json } | Json[]

type StudentProfilesInsert = {
  user_id: string
  full_name?: string | null
  age?: number | null
  gender?: 'Male' | 'Female' | '' | null
  teacher_id?: string | null
  teacher_name?: string | null
  school_name?: string | null
  grade_level?: GradeLevel | null
  academic_track?: string | null
  academic_year?: string | null
  math_average_2024_2025?: number | null
  math_average_2025_2026?: number | null
  updated_at?: string
}

type TestsInsert = {
  id: string
  name: string
  domain: string
  description?: string | null
  metadata?: Json
  is_active?: boolean
}

type QuestionsInsert = {
  test_id: string
  external_id: string
  prompt?: string | null
  options: Json
  correct_answer?: Json | null
  competencies?: string[]
  position?: number | null
  metadata?: Json
  id?: string
}

type TestSessionsInsert = {
  id?: string
  user_id: string
  test_id: string
  status?: SessionStatus
  started_at?: string
  completed_at?: string | null
  total_ms?: number | null
  score?: number | null
  correct_count?: number | null
  total_questions?: number | null
  metadata?: Json
}

type TrialResultsInsert = {
  session_id: string
  question_index: number
  question_id: string
  selected: Json
  free_text?: string | null
  correct: boolean
  score: number
  reaction_time_ms?: number | null
  id?: number
  created_at?: string
}

type MetricsRow = {
  user_id: string
  test_id: string
  period: string
  attempts: number
  best_score: number | null
  avg_score: number | null
  last_attempt: string | null
  updated_at: string
}

export interface Database {
  public: {
    Tables: {
      schools: {
        Row: {
          id: string
          name: string
          city: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          city?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          name?: string
          city?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }

      profiles: {
        Row: {
          id: string
          email: string
          full_name: string | null
          role: UserRole
          school_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          role?: UserRole
          school_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          email?: string
          full_name?: string | null
          role?: UserRole
          school_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }

      student_profiles: {
        Row: {
          user_id: string
          full_name: string | null
          age: number | null
          gender: 'Male' | 'Female' | '' | null
          teacher_id: string | null
          teacher_name: string | null
          school_name: string | null
          grade_level: GradeLevel | null
          academic_track: string | null
          academic_year: string | null
          math_average_2024_2025: number | null
          math_average_2025_2026: number | null
          updated_at: string
        }
        Insert: StudentProfilesInsert
        Update: Partial<StudentProfilesInsert>
        Relationships: []
      }

      students: {
        Row: {
          id: number
          created_at: string
        }
        Insert: {
          id?: never
          created_at?: string
        }
        Update: {
          created_at?: string
        }
        Relationships: []
      }

      tests: {
        Row: {
          id: string
          name: string
          domain: string
          description: string | null
          metadata: Json
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: TestsInsert
        Update: Partial<TestsInsert>
        Relationships: []
      }

      questions: {
        Row: {
          id: string
          test_id: string
          external_id: string
          prompt: string | null
          options: Json
          correct_answer: Json | null
          competencies: string[]
          position: number | null
          metadata: Json
        }
        Insert: QuestionsInsert
        Update: Partial<QuestionsInsert>
        Relationships: []
      }

      test_sessions: {
        Row: {
          id: string
          user_id: string
          test_id: string
          status: SessionStatus
          started_at: string
          completed_at: string | null
          total_ms: number | null
          score: number | null
          correct_count: number | null
          total_questions: number | null
          metadata: Json
          created_at: string
          updated_at: string
        }
        Insert: TestSessionsInsert
        Update: Partial<TestSessionsInsert>
        Relationships: []
      }

      trial_results: {
        Row: {
          id: number
          session_id: string
          question_index: number
          question_id: string
          selected: Json
          free_text: string | null
          correct: boolean
          score: number
          reaction_time_ms: number | null
          created_at: string
        }
        Insert: TrialResultsInsert
        Update: Partial<TrialResultsInsert>
        Relationships: []
      }

      metrics: {
        Row: MetricsRow
        Insert: MetricsRow
        Update: Partial<MetricsRow>
        Relationships: []
      }

      geometry_session_part_scores: {
        Row: {
          id: string
          session_id: string
          part_number: number
          part_label: string | null
          earned: number
          max_points: number
          percent: number | null
          score_out_of_20: number | null
          correct_count: number
          total_scorable: number
          created_at: string
        }
        Insert: {
          id?: string
          session_id: string
          part_number: number
          part_label?: string | null
          earned?: number
          max_points?: number
          percent?: number | null
          score_out_of_20?: number | null
          correct_count?: number
          total_scorable?: number
          created_at?: string
        }
        Update: Partial<{
          part_label: string | null
          earned: number
          max_points: number
          percent: number | null
          score_out_of_20: number | null
          correct_count: number
          total_scorable: number
        }>
        Relationships: []
      }

      geometry_session_capacity_scores: {
        Row: {
          id: string
          session_id: string
          ck_code: string
          ck_name: string | null
          earned: number
          max_points: number
          percent: number | null
          score_out_of_20: number | null
          created_at: string
        }
        Insert: {
          id?: string
          session_id: string
          ck_code: string
          ck_name?: string | null
          earned?: number
          max_points?: number
          percent?: number | null
          score_out_of_20?: number | null
          created_at?: string
        }
        Update: Partial<{
          ck_name: string | null
          earned: number
          max_points: number
          percent: number | null
          score_out_of_20: number | null
        }>
        Relationships: []
      }
    }
    Views: {
      my_students: {
        Row: {
          user_id: string
          full_name: string | null
          email: string
          grade_level: GradeLevel | null
          math_average_2024_2025: number | null
          math_average_2025_2026: number | null
          teacher_id: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      role_of: { Args: { uid: string }; Returns: UserRole }
      is_admin: { Args: Record<string, never>; Returns: boolean }
      is_teacher: { Args: Record<string, never>; Returns: boolean }
      is_super_admin: { Args: Record<string, never>; Returns: boolean }
      is_my_student: { Args: { student: string }; Returns: boolean }
    }
    Enums: {
      user_role: UserRole
      session_status: SessionStatus
      grade_level: GradeLevel
    }
  }
}
