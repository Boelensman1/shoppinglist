import type { Dispatch } from '../types/store/Dispatch'
import type { Action } from '../types/store/Action'
import actions from '../store/actions'

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')

  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

class PushNotificationManager {
  private dispatch: Dispatch<Action> | null = null
  private userId: string | null = null
  private subscription: PushSubscription | null = null
  private registration: ServiceWorkerRegistration | null = null

  get isSupported() {
    return 'serviceWorker' in navigator && 'PushManager' in window
  }

  async initialize(dispatch: Dispatch<Action>, userId: string) {
    this.dispatch = dispatch
    this.userId = userId

    dispatch(actions.updateCanSubscribe(this.isSupported))
    if (!this.isSupported) {
      this.dispatch(actions.updateHasPushSubscription(false))
      return
    }

    await this.registerServiceWorker()
  }

  private async registerServiceWorker() {
    if (!this.dispatch) {
      return
    }
    try {
      this.registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
        updateViaCache: 'none',
      })
    } catch (error) {
      console.error('Service worker registration failed:', error)
      this.dispatch(actions.updateHasPushSubscription(false))
      return
    }

    const sub = await this.registration.pushManager.getSubscription()
    this.dispatch(actions.updateHasPushSubscription(Boolean(sub)))
    if (sub) {
      this.subscription = sub
    }
  }

  async subscribe() {
    if (!this.dispatch || !this.userId || !this.isSupported) {
      return
    }

    const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
    if (!vapidKey) {
      console.error('VAPID public key not configured')
      return
    }

    const registration = await navigator.serviceWorker.ready
    const sub = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidKey),
    })

    this.subscription = sub
    const serializedSub = JSON.parse(JSON.stringify(sub))
    this.dispatch(
      actions.subscribeUserPushNotifications(this.userId, serializedSub),
    )
    this.dispatch(actions.updateHasPushSubscription(true))
  }

  async unsubscribe() {
    if (!this.dispatch || !this.userId) {
      return
    }

    await this.subscription?.unsubscribe()
    this.subscription = null
    this.dispatch(actions.unSubscribeUserPushNotifications(this.userId))
    this.dispatch(actions.updateHasPushSubscription(false))
  }
}

export default PushNotificationManager
