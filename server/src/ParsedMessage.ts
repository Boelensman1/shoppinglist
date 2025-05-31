interface Item {
  id: string
  value: string
  checked: boolean
}

interface ParsedMessage_syncWithServer {
  type: 'SYNC_WITH_SERVER'
  payload: ParsedMessageUndoable[]
}
interface ParsedMessage_addItem {
  type: 'ADD_LIST_ITEM'
  payload: Item & {
    afterId: string
  }
}
interface ParsedMessage_removeItem {
  type: 'REMOVE_LIST_ITEM'
  payload: {
    id: string
  }
}
interface ParsedMessage_updateValue {
  type: 'UPDATE_LIST_ITEM_VALUE'
  payload: { id: string; newValue: string }
}
interface ParsedMessage_updateChecked {
  type: 'UPDATE_LIST_ITEM_CHECKED'
  payload: { id: string; newChecked: boolean }
}
interface ParsedMessage_clearList {
  type: 'CLEAR_LIST'
}
interface ParsedMessage_setList {
  type: 'SET_LIST'
  payload: Item[]
}
interface ParsedMessage_batch {
  type: 'BATCH'
  payload: ParsedMessageUndoable[]
}

type ParsedMessageUndoable =
  | ParsedMessage_addItem
  | ParsedMessage_removeItem
  | ParsedMessage_updateValue
  | ParsedMessage_updateChecked
  | ParsedMessage_clearList
  | ParsedMessage_setList
  | ParsedMessage_batch

type ParsedMessage = ParsedMessageUndoable | ParsedMessage_syncWithServer

export default ParsedMessage
