import { z } from 'zod'

// Item schema
export const ItemSchema = z.object({
  id: z.string(),
  value: z.string(),
  checked: z.boolean(),
  deleted: z.boolean(),
  prevItemId: z.string(),
})

export type Item = z.infer<typeof ItemSchema>

// PushSubscription schema (from web-push)
const PushSubscriptionSchema = z.object({
  endpoint: z.string(),
  expirationTime: z.number().nullable().optional(),
  keys: z.object({
    auth: z.string(),
    p256dh: z.string(),
  }),
})

// Individual message schemas
const ParsedMessage_addItem = z.object({
  type: z.literal('ADD_LIST_ITEM'),
  payload: ItemSchema.extend({
    afterId: z.string(),
  }),
})

const ParsedMessage_removeItem = z.object({
  type: z.literal('REMOVE_LIST_ITEM'),
  payload: z.object({
    id: z.string(),
  }),
})

const ParsedMessage_updateValue = z.object({
  type: z.literal('UPDATE_LIST_ITEM_VALUE'),
  payload: z.object({
    id: z.string(),
    newValue: z.string(),
  }),
})

const ParsedMessage_updateChecked = z.object({
  type: z.literal('UPDATE_LIST_ITEM_CHECKED'),
  payload: z.object({
    id: z.string(),
    newChecked: z.boolean(),
  }),
})

const ParsedMessage_clearList = z.object({
  type: z.literal('CLEAR_LIST'),
})

const ParsedMessage_setList = z.object({
  type: z.literal('SET_LIST'),
  payload: z.array(ItemSchema),
})

// For BATCH and SYNC_WITH_SERVER, we use z.any() for the recursive payload
// The actual type safety comes from the TypeScript types below
const ParsedMessage_batch = z.object({
  type: z.literal('BATCH'),
  payload: z.any(), // Will validate at runtime when recursively processed
})

const ParsedMessage_syncWithServer = z.object({
  type: z.literal('SYNC_WITH_SERVER'),
  payload: z.any(), // Will validate at runtime when recursively processed
})

const ParsedMessage_signalFinishedShoppingList = z.object({
  type: z.literal('SIGNAL_FINISHED_SHOPPINGLIST'),
  payload: z.object({
    userId: z.string(),
  }),
})

const ParsedMessage_subscribeUserPushNotifications = z.object({
  type: z.literal('SUBSCRIBE_USER_PUSH_NOTIFICATIONS'),
  payload: z.object({
    userId: z.string(),
    subscription: PushSubscriptionSchema,
  }),
})

const ParsedMessage_unSubscribeUserPushNotifications = z.object({
  type: z.literal('UNSUBSCRIBE_USER_PUSH_NOTIFICATIONS'),
  payload: z.object({
    userId: z.string(),
  }),
})

// Main ParsedMessage discriminated union schema (for runtime validation)
export const ParsedMessageSchema = z.discriminatedUnion('type', [
  ParsedMessage_addItem,
  ParsedMessage_removeItem,
  ParsedMessage_updateValue,
  ParsedMessage_updateChecked,
  ParsedMessage_clearList,
  ParsedMessage_setList,
  ParsedMessage_batch,
  ParsedMessage_syncWithServer,
  ParsedMessage_signalFinishedShoppingList,
  ParsedMessage_subscribeUserPushNotifications,
  ParsedMessage_unSubscribeUserPushNotifications,
])

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

export default ParsedMessage
