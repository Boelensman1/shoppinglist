import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import Knex from 'knex'
import { Model } from 'objection'
import { HLC_ZERO, type ItemId, type ListId } from '../shared/index.mjs'
import ShoppingListEntry from '../ShoppingListEntry.mjs'
import List from '../List.mjs'
import * as handlers from '../handlers.mjs'

let knex: ReturnType<typeof Knex>

const DEFAULT_LIST_ID = 'default' as ListId
const ITEM_1 = 'item-1' as ItemId
const TS_TEST = '1700000000000:00000:test'

beforeAll(async () => {
  knex = Knex({
    client: 'better-sqlite3',
    connection: { filename: ':memory:' },
    useNullAsDefault: true,
  })

  Model.knex(knex)

  await knex.schema.createTable('lists', (table) => {
    table.string('id').primary()
    table.string('name').notNullable()
    table.string('colour').notNullable()
    table.timestamps(true, true, true)
  })

  await knex.schema.createTable('shoppingListEntries', (table) => {
    table.string('id').primary()
    table.string('prevItemId').notNullable()
    table.string('value').notNullable()
    table.boolean('checked').notNullable()
    table.boolean('deleted').notNullable()
    table.string('listId').notNullable().defaultTo('default')
    table.string('hlcTimestamp').nullable()
    table.timestamps(true, true, true)
  })

  await knex.schema.createTable('pushSubscriptions', (table) => {
    table.string('userId').primary()
    table.string('authKey').notNullable()
    table.string('p256dh').notNullable()
    table.string('endpoint').notNullable()
    table.integer('expirationTime').unsigned()
    table.timestamps(true, true, true)
  })
})

afterAll(async () => {
  await knex.destroy()
})

beforeEach(async () => {
  await knex('shoppingListEntries').truncate()
  await knex('lists').truncate()

  // Insert default list
  await List.query().insert({
    id: DEFAULT_LIST_ID,
    name: 'Boodschappen',
    colour: '#3b82f6',
  })
})

describe('addList', () => {
  it('should insert a new list', async () => {
    const newList = {
      id: 'list-1' as ListId,
      name: 'Hardware Store',
      colour: '#ef4444',
      hlcTimestamp: TS_TEST,
    }

    await handlers.addList(newList)

    const lists = await List.query()
    expect(lists).toHaveLength(2) // default + new
    const inserted = lists.find((l) => l.id === 'list-1')
    expect(inserted).toBeDefined()
    expect(inserted!.name).toBe('Hardware Store')
    expect(inserted!.colour).toBe('#ef4444')
  })

  it('should create an initial empty item for the new list', async () => {
    const newList = {
      id: 'list-1' as ListId,
      name: 'Hardware Store',
      colour: '#ef4444',
      hlcTimestamp: TS_TEST,
    }

    await handlers.addList(newList)

    const items = await ShoppingListEntry.query().where('listId', 'list-1')
    expect(items).toHaveLength(1)
    expect(items[0]!.id).toBe('initial-list-1')
    expect(items[0]!.value).toBe('')
    expect(items[0]!.prevItemId).toBe('HEAD')
    expect(items[0]!.listId).toBe('list-1')
  })
})

describe('removeList', () => {
  it('should remove a list and its items', async () => {
    // Add a second list
    await List.query().insert({
      id: 'list-2' as ListId,
      name: 'Other',
      colour: '#22c55e',
    })

    // Add items to both lists
    await ShoppingListEntry.query().insert({
      id: ITEM_1,
      value: 'Default item',
      checked: false,
      deleted: false,
      prevItemId: 'HEAD',
      listId: DEFAULT_LIST_ID,
      hlcTimestamp: HLC_ZERO,
    })
    await ShoppingListEntry.query().insert({
      id: 'item-2' as ItemId,
      value: 'Other item',
      checked: false,
      deleted: false,
      prevItemId: 'HEAD',
      listId: 'list-2' as ListId,
      hlcTimestamp: HLC_ZERO,
    })

    await handlers.removeList({ id: 'list-2' as ListId })

    const lists = await List.query()
    expect(lists).toHaveLength(1)
    expect(lists[0]!.id).toBe('default')

    const items = await ShoppingListEntry.query()
    expect(items).toHaveLength(1)
    expect(items[0]!.id).toBe('item-1')
  })

  it('should prevent removing the last list', async () => {
    await expect(handlers.removeList({ id: DEFAULT_LIST_ID })).rejects.toThrow(
      'Cannot remove the last list',
    )
  })
})

describe('clearList', () => {
  it('should clear only items for the specified list', async () => {
    // Add a second list
    await List.query().insert({
      id: 'list-2' as ListId,
      name: 'Other',
      colour: '#22c55e',
    })

    // Add items to both lists
    await ShoppingListEntry.query().insert({
      id: ITEM_1,
      value: 'Default item',
      checked: false,
      deleted: false,
      prevItemId: 'HEAD',
      listId: DEFAULT_LIST_ID,
      hlcTimestamp: HLC_ZERO,
    })
    await ShoppingListEntry.query().insert({
      id: 'item-2' as ItemId,
      value: 'Other item',
      checked: false,
      deleted: false,
      prevItemId: 'HEAD',
      listId: 'list-2' as ListId,
      hlcTimestamp: HLC_ZERO,
    })

    await handlers.clearList({
      listId: DEFAULT_LIST_ID,
      hlcTimestamp: TS_TEST,
    })

    const items = await ShoppingListEntry.query()
    // Should have the other list's item + the new initial item for default list
    const defaultItems = items.filter((i) => i.listId === DEFAULT_LIST_ID)
    const otherItems = items.filter((i) => i.listId === ('list-2' as ListId))

    expect(otherItems).toHaveLength(1)
    expect(otherItems[0]!.id).toBe('item-2')
    expect(defaultItems).toHaveLength(1)
    expect(defaultItems[0]!.value).toBe('')
  })
})

