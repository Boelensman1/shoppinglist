import { describe, it, expect, vi, afterEach } from 'vitest'
import {
  createHlc,
  hlcNow,
  hlcReceive,
  hlcCompare,
  hlcPack,
  hlcUnpack,
  HLC_ZERO,
} from '../shared/hlc.mjs'

describe('createHlc', () => {
  it('should return zeroed state with the given nodeId', () => {
    const state = createHlc('test-node')
    expect(state).toEqual({ wallMs: 0, counter: 0, nodeId: 'test-node' })
  })
})

describe('hlcPack / hlcUnpack', () => {
  it('should round-trip correctly', () => {
    const ts = { wallMs: 1700000000000, counter: 42, nodeId: 'node-a' }
    const packed = hlcPack(ts)
    const unpacked = hlcUnpack(packed)
    expect(unpacked).toEqual(ts)
  })

  it('should zero-pad wall clock and counter', () => {
    const packed = hlcPack({ wallMs: 123, counter: 5, nodeId: 'n' })
    expect(packed).toBe('0000000000123:00005:n')
  })

  it('should handle nodeId with colons', () => {
    const ts = { wallMs: 1000, counter: 0, nodeId: 'a:b:c' }
    const packed = hlcPack(ts)
    const unpacked = hlcUnpack(packed)
    expect(unpacked.nodeId).toBe('a:b:c')
  })

  it('should handle empty nodeId', () => {
    const ts = { wallMs: 1000, counter: 0, nodeId: '' }
    const packed = hlcPack(ts)
    expect(packed).toBe('0000000001000:00000:')
    const unpacked = hlcUnpack(packed)
    expect(unpacked).toEqual(ts)
  })

  it('should handle maximum wall clock and counter values', () => {
    const ts = { wallMs: 9999999999999, counter: 99999, nodeId: 'n' }
    const packed = hlcPack(ts)
    expect(packed).toBe('9999999999999:99999:n')
    const unpacked = hlcUnpack(packed)
    expect(unpacked).toEqual(ts)
  })

  it('should handle wallMs of 0', () => {
    const packed = hlcPack({ wallMs: 0, counter: 0, nodeId: 'n' })
    expect(packed).toBe('0000000000000:00000:n')
  })
})

describe('hlcCompare', () => {
  it('should order by wall clock first', () => {
    const a = hlcPack({ wallMs: 1000, counter: 99, nodeId: 'z' })
    const b = hlcPack({ wallMs: 2000, counter: 0, nodeId: 'a' })
    expect(hlcCompare(a, b)).toBeLessThan(0)
    expect(hlcCompare(b, a)).toBeGreaterThan(0)
  })

  it('should order by counter when wall clock is equal', () => {
    const a = hlcPack({ wallMs: 1000, counter: 1, nodeId: 'z' })
    const b = hlcPack({ wallMs: 1000, counter: 2, nodeId: 'a' })
    expect(hlcCompare(a, b)).toBeLessThan(0)
  })

  it('should order by nodeId when wall clock and counter are equal', () => {
    const a = hlcPack({ wallMs: 1000, counter: 0, nodeId: 'aaa' })
    const b = hlcPack({ wallMs: 1000, counter: 0, nodeId: 'bbb' })
    expect(hlcCompare(a, b)).toBeLessThan(0)
  })

  it('should return 0 for identical timestamps', () => {
    const a = hlcPack({ wallMs: 1000, counter: 5, nodeId: 'n' })
    expect(hlcCompare(a, a)).toBe(0)
  })

  it('lexicographic sort of packed strings should match hlcCompare ordering', () => {
    const timestamps = [
      hlcPack({ wallMs: 3000, counter: 0, nodeId: 'a' }),
      hlcPack({ wallMs: 1000, counter: 0, nodeId: 'b' }),
      hlcPack({ wallMs: 2000, counter: 1, nodeId: 'a' }),
      hlcPack({ wallMs: 2000, counter: 0, nodeId: 'a' }),
    ]

    const lexSorted = [...timestamps].sort()
    const hlcSorted = [...timestamps].sort(hlcCompare)
    expect(lexSorted).toEqual(hlcSorted)
  })
})

describe('HLC_ZERO', () => {
  it('should be less than any real timestamp', () => {
    const real = hlcPack({ wallMs: 1, counter: 0, nodeId: 'a' })
    expect(hlcCompare(HLC_ZERO, real)).toBeLessThan(0)
  })

  it('should have exact format 0000000000000:00000:', () => {
    expect(HLC_ZERO).toBe('0000000000000:00000:')
  })

  it('should be less than timestamp with wallMs 0 but non-empty nodeId', () => {
    const ts = hlcPack({ wallMs: 0, counter: 0, nodeId: 'a' })
    expect(hlcCompare(HLC_ZERO, ts)).toBeLessThan(0)
  })

  it('should compare equal to itself', () => {
    expect(hlcCompare(HLC_ZERO, HLC_ZERO)).toBe(0)
  })
})

