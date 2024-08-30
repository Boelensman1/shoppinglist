interface ParsedMessage_syncWithServer {
  type: 'SYNC_WITH_SERVER'
  payload: ParsedMessageUndoable[]
}
interface ParsedMessage_addItem {
  type: 'ADD_LIST_ITEM'
  payload: {
    afterId: string
    item: { id: string; value: string; checked: boolean }
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

type ParsedMessageUndoable =
  | ParsedMessage_addItem
  | ParsedMessage_removeItem
  | ParsedMessage_updateValue
  | ParsedMessage_updateChecked

type ParsedMessage = ParsedMessageUndoable | ParsedMessage_syncWithServer

export default ParsedMessage
