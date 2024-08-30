import type Item from './types/Item'

import IndexedDbManager from '../IndexedDbManager'

const saveItemsInIndexedDB = (idbm: IndexedDbManager, items: Item[]) => {
  idbm.updateItems(JSON.stringify(items))
}

export default saveItemsInIndexedDB