describe('hlcNow', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('should produce monotonically increasing timestamps', () => {
    vi.useFakeTimers()
    vi.setSystemTime(1000)

    const state = createHlc('node-a')
    const t1 = hlcNow(state)
    const t2 = hlcNow(state)
    const t3 = hlcNow(state)

    expect(hlcCompare(t1, t2)).toBeLessThan(0)
    expect(hlcCompare(t2, t3)).toBeLessThan(0)
  })

  it('should increment counter when wall clock has not advanced', () => {
    vi.useFakeTimers()
    vi.setSystemTime(5000)

    const state = createHlc('node-a')
    hlcNow(state)
    const t2 = hlcNow(state)
    const unpacked = hlcUnpack(t2)
    expect(unpacked.counter).toBe(1)
  })

  it('should reset counter when wall clock advances', () => {
    vi.useFakeTimers()
    vi.setSystemTime(1000)

    const state = createHlc('node-a')
    hlcNow(state)
    hlcNow(state)

    vi.setSystemTime(2000)
    const t3 = hlcNow(state)
    const unpacked = hlcUnpack(t3)
    expect(unpacked.wallMs).toBe(2000)
    expect(unpacked.counter).toBe(0)
  })

  it('should throw on local clock drift exceeding 60 seconds', () => {
    vi.useFakeTimers()
    vi.setSystemTime(100_000)

    const state = createHlc('node-a')
    hlcNow(state) // wallMs = 100000

    vi.setSystemTime(100_000 - 60_001) // 39999 — drift = 60001 ms
    expect(() => hlcNow(state)).toThrow('HLC local clock drift exceeds maximum')
  })

  it('should not throw when drift is exactly at 60-second boundary', () => {
    vi.useFakeTimers()
    vi.setSystemTime(100_000)

    const state = createHlc('node-a')
    hlcNow(state) // wallMs = 100000

    vi.setSystemTime(100_000 - 60_000) // 40000 — drift = 60000 ms (not > 60000)
    expect(() => hlcNow(state)).not.toThrow()
  })

  it('should throw on counter overflow', () => {
    vi.useFakeTimers()
    vi.setSystemTime(1000)

    const state = createHlc('node-a')
    hlcNow(state) // wallMs = 1000, counter = 0
    state.counter = 99999

    expect(() => hlcNow(state)).toThrow('HLC counter overflow')
  })

  it('should keep wallMs when wall clock goes backward within tolerance', () => {
    vi.useFakeTimers()
    vi.setSystemTime(5000)

    const state = createHlc('node-a')
    hlcNow(state) // wallMs = 5000, counter = 0

    vi.setSystemTime(4000) // 1s backward, within tolerance
    const t2 = hlcNow(state)
    const unpacked = hlcUnpack(t2)
    expect(unpacked.wallMs).toBe(5000)
    expect(unpacked.counter).toBe(1)
  })

  it('should preserve nodeId in packed output', () => {
    vi.useFakeTimers()
    vi.setSystemTime(1000)

    const state = createHlc('my-node')
    const packed = hlcNow(state)
    const unpacked = hlcUnpack(packed)
    expect(unpacked.nodeId).toBe('my-node')
  })
})

