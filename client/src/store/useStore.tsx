import { useContext } from 'react'

import StateContext from './context'

const useStore = () => useContext(StateContext)

export default useStore
