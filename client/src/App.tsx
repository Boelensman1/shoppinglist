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

import UndoRedoHandler, { getUndoRedoStore } from './components/UndoRedoHandler'
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

  // Sync with server when page gains focus
  onMount(() => {
    const handleFocus = () => {
      if (state.webSocketState === 'connected') {
        props.wsm.sendMessage(actions.syncWithServer([]), false)
      }
    }

    window.addEventListener('focus', handleFocus)
    onCleanup(() => {
      window.removeEventListener('focus', handleFocus)
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
        <Show when={useMobileLayout() && !showButtons()}>
          <button
            class="fixed bottom-4 right-4 bg-gray-500 text-white p-2 rounded-full shadow-lg w-12 h-12 flex items-center justify-center"
            onClick={() => setShowButtons(!showButtons())}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          </button>
        </Show>
        <Show when={showButtons() || !useMobileLayout()}>
          <div
            class={clsx(
              'fixed bottom-4 right-4 flex gap-2',
              useMobileLayout() && 'flex-col items-end',
            )}
          >
            <Show when={useMobileLayout()}>
              <button
                class="bg-gray-500 text-white p-2 rounded-full shadow-lg w-12 h-12 flex items-center justify-center mb-2"
                onClick={() => setShowButtons(false)}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  class="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
              <button
                class="bg-gray-500 text-white p-2 rounded-full shadow-lg px-4 disabled:opacity-50"
                onClick={() => getUndoRedoStore()?.undo()}
                disabled={state.undoList.length === 0}
              >
                Undo
              </button>
              <button
                class="bg-gray-500 text-white p-2 rounded-full shadow-lg px-4 disabled:opacity-50"
                onClick={() => getUndoRedoStore()?.redo()}
                disabled={state.redoList.length === 0}
              >
                Redo
              </button>
            </Show>
            <button
              class="bg-blue-500 text-white p-2 rounded-full shadow-lg px-4"
              onClick={() => {
                dispatch(actions.clearCheckedItems())
                window.scrollTo({ top: 0 })
                setShowButtons(false)
              }}
            >
              Clear checked
            </button>
            <button
              class="bg-red-500 text-white p-2 rounded-full shadow-lg px-4"
              onClick={() => {
                dispatch(actions.clear())
                window.scrollTo({ top: 0 })
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
