import { buildApp } from './app.js'

const port = parseInt(process.env['PORT'] ?? '3000', 10)
const host = process.env['NODE_ENV'] === 'production' ? '0.0.0.0' : '127.0.0.1'

const app = await buildApp()

try {
  await app.listen({ port, host })
  app.log.info(`NutriSnap API running on ${host}:${port}`)
} catch (err) {
  app.log.error(err)
  process.exit(1)
}
