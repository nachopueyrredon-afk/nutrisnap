import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { requireAuth } from '../plugins/auth.js'
import coachingMessages from '../data/coaching-messages.json' with { type: 'json' }

type MessageLibrary = Record<string, Array<{ key: string; text: string }>>

function pickMessage(trigger: string, vars: Record<string, string | number>): { key: string; text: string } {
  const library = coachingMessages as MessageLibrary
  const pool = library[trigger] ?? library['on_track'] ?? []
  const template = pool[Math.floor(Math.random() * pool.length)] ?? { key: 'default', text: 'Seguí así.' }

  const text = Object.entries(vars).reduce(
    (t, [k, v]) => t.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v)),
    template.text,
  )

  return { key: template.key, text }
}

export const coachingRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', requireAuth)

  // GET /v1/coaching/daily-summary
  app.get('/daily-summary', async (request) => {
    const today = new Date().toISOString().slice(0, 10)

    const [entriesResult, profileResult] = await Promise.all([
      app.supabase
        .from('diary_entries')
        .select('kcal_computed, protein_computed, carbs_computed, fat_computed')
        .eq('user_id', request.userId)
        .gte('logged_at', `${today}T00:00:00.000Z`)
        .lte('logged_at', `${today}T23:59:59.999Z`),
      app.supabase
        .from('user_profiles')
        .select('tdee_target_kcal, protein_target_g, carbs_target_g, fat_target_g')
        .eq('user_id', request.userId)
        .single(),
    ])

    const entries = entriesResult.data ?? []
    const profile = profileResult.data

    const totals = entries.reduce(
      (acc, e) => ({
        kcal: acc.kcal + (e.kcal_computed ?? 0),
        protein: acc.protein + (e.protein_computed ?? 0),
        carbs: acc.carbs + (e.carbs_computed ?? 0),
        fat: acc.fat + (e.fat_computed ?? 0),
      }),
      { kcal: 0, protein: 0, carbs: 0, fat: 0 },
    )

    const kcal_gap = Math.round((profile?.tdee_target_kcal ?? 0) - totals.kcal)
    const protein_gap_g = Math.round((profile?.protein_target_g ?? 0) - totals.protein)
    const carbs_gap_g = Math.round((profile?.carbs_target_g ?? 0) - totals.carbs)
    const fat_gap_g = Math.round((profile?.fat_target_g ?? 0) - totals.fat)

    let trigger = 'on_track'
    if (kcal_gap < -200) trigger = 'calorie_excess'
    else if (protein_gap_g > 20) trigger = 'protein_deficit'
    else if (carbs_gap_g > 30) trigger = 'carbs_deficit'
    else if (fat_gap_g > 10) trigger = 'fat_deficit'

    const message = pickMessage(trigger, {
      gap: Math.abs(protein_gap_g),
      kcal_gap: Math.abs(kcal_gap),
    })

    return { kcal_gap, protein_gap_g, carbs_gap_g, fat_gap_g, trigger, message }
  })

  // GET /v1/coaching/suggestions?macro=&gap_g=
  app.get('/suggestions', async (request) => {
    const { macro, gap_g } = z.object({
      macro: z.enum(['protein', 'carbs', 'fat']),
      gap_g: z.coerce.number().positive(),
    }).parse(request.query)

    const columnMap: Record<string, string> = {
      protein: 'protein_per_100g',
      carbs: 'carbs_per_100g',
      fat: 'fat_per_100g',
    }

    const col = columnMap[macro]!

    const { data: foods } = await app.supabase
      .from('food_items')
      .select('*')
      .order(col, { ascending: false })
      .limit(20)

    const suggestions = (foods ?? []).slice(0, 4).map((food) => {
      const densityPer100 = (food as Record<string, number>)[col] ?? 0
      const quantity_g = densityPer100 > 0 ? Math.round((gap_g / densityPer100) * 100) : 100
      const kcal_added = Math.round((food.kcal_per_100g * quantity_g) / 100)
      const quantity_label = quantity_g >= 1000
        ? `${(quantity_g / 1000).toFixed(1)}kg`
        : `${quantity_g}g`

      return { food_item: food, quantity_g, quantity_label, kcal_added }
    })

    return suggestions
  })
}
