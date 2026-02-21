import { EventEmitter } from 'events'

export const ee = new EventEmitter()
ee.setMaxListeners(100)
