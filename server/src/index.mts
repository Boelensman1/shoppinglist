import { Model, Transaction } from 'objection'
import Knex from 'knex'
import WebSocket, { WebSocketServer } from 'ws'

import ShoppingListEntry from './ShoppingListEntry.mjs'
import handleMessage from './handleMessage.mjs'
import ParsedMessage from './ParsedMessage.js'

const port: number = Number(process.env.PORT) || 1222

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
    ws.on('message', (message) => {
      broadcastMessage(ws, message.toString())
      const parsedMessage = JSON.parse(
        message.toString(),
      ) as unknown as ParsedMessage

      handleMessage(ws, parsedMessage)
    })

    ws.on('close', () => {
      console.log('A client disconnected.')
    })
  })

  console.log(`WebSocket server is running on ws://0.0.0.0:${port}`)
}

main()
