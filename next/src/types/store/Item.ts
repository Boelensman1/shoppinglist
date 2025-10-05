import type { Tagged } from 'type-fest'

export type ItemId = Tagged<'ItemId', string>

export interface Item {
  id: ItemId
  value: string
  checked: boolean
  deleted: boolean
  prevItemId: ItemId | 'HEAD'
}
