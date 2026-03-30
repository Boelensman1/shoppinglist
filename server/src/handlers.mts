import webpush from 'web-push'
import type { Transaction } from 'objection'

import ShoppingListEntry from './ShoppingListEntry.mjs'
import ListModel from './List.mjs'
import {
  hlcReceive,
  itemsListToRecords,
  type Hlc,
  type Item,
  type ItemRecords,
  type List,
  type ListRecords,
  type ParsedMessage_addItem,
  type ParsedMessage_addList,
  type ParsedMessage_clearList,
  type ParsedMessage_removeItem,
  type ParsedMessage_removeList,
  type ParsedMessage_setList,
  type ParsedMessage_signalFinishedShoppingList,
  type ParsedMessage_subscribeUserPushNotifications,
  type ParsedMessage_unSubscribeUserPushNotifications,
  type ParsedMessage_updateChecked,
  type ParsedMessage_updateList,
  type ParsedMessage_updateValue,
  type ParsedMessageUndoable,
} from './shared/index.mjs'
import { insertInitial } from './insertInitial.mjs'
import PushSubscription from './PushSubscription.mjs'
import { env } from './env.mjs'
import { serverHlc } from './hlcInstance.mjs'

const advanceServerHlc = (payload: Hlc) =>
  hlcReceive(serverHlc, payload.hlcTimestamp)

const clientStateIsNewer = (existingTs: string, incomingTs: string): boolean =>
  incomingTs <= existingTs

webpush.setVapidDetails(
  'mailto:me@wigger.email',
  env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
  env.VAPID_PRIVATE_KEY,
)

export const addListItem = async (
  payload: ParsedMessage_addItem['payload'],
  trx?: Transaction,
) => {
  advanceServerHlc(payload)
  await ShoppingListEntry.transaction(
    trx ?? ShoppingListEntry.knex(),
    async (t) => {
      // Skip if the existing row has a newer HLC timestamp, to prevent
      // delayed/out-of-order messages from overwriting more recent data.
      const existing = await ShoppingListEntry.query(t)
        .findById(payload.id)
        .forUpdate()
      if (
        existing &&
        clientStateIsNewer(existing.hlcTimestamp, payload.hlcTimestamp)
      ) {
        return
      }
      await ShoppingListEntry.query(t).insert(payload).onConflict('id').merge()
    },
  )
}

export const removeListItem = async (
  payload: ParsedMessage_removeItem['payload'],
  trx?: Transaction,
) => {
  advanceServerHlc(payload)
  await ShoppingListEntry.transaction(
    trx ?? ShoppingListEntry.knex(),
    async (t) => {
      const existing = await ShoppingListEntry.query(t)
        .findById(payload.id)
        .forUpdate()
      if (
        existing &&
        clientStateIsNewer(existing.hlcTimestamp, payload.hlcTimestamp)
      ) {
        return
      }
      await ShoppingListEntry.query(t)
        .findById(payload.id)
        .patch({ deleted: true, hlcTimestamp: payload.hlcTimestamp })
    },
  )
}

export const updateListItemValue = async (
  payload: ParsedMessage_updateValue['payload'],
  trx?: Transaction,
) => {
  advanceServerHlc(payload)
  await ShoppingListEntry.transaction(
    trx ?? ShoppingListEntry.knex(),
    async (t) => {
      const existing = await ShoppingListEntry.query(t)
        .findById(payload.id)
        .forUpdate()
      if (
        existing &&
        clientStateIsNewer(existing.hlcTimestamp, payload.hlcTimestamp)
      ) {
        return
      }
      await ShoppingListEntry.query(t)
        .findById(payload.id)
        .patch({ value: payload.newValue, hlcTimestamp: payload.hlcTimestamp })
    },
  )
}

export const updateListItemChecked = async (
  payload: ParsedMessage_updateChecked['payload'],
  trx?: Transaction,
) => {
  advanceServerHlc(payload)
  await ShoppingListEntry.transaction(
    trx ?? ShoppingListEntry.knex(),
    async (t) => {
      const existing = await ShoppingListEntry.query(t)
        .findById(payload.id)
        .forUpdate()
      if (
        existing &&
        clientStateIsNewer(existing.hlcTimestamp, payload.hlcTimestamp)
      ) {
        return
      }
      await ShoppingListEntry.query(t).findById(payload.id).patch({
        checked: payload.newChecked,
        hlcTimestamp: payload.hlcTimestamp,
      })
    },
  )
}

