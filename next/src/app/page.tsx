import { StoreProvider } from '@/store/useStore'
import App from './app'

export default function Home() {
  return (
    <StoreProvider>
      <App />
    </StoreProvider>
  )
}
