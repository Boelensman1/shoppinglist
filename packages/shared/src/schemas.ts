import { z } from 'zod'

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

export const ItemIdSchema = z.string().brand('ItemId')

// Item schema
export const ItemSchema = z.object({
  id: ItemIdSchema,
  value: z.string(),
  checked: z.boolean(),
  deleted: z.boolean(),
  prevItemId: ItemIdSchema.or(z.literal('HEAD')),
})

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
export const ParsedMessage_addItemSchema = z.object({
  type: z.literal(messageTypes.ADD_LIST_ITEM),
  payload: ItemSchema,
})

export const ParsedMessage_removeItemSchema = z.object({
  type: z.literal(messageTypes.REMOVE_LIST_ITEM),
  payload: z.object({
    id: ItemIdSchema,
    displayedPrevItemId: ItemIdSchema.optional(),
    displayedNextItemId: ItemIdSchema.optional(),
  }),
})

export const ParsedMessage_updateValueSchema = z.object({
  type: z.literal(messageTypes.UPDATE_LIST_ITEM_VALUE),
  payload: z.object({
    id: ItemIdSchema,
    newValue: z.string(),
  }),
})

export const ParsedMessage_updateCheckedSchema = z.object({
  type: z.literal(messageTypes.UPDATE_LIST_ITEM_CHECKED),
  payload: z.object({
    id: ItemIdSchema,
    newChecked: z.boolean(),
  }),
})

export const ParsedMessage_clearListSchema = z.object({
  type: z.literal(messageTypes.CLEAR_LIST),
})

export const ParsedMessage_setListSchema = z.object({
  type: z.literal(messageTypes.SET_LIST),
  payload: z.record(ItemIdSchema, ItemSchema),
})

export const ParsedMessage_batchSchema = z.object({
  type: z.literal(messageTypes.BATCH),
  get payload(): z.ZodArray<typeof ParsedMessageUndoableSchema> {
    return z.array(ParsedMessageUndoableSchema)
  },
})

export const ParsedMessage_syncWithServerSchema = z.object({
  type: z.literal(messageTypes.SYNC_WITH_SERVER),
  get payload(): z.ZodArray<typeof ParsedMessageUndoableSchema> {
    return z.array(ParsedMessageUndoableSchema)
  },
})

export const ParsedMessage_signalFinishedShoppingListSchema = z.object({
  type: z.literal(messageTypes.SIGNAL_FINISHED_SHOPPINGLIST),
  payload: z.object({
    userId: z.string(),
  }),
})

export const ParsedMessage_subscribeUserPushNotificationsSchema = z.object({
  type: z.literal(messageTypes.SUBSCRIBE_USER_PUSH_NOTIFICATIONS),
  payload: z.object({
    userId: z.string(),
    subscription: PushSubscriptionSchema,
  }),
})

export const ParsedMessage_unSubscribeUserPushNotificationsSchema = z.object({
  type: z.literal(messageTypes.UNSUBSCRIBE_USER_PUSH_NOTIFICATIONS),
  payload: z.object({
    userId: z.string(),
  }),
})

const parsedMessageUndoableList = [
  ParsedMessage_addItemSchema,
  ParsedMessage_removeItemSchema,
  ParsedMessage_updateValueSchema,
  ParsedMessage_updateCheckedSchema,
  ParsedMessage_clearListSchema,
  ParsedMessage_setListSchema,
  ParsedMessage_batchSchema,
] as const

const parsedMessageNotUndoableList = [
  ParsedMessage_syncWithServerSchema,
  ParsedMessage_signalFinishedShoppingListSchema,
  ParsedMessage_subscribeUserPushNotificationsSchema,
  ParsedMessage_unSubscribeUserPushNotificationsSchema,
] as const

export const ParsedMessageUndoableSchema = z.discriminatedUnion('type', [
  ...parsedMessageUndoableList,
]) as z.ZodDiscriminatedUnion<typeof parsedMessageUndoableList>

export const ParsedMessageSchema = z.discriminatedUnion('type', [
  ...parsedMessageUndoableList,
  ...parsedMessageNotUndoableList,
])

// client->server only messages
export const ParsedMessage_initialFullDataSchema = z.object({
  type: z.literal(messageTypes.INITIAL_FULL_DATA),
  payload: z.record(ItemIdSchema, ItemSchema),
})

export type ParsedMessageUndoableFromSchema = z.infer<
  typeof ParsedMessageUndoableSchema
>
export type ParsedMessageFromSchema = z.infer<typeof ParsedMessageSchema>
