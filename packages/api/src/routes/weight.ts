import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { requireAuth } from '../plugins/auth.js'

export const weightRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', requireAuth)

  // POST /v1/weight
  app.post('/', async (request, reply) => {
    const { weight_kg, logged_at } = z.object({
      weight_kg: z.number().positive().max(500),
      logged_at: z.string().datetime().optional(),
    }).parse(request.body)

    const { data, error } = await app.supabase
      .from('weight_logs')
      .insert({ user_id: request.userId, weight_kg, logged_at: logged_at ?? new Date().toISOString() })
      .select()
      .single()

    if (error) {
      return reply.status(500).send({ error: 'db_error' })
    }

    return reply.status(201).send(data)
  })

  // GET /v1/weight?limit=
  app.get('/', async (request) => {
    const { limit } = z.object({ limit: z.coerce.number().int().min(1).max(365).default(30) }).parse(request.query)

    const { data } = await app.supabase
      .from('weight_logs')
      .select('*')
      .eq('user_id', request.userId)
      .order('logged_at', { ascending: false })
      .limit(limit)

    return data ?? []
  })

  // GET /v1/weight/chart?period=
  app.get('/chart', async (request) => {
    const { period } = z.object({
      period: z.enum(['30d', '90d', '6m', 'all']).default('30d'),
    }).parse(request.query)

    const periodDays: Record<string, number> = { '30d': 30, '90d': 90, '6m': 180 }
    const days = periodDays[period]

    let query = app.supabase
      .from('weight_logs')
      .select('weight_kg, logged_at')
      .eq('user_id', request.userId)
      .order('logged_at', { ascending: true })

    if (days) {
      const from = new Date()
      from.setDate(from.getDate() - days)
      query = query.gte('logged_at', from.toISOString())
    }

    const { data } = await query
    return data ?? []
  })

  // GET /v1/tdee/adjustment — check if TDEE adjustment is suggested
  app.get('/tdee/adjustment', async (request, reply) => {
    const [profileResult, weightResult] = await Promise.all([
      app.supabase.from('user_profiles').select('*').eq('user_id', request.userId).single(),
      app.supabase
        .from('weight_logs')
        .select('weight_kg, logged_at')
        .eq('user_id', request.userId)
        .order('logged_at', { ascending: false })
        .limit(14),
    ])

    const profile = profileResult.data
    const weights = weightResult.data ?? []

    if (!profile?.tdee_target_kcal || weights.length < 7) {
      return reply.status(200).send({ adjustment_needed: false })
    }

    const recent = weights[0]?.weight_kg ?? 0
    const older = weights[weights.length - 1]?.weight_kg ?? 0
    const actual_delta_kg_per_week = (recent - older) / (weights.length / 7)

    const expected_delta_kg_per_week =
      profile.goal === 'lose' ? -0.38 : profile.goal === 'gain' ? 0.38 : 0

    const diff = Math.abs(actual_delta_kg_per_week - expected_delta_kg_per_week)

    if (diff < 0.2) {
      return { adjustment_needed: false }
    }

    const adjustment_kcal = actual_delta_kg_per_week < expected_delta_kg_per_week ? -100 : 100
    const suggested_kcal = profile.tdee_target_kcal + adjustment_kcal

    return {
      adjustment_needed: true,
      current_kcal: profile.tdee_target_kcal,
      suggested_kcal,
      reason:
        actual_delta_kg_per_week < expected_delta_kg_per_week
          ? 'Progreso más lento de lo esperado'
          : 'Progreso más rápido de lo esperado',
      weekly_actual_delta_g: Math.round(actual_delta_kg_per_week * 1000),
      weekly_expected_delta_g: Math.round(expected_delta_kg_per_week * 1000),
    }
  })

  // PATCH /v1/tdee/accept
  app.patch('/tdee/accept', async (request, reply) => {
    const { kcal_target } = z.object({ kcal_target: z.number().int().positive() }).parse(request.body)

    const { error } = await app.supabase
      .from('user_profiles')
      .update({ tdee_target_kcal: kcal_target, updated_at: new Date().toISOString() })
      .eq('user_id', request.userId)

    if (error) {
      return reply.status(500).send({ error: 'db_error' })
    }

    return { success: true, new_target: kcal_target }
  })
}
