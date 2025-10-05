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

    request.onerror = () => reject(request.error)
    request.onsuccess = () => {
      const db = request.result
      if (!db.objectStoreNames.contains('pendingNotifications')) {
        resolve(undefined)
        return
      }
      const transaction = db.transaction(['pendingNotifications'], 'readwrite')
      const store = transaction.objectStore('pendingNotifications')
      store.put({ id: 'latest', items, timestamp: Date.now() })
      transaction.oncomplete = () => resolve(undefined)
      transaction.onerror = () => reject(transaction.error)
    }
  })
}

self.addEventListener('push', function (event: PushEvent) {
  if (event.data) {
    const data = event.data.json()
    const options = {
      body: data.body,
      icon: data.icon || '/icon.png',
      badge: '/badge.png',
      vibrate: [100, 50, 100],
      data: data.data || {
        dateOfArrival: Date.now(),
        primaryKey: '2',
      },
    }

    const tasks = [self.registration.showNotification(data.title, options)]

    if (data.data?.items) {
      tasks.push(
        storeNotificationData(data.data.items)
          .catch(() => {})
          .then(() => undefined),
      )
    }

    event.waitUntil(Promise.all(tasks))
  }
})

self.addEventListener('notificationclick', function (event: NotificationEvent) {
  console.log('Notification click received.')
  event.notification.close()
  event.waitUntil(self.clients.openWindow('<https://your-website.com>'))
})

serwist.addEventListeners()
