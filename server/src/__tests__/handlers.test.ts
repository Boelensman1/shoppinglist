import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
  vi,
} from 'vitest'
import Knex from 'knex'
import { Model } from 'objection'
import type { ItemId, ListId } from '../shared/index.mjs'

// Mock index.mts to prevent server startup side effects
vi.mock('../index.mjs', async () => {
  // Dynamic import to get the actual insertInitial after DB is set up
  // We return a lazy wrapper that delegates to the real DB operations
  return {
    insertInitial: async (trx: unknown, listId: string = 'default') => {
      const ShoppingListEntry = (await import('../ShoppingListEntry.mjs'))
        .default
      const itemId = (
        listId === 'default' ? 'INITIAL' : `initial-${listId}`
      ) as ItemId
      return ShoppingListEntry.query(trx as never)
        .insert({
          id: itemId,
          value: '',
          checked: false,
          deleted: false,
          prevItemId: 'HEAD',
          listId: listId as ListId,
        })
        .onConflict('id')
        .ignore()
    },
  }
})

const { default: ShoppingListEntry } = await import('../ShoppingListEntry.mjs')
const { default: List } = await import('../List.mjs')
const handlers = await import('../handlers.mjs')

let knex: ReturnType<typeof Knex>

const DEFAULT_LIST_ID = 'default' as ListId

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
    }

    await handlers.addList(newList)

    const items = await ShoppingListEntry.query().where('listId', 'list-1')
    expect(items).toHaveLength(1)
    expect(items[0].id).toBe('initial-list-1')
    expect(items[0].value).toBe('')
    expect(items[0].prevItemId).toBe('HEAD')
    expect(items[0].listId).toBe('list-1')
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
      id: 'item-1' as ItemId,
      value: 'Default item',
      checked: false,
      deleted: false,
      prevItemId: 'HEAD',
      listId: DEFAULT_LIST_ID,
    })
    await ShoppingListEntry.query().insert({
      id: 'item-2' as ItemId,
      value: 'Other item',
      checked: false,
      deleted: false,
      prevItemId: 'HEAD',
      listId: 'list-2' as ListId,
    })

    await handlers.removeList({ id: 'list-2' as ListId })

    const lists = await List.query()
    expect(lists).toHaveLength(1)
    expect(lists[0].id).toBe('default')

    const items = await ShoppingListEntry.query()
    expect(items).toHaveLength(1)
    expect(items[0].id).toBe('item-1')
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
      id: 'item-1' as ItemId,
      value: 'Default item',
      checked: false,
      deleted: false,
      prevItemId: 'HEAD',
      listId: DEFAULT_LIST_ID,
    })
    await ShoppingListEntry.query().insert({
      id: 'item-2' as ItemId,
      value: 'Other item',
      checked: false,
      deleted: false,
      prevItemId: 'HEAD',
      listId: 'list-2' as ListId,
    })

    await handlers.clearList({ listId: DEFAULT_LIST_ID })

    const items = await ShoppingListEntry.query()
    // Should have the other list's item + the new initial item for default list
    const defaultItems = items.filter((i) => i.listId === DEFAULT_LIST_ID)
    const otherItems = items.filter((i) => i.listId === ('list-2' as ListId))

    expect(otherItems).toHaveLength(1)
    expect(otherItems[0].id).toBe('item-2')
    expect(defaultItems).toHaveLength(1)
    expect(defaultItems[0].value).toBe('')
  })
})

describe('addListItem', () => {
  it('should store item with correct listId', async () => {
    await handlers.addListItem({
      id: 'item-1' as ItemId,
      value: 'Milk',
      checked: false,
      deleted: false,
      prevItemId: 'HEAD',
      listId: DEFAULT_LIST_ID,
    })

    const items = await ShoppingListEntry.query()
    expect(items).toHaveLength(1)
    expect(items[0].listId).toBe('default')
  })
})

describe('getFullData', () => {
  it('should return both items and lists', async () => {
    await ShoppingListEntry.query().insert({
      id: 'item-1' as ItemId,
      value: 'Milk',
      checked: false,
      deleted: false,
      prevItemId: 'HEAD',
      listId: DEFAULT_LIST_ID,
    })

    const result = await handlers.getFullData()

    expect(result.items).toBeDefined()
    expect(result.lists).toBeDefined()
    expect(Object.keys(result.items)).toHaveLength(1)
    expect(Object.keys(result.lists)).toHaveLength(1)
    expect(result.lists[DEFAULT_LIST_ID]).toBeDefined()
    expect(result.lists[DEFAULT_LIST_ID].name).toBe('Boodschappen')
  })
})
