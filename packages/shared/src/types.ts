import type { Item } from './schemas.js'

export type { Item }

// TypeScript types (with proper recursive types for compile-time safety)
export type ParsedMessageUndoable =
  | { type: 'ADD_LIST_ITEM'; payload: Item & { afterId: string } }
  | { type: 'REMOVE_LIST_ITEM'; payload: { id: string } }
  | { type: 'UPDATE_LIST_ITEM_VALUE'; payload: { id: string; newValue: string } }
  | { type: 'UPDATE_LIST_ITEM_CHECKED'; payload: { id: string; newChecked: boolean } }
  | { type: 'CLEAR_LIST' }
  | { type: 'SET_LIST'; payload: Item[] }
  | { type: 'BATCH'; payload: ParsedMessageUndoable[] }

export type ParsedMessage =
  | ParsedMessageUndoable
  | { type: 'SYNC_WITH_SERVER'; payload: ParsedMessageUndoable[] }
  | { type: 'SIGNAL_FINISHED_SHOPPINGLIST'; payload: { userId: string } }
  | { type: 'SUBSCRIBE_USER_PUSH_NOTIFICATIONS'; payload: { userId: string; subscription: any } }
  | { type: 'UNSUBSCRIBE_USER_PUSH_NOTIFICATIONS'; payload: { userId: string } }
