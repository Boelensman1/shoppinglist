import { describe, it, expect } from 'vitest'
import { ParsedMessageSchema, ItemSchema } from '@shoppinglist/shared'

describe('ItemSchema', () => {
  it('should validate a valid item', () => {
    const validItem = {
      id: 'item-1',
      value: 'Milk',
      checked: false,
      deleted: false,
      prevItemId: 'INITIAL',
    }

    const result = ItemSchema.safeParse(validItem)
    expect(result.success).toBe(true)
  })

  it('should reject an item with missing fields', () => {
    const invalidItem = {
      id: 'item-1',
      value: 'Milk',
    }

    const result = ItemSchema.safeParse(invalidItem)
    expect(result.success).toBe(false)
  })

  it('should reject an item with wrong types', () => {
    const invalidItem = {
      id: 'item-1',
      value: 'Milk',
      checked: 'false', // should be boolean
      deleted: false,
      prevItemId: 'INITIAL',
    }

    const result = ItemSchema.safeParse(invalidItem)
    expect(result.success).toBe(false)
  })
})

describe('ParsedMessageSchema', () => {
  describe('ADD_LIST_ITEM', () => {
    it('should validate a valid ADD_LIST_ITEM message', () => {
      const validMessage = {
        type: 'ADD_LIST_ITEM',
        payload: {
          id: 'item-1',
          value: 'Milk',
          checked: false,
          deleted: false,
          prevItemId: 'INITIAL',
          afterId: 'INITIAL',
        },
      }

      const result = ParsedMessageSchema.safeParse(validMessage)
      expect(result.success).toBe(true)
    })

    it('should reject ADD_LIST_ITEM without afterId', () => {
      const invalidMessage = {
        type: 'ADD_LIST_ITEM',
        payload: {
          id: 'item-1',
          value: 'Milk',
          checked: false,
          deleted: false,
          prevItemId: 'INITIAL',
        },
      }

      const result = ParsedMessageSchema.safeParse(invalidMessage)
      expect(result.success).toBe(false)
    })
  })

  describe('REMOVE_LIST_ITEM', () => {
    it('should validate a valid REMOVE_LIST_ITEM message', () => {
      const validMessage = {
        type: 'REMOVE_LIST_ITEM',
        payload: {
          id: 'item-1',
        },
      }

      const result = ParsedMessageSchema.safeParse(validMessage)
      expect(result.success).toBe(true)
    })
  })

  describe('UPDATE_LIST_ITEM_VALUE', () => {
    it('should validate a valid UPDATE_LIST_ITEM_VALUE message', () => {
      const validMessage = {
        type: 'UPDATE_LIST_ITEM_VALUE',
        payload: {
          id: 'item-1',
          newValue: 'Updated Milk',
        },
      }

      const result = ParsedMessageSchema.safeParse(validMessage)
      expect(result.success).toBe(true)
    })
  })

  describe('UPDATE_LIST_ITEM_CHECKED', () => {
    it('should validate a valid UPDATE_LIST_ITEM_CHECKED message', () => {
      const validMessage = {
        type: 'UPDATE_LIST_ITEM_CHECKED',
        payload: {
          id: 'item-1',
          newChecked: true,
        },
      }

      const result = ParsedMessageSchema.safeParse(validMessage)
      expect(result.success).toBe(true)
    })

    it('should reject UPDATE_LIST_ITEM_CHECKED with string instead of boolean', () => {
      const invalidMessage = {
        type: 'UPDATE_LIST_ITEM_CHECKED',
        payload: {
          id: 'item-1',
          newChecked: 'true', // should be boolean
        },
      }

      const result = ParsedMessageSchema.safeParse(invalidMessage)
      expect(result.success).toBe(false)
    })
  })

  describe('CLEAR_LIST', () => {
    it('should validate a valid CLEAR_LIST message', () => {
      const validMessage = {
        type: 'CLEAR_LIST',
      }

      const result = ParsedMessageSchema.safeParse(validMessage)
      expect(result.success).toBe(true)
    })
  })

  describe('BATCH', () => {
    it('should validate a valid BATCH message', () => {
      const validMessage = {
        type: 'BATCH',
        payload: [
          {
            type: 'ADD_LIST_ITEM',
            payload: {
              id: 'item-1',
              value: 'Milk',
              checked: false,
              deleted: false,
              prevItemId: 'INITIAL',
              afterId: 'INITIAL',
            },
          },
          {
            type: 'UPDATE_LIST_ITEM_CHECKED',
            payload: {
              id: 'item-1',
              newChecked: true,
            },
          },
        ],
      }

      const result = ParsedMessageSchema.safeParse(validMessage)
      expect(result.success).toBe(true)
    })
  })

  describe('SIGNAL_FINISHED_SHOPPINGLIST', () => {
    it('should validate a valid SIGNAL_FINISHED_SHOPPINGLIST message', () => {
      const validMessage = {
        type: 'SIGNAL_FINISHED_SHOPPINGLIST',
        payload: {
          userId: 'user-123',
        },
      }

      const result = ParsedMessageSchema.safeParse(validMessage)
      expect(result.success).toBe(true)
    })
  })

  describe('Invalid messages', () => {
    it('should reject a message with unknown type', () => {
      const invalidMessage = {
        type: 'UNKNOWN_TYPE',
        payload: {},
      }

      const result = ParsedMessageSchema.safeParse(invalidMessage)
      expect(result.success).toBe(false)
    })

    it('should reject malformed JSON', () => {
      const result = ParsedMessageSchema.safeParse('not an object')
      expect(result.success).toBe(false)
    })

    it('should reject null', () => {
      const result = ParsedMessageSchema.safeParse(null)
      expect(result.success).toBe(false)
    })
  })
})
