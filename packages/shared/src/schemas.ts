import { z } from 'zod'

// Item schema
export const ItemSchema = z.object({
  id: z.string(),
  value: z.string(),
  checked: z.boolean(),
  deleted: z.boolean(),
  prevItemId: z.string(),
})

export type ItemFromSchema = z.infer<typeof ItemSchema>

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
export const ParsedMessage_addItem = z.object({
  type: z.literal('ADD_LIST_ITEM'),
  payload: ItemSchema,
})

export const ParsedMessage_removeItem = z.object({
  type: z.literal('REMOVE_LIST_ITEM'),
  payload: z.object({
    id: z.string(),
  }),
})

export const ParsedMessage_updateValue = z.object({
  type: z.literal('UPDATE_LIST_ITEM_VALUE'),
  payload: z.object({
    id: z.string(),
    newValue: z.string(),
  }),
})

export const ParsedMessage_updateChecked = z.object({
  type: z.literal('UPDATE_LIST_ITEM_CHECKED'),
  payload: z.object({
    id: z.string(),
    newChecked: z.boolean(),
  }),
})

export const ParsedMessage_clearList = z.object({
  type: z.literal('CLEAR_LIST'),
})

export const ParsedMessage_setList = z.object({
  type: z.literal('SET_LIST'),
  payload: z.array(ItemSchema),
})

export const ParsedMessage_batch = z.object({
  type: z.literal('BATCH'),
  get payload(): z.ZodArray<typeof ParsedMessageUndoableSchema> {
    return z.array(ParsedMessageUndoableSchema)
  },
})

export const ParsedMessage_syncWithServer = z.object({
  type: z.literal('SYNC_WITH_SERVER'),
  get payload(): z.ZodArray<typeof ParsedMessageUndoableSchema> {
    return z.array(ParsedMessageUndoableSchema)
  },
})

export const ParsedMessage_signalFinishedShoppingList = z.object({
  type: z.literal('SIGNAL_FINISHED_SHOPPINGLIST'),
  payload: z.object({
    userId: z.string(),
  }),
})

export const ParsedMessage_subscribeUserPushNotifications = z.object({
  type: z.literal('SUBSCRIBE_USER_PUSH_NOTIFICATIONS'),
  payload: z.object({
    userId: z.string(),
    subscription: PushSubscriptionSchema,
  }),
})

export const ParsedMessage_unSubscribeUserPushNotifications = z.object({
  type: z.literal('UNSUBSCRIBE_USER_PUSH_NOTIFICATIONS'),
  payload: z.object({
    userId: z.string(),
  }),
})

const parsedMessageUndoableList = [
  ParsedMessage_addItem,
  ParsedMessage_removeItem,
  ParsedMessage_updateValue,
  ParsedMessage_updateChecked,
  ParsedMessage_clearList,
  ParsedMessage_setList,
  ParsedMessage_batch,
] as const

const parsedMessageNotUndoableList = [
  ParsedMessage_syncWithServer,
  ParsedMessage_signalFinishedShoppingList,
  ParsedMessage_subscribeUserPushNotifications,
  ParsedMessage_unSubscribeUserPushNotifications,
] as const

const ParsedMessageUndoableSchema = z.discriminatedUnion('type', [
  ...parsedMessageUndoableList,
]) as z.ZodDiscriminatedUnion<typeof parsedMessageUndoableList>

export const ParsedMessageSchema = z.discriminatedUnion('type', [
  ...parsedMessageUndoableList,
  ...parsedMessageNotUndoableList,
])

export type ParsedMessageUndoableFromSchema = z.infer<
  typeof ParsedMessageUndoableSchema
>
export type ParsedMessageFromSchema = z.infer<typeof ParsedMessageSchema>

// Wire-protocol message type constants shared between client and server
export const messageTypes = {
  ADD_LIST_ITEM: 'ADD_LIST_ITEM' as const,
  REMOVE_LIST_ITEM: 'REMOVE_LIST_ITEM' as const,
  UPDATE_LIST_ITEM_VALUE: 'UPDATE_LIST_ITEM_VALUE' as const,
  UPDATE_LIST_ITEM_CHECKED: 'UPDATE_LIST_ITEM_CHECKED' as const,
  CLEAR_LIST: 'CLEAR_LIST' as const,
  SET_LIST: 'SET_LIST' as const,
  BATCH: 'BATCH' as const,
  SYNC_WITH_SERVER: 'SYNC_WITH_SERVER' as const,
  SIGNAL_FINISHED_SHOPPINGLIST: 'SIGNAL_FINISHED_SHOPPINGLIST' as const,
  SUBSCRIBE_USER_PUSH_NOTIFICATIONS:
    'SUBSCRIBE_USER_PUSH_NOTIFICATIONS' as const,
  UNSUBSCRIBE_USER_PUSH_NOTIFICATIONS:
    'UNSUBSCRIBE_USER_PUSH_NOTIFICATIONS' as const,
  INITIAL_FULL_DATA: 'INITIAL_FULL_DATA' as const,
}
