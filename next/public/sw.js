async function storeNotificationData(items) {
  return new Promise((resolve, reject) => {
    const request = self.indexedDB.open('ShoppinglistDB', 1)

    request.onerror = () => reject(request.error)
    request.onsuccess = () => {
      const db = request.result
      if (!db.objectStoreNames.contains('pendingNotifications')) {
        resolve() // Store doesn't exist yet, skip
        return
      }
      const transaction = db.transaction(['pendingNotifications'], 'readwrite')
      const store = transaction.objectStore('pendingNotifications')
      store.put({ id: 'latest', items, timestamp: Date.now() })
      transaction.oncomplete = () => resolve()
      transaction.onerror = () => reject(transaction.error)
    }
  })
}

self.addEventListener('push', function (event) {
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

    // Store notification data in IndexedDB for when app is reopened
    if (data.data?.items) {
      tasks.push(storeNotificationData(data.data.items).catch(() => {}))
    }

    event.waitUntil(Promise.all(tasks))
  }
})

self.addEventListener('notificationclick', function (event) {
  console.log('Notification click received.')
  event.notification.close()
  event.waitUntil(clients.openWindow('<https://your-website.com>'))
})
