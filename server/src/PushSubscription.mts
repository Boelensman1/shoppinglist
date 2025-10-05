import type { PushSubscription as PushSubscriptionJSON } from 'web-push'
import { Model } from 'objection'

class PushSubscription extends Model {
  userId!: string
  authKey!: string
  p256dh!: string
  endpoint!: string
  expirationTime?: number
  createdAt!: string
  updatedAt?: string

  public toWebPush(): PushSubscriptionJSON {
    return {
      keys: {
        auth: this.authKey,
        p256dh: this.p256dh,
      },
      endpoint: this.endpoint,
      expirationTime: this.expirationTime,
    }
  }

  static get tableName() {
    return 'pushSubscriptions'
  }

  static get idColumn() {
    return 'userId'
  }

  static get jsonSchema() {
    return {
      type: 'object',
      required: ['authKey', 'p256dh', 'endpoint'],

      properties: {
        userId: { type: 'string' },
        authKey: { type: 'string' },
        p256dh: { type: 'string' },
        endpoint: { type: 'string' },
        expirationTime: { type: ['integer', 'null'] },
        createdAt: { type: 'string', format: 'date-time' },
        updatedAt: { type: ['string', 'null'], format: 'date-time' },
      },
    }
  }
}

export default PushSubscription