describe('addListItem', () => {
  it('should store item with correct listId', async () => {
    await handlers.addListItem({
      id: ITEM_1,
      value: 'Milk',
      checked: false,
      deleted: false,
      prevItemId: 'HEAD',
      listId: DEFAULT_LIST_ID,
      hlcTimestamp: TS_TEST,
    })

    const items = await ShoppingListEntry.query()
    expect(items).toHaveLength(1)
    expect(items[0]!.listId).toBe('default')
  })
})

describe('getFullData', () => {
  it('should return both items and lists', async () => {
    await ShoppingListEntry.query().insert({
      id: ITEM_1,
      value: 'Milk',
      checked: false,
      deleted: false,
      prevItemId: 'HEAD',
      listId: DEFAULT_LIST_ID,
      hlcTimestamp: HLC_ZERO,
    })

    const result = await handlers.getFullData()

    expect(result.items).toBeDefined()
    expect(result.lists).toBeDefined()
    expect(Object.keys(result.items)).toHaveLength(1)
    expect(Object.keys(result.lists)).toHaveLength(1)
    expect(result.lists[DEFAULT_LIST_ID]).toBeDefined()
    expect(result.lists[DEFAULT_LIST_ID]!.name).toBe('Boodschappen')
  })
})

describe('LWW conflict resolution', () => {
  const TS_OLD = '1700000000000:00000:client-a'
  const TS_NEW = '1700000001000:00000:client-b'

  it('should accept a mutation with a newer timestamp', async () => {
    await ShoppingListEntry.query().insert({
      id: ITEM_1,
      value: 'Milk',
      checked: false,
      deleted: false,
      prevItemId: 'HEAD',
      listId: DEFAULT_LIST_ID,
      hlcTimestamp: TS_OLD,
    })

    await handlers.updateListItemChecked({
      id: ITEM_1,
      newChecked: true,
      hlcTimestamp: TS_NEW,
    })

    const item = await ShoppingListEntry.query().findById('item-1')
    expect(item!.checked).toBe(true)
    expect(item!.hlcTimestamp).toBe(TS_NEW)
  })

  it('should reject a mutation with an older timestamp', async () => {
    await ShoppingListEntry.query().insert({
      id: ITEM_1,
      value: 'Milk',
      checked: true,
      deleted: false,
      prevItemId: 'HEAD',
      listId: DEFAULT_LIST_ID,
      hlcTimestamp: TS_NEW,
    })

    await handlers.updateListItemChecked({
      id: ITEM_1,
      newChecked: false,
      hlcTimestamp: TS_OLD,
    })

    const item = await ShoppingListEntry.query().findById('item-1')
    expect(item!.checked).toBe(true) // unchanged
    expect(item!.hlcTimestamp).toBe(TS_NEW)
  })

  it('should reject addListItem with older timestamp on existing item', async () => {
    await ShoppingListEntry.query().insert({
      id: ITEM_1,
      value: 'Milk',
      checked: true,
      deleted: false,
      prevItemId: 'HEAD',
      listId: DEFAULT_LIST_ID,
      hlcTimestamp: TS_NEW,
    })

    await handlers.addListItem({
      id: ITEM_1,
      value: 'Bread',
      checked: false,
      deleted: false,
      prevItemId: 'HEAD',
      listId: DEFAULT_LIST_ID,
      hlcTimestamp: TS_OLD,
    })

    const item = await ShoppingListEntry.query().findById('item-1')
    expect(item!.value).toBe('Milk') // unchanged
    expect(item!.checked).toBe(true) // unchanged
  })

  it('should apply removeListItem LWW guard', async () => {
    await ShoppingListEntry.query().insert({
      id: ITEM_1,
      value: 'Milk',
      checked: false,
      deleted: false,
      prevItemId: 'HEAD',
      listId: DEFAULT_LIST_ID,
      hlcTimestamp: TS_NEW,
    })

    await handlers.removeListItem({
      id: ITEM_1,
      hlcTimestamp: TS_OLD,
    })

    const item = await ShoppingListEntry.query().findById('item-1')
    expect(item!.deleted).toBe(false) // unchanged — stale write rejected
  })

  it('should apply updateListItemValue LWW guard', async () => {
    await ShoppingListEntry.query().insert({
      id: ITEM_1,
      value: 'Milk',
      checked: false,
      deleted: false,
      prevItemId: 'HEAD',
      listId: DEFAULT_LIST_ID,
      hlcTimestamp: TS_NEW,
    })

    await handlers.updateListItemValue({
      id: ITEM_1,
      newValue: 'Stale value',
      hlcTimestamp: TS_OLD,
    })

    const item = await ShoppingListEntry.query().findById('item-1')
    expect(item!.value).toBe('Milk') // unchanged
  })
})
