import { State } from '@/types/store/State'

class IndexedDbManager {
  db: IDBDatabase | null = null

  async init() {
    return new Promise((resolve, reject) => {
      const request = window.indexedDB.open('ItemsDb', 1)
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

        db.createObjectStore('items', { keyPath: 'id' })
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
}

export default IndexedDbManager
