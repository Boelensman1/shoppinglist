import type { Item } from '@shoppinglist/shared'
import type { State } from '@/types/store/State'

class IndexedDbManager {
  db: IDBDatabase | null = null

  private createError(context: string, originalError?: unknown): Error {
    const errorMessage =
      originalError instanceof Error
        ? originalError.message
        : String(originalError)
    return new Error(`IndexedDB ${context}: ${errorMessage}`)
  }

  private ensureDb(operation: string): IDBDatabase {
    if (!this.db) {
      throw this.createError(operation, 'Database not initialized')
    }
    return this.db
  }

  async init() {
    return new Promise((resolve, reject) => {
      const request = window.indexedDB.open('ShoppinglistDB', 1)
      request.onerror = (event) => {
        const target = event.target as IDBOpenDBRequest
        console.error(event)
        reject(this.createError('initialization', target.error))
      }
      request.onsuccess = (event) => {
        const target = event.target as IDBOpenDBRequest
        this.db = target.result
        resolve(true)
      }
      request.onupgradeneeded = (event) => {
        const target = event.target as IDBOpenDBRequest
        const db = target.result

        if (!db.objectStoreNames.contains('items')) {
          db.createObjectStore('items', { keyPath: 'id' })
        }
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'key' })
        }
        if (!db.objectStoreNames.contains('pendingNotifications')) {
          db.createObjectStore('pendingNotifications', { keyPath: 'id' })
        }
      }
    })
  }

  async updateItems(items: State['items']) {
    return new Promise((resolve, reject) => {
      try {
        const db = this.ensureDb('updateItems')
        const transaction = db.transaction(['items'], 'readwrite')
        const objectStore = transaction.objectStore('items')
        objectStore.delete('main')
        const request = objectStore.add({
          id: 'main',
          items: JSON.stringify(items),
        })
        request.onsuccess = () => {
          resolve(true)
        }
        request.onerror = (event) => {
          console.error(event)
          const target = event.target as IDBOpenDBRequest
          reject(this.createError('updateItems', target.error))
        }
      } catch (error) {
        reject(this.createError('updateItems', error))
      }
    })
  }

  async getItems(): Promise<State['items']> {
    return new Promise((resolve, reject) => {
      try {
        const db = this.ensureDb('getItems')
        const transaction = db.transaction(['items'], 'readonly')
        const objectStore = transaction.objectStore('items')
        const request = objectStore.get('main')
        request.onerror = (event) => {
          console.error(event)
          const target = event.target as IDBOpenDBRequest
          reject(this.createError('getItems', target.error))
        }
        request.onsuccess = (event) => {
          const target = event.target as IDBRequest<{
            id: string
            items: string
          }>
          if (target.result) {
            resolve(JSON.parse(target.result.items) as State['items'])
          } else {
            resolve({})
          }
        }
      } catch (error) {
        reject(this.createError('getItems', error))
      }
    })
  }

  async saveUserId(userId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const db = this.ensureDb('saveUserId')
        const transaction = db.transaction(['settings'], 'readwrite')
        const objectStore = transaction.objectStore('settings')
        const request = objectStore.put({ key: 'userId', value: userId })
        request.onsuccess = () => {
          resolve()
        }
        request.onerror = (event) => {
          console.error(event)
          const target = event.target as IDBOpenDBRequest
          reject(this.createError('saveUserId', target.error))
        }
      } catch (error) {
        reject(this.createError('saveUserId', error))
      }
    })
  }

  async getUserId(): Promise<string | null> {
    return new Promise((resolve, reject) => {
      try {
        const db = this.ensureDb('getUserId')
        const transaction = db.transaction(['settings'], 'readonly')
        const objectStore = transaction.objectStore('settings')
        const request = objectStore.get('userId')
        request.onerror = (event) => {
          console.error(event)
          const target = event.target as IDBOpenDBRequest
          reject(this.createError('getUserId', target.error))
        }
        request.onsuccess = (event) => {
          const target = event.target as IDBRequest<{
            key: string
            value: string
          }>
          if (target.result) {
            resolve(target.result.value)
          } else {
            resolve(null)
          }
        }
      } catch (error) {
        reject(this.createError('getUserId', error))
      }
    })
  }

  async getPendingNotification(): Promise<Item[] | null> {
    return new Promise((resolve, reject) => {
      try {
        const db = this.ensureDb('getPendingNotification')
        const transaction = db.transaction(['pendingNotifications'], 'readonly')
        const objectStore = transaction.objectStore('pendingNotifications')
        const request = objectStore.get('latest')
        request.onerror = (event) => {
          console.error(event)
          const target = event.target as IDBOpenDBRequest
          reject(this.createError('getPendingNotification', target.error))
        }
        request.onsuccess = (event) => {
          const target = event.target as IDBRequest<{
            id: string
            items: Item[]
            timestamp: number
          }>
          if (target.result) {
            resolve(target.result.items)
          } else {
            resolve(null)
          }
        }
      } catch (error) {
        reject(this.createError('getPendingNotification', error))
      }
    })
  }

  async clearPendingNotification(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const db = this.ensureDb('clearPendingNotification')
        const transaction = db.transaction(
          ['pendingNotifications'],
          'readwrite',
        )
        const objectStore = transaction.objectStore('pendingNotifications')
        const request = objectStore.delete('latest')
        request.onsuccess = () => {
          resolve()
        }
        request.onerror = (event) => {
          console.error(event)
          const target = event.target as IDBOpenDBRequest
          reject(this.createError('clearPendingNotification', target.error))
        }
      } catch (error) {
        reject(this.createError('clearPendingNotification', error))
      }
    })
  }
}

export default IndexedDbManager
