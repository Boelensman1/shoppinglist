import webpush from 'web-push'
import type { Transaction } from 'objection'

import ShoppingListEntry from './ShoppingListEntry.mjs'
import ListModel from './List.mjs'
import {
  itemsListToRecords,
  type Item,
  type ItemRecords,
  type List,
  type ListId,
  type ListRecords,
  type ParsedMessageUndoable,
} from './shared/index.mjs'
import { insertInitial } from './index.mjs'
import PushSubscription from './PushSubscription.mjs'
import { env } from './env.mjs'

webpush.setVapidDetails(
  'mailto:me@wigger.email',
  env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
  env.VAPID_PRIVATE_KEY,
)

export const addListItem = async (payload: Item, trx?: Transaction) => {
  await ShoppingListEntry.transaction(
    trx ?? ShoppingListEntry.knex(),
    async (t) => {
      await ShoppingListEntry.query(t).insert(payload).onConflict('id').merge()
    },
  )
}

export const removeListItem = async (
  payload: { id: string },
  trx?: Transaction,
) => {
  await ShoppingListEntry.query(trx)
    .findById(payload.id)
    .patch({ deleted: true })
}

export const updateListItemValue = async (
  payload: { id: string; newValue: string },
  trx?: Transaction,
) => {
  await ShoppingListEntry.query(trx)
    .findById(payload.id)
    .patch({ value: payload.newValue })
}

export const updateListItemChecked = async (
  payload: { id: string; newChecked: boolean },
  trx?: Transaction,
) => {
  await ShoppingListEntry.query(trx)
    .findById(payload.id)
    .patch({ checked: payload.newChecked })
}

export const clearList = async (
  payload: { listId: ListId },
  trx?: Transaction,
) => {
  await ShoppingListEntry.transaction(
    trx ?? ShoppingListEntry.knex(),
    async (t) => {
      await ShoppingListEntry.query(t).where('listId', payload.listId).delete()
      await insertInitial(t, payload.listId)
    },
  )
}

export const setList = async (
  payload: Record<string, Item>,
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

export const addList = async (payload: List) => {
  await ListModel.transaction(async (trx) => {
    await ListModel.query(trx).insert(payload).onConflict('id').merge()
    await insertInitial(trx, payload.id)
  })
}

export const updateList = async (payload: List) => {
  await ListModel.query().findById(payload.id).patch({
    name: payload.name,
    colour: payload.colour,
  })
}

export const removeList = async (payload: { id: ListId }) => {
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

export const subscribePushNotifications = async (payload: {
  userId: string
  subscription: {
    endpoint: string
    expirationTime?: number | null
    keys: { auth: string; p256dh: string }
  }
}) => {
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

export const unsubscribePushNotifications = async (userId: string) => {
  await PushSubscription.query().findOne({ userId }).delete()
}

export const signalFinishedShoppingList = async (userId: string) => {
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
