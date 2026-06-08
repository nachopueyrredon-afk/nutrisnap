import fp from 'fastify-plugin'
import { createClient } from '@supabase/supabase-js'
import type { FastifyPluginAsync, FastifyRequest } from 'fastify'

declare module 'fastify' {
  interface FastifyRequest {
    userId: string
    userEmail: string
  }
}

// Attach this hook to routes that require authentication
export async function requireAuth(request: FastifyRequest) {
  const authHeader = request.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    throw { statusCode: 401, message: 'Missing authorization header' }
  }

  const token = authHeader.slice(7)
  const url = process.env['SUPABASE_URL']!
  const anonKey = process.env['SUPABASE_ANON_KEY'] ?? process.env['SUPABASE_SERVICE_ROLE_KEY']!

  // Verify JWT with Supabase by calling getUser — this validates the token server-side
  const client = createClient(url, anonKey)
  const { data, error } = await client.auth.getUser(token)

  if (error || !data.user) {
    throw { statusCode: 401, message: 'Invalid or expired token' }
  }

  request.userId = data.user.id
  request.userEmail = data.user.email ?? ''
}

const authPlugin: FastifyPluginAsync = async (app) => {
  app.decorateRequest('userId', '')
  app.decorateRequest('userEmail', '')
}

export default fp(authPlugin)
export { authPlugin }
