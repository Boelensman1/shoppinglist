import { Model, Transaction } from 'objection'
import Knex from 'knex'
import { WebSocketServer } from 'ws'
import { applyWSSHandler } from '@trpc/server/adapters/ws'

import ShoppingListEntry from './ShoppingListEntry.mjs'
import { ItemId } from '@shoppinglist/shared'
import { env } from './env.mjs'
import { appRouter } from './router.mjs'
import { createContext } from './trpc.mjs'

const port: number = env.PORT

const knex = Knex({
  client: 'better-sqlite3',
  connection: {
    filename: './db.sqlite3',
  },
  useNullAsDefault: true,
})

Model.knex(knex)

export const insertInitial = (trx?: Transaction) =>
  ShoppingListEntry.query(trx)
    .insert({
      id: 'INITIAL' as ItemId,
      value: '',
      checked: false,
      deleted: false,
      prevItemId: 'HEAD',
    })
    .onConflict('id')
    .ignore()

const init = async () => {
  if (!(await knex.schema.hasTable('shoppingListEntries'))) {
    await knex.schema.createTable('shoppingListEntries', (table) => {
      table.string('id').primary()
      table.string('prevItemId').notNullable()
      table.string('value').notNullable()
      table.boolean('checked').notNullable()
      table.boolean('deleted').notNullable()
      table.timestamps(true, true, true)
    })

    await insertInitial()
  }

  if (!(await knex.schema.hasTable('pushSubscriptions'))) {
    await knex.schema.createTable('pushSubscriptions', (table) => {
      table.string('userId').primary()
      table.string('authKey').notNullable()
      table.string('p256dh').notNullable()
      table.string('endpoint').notNullable()
      table.integer('expirationTime').unsigned()
      table.timestamps(true, true, true)
    })

    await insertInitial()
  }
}

const main = async () => {
  await init()

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
