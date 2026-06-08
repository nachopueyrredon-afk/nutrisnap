import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { requireAuth } from '../plugins/auth.js'

export const foodsRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', requireAuth)

  // GET /v1/foods/search?q=&limit=
  app.get('/search', async (request, reply) => {
    const { q, limit } = z.object({
      q: z.string().min(1),
      limit: z.coerce.number().int().min(1).max(50).default(20),
    }).parse(request.query)

    const { data, error } = await app.supabase
      .from('food_items')
      .select('*')
      .textSearch('name', q, { type: 'websearch', config: 'spanish' })
      .limit(limit)

    if (error) {
      return reply.status(500).send({ error: 'search_error' })
    }

    return { items: data ?? [], total: data?.length ?? 0 }
  })

  // GET /v1/foods/recent
  app.get('/recent', async (request) => {
    const { data } = await app.supabase
      .from('diary_entries')
      .select('food_item_id, food_items(*)')
      .eq('user_id', request.userId)
      .order('created_at', { ascending: false })
      .limit(30)

    const seen = new Set<string>()
    const unique = (data ?? [])
      .filter((row) => {
        if (!row.food_item_id || seen.has(row.food_item_id)) return false
        seen.add(row.food_item_id)
        return true
      })
      .slice(0, 10)
      .map((row) => row.food_items)

    return unique
  })

  // GET /v1/foods/frequent
  app.get('/frequent', async (request) => {
    const { data } = await app.supabase
      .from('diary_entries')
      .select('food_item_id')
      .eq('user_id', request.userId)

    const counts: Record<string, number> = {}
    for (const row of data ?? []) {
      if (row.food_item_id) {
        counts[row.food_item_id] = (counts[row.food_item_id] ?? 0) + 1
      }
    }

    const topIds = Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([id]) => id)

    if (topIds.length === 0) return []

    const { data: foods } = await app.supabase
      .from('food_items')
      .select('*')
      .in('id', topIds)

    return foods ?? []
  })

  // GET /v1/foods/:id
  app.get('/:id', async (request, reply) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(request.params)

    const { data, error } = await app.supabase
      .from('food_items')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !data) {
      return reply.status(404).send({ error: 'not_found' })
    }

    return data
  })

  // POST /v1/foods/barcode
  app.post('/barcode', async (request, reply) => {
    const { barcode } = z.object({ barcode: z.string().min(1) }).parse(request.body)

    // Check local DB first
    const { data: local } = await app.supabase
      .from('food_items')
      .select('*')
      .eq('barcode', barcode)
      .single()

    if (local) return local

    // Fetch from Open Food Facts
    const response = await fetch(
      `https://world.openfoodfacts.org/api/v2/product/${barcode}.json?fields=product_name,nutriments,serving_size`,
    )

    if (!response.ok) {
      return reply.status(404).send({ error: 'barcode_not_found' })
    }

    const json = await response.json() as { status: number; product?: Record<string, unknown> }

    if (json.status !== 1 || !json.product) {
      return reply.status(404).send({ error: 'barcode_not_found' })
    }

    const p = json.product
    const nutriments = p['nutriments'] as Record<string, number> | undefined ?? {}

    const newItem = {
      name: String(p['product_name'] ?? 'Unknown'),
      source: 'open_food_facts' as const,
      barcode,
      serving_size_g: parseFloat(String(p['serving_size'] ?? '100')) || 100,
      serving_label: String(p['serving_size'] ?? '100g'),
      kcal_per_100g: nutriments['energy-kcal_100g'] ?? 0,
      protein_per_100g: nutriments['proteins_100g'] ?? 0,
      carbs_per_100g: nutriments['carbohydrates_100g'] ?? 0,
      fat_per_100g: nutriments['fat_100g'] ?? 0,
      external_id: barcode,
    }

    const { data: created, error } = await app.supabase
      .from('food_items')
      .insert(newItem)
      .select()
      .single()

    if (error) {
      return reply.status(500).send({ error: 'db_error' })
    }

    return reply.status(201).send(created)
  })
}
