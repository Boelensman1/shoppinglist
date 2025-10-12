import webpush from 'web-push'
import 'dotenv/config'
import type Objection from 'objection'

import WebSocket from 'ws'
import ShoppingListEntry from './ShoppingListEntry.mjs'
import ParsedMessage from './ParsedMessage.js'
import { insertInitial } from './index.mjs'
import PushSubscriptionJSON from './PushSubscription.mjs'

webpush.setVapidDetails(
  'mailto:me@wigger.email',
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!,
)

const handleMessage = async (
  ws: WebSocket,
  parsedMessage: ParsedMessage,
  inTransaction?: Objection.Transaction,
) => {
  console.log(JSON.stringify(parsedMessage, null, 2))
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
            .merge()
        },
      )
      return
    }
    case 'REMOVE_LIST_ITEM':
      await ShoppingListEntry.query(inTransaction)
        .findById(parsedMessage.payload.id)
        .patch({ deleted: true })
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

    case 'SUBSCRIBE_USER_PUSH_NOTIFICATIONS': {
      const { userId, subscription } = parsedMessage.payload

      await PushSubscriptionJSON.transaction(async (trx) => {
        const existingSub = await PushSubscriptionJSON.query(trx)
          .findOne({
            userId,
          })
          .forUpdate()

        if (existingSub) {
          await existingSub.$query(trx).update({
            authKey: subscription.keys.auth,
            p256dh: subscription.keys.p256dh,
            endpoint: subscription.endpoint,
            expirationTime: subscription.expirationTime ?? undefined,
          })
        } else {
          await PushSubscriptionJSON.query(trx).insert({
            userId,
            authKey: subscription.keys.auth,
            p256dh: subscription.keys.p256dh,
            endpoint: subscription.endpoint,
            expirationTime: subscription.expirationTime ?? undefined,
          })
        }
      })
      return
    }

    case 'UNSUBSCRIBE_USER_PUSH_NOTIFICATIONS': {
      const { userId } = parsedMessage.payload
      await PushSubscriptionJSON.query()
        .findOne({
          userId,
        })
        .delete()
      return
    }

    case 'SIGNAL_FINISHED_SHOPPINGLIST': {
      const subscriptions = await PushSubscriptionJSON.query().where(
        'userId',
        '!=',
        parsedMessage.payload.userId,
      )
      const items = await ShoppingListEntry.query()

      if (subscriptions.length === 0) {
        throw new Error('No subscriptions available')
      }

      try {
        await Promise.all(
          subscriptions.map((subscription) =>
            webpush.sendNotification(
              subscription.toWebPush(),
              JSON.stringify({
                title: 'Boodschappenlijstje is af!',
                body: `Er staan ${items.length} boodschappen op.`,
                data: {
                  items: items.map((item) => item.toJSON()),
                },
              }),
            ),
          ),
        )
        return { success: true }
      } catch (error) {
        console.error('Error sending push notification:', error)
        return { success: false, error: 'Failed to send notification' }
      }
    }
  }
}

export default handleMessage
