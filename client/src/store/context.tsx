import { createContext, type Dispatch } from 'react'

import type Action from '../types/Action'
import initialState from './initial'

type ContextType = [typeof initialState, Dispatch<Action>]

const StateContext = createContext<ContextType>([
  initialState,
  () => {
    console.error('Context is not available')
  },
])

export default StateContext
