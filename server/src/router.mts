import { on } from 'events'
import { z } from 'zod'

import { router, publicProcedure } from './trpc.mjs'
import { ee } from './ee.mjs'
import * as handlers from './handlers.mjs'
import {
  ParsedMessage_addItemSchema,
  ParsedMessage_removeItemSchema,
  ParsedMessage_updateValueSchema,
  ParsedMessage_updateCheckedSchema,
  ParsedMessage_clearListSchema,
  ParsedMessage_setListSchema,
  ParsedMessage_addListSchema,
  ParsedMessage_removeListSchema,
  ParsedMessage_updateListSchema,
  ParsedMessage_subscribeUserPushNotificationsSchema,
  ParsedMessage_unSubscribeUserPushNotificationsSchema,
  ParsedMessage_signalFinishedShoppingListSchema,
  ParsedMessageUndoableSchema,
} from './shared/index.mjs'

export const appRouter = router({
  addListItem: publicProcedure
    .input(ParsedMessage_addItemSchema.shape.payload)
    .mutation(async ({ input, ctx }) => {
      await handlers.addListItem(input)
      ee.emit('broadcast', {
        sessionId: ctx.sessionId,
        data: { type: 'ADD_LIST_ITEM', payload: input },
      })
    }),

  removeListItem: publicProcedure
    .input(ParsedMessage_removeItemSchema.shape.payload)
    .mutation(async ({ input, ctx }) => {
      await handlers.removeListItem(input)
      ee.emit('broadcast', {
        sessionId: ctx.sessionId,
        data: { type: 'REMOVE_LIST_ITEM', payload: input },
      })
    }),

  updateListItemValue: publicProcedure
    .input(ParsedMessage_updateValueSchema.shape.payload)
    .mutation(async ({ input, ctx }) => {
      await handlers.updateListItemValue(input)
      ee.emit('broadcast', {
        sessionId: ctx.sessionId,
        data: { type: 'UPDATE_LIST_ITEM_VALUE', payload: input },
      })
    }),

  updateListItemChecked: publicProcedure
    .input(ParsedMessage_updateCheckedSchema.shape.payload)
    .mutation(async ({ input, ctx }) => {
      await handlers.updateListItemChecked(input)
      ee.emit('broadcast', {
        sessionId: ctx.sessionId,
        data: { type: 'UPDATE_LIST_ITEM_CHECKED', payload: input },
      })
    }),

  clearList: publicProcedure
    .input(ParsedMessage_clearListSchema.shape.payload)
    .mutation(async ({ input, ctx }) => {
      await handlers.clearList(input)
      ee.emit('broadcast', {
        sessionId: ctx.sessionId,
        data: { type: 'CLEAR_LIST', payload: input },
      })
    }),

  setList: publicProcedure
    .input(ParsedMessage_setListSchema.shape.payload)
    .mutation(async ({ input, ctx }) => {
      await handlers.setList(input)
      ee.emit('broadcast', {
        sessionId: ctx.sessionId,
        data: { type: 'SET_LIST', payload: input },
      })
    }),

  batch: publicProcedure
    .input(z.array(ParsedMessageUndoableSchema))
    .mutation(async ({ input, ctx }) => {
      await handlers.executeBatch(input)
      for (const action of input) {
        ee.emit('broadcast', {
          sessionId: ctx.sessionId,
          data: action,
        })
      }
    }),

  addList: publicProcedure
    .input(ParsedMessage_addListSchema.shape.payload)
    .mutation(async ({ input, ctx }) => {
      await handlers.addList(input)
      ee.emit('broadcast', {
        sessionId: ctx.sessionId,
        data: { type: 'ADD_LIST', payload: input },
      })
    }),

  updateList: publicProcedure
    .input(ParsedMessage_updateListSchema.shape.payload)
    .mutation(async ({ input, ctx }) => {
      await handlers.updateList(input)
      ee.emit('broadcast', {
        sessionId: ctx.sessionId,
        data: { type: 'UPDATE_LIST', payload: input },
      })
    }),

  removeList: publicProcedure
    .input(ParsedMessage_removeListSchema.shape.payload)
    .mutation(async ({ input, ctx }) => {
      await handlers.removeList(input)
      ee.emit('broadcast', {
        sessionId: ctx.sessionId,
        data: { type: 'REMOVE_LIST', payload: input },
      })
    }),

  syncWithServer: publicProcedure
    .input(z.array(ParsedMessageUndoableSchema))
    .mutation(async ({ input, ctx }) => {
      for (const action of input) {
        await handlers.executeUndoableAction(action)
        ee.emit('broadcast', {
          sessionId: ctx.sessionId,
          data: action,
        })
      }
      return handlers.getFullData()
    }),

  signalFinishedShoppingList: publicProcedure
    .input(ParsedMessage_signalFinishedShoppingListSchema.shape.payload)
    .mutation(async ({ input }) => {
      await handlers.signalFinishedShoppingList(input.userId)
    }),

  subscribePushNotifications: publicProcedure
    .input(ParsedMessage_subscribeUserPushNotificationsSchema.shape.payload)
    .mutation(async ({ input }) => {
      await handlers.subscribePushNotifications(input)
    }),

  unsubscribePushNotifications: publicProcedure
    .input(ParsedMessage_unSubscribeUserPushNotificationsSchema.shape.payload)
    .mutation(async ({ input }) => {
      await handlers.unsubscribePushNotifications(input.userId)
    }),

  onBroadcast: publicProcedure.subscription(async function* ({ ctx, signal }) {
    for await (const [event] of on(ee, 'broadcast', { signal })) {
      if (event.sessionId !== ctx.sessionId) {
        yield event.data
      }
    }
  }),
})

export type AppRouter = typeof appRouter
