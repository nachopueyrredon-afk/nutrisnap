import type { FastifyPluginAsync } from 'fastify'
import { requireAuth } from '../plugins/auth.js'

const FREE_DAILY_QUOTA = 3
const LOGMEAL_TIMEOUT_MS = 5000

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getDailyUsage(supabase: any, userId: string): Promise<number> {
  const today = new Date().toISOString().slice(0, 10)
  const { count } = await supabase
    .from('ai_scan_logs')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('used_free_quota', true)
    .gte('scanned_at', `${today}T00:00:00.000Z`)
    .lte('scanned_at', `${today}T23:59:59.999Z`)

  return count ?? 0
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getUserTier(supabase: any, userId: string): Promise<string> {
  const { data } = await supabase
    .from('subscriptions')
    .select('tier')
    .eq('user_id', userId)
    .single()

  return data?.tier ?? 'free'
}

export const aiRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', requireAuth)

  // GET /v1/ai/quota
  app.get('/quota', async (request) => {
    const [tier, used] = await Promise.all([
      getUserTier(app.supabase, request.userId),
      getDailyUsage(app.supabase, request.userId),
    ])

    const isPremium = tier !== 'free'
    return {
      used: isPremium ? 0 : used,
      limit: isPremium ? null : FREE_DAILY_QUOTA,
      remaining: isPremium ? null : Math.max(0, FREE_DAILY_QUOTA - used),
      is_premium: isPremium,
    }
  })

  // POST /v1/ai/scan
  app.post('/scan', async (request, reply) => {
    const [tier, used] = await Promise.all([
      getUserTier(app.supabase, request.userId),
      getDailyUsage(app.supabase, request.userId),
    ])

    const isPremium = tier !== 'free'

    if (!isPremium && used >= FREE_DAILY_QUOTA) {
      return reply.status(429).send({
        error: 'quota_exceeded',
        upgrade_url: 'https://nutrisnap.app/premium',
      })
    }

    const data = await request.file()
    if (!data) {
      return reply.status(400).send({ error: 'no_image' })
    }

    const imageBuffer = await data.toBuffer()

    // Call LogMeal API with timeout
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), LOGMEAL_TIMEOUT_MS)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let logmealResult: any = null

    try {
      const formData = new FormData()
      formData.append('image', new Blob([imageBuffer], { type: data.mimetype }), data.filename ?? 'photo.jpg')

      const response = await fetch(
        `${process.env['LOGMEAL_API_URL']}/image/segmentation/complete`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${process.env['LOGMEAL_API_KEY']}` },
          body: formData,
          signal: controller.signal,
        },
      )

      if (response.ok) {
        logmealResult = await response.json() as typeof logmealResult
      }
    } catch {
      // LogMeal timeout or error → fallback to search
      await app.supabase.from('ai_scan_logs').insert({
        user_id: request.userId,
        used_free_quota: !isPremium,
      })

      return reply.status(503).send({
        error: 'ai_unavailable',
        fallback: 'search',
      })
    } finally {
      clearTimeout(timeout)
    }

    const recognitions = logmealResult?.recognition_results ?? []
    const matches = []

    for (const item of recognitions.slice(0, 5)) {
      const { data: foods } = await app.supabase
        .from('food_items')
        .select('*')
        .textSearch('name', item.name, { type: 'websearch', config: 'spanish' })
        .limit(1)

      if (foods?.[0]) {
        matches.push({ food_item: foods[0], confidence: item.prob })
      }
    }

    // Log the scan
    await app.supabase.from('ai_scan_logs').insert({
      user_id: request.userId,
      food_item_id: matches[0]?.food_item.id ?? null,
      confidence: matches[0]?.confidence ?? null,
      used_free_quota: !isPremium,
    })

    const quota_remaining = isPremium ? null : Math.max(0, FREE_DAILY_QUOTA - used - 1)

    return { matches, quota_remaining }
  })
}
