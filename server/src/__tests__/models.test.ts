import { describe, it, expect } from 'vitest'
import ShoppingListEntry from '../ShoppingListEntry.mjs'
import PushSubscription from '../PushSubscription.mjs'

describe('ShoppingListEntry', () => {
  it('should have correct table name', () => {
    expect(ShoppingListEntry.tableName).toBe('shoppingListEntries')
  })

  it('should parse database json and convert boolean fields', () => {
    const entry = new ShoppingListEntry()
    const parsed = entry.$parseDatabaseJson({
      id: 'test-1',
      value: 'Test Item',
      checked: 1, // SQLite stores booleans as integers
      deleted: 0,
      prevItemId: 'INITIAL',
    })

    expect(parsed.checked).toBe(true)
    expect(parsed.deleted).toBe(false)
  })

  it('should have valid json schema', () => {
    const schema = ShoppingListEntry.jsonSchema
    expect(schema.type).toBe('object')
    expect(schema.required).toContain('id')
    expect(schema.required).toContain('value')
    expect(schema.required).toContain('checked')
    expect(schema.required).toContain('deleted')
    expect(schema.required).toContain('prevItemId')
  })
})

describe('PushSubscription', () => {
  it('should have correct table name', () => {
    expect(PushSubscription.tableName).toBe('pushSubscriptions')
  })

  it('should have userId as id column', () => {
    expect(PushSubscription.idColumn).toBe('userId')
  })

  it('should convert to WebPush format', () => {
    const subscription = new PushSubscription()
    subscription.userId = 'user-1'
    subscription.authKey = 'auth-key-123'
    subscription.p256dh = 'p256dh-key-456'
    subscription.endpoint = 'https://example.com/push'
    subscription.expirationTime = 1234567890

    const webPush = subscription.toWebPush()

    expect(webPush.keys.auth).toBe('auth-key-123')
    expect(webPush.keys.p256dh).toBe('p256dh-key-456')
    expect(webPush.endpoint).toBe('https://example.com/push')
    expect(webPush.expirationTime).toBe(1234567890)
  })

  it('should have valid json schema', () => {
    const schema = PushSubscription.jsonSchema
    expect(schema.type).toBe('object')
    expect(schema.required).toContain('authKey')
    expect(schema.required).toContain('p256dh')
    expect(schema.required).toContain('endpoint')
  })
})
