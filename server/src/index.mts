import { Model } from 'objection'
import Knex from 'knex'
import { WebSocketServer } from 'ws'
import { applyWSSHandler } from '@trpc/server/adapters/ws'

import { env } from './env.mjs'
import { appRouter } from './router.mjs'
import { createContext } from './trpc.mjs'
import { initDb } from './initDb.mjs'

const port: number = env.PORT

const knex = Knex({
  client: 'better-sqlite3',
  connection: {
    filename: './db.sqlite3',
  },
  useNullAsDefault: true,
})

Model.knex(knex)

const main = async () => {
  await initDb(knex)

  const wss = new WebSocketServer({
    port,
  })

  const handler = applyWSSHandler({
    wss,
    router: appRouter,
    createContext,
    keepAlive: {
      enabled: true,
      pingMs: 30_000,
      pongWaitMs: 5_000,
    },
  })

  console.log(`tRPC WebSocket server is running on ws://0.0.0.0:${port}`)

  // Graceful shutdown handlers
  const shutdown = async (signal: string) => {
    console.log(`\n${signal} received, shutting down gracefully...`)

    handler.broadcastReconnectNotification()

    // Close WebSocket server
    wss.close(() => {
      console.log('WebSocket server closed')
    })

    // Close all active connections
    wss.clients.forEach((client) => {
      client.close()
    })

    // Destroy database connection
    try {
      await knex.destroy()
      console.log('Database connection closed')
    } catch (error) {
      console.error('Error closing database connection:', error)
    }

    process.exit(0)
  }

  process.on('SIGTERM', () => shutdown('SIGTERM'))
  process.on('SIGINT', () => shutdown('SIGINT'))
}

main()
