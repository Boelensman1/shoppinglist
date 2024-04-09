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

const SPACE_BETWEEN_ENTRIES = 100000

const distributeEntryOrders = async (
  trx: Knex.Knex<any, any[]>,
): Promise<number> => {
  const currentEntries = await ShoppingListEntry.query(trx)
    .orderBy('order')
    .select(['id'])

  const newEntries = currentEntries.map(({ id }, i) => ({
    id,
    order: Number.MIN_SAFE_INTEGER + i * SPACE_BETWEEN_ENTRIES,
  }))

  // Patch all entries to use the new ordering
  for (const entry of newEntries) {
    await ShoppingListEntry.query(trx)
      .patch({ order: entry.order })
      .where('id', '=', entry.id)
  }

  // return new biggest order
  return newEntries[newEntries.length].order
}

const getOrderForAfterId = async (
  afterId: string,
  trx: Knex.Knex<any, any[]>,
  retryIfFull = true,
): Promise<number> => {
  const entryBefore = await ShoppingListEntry.query(trx)
    .findById(afterId)
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
    : entryBefore.order + SPACE_BETWEEN_ENTRIES

  if (order === entryBefore.order || order === entryAfter?.order) {
    if (!retryIfFull) {
      throw new Error('Could not find order.')
    }
    await distributeEntryOrders(trx)
    return getOrderForAfterId(afterId, trx, false)
  }
  return order
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
      broadcastMessage(ws, message.toString())
      const parsedMessage = JSON.parse(
        message.toString(),
      ) as unknown as ParsedMessage

      switch (parsedMessage.type) {
        case 'ADD_LIST_ITEM': {
          ShoppingListEntry.transaction(async (trx) => {
            await ShoppingListEntry.query(trx).insert({
              ...parsedMessage.payload.item,
              order: await getOrderForAfterId(
                parsedMessage.payload.afterId,
                trx,
              ),
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
          // if checked, move the entry to the end
          ShoppingListEntry.transaction(async (trx) => {
            const lastUncheckedEntry = await ShoppingListEntry.query(trx)
              .select(['order', 'id'])
              .orderBy('order', 'DESC')
              .where({ checked: false })
              .limit(1)
              .first()

            let order
            if (!lastUncheckedEntry) {
              // no matching entries that should come before it, move to the start
              order = Number.MIN_SAFE_INTEGER
            } else {
              order = await getOrderForAfterId(lastUncheckedEntry.id, trx)
            }

            await ShoppingListEntry.query(trx)
              .findById(parsedMessage.payload.id)
              .patch({
                checked: parsedMessage.payload.newChecked,
                order,
              })
          })

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
