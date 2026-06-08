import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { requireAuth } from '../plugins/auth.js'
import { convertToGrams, computeMacros } from '@nutrisnap/shared'
import type { FoodItem } from '@nutrisnap/shared'

const createEntrySchema = z.object({
  food_item_id: z.string().uuid(),
  logged_at: z.string().datetime().optional(),
  meal_type: z.enum(['breakfast', 'lunch', 'dinner', 'snack']),
  quantity: z.number().positive(),
  unit: z.string().min(1),
  entry_method: z.enum(['ai_photo', 'barcode', 'manual_search', 'manual_input']).optional(),
})

export const diaryRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', requireAuth)

  // POST /v1/diary/entries
  app.post('/entries', async (request, reply) => {
    const body = createEntrySchema.parse(request.body)

    const { data: food, error: foodError } = await app.supabase
      .from('food_items')
      .select('*')
      .eq('id', body.food_item_id)
      .single()

    if (foodError || !food) {
      return reply.status(404).send({ error: 'food_not_found' })
    }

    let quantity_in_g: number
    try {
      quantity_in_g = convertToGrams(body.quantity, body.unit, food as FoodItem)
    } catch {
      return reply.status(422).send({ error: 'invalid_unit', message: `Unidad no reconocida: ${body.unit}` })
    }

    const macros = computeMacros(quantity_in_g, food as FoodItem)

    const { data, error } = await app.supabase
      .from('diary_entries')
      .insert({
        user_id: request.userId,
        food_item_id: body.food_item_id,
        logged_at: body.logged_at ?? new Date().toISOString(),
        meal_type: body.meal_type,
        quantity: body.quantity,
        unit: body.unit,
        quantity_in_g,
        kcal_computed: macros.kcal,
        protein_computed: macros.protein,
        carbs_computed: macros.carbs,
        fat_computed: macros.fat,
        entry_method: body.entry_method ?? null,
      })
      .select()
      .single()

    if (error) {
      return reply.status(500).send({ error: 'db_error' })
    }

    return reply.status(201).send(data)
  })

  // GET /v1/diary/day?date=YYYY-MM-DD
  app.get('/day', async (request, reply) => {
    const { date } = z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) }).parse(request.query)

    const start = `${date}T00:00:00.000Z`
    const end = `${date}T23:59:59.999Z`

    const [entriesResult, profileResult] = await Promise.all([
      app.supabase
        .from('diary_entries')
        .select('*, food_items(*)')
        .eq('user_id', request.userId)
        .gte('logged_at', start)
        .lte('logged_at', end)
        .order('logged_at', { ascending: true }),
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
        protein_g: acc.protein_g + (e.protein_computed ?? 0),
        carbs_g: acc.carbs_g + (e.carbs_computed ?? 0),
        fat_g: acc.fat_g + (e.fat_computed ?? 0),
      }),
      { kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0 },
    )

    return {
      date,
      entries,
      totals: {
        kcal: Math.round(totals.kcal * 10) / 10,
        protein_g: Math.round(totals.protein_g * 10) / 10,
        carbs_g: Math.round(totals.carbs_g * 10) / 10,
        fat_g: Math.round(totals.fat_g * 10) / 10,
      },
      targets: {
        kcal: profile?.tdee_target_kcal ?? 0,
        protein_g: profile?.protein_target_g ?? 0,
        carbs_g: profile?.carbs_target_g ?? 0,
        fat_g: profile?.fat_target_g ?? 0,
      },
    }
  })

  // GET /v1/diary/history?from=&to=
  app.get('/history', async (request) => {
    const { from, to } = z.object({
      from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    }).parse(request.query)

    const { data } = await app.supabase
      .from('diary_entries')
      .select('*, food_items(*)')
      .eq('user_id', request.userId)
      .gte('logged_at', `${from}T00:00:00.000Z`)
      .lte('logged_at', `${to}T23:59:59.999Z`)
      .order('logged_at', { ascending: false })

    return data ?? []
  })

  // PATCH /v1/diary/entries/:id
  app.patch('/entries/:id', async (request, reply) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(request.params)
    const body = createEntrySchema.partial().parse(request.body)

    const { data: existing, error: existingError } = await app.supabase
      .from('diary_entries')
      .select('*, food_items(*)')
      .eq('id', id)
      .eq('user_id', request.userId)
      .single()

    if (existingError || !existing) {
      return reply.status(404).send({ error: 'not_found' })
    }

    const food = body.food_item_id
      ? (await app.supabase.from('food_items').select('*').eq('id', body.food_item_id).single()).data
      : existing.food_items

    if (!food) {
      return reply.status(404).send({ error: 'food_not_found' })
    }

    const quantity = body.quantity ?? existing.quantity
    const unit = body.unit ?? existing.unit

    let quantity_in_g: number
    try {
      quantity_in_g = convertToGrams(quantity, unit, food as FoodItem)
    } catch {
      return reply.status(422).send({ error: 'invalid_unit' })
    }

    const macros = computeMacros(quantity_in_g, food as FoodItem)

    const { data, error } = await app.supabase
      .from('diary_entries')
      .update({
        ...body,
        quantity_in_g,
        kcal_computed: macros.kcal,
        protein_computed: macros.protein,
        carbs_computed: macros.carbs,
        fat_computed: macros.fat,
      })
      .eq('id', id)
      .eq('user_id', request.userId)
      .select()
      .single()

    if (error) {
      return reply.status(500).send({ error: 'db_error' })
    }

    return data
  })

  // DELETE /v1/diary/entries/:id
  app.delete('/entries/:id', async (request, reply) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(request.params)

    const { error } = await app.supabase
      .from('diary_entries')
      .delete()
      .eq('id', id)
      .eq('user_id', request.userId)

    if (error) {
      return reply.status(500).send({ error: 'db_error' })
    }

    return reply.status(204).send()
  })
}