export const clearList = async (
  payload: ParsedMessage_clearList['payload'],
  trx?: Transaction,
) => {
  advanceServerHlc(payload)
  await ShoppingListEntry.transaction(
    trx ?? ShoppingListEntry.knex(),
    async (t) => {
      await ShoppingListEntry.query(t).where('listId', payload.listId).delete()
      await insertInitial(t, payload.listId, payload.hlcTimestamp)
    },
  )
}

export const setList = async (
  payload: ParsedMessage_setList['payload'],
  trx?: Transaction,
) => {
  await ShoppingListEntry.transaction(
    trx ?? ShoppingListEntry.knex(),
    async (t) => {
      await t.table('shoppingListEntries').truncate()
      await Promise.all(
        Object.values(payload).map((item) =>
          ShoppingListEntry.query(t).insert(item),
        ),
      )
    },
  )
}

export const executeUndoableAction = async (
  action: ParsedMessageUndoable,
  trx?: Transaction,
) => {
  switch (action.type) {
    case 'ADD_LIST_ITEM':
      return addListItem(action.payload, trx)
    case 'REMOVE_LIST_ITEM':
      return removeListItem(action.payload, trx)
    case 'UPDATE_LIST_ITEM_VALUE':
      return updateListItemValue(action.payload, trx)
    case 'UPDATE_LIST_ITEM_CHECKED':
      return updateListItemChecked(action.payload, trx)
    case 'CLEAR_LIST':
      return clearList(action.payload, trx)
    case 'SET_LIST':
      return setList(action.payload, trx)
    case 'BATCH':
      return executeBatch(action.payload, trx)
  }
}

export const executeBatch = async (
  actions: ParsedMessageUndoable[],
  trx?: Transaction,
) => {
  await ShoppingListEntry.transaction(
    trx ?? ShoppingListEntry.knex(),
    async (t) => {
      await Promise.all(
        actions.map((action) => executeUndoableAction(action, t)),
      )
    },
  )
}

export const getFullData = async (): Promise<{
  items: ItemRecords
  lists: ListRecords
}> => {
  const results = await ShoppingListEntry.query()
  const items = itemsListToRecords(results.map((r) => r.toJSON() as Item))

  const listResults = await ListModel.query()
  const lists = listResults.reduce<ListRecords>((acc, l) => {
    const list = l.toJSON() as unknown as List
    acc[list.id] = list
    return acc
  }, {})

  return { items, lists }
}

export const addList = async (payload: ParsedMessage_addList['payload']) => {
  await ListModel.transaction(async (trx) => {
    await ListModel.query(trx).insert(payload).onConflict('id').merge()
    await insertInitial(trx, payload.id)
  })
}

export const updateList = async (
  payload: ParsedMessage_updateList['payload'],
) => {
  await ListModel.query().findById(payload.id).patch({
    name: payload.name,
    colour: payload.colour,
  })
}

export const removeList = async (
  payload: ParsedMessage_removeList['payload'],
) => {
  // Prevent deleting the last list
  const count = await ListModel.query().resultSize()
  if (count <= 1) {
    throw new Error('Cannot remove the last list')
  }

  await ListModel.transaction(async (trx) => {
    await ShoppingListEntry.query(trx).where('listId', payload.id).delete()
    await ListModel.query(trx).deleteById(payload.id)
  })
}

export const subscribePushNotifications = async (
  payload: ParsedMessage_subscribeUserPushNotifications['payload'],
) => {
  const { userId, subscription } = payload

  await PushSubscription.transaction(async (trx) => {
    const existingSub = await PushSubscription.query(trx)
      .findOne({ userId })
      .forUpdate()

    if (existingSub) {
      await existingSub.$query(trx).update({
        authKey: subscription.keys.auth,
        p256dh: subscription.keys.p256dh,
        endpoint: subscription.endpoint,
        expirationTime: subscription.expirationTime ?? undefined,
      })
    } else {
      await PushSubscription.query(trx).insert({
        userId,
        authKey: subscription.keys.auth,
        p256dh: subscription.keys.p256dh,
        endpoint: subscription.endpoint,
        expirationTime: subscription.expirationTime ?? undefined,
      })
    }
  })
}

export const unsubscribePushNotifications = async (
  payload: ParsedMessage_unSubscribeUserPushNotifications['payload'],
) => {
  const { userId } = payload
  await PushSubscription.query().findOne({ userId }).delete()
}

export const signalFinishedShoppingList = async (
  payload: ParsedMessage_signalFinishedShoppingList['payload'],
) => {
  const { userId } = payload
  const subscriptions = await PushSubscription.query().where(
    'userId',
    '!=',
    userId,
  )
  const items = await ShoppingListEntry.query()

  if (subscriptions.length === 0) {
    throw new Error('No subscriptions available')
  }

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
}
