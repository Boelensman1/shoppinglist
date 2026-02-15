import { Model, Transaction } from 'objection'
import Knex from 'knex'
import WebSocket, { WebSocketServer } from 'ws'

import ShoppingListEntry from './ShoppingListEntry.mjs'
import handleMessage from './handleMessage.mjs'
import { ParsedMessageSchema } from './schemas.mjs'
import { env } from './env.mjs'

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
      id: 'INITIAL',
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

  const broadcastMessage = (senderWs: WebSocket, message: string) => {
    wss.clients.forEach((client) => {
      if (client !== senderWs && client.readyState === WebSocket.OPEN) {
        client.send(message)
      }
    })
  }

  wss.on('connection', (ws) => {
    console.log('A new client connected.')

    // Receiving message from client
    ws.on('message', async (message) => {
      const msgAsString = message.toString()
      broadcastMessage(ws, msgAsString)

      // Parse JSON first
      let jsonData: unknown
      try {
        jsonData = JSON.parse(msgAsString)
      } catch (error) {
        console.error('Invalid JSON received:', error)
        ws.send(JSON.stringify({ type: 'ERROR', message: 'Invalid JSON format' }))
        return
      }

      // Validate with Zod
      const result = ParsedMessageSchema.safeParse(jsonData)
      if (!result.success) {
        console.error('Invalid message format:', result.error)
        ws.send(JSON.stringify({
          type: 'ERROR',
          message: 'Invalid message format',
          errors: result.error.issues
        }))
        return
      }

      // Handle message with error handling
      try {
        await handleMessage(ws, result.data as any)
      } catch (error) {
        console.error('Error handling message:', error)
        ws.send(JSON.stringify({
          type: 'ERROR',
          message: 'An error occurred while processing your request'
        }))
      }
    })

    ws.on('close', () => {
      console.log('A client disconnected.')
    })
  })

  console.log(`WebSocket server is running on ws://0.0.0.0:${port}`)

  // Graceful shutdown handlers
  const shutdown = async (signal: string) => {
    console.log(`\n${signal} received, shutting down gracefully...`)

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
