import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { requireAuth } from '../plugins/auth.js'

export const linksRoutes: FastifyPluginAsync = async (app) => {
  // GET /v1/links/verify?code= (unauthenticated)
  app.get('/verify', async (request, reply) => {
    const { code } = z.object({ code: z.string().min(1) }).parse(request.query)

    const { data, error } = await app.supabase
      .from('professionals')
      .select('display_name, specialty')
      .eq('invite_code', code)
      .single()

    if (error || !data) {
      return reply.status(404).send({ error: 'invalid_code' })
    }

    return {
      professional: {
        name: data.display_name,
        specialty: data.specialty,
        verified: true,
      },
    }
  })

  // Authenticated endpoints below
  app.addHook('preHandler', requireAuth)

  // POST /v1/links/connect
  app.post('/connect', async (request, reply) => {
    const { invite_code } = z.object({ invite_code: z.string().min(1) }).parse(request.body)

    const { data: pro } = await app.supabase
      .from('professionals')
      .select('id')
      .eq('invite_code', invite_code)
      .single()

    if (!pro) {
      return reply.status(404).send({ error: 'invalid_code' })
    }

    const { data: existing } = await app.supabase
      .from('patient_links')
      .select('id, status')
      .eq('professional_id', pro.id)
      .eq('patient_id', request.userId)
      .single()

    if (existing) {
      if (existing.status === 'active') {
        return reply.status(409).send({ error: 'already_linked' })
      }
      // Re-link if previously revoked
      const { data, error } = await app.supabase
        .from('patient_links')
        .update({ status: 'pending', consent_revoked_at: null })
        .eq('id', existing.id)
        .select()
        .single()

      if (error) return reply.status(500).send({ error: 'db_error' })
      return data
    }

    const { data, error } = await app.supabase
      .from('patient_links')
      .insert({ professional_id: pro.id, patient_id: request.userId, status: 'pending' })
      .select()
      .single()

    if (error) {
      return reply.status(500).send({ error: 'db_error' })
    }

    return reply.status(201).send(data)
  })

  // POST /v1/links/confirm/:link_id — patient explicitly accepts
  app.post('/confirm/:link_id', async (request, reply) => {
    const { link_id } = z.object({ link_id: z.string().uuid() }).parse(request.params)

    const { data, error } = await app.supabase
      .from('patient_links')
      .update({ status: 'active', consent_given_at: new Date().toISOString() })
      .eq('id', link_id)
      .eq('patient_id', request.userId) // patient can only confirm their own links
      .eq('status', 'pending')
      .select()
      .single()

    if (error || !data) {
      return reply.status(404).send({ error: 'link_not_found_or_not_pending' })
    }

    return data
  })

  // DELETE /v1/links/:link_id — patient revokes access
  app.delete('/:link_id', async (request, reply) => {
    const { link_id } = z.object({ link_id: z.string().uuid() }).parse(request.params)

    const { error } = await app.supabase
      .from('patient_links')
      .update({ status: 'revoked', consent_revoked_at: new Date().toISOString() })
      .eq('id', link_id)
      .eq('patient_id', request.userId)

    if (error) {
      return reply.status(500).send({ error: 'db_error' })
    }

    return reply.status(204).send()
  })
}
