import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { requireAuth } from '../plugins/auth.js'

function generateInviteCode(name: string): string {
  const slug = name.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 8)
  const year = new Date().getFullYear()
  const rand = Math.floor(Math.random() * 900 + 100)
  return `NUT-${slug}-${year}-${rand}`
}

export const professionalsRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', requireAuth)

  // POST /v1/professionals/register
  app.post('/register', async (request, reply) => {
    const { display_name, specialty } = z.object({
      display_name: z.string().min(2),
      specialty: z.string().optional(),
    }).parse(request.body)

    // Check subscription tier
    const { data: sub } = await app.supabase
      .from('subscriptions')
      .select('tier')
      .eq('user_id', request.userId)
      .single()

    if (sub?.tier !== 'professional') {
      return reply.status(403).send({ error: 'requires_professional_tier' })
    }

    // Check if already registered
    const { data: existing } = await app.supabase
      .from('professionals')
      .select('id')
      .eq('user_id', request.userId)
      .single()

    if (existing) {
      return reply.status(409).send({ error: 'already_registered' })
    }

    const invite_code = generateInviteCode(display_name)

    const { data, error } = await app.supabase
      .from('professionals')
      .insert({ user_id: request.userId, display_name, specialty: specialty ?? null, invite_code })
      .select()
      .single()

    if (error) {
      return reply.status(500).send({ error: 'db_error' })
    }

    return reply.status(201).send(data)
  })

  // GET /v1/professionals/me
  app.get('/me', async (request, reply) => {
    const { data, error } = await app.supabase
      .from('professionals')
      .select('*')
      .eq('user_id', request.userId)
      .single()

    if (error || !data) {
      return reply.status(404).send({ error: 'not_registered' })
    }

    return data
  })

  // GET /v1/professionals/patients
  app.get('/patients', async (request, reply) => {
    const { data: pro } = await app.supabase
      .from('professionals')
      .select('id')
      .eq('user_id', request.userId)
      .single()

    if (!pro) {
      return reply.status(403).send({ error: 'not_a_professional' })
    }

    const { data: links } = await app.supabase
      .from('patient_links')
      .select('patient_id, status')
      .eq('professional_id', pro.id)
      .eq('status', 'active')

    if (!links?.length) return []

    const patientIds = links.map((l) => l.patient_id)

    const [usersResult, profilesResult] = await Promise.all([
      app.supabase.from('users').select('id, email').in('id', patientIds),
      app.supabase.from('user_profiles').select('user_id, tdee_target_kcal, stage, goal').in('user_id', patientIds),
    ])

    const profileMap = Object.fromEntries(
      (profilesResult.data ?? []).map((p) => [p.user_id, p]),
    )

    const today = new Date().toISOString().slice(0, 10)

    const patients = await Promise.all(
      (usersResult.data ?? []).map(async (user) => {
        const profile = profileMap[user.id]

        const { data: todayEntries } = await app.supabase
          .from('diary_entries')
          .select('kcal_computed')
          .eq('user_id', user.id)
          .gte('logged_at', `${today}T00:00:00.000Z`)
          .lte('logged_at', `${today}T23:59:59.999Z`)

        const today_kcal = (todayEntries ?? []).reduce((s, e) => s + (e.kcal_computed ?? 0), 0)

        const { data: lastEntry } = await app.supabase
          .from('diary_entries')
          .select('logged_at')
          .eq('user_id', user.id)
          .order('logged_at', { ascending: false })
          .limit(1)
          .single()

        const last_logged_at = lastEntry?.logged_at ?? null
        const daysSince = last_logged_at
          ? Math.floor((Date.now() - new Date(last_logged_at).getTime()) / 86400000)
          : 999

        const status =
          daysSince === 0 ? 'on_track' : daysSince < 3 ? 'not_logged' : 'inactive'

        return {
          patient_id: user.id,
          name: user.email,
          stage: profile?.goal ?? null,
          last_logged_at,
          streak_days: 0, // TODO: implement streak calculation
          today_kcal: Math.round(today_kcal),
          today_kcal_target: profile?.tdee_target_kcal ?? 0,
          adherence_pct_30d: 0, // TODO: implement 30-day adherence
          status,
        }
      }),
    )

    return patients
  })

  // GET /v1/professionals/patients/:patient_id/summary
  app.get('/patients/:patient_id/summary', async (request, reply) => {
    const { patient_id } = z.object({ patient_id: z.string().uuid() }).parse(request.params)

    const { data: pro } = await app.supabase
      .from('professionals')
      .select('id')
      .eq('user_id', request.userId)
      .single()

    if (!pro) {
      return reply.status(403).send({ error: 'not_a_professional' })
    }

    const { data: link } = await app.supabase
      .from('patient_links')
      .select('id')
      .eq('professional_id', pro.id)
      .eq('patient_id', patient_id)
      .eq('status', 'active')
      .single()

    if (!link) {
      return reply.status(403).send({ error: 'not_linked' })
    }

    const today = new Date().toISOString().slice(0, 10)

    const [profileResult, weightResult, todayDiaryResult, messagesResult] = await Promise.all([
      app.supabase.from('user_profiles').select('*').eq('user_id', patient_id).single(),
      app.supabase.from('weight_logs').select('*').eq('user_id', patient_id).order('logged_at', { ascending: false }).limit(90),
      app.supabase.from('diary_entries').select('*').eq('user_id', patient_id).gte('logged_at', `${today}T00:00:00.000Z`).lte('logged_at', `${today}T23:59:59.999Z`),
      app.supabase.from('messages').select('id').eq('professional_id', pro.id).eq('patient_id', patient_id).is('read_at', null),
    ])

    return {
      profile: profileResult.data,
      current_weight: weightResult.data?.[0]?.weight_kg ?? null,
      weight_history: weightResult.data ?? [],
      today_diary: todayDiaryResult.data ?? [],
      messages_unread: messagesResult.data?.length ?? 0,
    }
  })

  // PATCH /v1/professionals/patients/:patient_id/goal
  app.patch('/patients/:patient_id/goal', async (request, reply) => {
    const { patient_id } = z.object({ patient_id: z.string().uuid() }).parse(request.params)
    const body = z.object({
      kcal_target: z.number().int().positive(),
      protein_g: z.number().int().positive().optional(),
      carbs_g: z.number().int().positive().optional(),
      fat_g: z.number().int().positive().optional(),
    }).parse(request.body)

    const { data: pro } = await app.supabase
      .from('professionals')
      .select('id')
      .eq('user_id', request.userId)
      .single()

    if (!pro) {
      return reply.status(403).send({ error: 'not_a_professional' })
    }

    const { data: link } = await app.supabase
      .from('patient_links')
      .select('id')
      .eq('professional_id', pro.id)
      .eq('patient_id', patient_id)
      .eq('status', 'active')
      .single()

    if (!link) {
      return reply.status(403).send({ error: 'not_linked' })
    }

    const { error } = await app.supabase
      .from('user_profiles')
      .update({
        tdee_target_kcal: body.kcal_target,
        ...(body.protein_g && { protein_target_g: body.protein_g }),
        ...(body.carbs_g && { carbs_target_g: body.carbs_g }),
        ...(body.fat_g && { fat_target_g: body.fat_g }),
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', patient_id)

    if (error) {
      return reply.status(500).send({ error: 'db_error' })
    }

    return { success: true }
  })

  // POST /v1/professionals/patients/:patient_id/messages
  app.post('/patients/:patient_id/messages', async (request, reply) => {
    const { patient_id } = z.object({ patient_id: z.string().uuid() }).parse(request.params)
    const { body: msgBody } = z.object({ body: z.string().min(1).max(2000) }).parse(request.body)

    const { data: pro } = await app.supabase
      .from('professionals')
      .select('id')
      .eq('user_id', request.userId)
      .single()

    if (!pro) {
      return reply.status(403).send({ error: 'not_a_professional' })
    }

    const { data: link } = await app.supabase
      .from('patient_links')
      .select('id')
      .eq('professional_id', pro.id)
      .eq('patient_id', patient_id)
      .eq('status', 'active')
      .single()

    if (!link) {
      return reply.status(403).send({ error: 'not_linked' })
    }

    const { data, error } = await app.supabase
      .from('messages')
      .insert({ professional_id: pro.id, patient_id, body: msgBody })
      .select()
      .single()

    if (error) {
      return reply.status(500).send({ error: 'db_error' })
    }

    return reply.status(201).send(data)
  })
}
