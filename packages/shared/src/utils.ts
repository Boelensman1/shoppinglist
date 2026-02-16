import type { Item, ItemRecords } from './types.js'

export const itemsListToRecords = (itemsList: Item[]) =>
  itemsList.reduce<ItemRecords>((acc, item) => {
    acc[item.id] = item
    return acc
  }, {})
