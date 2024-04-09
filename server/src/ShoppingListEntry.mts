import { Model, Pojo } from 'objection'

class ShoppingListEntry extends Model {
  id!: string
  value!: string
  checked!: boolean
  order!: number
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
    return json
  }

  static get jsonSchema() {
    return {
      type: 'object',
      required: ['id', 'value', 'checked'],

      properties: {
        id: { type: 'string' },
        value: { type: 'string' },
        checked: { type: 'boolean' },
        order: { type: 'number' },
        createdAt: { type: 'string', format: 'date-time' },
        updatedAt: { type: ['string', 'null'], format: 'date-time' },
      },
    }
  }
}

export default ShoppingListEntry
