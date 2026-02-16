// tombstoned linked list
import type { Item, ItemId } from '@shoppinglist/shared'
import type { State } from '@/types/store/State'

type ItemsWithPrevId = Map<Item['prevItemId'], Item['id'][]>

export type ItemWithDisplayedInfo = Item & {
  displayedPrevItemId?: ItemId
  displayedNextItemId?: ItemId
}

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

export const itemsToList = (items: State['items']): ItemWithDisplayedInfo[] => {
  // start by creating a map of prevIds
  const itemsWithPrevId: ItemsWithPrevId = new Map()
  Object.values(items).forEach((item) => {
    const ids = itemsWithPrevId.get(item.prevItemId) || []
    ids.push(item.id)
    itemsWithPrevId.set(item.prevItemId, ids)
  })

  const itemList: Item[] = []
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
    .map((item, index, arr) => ({
      ...item,
      displayedPrevItemId: index === 0 ? undefined : arr[index - 1].id,
      displayedNextItemId:
        index === arr.length - 1 ? undefined : arr[index + 1].id,
    }))
}
