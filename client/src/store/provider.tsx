import { useReducer, ReactNode, FC } from 'react'

import StateContext from './context'
import initialState from './initial'
import reducer from './reducer'

interface StoreProviderProps {
  children: ReactNode
}

export const StoreProvider: FC<StoreProviderProps> = ({ children }) => (
  <StateContext.Provider value={useReducer(reducer, initialState)}>
    {children}
  </StateContext.Provider>
)

export default StoreProvider
