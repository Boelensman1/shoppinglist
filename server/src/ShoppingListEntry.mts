import { Model, Pojo } from 'objection'

class ShoppingListEntry extends Model {
  id!: string
  value!: string
  checked!: boolean
  prevItemId!: string
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
    return {
      type: 'object',
      required: ['id', 'value', 'checked', 'deleted', 'prevItemId'],

      properties: {
        id: { type: 'string' },
        value: { type: 'string' },
        checked: { type: 'boolean' },
        deleted: { type: 'boolean' },
        prevItemId: { type: 'string' },
        createdAt: { type: 'string', format: 'date-time' },
        updatedAt: { type: ['string', 'null'], format: 'date-time' },
      },
    }
  }
}

export default ShoppingListEntry
