import type { Item as SharedItem } from '@shoppinglist/shared'
import type { Tagged } from 'type-fest'

export type ItemId = Tagged<'ItemId', string>

export interface Item extends Omit<SharedItem, 'id' | 'prevItemId'> {
  id: ItemId
  prevItemId: ItemId | 'HEAD'
}
