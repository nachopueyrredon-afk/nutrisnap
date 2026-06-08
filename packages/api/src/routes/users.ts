import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { requireAuth } from '../plugins/auth.js'
import { calculateTDEE, calculateMacros } from '@nutrisnap/shared'

const upsertProfileSchema = z.object({
  weight_kg: z.number().positive().optional(),
  height_cm: z.number().positive().optional(),
  age: z.number().int().min(10).max(120).optional(),
  biological_sex: z.enum(['male', 'female']).optional(),
  goal: z.enum(['lose', 'maintain', 'gain']).optional(),
  activity_level: z.enum(['sedentary', 'light', 'moderate', 'very_active']).optional(),
  unit_system: z.enum(['metric', 'imperial']).optional(),
})

export const usersRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', requireAuth)

  // POST /v1/users/profile — create or update profile + calculate TDEE
  app.post('/profile', async (request, reply) => {
    const body = upsertProfileSchema.parse(request.body)

    const { data: existing } = await app.supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', request.userId)
      .single()

    const merged = { ...existing, ...body }

    let tdee_target_kcal: number | undefined
    let protein_target_g: number | undefined
    let carbs_target_g: number | undefined
    let fat_target_g: number | undefined

    if (merged.weight_kg && merged.height_cm && merged.age && merged.biological_sex && merged.activity_level && merged.goal) {
      tdee_target_kcal = calculateTDEE({
        weight_kg: merged.weight_kg,
        height_cm: merged.height_cm,
        age: merged.age,
        biological_sex: merged.biological_sex,
        activity_level: merged.activity_level,
        goal: merged.goal,
      })
      const macros = calculateMacros(tdee_target_kcal)
      protein_target_g = macros.protein_g
      carbs_target_g = macros.carbs_g
      fat_target_g = macros.fat_g
    }

    const { data, error } = await app.supabase
      .from('user_profiles')
      .upsert({
        user_id: request.userId,
        ...body,
        ...(tdee_target_kcal && { tdee_target_kcal, protein_target_g, carbs_target_g, fat_target_g }),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) {
      return reply.status(500).send({ error: 'db_error', message: error.message })
    }

    return reply.status(201).send(data)
  })

  // GET /v1/users/profile
  app.get('/profile', async (request, reply) => {
    const { data, error } = await app.supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', request.userId)
      .single()

    if (error || !data) {
      return reply.status(404).send({ error: 'profile_not_found' })
    }

    return data
  })

  // PATCH /v1/users/profile
  app.patch('/profile', async (request, reply) => {
    const body = upsertProfileSchema.parse(request.body)

    const { data, error } = await app.supabase
      .from('user_profiles')
      .update({ ...body, updated_at: new Date().toISOString() })
      .eq('user_id', request.userId)
      .select()
      .single()

    if (error) {
      return reply.status(500).send({ error: 'db_error', message: error.message })
    }

    return data
  })

  // PATCH /v1/users/stage
  app.patch('/stage', async (request, reply) => {
    const { stage } = z.object({ stage: z.enum(['active_process', 'maintenance']) }).parse(request.body)

    const { error } = await app.supabase
      .from('users')
      .update({ stage, updated_at: new Date().toISOString() })
      .eq('id', request.userId)

    if (error) {
      return reply.status(500).send({ error: 'db_error' })
    }

    return { success: true }
  })

  // PATCH /v1/users/nutritionist-contact
  app.patch('/nutritionist-contact', async (request, reply) => {
    const { nutritionist_contact } = z.object({ nutritionist_contact: z.string() }).parse(request.body)

    const { error } = await app.supabase
      .from('users')
      .update({ nutritionist_contact, updated_at: new Date().toISOString() })
      .eq('id', request.userId)

    if (error) {
      return reply.status(500).send({ error: 'db_error' })
    }

    return { success: true }
  })
}
