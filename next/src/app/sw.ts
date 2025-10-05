/// <reference lib="webworker" />
import type { PrecacheEntry, SerwistGlobalConfig } from 'serwist'
import { defaultCache } from '@serwist/next/worker'
import { Serwist } from 'serwist'

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined
  }
}

declare const self: ServiceWorkerGlobalScope

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: defaultCache,
})

// Notification handling (preserve existing functionality)
async function storeNotificationData(items: unknown) {
  return new Promise((resolve, reject) => {
    const request = self.indexedDB.open('ShoppinglistDB', 1)

    request.onerror = () => {
      console.error('[SW] IndexedDB open error:', request.error)
      reject(request.error)
    }

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result
      if (!db.objectStoreNames.contains('pendingNotifications')) {
        db.createObjectStore('pendingNotifications', { keyPath: 'id' })
      }
    }

    request.onsuccess = () => {
      const db = request.result
      if (!db.objectStoreNames.contains('pendingNotifications')) {
        console.warn('[SW] Object store does not exist')
        resolve(undefined)
        return
      }
      const transaction = db.transaction(['pendingNotifications'], 'readwrite')
      const store = transaction.objectStore('pendingNotifications')
      const putRequest = store.put({
        id: 'latest',
        items,
        timestamp: Date.now(),
      })

      putRequest.onsuccess = () => console.log('[SW] Data stored successfully')
      putRequest.onerror = () =>
        console.error('[SW] Put error:', putRequest.error)

      transaction.oncomplete = () => {
        console.log('[SW] Transaction complete')
        resolve(undefined)
      }
      transaction.onerror = () => {
        console.error('[SW] Transaction error:', transaction.error)
        reject(transaction.error)
      }
    }
  })
}

self.addEventListener('push', function (event: PushEvent) {
  if (event.data) {
    const data = event.data.json()
    const options = {
      body: data.body,
      icon: data.icon || '/icon1.png',
      data: data.data || {
        dateOfArrival: Date.now(),
        primaryKey: '2',
      },
    }

    const tasks = [self.registration.showNotification(data.title, options)]

    if (data.data?.items) {
      tasks.push(
        storeNotificationData(data.data.items)
          .catch((error) => {
            console.error('[SW] Failed to store notification data:', error)
          })
          .then(() => undefined),
      )
    } else {
      console.log('[SW] No items in push data')
    }

    event.waitUntil(Promise.all(tasks))
  }
})

self.addEventListener('notificationclick', function (event: NotificationEvent) {
  event.notification.close()
  event.waitUntil(self.clients.openWindow('/'))
})

serwist.addEventListeners()
