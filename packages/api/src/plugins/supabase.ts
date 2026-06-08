import fp from 'fastify-plugin'
import { createClient } from '@supabase/supabase-js'
import type { FastifyPluginAsync } from 'fastify'

declare module 'fastify' {
  interface FastifyInstance {
    supabase: ReturnType<typeof createClient>
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

  app.decorate('supabase', client)
}

export default fp(supabasePlugin)
export { supabasePlugin }
