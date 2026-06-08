import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { requireAuth } from '../plugins/auth.js'

export const messagesRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', requireAuth)

  // GET /v1/messages
  app.get('/', async (request) => {
    const { limit, offset } = z.object({
      limit: z.coerce.number().int().min(1).max(100).default(20),
      offset: z.coerce.number().int().min(0).default(0),
    }).parse(request.query)

    const { data } = await app.supabase
      .from('messages')
      .select('*, professionals(display_name)')
      .eq('patient_id', request.userId)
      .order('sent_at', { ascending: false })
      .range(offset, offset + limit - 1)

    return data ?? []
  })

  // PATCH /v1/messages/:id/read
  app.patch('/:id/read', async (request, reply) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(request.params)

    const { error } = await app.supabase
      .from('messages')
      .update({ read_at: new Date().toISOString() })
      .eq('id', id)
      .eq('patient_id', request.userId)

    if (error) {
      return reply.status(500).send({ error: 'db_error' })
    }

    return { success: true }
  })
}
