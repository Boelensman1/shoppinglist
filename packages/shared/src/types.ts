import type { Tagged } from 'type-fest'
import type {
  ItemFromSchema,
  ParsedMessageFromSchema,
  ParsedMessageUndoableFromSchema,
} from './schemas.js'

export type ItemId = Tagged<'ItemId', string>

export interface Item extends Omit<ItemFromSchema, 'id' | 'prevItemId'> {
  id: ItemId
  prevItemId: ItemId | 'HEAD'
}

export type ParsedMessageUndoable = ParsedMessageUndoableFromSchema
export type ParsedMessage = ParsedMessageFromSchema
