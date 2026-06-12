import 'dotenv/config'
import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger as honoLogger } from 'hono/logger'
import { logger } from '@reposentry/core'
import { loadEnv } from './env.js'
import { err } from './envelope.js'
import { createRedisConnection, createReviewQueue, startReviewWorker } from './queue.js'
import { handleWebhookEvent, verifyWebhookSignature } from './webhook.js'
import { buildApiRoutes } from './routes.js'

const env = loadEnv()

const connection = createRedisConnection(env)
const queue = createReviewQueue(connection)
const worker = startReviewWorker(env, createRedisConnection(env))

const app = new Hono()
app.use('*', honoLogger())

app.get('/health', (c) => c.json({ ok: true, service: 'reposentry-api' }))

// --- GitHub webhook (no bearer auth — HMAC signature is the auth) ----------
app.post('/webhooks/github', async (c) => {
  const rawBody = await c.req.text()
  const signature = c.req.header('x-hub-signature-256')

  if (!verifyWebhookSignature(rawBody, signature, env.GITHUB_WEBHOOK_SECRET)) {
    logger.warn('webhook.bad-signature', { event: c.req.header('x-github-event') })
    return c.json(err('invalid webhook signature'), 401)
  }

  const eventName = c.req.header('x-github-event')
  if (!eventName) return c.json(err('missing x-github-event header'), 400)

  let payload: unknown
  try {
    payload = JSON.parse(rawBody)
  } catch {
    return c.json(err('payload is not valid JSON'), 400)
  }

  try {
    const result = await handleWebhookEvent(eventName, payload, queue)
    return c.json({ success: result.status < 400, data: result.message, error: null }, result.status as 200)
  } catch (error) {
    logger.error('webhook.handler-failed', { event: eventName, error: String(error) })
    return c.json(err('internal error handling webhook'), 500)
  }
})

// --- REST API (bearer-token gated, consumed by the dashboard) --------------
app.use('/api/*', cors({ origin: '*', allowHeaders: ['Authorization', 'Content-Type'] }))
app.use('/api/*', async (c, next) => {
  const header = c.req.header('authorization')
  if (header !== `Bearer ${env.API_INTERNAL_TOKEN}`) {
    return c.json(err('unauthorized'), 401)
  }
  await next()
})
app.route('/api', buildApiRoutes(queue))

app.notFound((c) => c.json(err('not found'), 404))
app.onError((error, c) => {
  logger.error('api.unhandled-error', { path: c.req.path, error: String(error) })
  return c.json(err('internal server error'), 500)
})

serve({ fetch: app.fetch, port: env.PORT }, (info) => {
  logger.info('api.listening', { port: info.port })
})

// Graceful shutdown: finish the in-flight review before exiting.
for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => {
    logger.info('api.shutdown', { signal })
    void Promise.allSettled([worker.close(), queue.close(), connection.quit()]).then(() =>
      process.exit(0)
    )
  })
}
