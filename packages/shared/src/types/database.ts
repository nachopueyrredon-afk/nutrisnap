// Database entity types — mirror the PostgreSQL schema exactly

export type UserRole = 'patient' | 'professional'
export type UserStage = 'active_process' | 'maintenance'
export type BiologicalSex = 'male' | 'female'
export type Goal = 'lose' | 'maintain' | 'gain'
export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'very_active'
export type UnitSystem = 'metric' | 'imperial'
export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack'
export type EntryMethod = 'ai_photo' | 'barcode' | 'manual_search' | 'manual_input'
export type FoodSource = 'usda' | 'open_food_facts'
export type PatientLinkStatus = 'pending' | 'active' | 'revoked'
export type SubscriptionTier = 'free' | 'premium' | 'professional'
export type CoachingTrigger =
  | 'calorie_excess'
  | 'calorie_deficit'
  | 'protein_deficit'
  | 'carbs_deficit'
  | 'fat_deficit'
  | 'streak_broken'
  | 'goal_reached'
  | 'weekly_check'

export interface User {
  id: string
  email: string
  role: UserRole
  stage: UserStage | null
  nutritionist_contact: string | null
  created_at: string
  updated_at: string
}

export interface UserProfile {
  id: string
  user_id: string
  weight_kg: number | null
  height_cm: number | null
  age: number | null
  biological_sex: BiologicalSex | null
  goal: Goal | null
  activity_level: ActivityLevel | null
  tdee_target_kcal: number | null
  protein_target_g: number | null
  carbs_target_g: number | null
  fat_target_g: number | null
  unit_system: UnitSystem
  updated_at: string
}

export interface FoodItem {
  id: string
  name: string
  source: FoodSource
  barcode: string | null
  serving_size_g: number
  serving_label: string | null
  kcal_per_100g: number
  protein_per_100g: number
  carbs_per_100g: number
  fat_per_100g: number
  external_id: string | null
  created_at: string
}

export interface DiaryEntry {
  id: string
  user_id: string
  food_item_id: string
  logged_at: string
  meal_type: MealType
  quantity: number
  unit: string
  quantity_in_g: number
  kcal_computed: number
  protein_computed: number
  carbs_computed: number
  fat_computed: number
  entry_method: EntryMethod | null
  created_at: string
}

export interface WeightLog {
  id: string
  user_id: string
  weight_kg: number
  logged_at: string
  created_at: string
}

export interface AiScanLog {
  id: string
  user_id: string
  scanned_at: string
  food_item_id: string | null
  confidence: number | null
  used_free_quota: boolean
}

export interface Professional {
  id: string
  user_id: string
  display_name: string
  specialty: string | null
  invite_code: string
  created_at: string
}

export interface PatientLink {
  id: string
  professional_id: string
  patient_id: string
  status: PatientLinkStatus
  consent_given_at: string | null
  consent_revoked_at: string | null
  created_at: string
}

export interface Message {
  id: string
  professional_id: string
  patient_id: string
  body: string
  sent_at: string
  read_at: string | null
}

export interface CoachingLog {
  id: string
  user_id: string
  trigger_type: CoachingTrigger
  message_key: string
  shown_at: string
}

export interface Subscription {
  id: string
  user_id: string
  tier: SubscriptionTier
  revenuecat_customer_id: string | null
  expires_at: string | null
  updated_at: string
}
