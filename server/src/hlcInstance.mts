import { createHlc, type HlcState } from './shared/hlc.mjs'

export const serverHlc: HlcState = createHlc('server')
