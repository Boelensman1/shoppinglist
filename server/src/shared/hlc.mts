/** Mutable state for a Hybrid Logical Clock node. */
export interface HlcState {
  /** Wall-clock milliseconds (may be ahead of real time after a receive). */
  wallMs: number
  /** Logical counter that disambiguates events sharing the same {@link wallMs}. */
  counter: number
  /** Unique identifier for the node that owns this clock. */
  nodeId: string
}

// hlcCompare uses lexicographic ordering, so these widths must stay fixed
const MAX_COUNTER = 99999
const COUNTER_WIDTH = String(MAX_COUNTER).length
const MAX_DRIFT_MS = 60_000

/** Packed timestamp that sorts before every valid HLC value (empty nodeId). */
export const HLC_ZERO = hlcPack(createHlc(''))

/** Create a fresh HLC state for {@link nodeId}, starting at epoch zero. */
export function createHlc(nodeId: string): HlcState {
  return { wallMs: 0, counter: 0, nodeId }
}

/**
 * Generate a packed timestamp for a local event, advancing {@link state} in place.
 *
 * @throws If the local clock has drifted more than 60 s behind the HLC wall time,
 *         or if the logical counter overflows.
 */
export function hlcNow(state: HlcState): string {
  const now = Date.now()
  if (now > state.wallMs) {
    state.wallMs = now
    state.counter = 0
  } else {
    if (state.wallMs - now > MAX_DRIFT_MS) {
      throw new Error('HLC local clock drift exceeds maximum')
    }
    state.counter++
  }
  if (state.counter > MAX_COUNTER) {
    throw new Error('HLC counter overflow')
  }
  return hlcPack(state)
}

/**
 * Merge a remote packed timestamp into the local {@link state}, returning the
 * new packed local timestamp. Advances {@link state} in place.
 *
 * The merge picks the maximum of the three wall-clock values (local state,
 * remote, and physical `Date.now()`) and adjusts the counter to preserve
 * uniqueness:
 * - If physical time is strictly ahead of both, reset the counter to 0.
 * - If the remote wall time wins, adopt it and set counter to remote + 1.
 * - If the local wall time wins, increment the local counter.
 * - On a wall-time tie, take the max of both counters and add 1.
 *
 * @throws If either the remote or local clock has drifted more than 60 s,
 *         or if the logical counter overflows.
 */
export function hlcReceive(state: HlcState, packed: string): string {
  const remote = hlcUnpack(packed)
  const now = Date.now()

  if (remote.wallMs - now > MAX_DRIFT_MS) {
    throw new Error('HLC remote clock drift exceeds maximum')
  }
  if (state.wallMs - now > MAX_DRIFT_MS) {
    throw new Error('HLC local clock drift exceeds maximum')
  }

  if (now > state.wallMs && now > remote.wallMs) {
    state.wallMs = now
    state.counter = 0
  } else if (remote.wallMs > state.wallMs) {
    state.wallMs = remote.wallMs
    state.counter = remote.counter + 1
  } else if (state.wallMs > remote.wallMs) {
    state.counter++
  } else {
    // state.wallMs === remote.wallMs
    state.counter = Math.max(state.counter, remote.counter) + 1
  }
  if (state.counter > MAX_COUNTER) {
    throw new Error('HLC counter overflow')
  }
  return hlcPack(state)
}

/** Serialize a timestamp to the fixed-width string format `wallMs:counter:nodeId`. */
export function hlcPack(ts: HlcState): string {
  const wall = String(ts.wallMs).padStart(13, '0')
  const counter = String(ts.counter).padStart(COUNTER_WIDTH, '0')
  return `${wall}:${counter}:${ts.nodeId}`
}

/** Deserialize a packed string back into an {@link HlcState}. */
export function hlcUnpack(packed: string): HlcState {
  const parts = packed.split(':')
  return {
    wallMs: parseInt(parts[0] ?? '0', 10),
    counter: parseInt(parts[1] ?? '0', 10),
    // nodeId may itself contain colons, so rejoin everything after the first two fields
    nodeId: parts.slice(2).join(':'),
  }
}

/** Compare two packed timestamps lexicographically (suitable as an `Array.sort` comparator). */
export function hlcCompare(a: string, b: string): number {
  if (a < b) return -1
  if (a > b) return 1
  return 0
}
