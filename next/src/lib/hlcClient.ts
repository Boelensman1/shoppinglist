import { createHlc, hlcNow, hlcReceive, type HlcState } from 'server/shared'

let hlcState: HlcState | null = null

export function initClientHlc(nodeId: string) {
  hlcState = createHlc(nodeId)
}

export function clientHlcNow(): string {
  if (!hlcState) {
    throw new Error('HLC not initialized')
  }
  return hlcNow(hlcState)
}

export function clientHlcReceive(packed: string) {
  if (!hlcState) {
    return
  }
  hlcReceive(hlcState, packed)
}
