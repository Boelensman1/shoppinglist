import type { Transaction } from 'objection'

import ShoppingListEntry from './ShoppingListEntry.mjs'
import { HLC_ZERO, type ItemId, type ListId } from './shared/index.mjs'

export const DEFAULT_LIST_ID = 'default' as ListId

export const insertInitial = (
  trx?: Transaction,
  listId: ListId = DEFAULT_LIST_ID,
  hlcTimestamp: string = HLC_ZERO,
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
      hlcTimestamp,
    })
    .onConflict('id')
    .ignore()
}
