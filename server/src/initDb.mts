import type Knex from 'knex'
import List from './List.mjs'

import { DEFAULT_LIST_ID, insertInitial } from './insertInitial.mjs'
import { HLC_ZERO } from './shared/hlc.mjs'

export const initDb = async (knex: ReturnType<typeof Knex>) => {
  // Create lists table if it doesn't exist
  if (!(await knex.schema.hasTable('lists'))) {
    await knex.schema.createTable('lists', (table) => {
      table.string('id').primary()
      table.string('name').notNullable()
      table.string('colour').notNullable()
      table.timestamps(true, true, true)
    })

    await List.query()
      .insert({
        id: DEFAULT_LIST_ID,
        name: 'Boodschappen',
        colour: '#3b82f6',
      })
      .onConflict('id')
      .ignore()
  }

  if (!(await knex.schema.hasTable('shoppingListEntries'))) {
    await knex.schema.createTable('shoppingListEntries', (table) => {
      table.string('id').primary()
      table.string('prevItemId').notNullable()
      table.string('value').notNullable()
      table.boolean('checked').notNullable()
      table.boolean('deleted').notNullable()
      table.string('listId').notNullable().defaultTo('default')
      table.timestamps(true, true, true)
    })

    await insertInitial()
  } else if (!(await knex.schema.hasColumn('shoppingListEntries', 'listId'))) {
    // Migration: add listId column to existing table
    await knex.schema.alterTable('shoppingListEntries', (table) => {
      table.string('listId').notNullable().defaultTo('default')
    })
  }

  // Migration: add hlcTimestamp column
  if (!(await knex.schema.hasColumn('shoppingListEntries', 'hlcTimestamp'))) {
    await knex.schema.alterTable('shoppingListEntries', (table) => {
      table.string('hlcTimestamp')
    })
    // Backfill existing rows before making the column non-nullable
    await knex('shoppingListEntries')
      .whereNull('hlcTimestamp')
      .update({ hlcTimestamp: HLC_ZERO })
    await knex.schema.alterTable('shoppingListEntries', (table) => {
      table.string('hlcTimestamp').notNullable().alter()
    })
  }

  // Ensure default list exists (for existing databases)
  await List.query()
    .insert({
      id: DEFAULT_LIST_ID,
      name: 'Boodschappen',
      colour: '#3b82f6',
    })
    .onConflict('id')
    .ignore()

  if (!(await knex.schema.hasTable('pushSubscriptions'))) {
    await knex.schema.createTable('pushSubscriptions', (table) => {
      table.string('userId').primary()
      table.string('authKey').notNullable()
      table.string('p256dh').notNullable()
      table.string('endpoint').notNullable()
      table.integer('expirationTime').unsigned()
      table.timestamps(true, true, true)
    })
  }
}
