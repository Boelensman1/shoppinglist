import { Model } from 'objection'
import Knex from 'knex'
import WebSocket, { WebSocketServer } from 'ws'

import ShoppingListEntry from './ShoppingListEntry.mjs'

const port: number = Number(process.env.PORT) || 1222

const knex = Knex({
  client: 'better-sqlite3',
  connection: {
    filename: './db.sqlite3',
  },
  useNullAsDefault: true,
})

Model.knex(knex)

interface ParsedMessage_addItem {
  type: 'ADD_LIST_ITEM'
  payload: {
    afterId: string
    item: { id: string; value: string; checked: boolean }
  }
}
interface ParsedMessage_removeItem {
  type: 'REMOVE_LIST_ITEM'
  payload: {
    id: string
  }
}
interface ParsedMessage_updateValue {
  type: 'UPDATE_LIST_ITEM_VALUE'
  payload: { id: string; newValue: string }
}
interface ParsedMessage_updateChecked {
  type: 'UPDATE_LIST_ITEM_CHECKED'
  payload: { id: string; newChecked: boolean }
}

type ParsedMessage =
  | ParsedMessage_addItem
  | ParsedMessage_removeItem
  | ParsedMessage_updateValue
  | ParsedMessage_updateChecked

const init = async () => {
  if (!(await knex.schema.hasTable('shoppingListEntries'))) {
    await knex.schema.createTable('shoppingListEntries', (table) => {
      table.string('id').primary()
      table.integer('order').unique().notNullable()
      table.string('value').notNullable()
      table.boolean('checked').notNullable()
      table.timestamps(true, true, true)
    })

    await ShoppingListEntry.query().insert({
      id: 'INITIAL',
      value: '',
      checked: false,
      order: Number.MIN_SAFE_INTEGER,
    })
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

    // send current state
    ShoppingListEntry.query()
      .orderBy('order')
      .then((results) => {
        ws.send(
          JSON.stringify({
            type: 'INITIAL_FULL_DATA',
            payload: results.map((r) => r.toJSON()),
          }),
        )
      })

    // Receiving message from client
    ws.on('message', (message) => {
      console.log('Received a message.')
      broadcastMessage(ws, message.toString())
      const parsedMessage = JSON.parse(
        message.toString(),
      ) as unknown as ParsedMessage

      switch (parsedMessage.type) {
        case 'ADD_LIST_ITEM': {
          ShoppingListEntry.transaction(async (trx) => {
            const entryBefore = await ShoppingListEntry.query(trx)
              .findById(parsedMessage.payload.afterId)
              .select('order')
              .throwIfNotFound()
            const entryAfter = await ShoppingListEntry.query(trx)
              .where('order', '>', entryBefore.order)
              .orderBy('order')
              .select('order')
              .limit(1)
              .first()

            const order = entryAfter
              ? Math.round((entryBefore.order + entryAfter.order) / 2)
              : entryBefore.order + 100000

            await ShoppingListEntry.query(trx).insert({
              ...parsedMessage.payload.item,
              order,
            })
          })
          return
        }
        case 'REMOVE_LIST_ITEM':
          ShoppingListEntry.query()
            .findById(parsedMessage.payload.id)
            .del()
            .execute()
          return
        case 'UPDATE_LIST_ITEM_VALUE':
          ShoppingListEntry.query()
            .findById(parsedMessage.payload.id)
            .patch({ value: parsedMessage.payload.newValue })
            .execute()
          return
        case 'UPDATE_LIST_ITEM_CHECKED':
          ShoppingListEntry.query()
            .findById(parsedMessage.payload.id)
            .patch({ checked: parsedMessage.payload.newChecked })
            .execute()
          return
      }
    })

    ws.on('close', () => {
      console.log('A client disconnected.')
    })
  })

  console.log(`WebSocket server is running on ws://0.0.0.0:${port}`)
}

main()
