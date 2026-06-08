import type { ActivityLevel, Goal, BiologicalSex } from '../types/database.js'

interface TdeeInput {
  weight_kg: number
  height_cm: number
  age: number
  biological_sex: BiologicalSex
  activity_level: ActivityLevel
  goal: Goal
}

const ACTIVITY_FACTORS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  very_active: 1.725,
}

const GOAL_ADJUSTMENTS: Record<Goal, number> = {
  lose: -380,
  maintain: 0,
  gain: 380,
}

export function calculateTDEE(profile: TdeeInput): number {
  const { weight_kg, height_cm, age, biological_sex, activity_level, goal } = profile

  const bmr =
    biological_sex === 'male'
      ? 10 * weight_kg + 6.25 * height_cm - 5 * age + 5
      : 10 * weight_kg + 6.25 * height_cm - 5 * age - 161

  const tdee = bmr * ACTIVITY_FACTORS[activity_level]
  return Math.round(tdee + GOAL_ADJUSTMENTS[goal])
}

export function calculateMacros(kcal: number) {
  return {
    protein_g: Math.round((kcal * 0.3) / 4),
    carbs_g: Math.round((kcal * 0.4) / 4),
    fat_g: Math.round((kcal * 0.3) / 9),
  }
}
