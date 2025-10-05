// tombstoned linked list
import type { Item } from '@/types/store/Item'
import type { State } from '@/types/store/State'

type ItemsWithPrevId = Map<Item['prevItemId'], Item['id'][]>

const addItemsToList = (
  itemList: Item[],
  items: State['items'],
  itemsWithPrevId: ItemsWithPrevId,
  ref: Item['prevItemId'],
) => {
  // start by adding the current ref
  const itemsToAdd =
    itemsWithPrevId.get(ref)?.toSorted((a, b) => -a.localeCompare(b)) ?? []

  // recurse and add them
  itemsToAdd.forEach((id) => {
    itemList.push(items[id])
    addItemsToList(itemList, items, itemsWithPrevId, id)
  })
}

export const itemsToList = (items: State['items']): Item[] => {
  // start by creating a map of prevIds
  const itemsWithPrevId: ItemsWithPrevId = new Map()
  Object.values(items).forEach((item) => {
    const ids = itemsWithPrevId.get(item.prevItemId) || []
    ids.push(item.id)
    itemsWithPrevId.set(item.prevItemId, ids)
  })

  const itemList: Item[] = []
  console.log([...itemsWithPrevId.entries()])
  addItemsToList(itemList, items, itemsWithPrevId, 'HEAD')

  return itemList
    .filter((item) => !item.deleted)
    .sort((a, b) => {
      if (a.checked) {
        return b.checked ? 0 : 1
      }
      if (b.checked) {
        return a.checked ? 0 : -1
      }
      return 0
    })
}
