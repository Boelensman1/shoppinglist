import clsx from 'clsx'
import {
  type Component,
  Show,
  onMount,
  createSignal,
  onCleanup,
} from 'solid-js'
import { createMediaQuery } from '@solid-primitives/media'

import useStore from './store/useStore'
import WebSocketManager from './WebSocketManager'
import IndexedDbManager from './IndexedDbManager'

import UndoRedoHandler from './components/UndoRedoHandler'
import ShoppingList from './components/ShoppingList'
import actions from './store/actions'

interface AppProps {
  wsm: WebSocketManager
  idbm: IndexedDbManager
}

const App: Component<AppProps> = (props) => {
  const [state, dispatch] = useStore()
  const useMobileLayout = createMediaQuery('(max-width:624px)')
  const [showButtons, setShowButtons] = createSignal(false)

  onMount(() => {
    const wsScheme = window.location.protocol === 'https:' ? 'wss' : 'ws'
    const basePath = window.location.pathname.replace(/\/$/, '')
    const wsUrl = window.location.host.startsWith('localhost')
      ? 'ws://127.0.0.1:1222'
      : `${wsScheme}://${window.location.host}/${basePath}/ws`

    // Connect to WebSocket and pass the dispatch function
    props.wsm.connect(wsUrl, dispatch)
  })

  onMount(() => {
    // eslint-disable-next-line solid/reactivity
    props.idbm.init().then(async () => {
      const items = await props.idbm.getItems()
      dispatch({
        type: 'INITIAL_FULL_DATA',
        payload: items,
        fromServer: true,
      })
    })
  })

  onMount(() => {
    let touchStartY = 0
    let touchEndY = 0
    const minSwipeDistance = 100 // minimum distance for swipe detection
    let hideTimeout: number | undefined

    const handleTouchStart = (e: TouchEvent) => {
      touchStartY = e.touches[0].clientY
    }

    const handleTouchEnd = (e: TouchEvent) => {
      touchEndY = e.changedTouches[0].clientY
      const swipeDistance = touchEndY - touchStartY

      // Detect downward swipe
      if (swipeDistance > minSwipeDistance) {
        e.preventDefault()
        setShowButtons(true)
        // Clear any existing timeout
        window.clearTimeout(hideTimeout)
        // Set new timeout to hide buttons after 2 seconds
        hideTimeout = window.setTimeout(() => {
          setShowButtons(false)
        }, 2000)
      }
    }

    window.addEventListener('touchstart', handleTouchStart, { passive: true })
    window.addEventListener('touchend', handleTouchEnd, { passive: true })

    onCleanup(() => {
      window.removeEventListener('touchstart', handleTouchStart)
      window.removeEventListener('touchend', handleTouchEnd)
      window.clearTimeout(hideTimeout)
    })
  })

  return (
    <div
      class={clsx(
        'w-screen h-dvh',
        !useMobileLayout() && 'py-4',
        state.loaded && state.webSocketState === 'disconnected' && 'bg-red-500',
        state.loaded &&
          state.webSocketState === 'disconnected' &&
          useMobileLayout() &&
          'p-1',
      )}
      style={{ overflow: 'scroll' }}
    >
      <Show
        when={state.loaded}
        fallback={
          <div class="flex items-center justify-center h-screen">
            <div class="loader" />
          </div>
        }
      >
        <div
          class={clsx(
            'bg-white',
            useMobileLayout()
              ? ' py-3 px-1'
              : ' max-w-xl mx-auto py-5 pr-6 pl-4 rounded-sm shadow-md border',
          )}
        >
          <ShoppingList items={state.items} />
        </div>
        <Show when={showButtons() || !useMobileLayout()}>
          <div class="fixed bottom-4 right-4 flex gap-2">
            <button
              class="bg-blue-500 text-white p-2 rounded-full shadow-lg px-4"
              onClick={() => {
                if (
                  window.confirm(
                    'Are you sure you want to clear all checked items?',
                  )
                ) {
                  dispatch(actions.clearCheckedItems())
                  window.scrollTo({ top: 0 })
                }
                setShowButtons(false)
              }}
            >
              Clear checked
            </button>
            <button
              class="bg-red-500 text-white p-2 rounded-full shadow-lg px-4"
              onClick={() => {
                if (
                  window.confirm(
                    'Are you sure you want to clear the entire list?',
                  )
                ) {
                  dispatch(actions.clear())
                  window.scrollTo({ top: 0 })
                }
                setShowButtons(false)
              }}
            >
              Clear list
            </button>
          </div>
        </Show>
        <UndoRedoHandler />
      </Show>
    </div>
  )
}

export default App
