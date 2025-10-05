import { State } from '@/types/store/State'

class IndexedDbManager {
  db: IDBDatabase | null = null

  async init() {
    return new Promise((resolve, reject) => {
      const request = window.indexedDB.open('ItemsDb', 2)
      request.onerror = (event) => {
        const target = event.target as IDBOpenDBRequest
        console.error(event)
        console.error('Error opening indexedDB', target.error)
        reject(target.error)
      }
      request.onsuccess = (event) => {
        const target = event.target as IDBOpenDBRequest
        this.db = target.result
        resolve(true)
      }
      request.onupgradeneeded = (event) => {
        const target = event.target as IDBOpenDBRequest
        // Save the IDBDatabase interface
        const db = target.result

        if (!db.objectStoreNames.contains('items')) {
          db.createObjectStore('items', { keyPath: 'id' })
        }
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'key' })
        }
        this.db = db
        resolve(true)
      }
    })
  }

  async updateItems(items: State['items']) {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        console.error('Db has not been initialised')
        return
      }
      const transaction = this.db.transaction(['items'], 'readwrite')
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
        reject(target.error)
      }
    })
  }

  async getItems(): Promise<State['items']> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        console.error('Db has not been initialised')
        return
      }
      const transaction = this.db.transaction(['items'], 'readonly')
      const objectStore = transaction.objectStore('items')
      const request = objectStore.get('main')
      request.onerror = (event) => {
        console.error(event)
        const target = event.target as IDBOpenDBRequest
        reject(target.error)
      }
      request.onsuccess = (event) => {
        const target = event.target as IDBRequest<{ id: string; items: string }>
        if (target.result) {
          resolve(JSON.parse(target.result.items) as State['items'])
        } else {
          resolve({})
        }
      }
    })
  }

  async saveUserId(userId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        console.error('Db has not been initialised')
        reject(new Error('Db has not been initialised'))
        return
      }
      const transaction = this.db.transaction(['settings'], 'readwrite')
      const objectStore = transaction.objectStore('settings')
      const request = objectStore.put({ key: 'userId', value: userId })
      request.onsuccess = () => {
        resolve()
      }
      request.onerror = (event) => {
        console.error(event)
        const target = event.target as IDBOpenDBRequest
        reject(target.error)
      }
    })
  }

  async getUserId(): Promise<string | null> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        console.error('Db has not been initialised')
        reject(new Error('Db has not been initialised'))
        return
      }
      const transaction = this.db.transaction(['settings'], 'readonly')
      const objectStore = transaction.objectStore('settings')
      const request = objectStore.get('userId')
      request.onerror = (event) => {
        console.error(event)
        const target = event.target as IDBOpenDBRequest
        reject(target.error)
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
    })
  }
}

export default IndexedDbManager