describe('hlcReceive', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('should advance clock when remote is ahead', () => {
    vi.useFakeTimers()
    vi.setSystemTime(1000)

    const state = createHlc('node-a')
    hlcNow(state) // wallMs = 1000, counter = 0

    const remoteTs = hlcPack({ wallMs: 5000, counter: 10, nodeId: 'node-b' })
    hlcReceive(state, remoteTs)

    const next = hlcNow(state)
    const unpacked = hlcUnpack(next)
    // Wall should be at least 5000 (remote), counter should have advanced
    expect(unpacked.wallMs).toBeGreaterThanOrEqual(5000)
  })

  it('should advance counter when remote has same wall clock', () => {
    vi.useFakeTimers()
    vi.setSystemTime(5000)

    const state = createHlc('node-a')
    hlcNow(state) // wallMs = 5000, counter = 0

    const remoteTs = hlcPack({ wallMs: 5000, counter: 3, nodeId: 'node-b' })
    hlcReceive(state, remoteTs)

    // Counter should be max(0, 3) + 1 = 4
    expect(state.counter).toBe(4)
  })

  it('should use wall clock when it is ahead of both local and remote', () => {
    vi.useFakeTimers()
    vi.setSystemTime(1000)

    const state = createHlc('node-a')
    hlcNow(state) // wallMs = 1000

    vi.setSystemTime(9000) // wall clock jumps ahead
    const remoteTs = hlcPack({ wallMs: 5000, counter: 0, nodeId: 'node-b' })
    hlcReceive(state, remoteTs)

    expect(state.wallMs).toBe(9000)
    expect(state.counter).toBe(0)
  })

  it('should return packed timestamp with local nodeId, not remote', () => {
    vi.useFakeTimers()
    vi.setSystemTime(1000)

    const state = createHlc('local-node')
    hlcNow(state)

    const remoteTs = hlcPack({
      wallMs: 5000,
      counter: 0,
      nodeId: 'remote-node',
    })
    const result = hlcReceive(state, remoteTs)
    const unpacked = hlcUnpack(result)
    expect(unpacked.nodeId).toBe('local-node')
  })

  it('should throw when remote clock drift exceeds maximum', () => {
    vi.useFakeTimers()
    vi.setSystemTime(1000)

    const state = createHlc('node-a')
    const remoteTs = hlcPack({
      wallMs: 1000 + 60_001,
      counter: 0,
      nodeId: 'node-b',
    })
    expect(() => hlcReceive(state, remoteTs)).toThrow(
      'HLC remote clock drift exceeds maximum',
    )
  })

  it('should not throw when remote is exactly at drift boundary', () => {
    vi.useFakeTimers()
    vi.setSystemTime(1000)

    const state = createHlc('node-a')
    const remoteTs = hlcPack({
      wallMs: 1000 + 60_000,
      counter: 0,
      nodeId: 'node-b',
    })
    expect(() => hlcReceive(state, remoteTs)).not.toThrow()
  })

  it('should throw when local clock drift exceeds maximum during receive', () => {
    vi.useFakeTimers()
    vi.setSystemTime(100_000)

    const state = createHlc('node-a')
    hlcNow(state) // wallMs = 100000

    vi.setSystemTime(100_000 - 60_001) // local drift = 60001
    // Remote is below now, so remote drift check passes
    const remoteTs = hlcPack({ wallMs: 1000, counter: 0, nodeId: 'node-b' })
    expect(() => hlcReceive(state, remoteTs)).toThrow(
      'HLC local clock drift exceeds maximum',
    )
  })

  it('should throw on counter overflow during receive', () => {
    vi.useFakeTimers()
    vi.setSystemTime(1000)

    const state = createHlc('node-a')
    // Push state wallMs ahead so now < both wallMs values
    state.wallMs = 5000
    state.counter = 50000

    const remoteTs = hlcPack({ wallMs: 5000, counter: 99999, nodeId: 'node-b' })
    // max(50000, 99999) + 1 = 100000 > 99999
    expect(() => hlcReceive(state, remoteTs)).toThrow('HLC counter overflow')
  })

  it('should increment counter when local wallMs is ahead of remote', () => {
    vi.useFakeTimers()
    vi.setSystemTime(1000)

    const state = createHlc('node-a')
    state.wallMs = 5000
    state.counter = 3

    const remoteTs = hlcPack({ wallMs: 3000, counter: 10, nodeId: 'node-b' })
    hlcReceive(state, remoteTs)

    expect(state.wallMs).toBe(5000)
    expect(state.counter).toBe(4)
  })

  it('should take max of counters + 1 when wallMs equal and local counter higher', () => {
    vi.useFakeTimers()
    vi.setSystemTime(1000)

    const state = createHlc('node-a')
    state.wallMs = 5000
    state.counter = 10

    const remoteTs = hlcPack({ wallMs: 5000, counter: 3, nodeId: 'node-b' })
    hlcReceive(state, remoteTs)

    expect(state.wallMs).toBe(5000)
    expect(state.counter).toBe(11) // max(10, 3) + 1
  })

  it('should handle multiple sequential receives correctly', () => {
    vi.useFakeTimers()
    vi.setSystemTime(1000)

    const state = createHlc('node-a')

    const r1 = hlcReceive(
      state,
      hlcPack({ wallMs: 5000, counter: 0, nodeId: 'node-b' }),
    )
    expect(state.wallMs).toBe(5000)
    expect(state.counter).toBe(1)

    const r2 = hlcReceive(
      state,
      hlcPack({ wallMs: 5000, counter: 5, nodeId: 'node-c' }),
    )
    // max(1, 5) + 1 = 6
    expect(state.counter).toBe(6)

    const r3 = hlcReceive(
      state,
      hlcPack({ wallMs: 5000, counter: 2, nodeId: 'node-d' }),
    )
    // max(6, 2) + 1 = 7
    expect(state.counter).toBe(7)

    // All returned timestamps should be monotonically increasing
    expect(hlcCompare(r1, r2)).toBeLessThan(0)
    expect(hlcCompare(r2, r3)).toBeLessThan(0)
  })

  it('should produce monotonic timestamps across interleaved hlcNow and hlcReceive', () => {
    vi.useFakeTimers()
    vi.setSystemTime(1000)

    const state = createHlc('node-a')
    const timestamps: string[] = []

    timestamps.push(hlcNow(state))
    timestamps.push(
      hlcReceive(
        state,
        hlcPack({ wallMs: 5000, counter: 0, nodeId: 'node-b' }),
      ),
    )
    timestamps.push(hlcNow(state))
    timestamps.push(
      hlcReceive(
        state,
        hlcPack({ wallMs: 5000, counter: 10, nodeId: 'node-c' }),
      ),
    )
    timestamps.push(hlcNow(state))

    for (let i = 1; i < timestamps.length; i++) {
      expect(hlcCompare(timestamps[i - 1]!, timestamps[i]!)).toBeLessThan(0)
    }
  })
})
