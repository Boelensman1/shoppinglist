import type Objection from 'objection'

import WebSocket from 'ws'
import ShoppingListEntry from './ShoppingListEntry.mjs'
import ParsedMessage from './ParsedMessage.js'
import getOrderForAfterId from './getOrderForAfterId.mjs'
import { insertInitial } from './index.mjs'

const handleMessage = async (
  ws: WebSocket,
  parsedMessage: ParsedMessage,
  inTransaction?: Objection.Transaction,
) => {
  // console.log(parsedMessage)
  switch (parsedMessage.type) {
    case 'SYNC_WITH_SERVER': {
      console.log(parsedMessage.payload)
      // handle offline messages
      for (const offlineMessage of parsedMessage.payload) {
        await ShoppingListEntry.transaction(async (trx) => {
          await handleMessage(ws, offlineMessage, trx)
        })
      }

      // send current state
      const results =
        await ShoppingListEntry.query(inTransaction).orderBy('order')

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
          await ShoppingListEntry.query(trx).insert({
            ...item,
            order: await getOrderForAfterId(afterId, trx),
          })
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
      // if checked, move the entry to the end
      await ShoppingListEntry.transaction(
        inTransaction ?? ShoppingListEntry.knex(),
        async (trx) => {
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
              ShoppingListEntry.query().insert(item),
            ),
          )
        },
      )

      return
  }
}

export default handleMessage
