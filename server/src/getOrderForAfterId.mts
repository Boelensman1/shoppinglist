import Knex from 'knex'

import ShoppingListEntry from './ShoppingListEntry.mjs'

const SPACE_BETWEEN_ENTRIES = 100000

const distributeEntryOrders = async (
  trx: Knex.Knex<any, any[]>,
): Promise<number> => {
  const currentEntries = await ShoppingListEntry.query(trx)
    .orderBy('order')
    .select(['id'])

  const newEntries = currentEntries.map(({ id }, i) => ({
    id,
    order: Number.MIN_SAFE_INTEGER + i * SPACE_BETWEEN_ENTRIES,
  }))

  // Patch all entries to use the new ordering
  for (const entry of newEntries) {
    await ShoppingListEntry.query(trx)
      .patch({ order: entry.order })
      .where('id', '=', entry.id)
  }

  // return new biggest order
  return newEntries[newEntries.length].order
}

const getOrderForAfterId = async (
  afterId: string,
  trx: Knex.Knex<any, any[]>,
  retryIfFull = true,
): Promise<number> => {
  const entryBefore = await ShoppingListEntry.query(trx)
    .findById(afterId)
    .select('order')
    .throwIfNotFound()
  const entryAfter = await ShoppingListEntry.query(trx)
    .where('order', '>', entryBefore.order)
    .orderBy('order')
    .select('order')
    .limit(1)
    .first()

  const order = entryAfter
    ? Math.round((entryBefore.order + entryAfter.order) / 2)
    : entryBefore.order + SPACE_BETWEEN_ENTRIES

  if (order === entryBefore.order || order === entryAfter?.order) {
    if (!retryIfFull) {
      throw new Error('Could not find order.')
    }
    await distributeEntryOrders(trx)
    return getOrderForAfterId(afterId, trx, false)
  }
  return order
}

export default getOrderForAfterId
