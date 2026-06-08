import fp from 'fastify-plugin'
import { createClient } from '@supabase/supabase-js'
import type { FastifyPluginAsync } from 'fastify'

// Using `any` here because Supabase DB types are generated separately.
// Run: npx supabase gen types typescript --project-id vrhcvyppkepjoylkqhsp > src/types/database.gen.ts
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseAny = ReturnType<typeof createClient<any>>

declare module 'fastify' {
  interface FastifyInstance {
    supabase: SupabaseAny
  }
}

const supabasePlugin: FastifyPluginAsync = async (app) => {
  const url = process.env['SUPABASE_URL']
  const key = process.env['SUPABASE_SERVICE_ROLE_KEY']

  if (!url || !key) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  }

  const client = createClient(url, key, {
    auth: { persistSession: false },
  })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  app.decorate('supabase', client as any)
}

export default fp(supabasePlugin)
export { supabasePlugin }
