import Fastify from 'fastify'
import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import multipart from '@fastify/multipart'
import rateLimit from '@fastify/rate-limit'
import { authPlugin } from './plugins/auth.js'
import { supabasePlugin } from './plugins/supabase.js'
import { usersRoutes } from './routes/users.js'
import { foodsRoutes } from './routes/foods.js'
import { diaryRoutes } from './routes/diary.js'
import { aiRoutes } from './routes/ai.js'
import { weightRoutes } from './routes/weight.js'
import { coachingRoutes } from './routes/coaching.js'
import { professionalsRoutes } from './routes/professionals.js'
import { linksRoutes } from './routes/links.js'
import { messagesRoutes } from './routes/messages.js'
import { subscriptionsRoutes } from './routes/subscriptions.js'

export async function buildApp() {
  const app = Fastify({
    logger: {
      level: process.env['NODE_ENV'] === 'production' ? 'warn' : 'info',
    },
  })

  // Core plugins
  await app.register(helmet)
  await app.register(cors, {
    origin: process.env['NODE_ENV'] === 'production'
      ? ['https://nutrisnap.app', 'https://pro.nutrisnap.app']
      : true,
  })
  await app.register(multipart, { limits: { fileSize: 10 * 1024 * 1024 } }) // 10MB
  await app.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute',
    redis: undefined, // TODO: wire Redis for distributed rate limiting
  })

  // App plugins
  await app.register(supabasePlugin)
  await app.register(authPlugin)

  // Routes — all under /v1
  await app.register(usersRoutes, { prefix: '/v1/users' })
  await app.register(foodsRoutes, { prefix: '/v1/foods' })
  await app.register(diaryRoutes, { prefix: '/v1/diary' })
  await app.register(aiRoutes, { prefix: '/v1/ai' })
  await app.register(weightRoutes, { prefix: '/v1/weight' })
  await app.register(coachingRoutes, { prefix: '/v1/coaching' })
  await app.register(professionalsRoutes, { prefix: '/v1/professionals' })
  await app.register(linksRoutes, { prefix: '/v1/links' })
  await app.register(messagesRoutes, { prefix: '/v1/messages' })
  await app.register(subscriptionsRoutes, { prefix: '/v1/subscription' })

  // Health check (unauthenticated)
  app.get('/health', async () => ({ status: 'ok', version: '0.1.0' }))

  return app
}
