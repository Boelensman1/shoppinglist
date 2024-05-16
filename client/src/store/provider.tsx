import { useReducer, ReactNode, FC, useRef, useCallback } from 'react'

import StateContext from './context'
import initialState from './initial'
import reducer from './reducer'
import type Action from '../types/Action'
import webSocketMiddleware from './webSocketMiddleware'

interface StoreProviderProps {
  children: ReactNode
}

const StoreProvider: FC<StoreProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(reducer, initialState)
  const stateRef = useRef(state)
  stateRef.current = state

  const enhancedDispatch = useCallback(
    (action: Action) => webSocketMiddleware(dispatch, stateRef.current)(action),
    [dispatch],
  )

  return (
    <StateContext.Provider value={[state, enhancedDispatch]}>
      {children}
    </StateContext.Provider>
  )
}

export default StoreProvider
