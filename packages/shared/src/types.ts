import z from 'zod'

import type {
  ItemIdSchema,
  ItemSchema,
  ListIdSchema,
  ListSchema,
  ParsedMessage_addItemSchema,
  ParsedMessage_addListSchema,
  ParsedMessage_batchSchema,
  ParsedMessage_clearListSchema,
  ParsedMessage_initialFullDataSchema,
  ParsedMessage_removeItemSchema,
  ParsedMessage_removeListSchema,
  ParsedMessage_setListSchema,
  ParsedMessage_signalFinishedShoppingListSchema,
  ParsedMessage_subscribeUserPushNotificationsSchema,
  ParsedMessage_syncWithServerSchema,
  ParsedMessage_unSubscribeUserPushNotificationsSchema,
  ParsedMessage_updateCheckedSchema,
  ParsedMessage_updateValueSchema,
  ParsedMessageFromSchema,
  ParsedMessageUndoableFromSchema,
} from './schemas.js'

export type ItemId = z.infer<typeof ItemIdSchema>
export type ListId = z.infer<typeof ListIdSchema>

export type Item = z.infer<typeof ItemSchema>
export type List = z.infer<typeof ListSchema>

export type ParsedMessageUndoable = ParsedMessageUndoableFromSchema
export type ParsedMessage = ParsedMessageFromSchema

export type ParsedMessage_addItem = z.infer<typeof ParsedMessage_addItemSchema>
export type ParsedMessage_removeItem = z.infer<
  typeof ParsedMessage_removeItemSchema
>
export type ParsedMessage_updateValue = z.infer<
  typeof ParsedMessage_updateValueSchema
>
export type ParsedMessage_updateChecked = z.infer<
  typeof ParsedMessage_updateCheckedSchema
>
export type ParsedMessage_clearList = z.infer<
  typeof ParsedMessage_clearListSchema
>
export type ParsedMessage_setList = z.infer<typeof ParsedMessage_setListSchema>
export type ParsedMessage_batch = z.infer<typeof ParsedMessage_batchSchema>
export type ParsedMessage_syncWithServer = z.infer<
  typeof ParsedMessage_syncWithServerSchema
>
export type ParsedMessage_signalFinishedShoppingList = z.infer<
  typeof ParsedMessage_signalFinishedShoppingListSchema
>
export type ParsedMessage_subscribeUserPushNotifications = z.infer<
  typeof ParsedMessage_subscribeUserPushNotificationsSchema
>
export type ParsedMessage_unSubscribeUserPushNotifications = z.infer<
  typeof ParsedMessage_unSubscribeUserPushNotificationsSchema
>

export type ParsedMessage_initialFullData = z.infer<
  typeof ParsedMessage_initialFullDataSchema
>

export type ParsedMessage_addList = z.infer<typeof ParsedMessage_addListSchema>
export type ParsedMessage_removeList = z.infer<
  typeof ParsedMessage_removeListSchema
>

export type ItemRecords = Record<ItemId, Item>
export type ListRecords = Record<ListId, List>
