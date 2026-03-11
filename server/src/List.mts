import { JSONSchema, Model } from 'objection'
import z from 'zod'
import { ListSchema } from './shared/index.mjs'

class List extends Model {
  id!: string
  name!: string
  colour!: string
  createdAt!: string
  updatedAt?: string

  static get tableName() {
    return 'lists'
  }

  static get jsonSchema() {
    return z.toJSONSchema(ListSchema) as JSONSchema
  }
}

export default List
