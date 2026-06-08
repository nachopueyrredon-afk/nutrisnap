// API request/response shapes shared between backend and clients

import type { DiaryEntry, FoodItem, MealType, EntryMethod, CoachingTrigger } from './database.js'

// ── Diary ──────────────────────────────────────────────────────────────────

export interface MacroTotals {
  kcal: number
  protein_g: number
  carbs_g: number
  fat_g: number
}

export interface DayDiaryResponse {
  date: string
  entries: DiaryEntry[]
  totals: MacroTotals
  targets: MacroTotals
}

export interface CreateDiaryEntryBody {
  food_item_id: string
  logged_at?: string
  meal_type: MealType
  quantity: number
  unit: string
  entry_method?: EntryMethod
}

// ── Food ──────────────────────────────────────────────────────────────────

export interface FoodSearchResult {
  items: FoodItem[]
  total: number
}

export interface BarcodeSearchBody {
  barcode: string
}

// ── AI Scan ───────────────────────────────────────────────────────────────

export interface AiScanMatch {
  food_item: FoodItem
  confidence: number
}

export interface AiScanResponse {
  matches: AiScanMatch[]
  quota_remaining: number
}

export interface AiQuotaResponse {
  used: number
  limit: number
  remaining: number
  is_premium: boolean
}

// ── Weight ────────────────────────────────────────────────────────────────

export interface CreateWeightBody {
  weight_kg: number
  logged_at?: string
}

export interface TdeeAdjustment {
  current_kcal: number
  suggested_kcal: number
  reason: string
  weekly_actual_delta_g: number
  weekly_expected_delta_g: number
}

// ── Coaching ─────────────────────────────────────────────────────────────

export interface CoachingMessage {
  key: string
  text: string
}

export interface CoachingDailySummary {
  kcal_gap: number
  protein_gap_g: number
  carbs_gap_g: number
  fat_gap_g: number
  trigger: CoachingTrigger | 'on_track'
  message: CoachingMessage
}

export interface CoachingSuggestion {
  food_item: FoodItem
  quantity_g: number
  quantity_label: string
  kcal_added: number
}

// ── Professional ──────────────────────────────────────────────────────────

export interface PatientSummaryItem {
  patient_id: string
  name: string
  stage: string | null
  last_logged_at: string | null
  streak_days: number
  today_kcal: number
  today_kcal_target: number
  adherence_pct_30d: number
  status: 'on_track' | 'not_logged' | 'inactive'
}

export interface UpdatePatientGoalBody {
  kcal_target: number
  protein_g?: number
  carbs_g?: number
  fat_g?: number
}

export interface SendMessageBody {
  body: string
}

// ── Links ─────────────────────────────────────────────────────────────────

export interface ConnectLinkBody {
  invite_code: string
}

export interface VerifyLinkResponse {
  professional: {
    name: string
    specialty: string | null
    verified: true
  }
}

// ── Profile ───────────────────────────────────────────────────────────────

export interface UpsertProfileBody {
  weight_kg?: number
  height_cm?: number
  age?: number
  biological_sex?: 'male' | 'female'
  goal?: 'lose' | 'maintain' | 'gain'
  activity_level?: 'sedentary' | 'light' | 'moderate' | 'very_active'
  unit_system?: 'metric' | 'imperial'
}

// ── Errors ────────────────────────────────────────────────────────────────

export interface ApiError {
  error: string
  message?: string
  upgrade_url?: string
}
