import type { FoodItem } from '../types/database.js'

const UNIT_TO_GRAMS: Record<string, number | null> = {
  g: 1,
  kg: 1000,
  oz: 28.3495,
  lb: 453.592,
  cup: 240,
  tbsp: 15,
  tsp: 5,
  ml: 1,
  l: 1000,
  unit: null,
  unidad: null,
  portion: null,
  porcion: null,
  porción: null,
}

export function convertToGrams(quantity: number, unit: string, food: FoodItem): number {
  const normalized = unit.toLowerCase().trim()

  if (normalized === 'unit' || normalized === 'unidad' || normalized === 'portion' || normalized === 'porcion' || normalized === 'porción') {
    return quantity * food.serving_size_g
  }

  const factor = UNIT_TO_GRAMS[normalized]
  if (factor == null) {
    throw new Error(`Unidad no reconocida: ${unit}`)
  }

  return quantity * factor
}

export function computeMacros(quantity_g: number, food: FoodItem) {
  const factor = quantity_g / 100
  return {
    kcal: Math.round(food.kcal_per_100g * factor * 10) / 10,
    protein: Math.round(food.protein_per_100g * factor * 10) / 10,
    carbs: Math.round(food.carbs_per_100g * factor * 10) / 10,
    fat: Math.round(food.fat_per_100g * factor * 10) / 10,
  }
}
