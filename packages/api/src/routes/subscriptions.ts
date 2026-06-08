import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { requireAuth } from '../plugins/auth.js'
import crypto from 'node:crypto'

export const subscriptionsRoutes: FastifyPluginAsync = async (app) => {
  // GET /v1/subscription/status (authenticated)
  app.get('/status', { preHandler: requireAuth }, async (request) => {
    const { data } = await app.supabase
      .from('subscriptions')
      .select('tier, expires_at')
      .eq('user_id', request.userId)
      .single()

    return {
      tier: data?.tier ?? 'free',
      expires_at: data?.expires_at ?? null,
    }
  })

  // POST /v1/subscription/webhook (RevenueCat — unauthenticated, verify signature)
  app.post('/webhook', async (request, reply) => {
    const signature = request.headers['x-revenuecat-webhook-auth-header']
    const secret = process.env['REVENUECAT_WEBHOOK_SECRET']

    if (!secret || !signature) {
      return reply.status(401).send({ error: 'missing_signature' })
    }

    const expected = crypto
      .createHmac('sha256', secret)
      .update(JSON.stringify(request.body))
      .digest('hex')

    if (signature !== expected) {
      return reply.status(401).send({ error: 'invalid_signature' })
    }

    const body = request.body as {
      event?: {
        type?: string
        app_user_id?: string
        product_id?: string
        expiration_at_ms?: number
      }
    }

    const event = body?.event
    if (!event?.app_user_id) {
      return reply.status(200).send({ received: true })
    }

    const tierMap: Record<string, string> = {
      INITIAL_PURCHASE: 'premium',
      RENEWAL: 'premium',
      CANCELLATION: 'free',
      EXPIRATION: 'free',
      PRODUCT_CHANGE: 'premium',
    }

    const tier = tierMap[event.type ?? ''] ?? 'free'

    await app.supabase.from('subscriptions').upsert({
      user_id: event.app_user_id,
      tier,
      revenuecat_customer_id: event.app_user_id,
      expires_at: event.expiration_at_ms
        ? new Date(event.expiration_at_ms).toISOString()
        : null,
      updated_at: new Date().toISOString(),
    })

    return { received: true }
  })
}
