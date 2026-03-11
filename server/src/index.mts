import { Model, Transaction } from 'objection'
import Knex from 'knex'
import { WebSocketServer } from 'ws'
import { applyWSSHandler } from '@trpc/server/adapters/ws'

import ShoppingListEntry from './ShoppingListEntry.mjs'
import List from './List.mjs'
import type { ItemId, ListId } from './shared/index.mjs'
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

const DEFAULT_LIST_ID = 'default' as ListId

export const insertInitial = (
  trx?: Transaction,
  listId: ListId = DEFAULT_LIST_ID,
) => {
  const itemId = (
    listId === DEFAULT_LIST_ID ? 'INITIAL' : `initial-${listId}`
  ) as ItemId
  return ShoppingListEntry.query(trx)
    .insert({
      id: itemId,
      value: '',
      checked: false,
      deleted: false,
      prevItemId: 'HEAD',
      listId,
    })
    .onConflict('id')
    .ignore()
}

const init = async () => {
  // Create lists table if it doesn't exist
  if (!(await knex.schema.hasTable('lists'))) {
    await knex.schema.createTable('lists', (table) => {
      table.string('id').primary()
      table.string('name').notNullable()
      table.string('colour').notNullable()
      table.timestamps(true, true, true)
    })

    await List.query()
      .insert({
        id: DEFAULT_LIST_ID,
        name: 'Boodschappen',
        colour: '#3b82f6',
      })
      .onConflict('id')
      .ignore()
  }

  if (!(await knex.schema.hasTable('shoppingListEntries'))) {
    await knex.schema.createTable('shoppingListEntries', (table) => {
      table.string('id').primary()
      table.string('prevItemId').notNullable()
      table.string('value').notNullable()
      table.boolean('checked').notNullable()
      table.boolean('deleted').notNullable()
      table.string('listId').notNullable().defaultTo('default')
      table.timestamps(true, true, true)
    })

    await insertInitial()
  } else if (!(await knex.schema.hasColumn('shoppingListEntries', 'listId'))) {
    // Migration: add listId column to existing table
    await knex.schema.alterTable('shoppingListEntries', (table) => {
      table.string('listId').notNullable().defaultTo('default')
    })
  }

  // Ensure default list exists (for existing databases)
  await List.query()
    .insert({
      id: DEFAULT_LIST_ID,
      name: 'Boodschappen',
      colour: '#3b82f6',
    })
    .onConflict('id')
    .ignore()

  if (!(await knex.schema.hasTable('pushSubscriptions'))) {
    await knex.schema.createTable('pushSubscriptions', (table) => {
      table.string('userId').primary()
      table.string('authKey').notNullable()
      table.string('p256dh').notNullable()
      table.string('endpoint').notNullable()
      table.integer('expirationTime').unsigned()
      table.timestamps(true, true, true)
    })
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
