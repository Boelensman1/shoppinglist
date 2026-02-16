import { JSONSchema, Model, Pojo } from 'objection'
import z from 'zod'
import { ItemId, ItemSchema } from '@shoppinglist/shared'

class ShoppingListEntry extends Model {
  id!: ItemId
  value!: string
  checked!: boolean
  prevItemId!: ItemId | 'HEAD'
  deleted!: boolean
  createdAt!: string
  updatedAt?: string

  static get tableName() {
    return 'shoppingListEntries'
  }

  $parseDatabaseJson(json: Pojo) {
    json = super.$parseDatabaseJson(json)
    if (json.checked !== undefined) {
      json.checked = Boolean(json.checked)
    }
    if (json.deleted !== undefined) {
      json.deleted = Boolean(json.deleted)
    }
    return json
  }

  static get jsonSchema() {
    return z.toJSONSchema(ItemSchema) as JSONSchema
  }
}

export default ShoppingListEntry
