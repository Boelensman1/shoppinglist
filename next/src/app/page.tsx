'use client'

import { StoreProvider } from '@/store/useStore'
import App from './app'
import { InstallPrompt } from '@/components/InstallPrompt'
import { PushNotificationManager } from '@/components/PushNotificationManager'

export default function Home() {
  return (
    <StoreProvider>
      <App />
      <PushNotificationManager />
      <InstallPrompt />
    </StoreProvider>
  )
}
