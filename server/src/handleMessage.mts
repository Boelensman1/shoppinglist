import type Objection from 'objection'

import WebSocket from 'ws'
import ShoppingListEntry from './ShoppingListEntry.mjs'
import ParsedMessage from './ParsedMessage.js'
import { insertInitial } from './index.mjs'

const handleMessage = async (
  ws: WebSocket,
  parsedMessage: ParsedMessage,
  inTransaction?: Objection.Transaction,
) => {
  switch (parsedMessage.type) {
    case 'SYNC_WITH_SERVER': {
      // handle offline messages
      for (const offlineMessage of parsedMessage.payload) {
        await ShoppingListEntry.transaction(async (trx) => {
          await handleMessage(ws, offlineMessage, trx)
        })
      }

      // send current state
      const results = await ShoppingListEntry.query(inTransaction)

      ws.send(
        JSON.stringify({
          type: 'INITIAL_FULL_DATA',
          payload: results.map((r) => r.toJSON()),
        }),
      )
      return
    }

    case 'ADD_LIST_ITEM': {
      await ShoppingListEntry.transaction(
        inTransaction ?? ShoppingListEntry.knex(),
        async (trx) => {
          const { afterId, ...item } = parsedMessage.payload
          await ShoppingListEntry.query(trx)
            .insert(item)
            .onConflict('id')
            .ignore()
        },
      )
      return
    }
    case 'REMOVE_LIST_ITEM':
      await ShoppingListEntry.query(inTransaction)
        .findById(parsedMessage.payload.id)
        .del()
      return
    case 'UPDATE_LIST_ITEM_VALUE':
      await ShoppingListEntry.query(inTransaction)
        .findById(parsedMessage.payload.id)
        .patch({ value: parsedMessage.payload.newValue })
      return
    case 'UPDATE_LIST_ITEM_CHECKED':
      await ShoppingListEntry.query().findById(parsedMessage.payload.id).patch({
        checked: parsedMessage.payload.newChecked,
      })

      return

    case 'BATCH':
      await ShoppingListEntry.transaction(
        inTransaction ?? ShoppingListEntry.knex(),
        async (trx) => {
          await Promise.all(
            parsedMessage.payload.map((message) =>
              handleMessage(ws, message, trx),
            ),
          )
        },
      )
      return

    case 'CLEAR_LIST':
      await ShoppingListEntry.transaction(
        inTransaction ?? ShoppingListEntry.knex(),
        async (trx) => {
          await trx.table('shoppingListEntries').truncate()
          await insertInitial(trx)
        },
      )

      return

    case 'SET_LIST':
      await ShoppingListEntry.transaction(
        inTransaction ?? ShoppingListEntry.knex(),
        async (trx) => {
          await trx.table('shoppingListEntries').truncate()
          await Promise.all(
            parsedMessage.payload.map((item) =>
              ShoppingListEntry.query(trx).insert(item),
            ),
          )
        },
      )

      return
  }
}

export default handleMessage
