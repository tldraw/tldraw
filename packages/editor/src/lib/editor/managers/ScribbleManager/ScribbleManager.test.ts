import { vi } from 'vitest'
import { TestEditor } from '../../../test/TestEditor'
import { ScribbleManager } from './ScribbleManager'

let editor: TestEditor
let scribbles: ScribbleManager

beforeEach(() => {
	vi.useFakeTimers()
	editor = new TestEditor()
	scribbles = editor.scribbles
})

afterEach(() => {
	editor.dispose()
	vi.useRealTimers()
})

function tick(times = 1, elapsed = 16) {
	for (let i = 0; i < times; i++) {
		scribbles.tick(elapsed)
	}
}

function drawPoints(id: string, count: number, start = 0) {
	for (let i = 0; i < count; i++) {
		scribbles.addPoint(id, start + i * 10, 0)
		tick()
	}
}

describe('addScribble', () => {
	it('creates a starting scribble with default properties', () => {
		const item = scribbles.addScribble({}, 'my-scribble')

		expect(item).toEqual({
			id: 'my-scribble',
			scribble: {
				id: 'my-scribble',
				size: 20,
				color: 'accent',
				opacity: 0.8,
				delay: 0,
				points: [],
				shrink: 0.1,
				taper: true,
				state: 'starting',
			},
			timeoutMs: 0,
			delayRemaining: 0,
			prev: null,
			next: null,
		})
	})

	it('generates an id when none is provided', () => {
		const a = scribbles.addScribble({})
		const b = scribbles.addScribble({})
		expect(a.id).toEqual(expect.any(String))
		expect(a.id).not.toEqual(b.id)
		expect(a.scribble.id).toBe(a.id)
	})

	it('applies overrides but always starts in the starting state', () => {
		const item = scribbles.addScribble({
			size: 4,
			color: 'muted-1',
			opacity: 0.5,
			delay: 100,
			shrink: 0,
			taper: false,
			state: 'active',
		})

		expect(item.scribble).toMatchObject({
			size: 4,
			color: 'muted-1',
			opacity: 0.5,
			delay: 100,
			shrink: 0,
			taper: false,
			state: 'starting',
		})
		expect(item.delayRemaining).toBe(100)
	})

	it('does not touch instance state until the next tick', () => {
		scribbles.addScribble({})
		expect(editor.getInstanceState().scribbles).toEqual([])
	})
})

describe('addPoint', () => {
	it('queues the point as next until the tick commits it', () => {
		const item = scribbles.addScribble({}, 'a')
		scribbles.addPoint('a', 10, 20)

		expect(item.next).toEqual({ x: 10, y: 20, z: 0.5 })
		expect(item.prev).toBeNull()
		expect(item.scribble.points).toEqual([])

		tick()

		expect(item.prev).toEqual({ x: 10, y: 20, z: 0.5 })
		expect(item.scribble.points).toEqual([{ x: 10, y: 20, z: 0.5 }])
	})

	it('uses the given pressure for z', () => {
		const item = scribbles.addScribble({}, 'a')
		scribbles.addPoint('a', 0, 0, 0.9)
		expect(item.next).toEqual({ x: 0, y: 0, z: 0.9 })
	})

	it('ignores points less than one unit away from the previous committed point', () => {
		const item = scribbles.addScribble({}, 'a')
		scribbles.addPoint('a', 0, 0)
		tick()

		scribbles.addPoint('a', 0.5, 0.5)
		expect(item.next).toEqual({ x: 0, y: 0, z: 0.5 })

		scribbles.addPoint('a', 1, 0)
		expect(item.next).toEqual({ x: 1, y: 0, z: 0.5 })
	})

	it('does not add the same point twice across ticks', () => {
		const item = scribbles.addScribble({}, 'a')
		scribbles.addPoint('a', 0, 0)
		tick(3)
		expect(item.scribble.points).toHaveLength(1)
	})

	it('throws for an unknown scribble id', () => {
		expect(() => scribbles.addPoint('missing', 0, 0)).toThrow('Scribble with id missing not found')
	})
})

describe('lifecycle', () => {
	it('moves from starting to active after more than eight points', () => {
		const item = scribbles.addScribble({}, 'a')

		drawPoints('a', 8)
		expect(item.scribble.state).toBe('starting')
		expect(item.scribble.points).toHaveLength(8)

		drawPoints('a', 1, 80)
		expect(item.scribble.state).toBe('active')
		expect(item.scribble.points).toHaveLength(9)
	})

	it('eats its own tail while active so the trail stays at nine points', () => {
		const item = scribbles.addScribble({}, 'a')
		drawPoints('a', 15)

		expect(item.scribble.state).toBe('active')
		expect(item.scribble.points).toHaveLength(9)
		expect(item.scribble.points[0]).toEqual({ x: 60, y: 0, z: 0.5 })
		expect(item.scribble.points[8]).toEqual({ x: 140, y: 0, z: 0.5 })
	})

	it('keeps the tail while the delay has not elapsed', () => {
		const item = scribbles.addScribble({ delay: 1000 }, 'a')
		drawPoints('a', 15)

		expect(item.scribble.state).toBe('active')
		expect(item.scribble.points).toHaveLength(15)
	})

	it('shrinks one point per 16ms when active and idle', () => {
		const item = scribbles.addScribble({}, 'a')
		drawPoints('a', 9)
		expect(item.scribble.points).toHaveLength(9)

		tick(1)
		expect(item.scribble.points).toHaveLength(8)

		tick(2, 8)
		expect(item.scribble.points).toHaveLength(7)

		tick(7)
		expect(item.scribble.points).toHaveLength(1)

		tick(5)
		expect(item.scribble.points).toHaveLength(1)
	})

	it('re-arms the delay once the idle trail is down to a single point', () => {
		const item = scribbles.addScribble({ delay: 50 }, 'a')
		drawPoints('a', 9)
		expect(item.delayRemaining).toBe(50)

		tick(4)
		expect(item.delayRemaining).toBe(0)
		expect(item.scribble.points).toHaveLength(5)

		tick(5)
		expect(item.scribble.points).toHaveLength(1)
		expect(item.delayRemaining).toBe(50)
	})

	it('publishes the scribble points to the instance state on every tick', () => {
		scribbles.addScribble({ color: 'laser' }, 'a')
		drawPoints('a', 2)

		expect(editor.getInstanceState().scribbles).toEqual([
			{
				id: 'a',
				size: 20,
				color: 'laser',
				opacity: 0.8,
				delay: 0,
				shrink: 0.1,
				taper: true,
				state: 'starting',
				points: [
					{ x: 0, y: 0, z: 0.5 },
					{ x: 10, y: 0, z: 0.5 },
				],
			},
		])
	})

	it('copies points into the instance state rather than sharing the array', () => {
		const item = scribbles.addScribble({}, 'a')
		drawPoints('a', 2)

		const published = editor.getInstanceState().scribbles[0].points
		expect(published).not.toBe(item.scribble.points)
		item.scribble.points.push({ x: 99, y: 99, z: 0.5 })
		expect(editor.getInstanceState().scribbles[0].points).toHaveLength(2)
	})

	it('is driven by the editor tick event', () => {
		const item = scribbles.addScribble({}, 'a')
		scribbles.addPoint('a', 0, 0)
		editor.emit('tick', 16)

		expect(item.scribble.points).toHaveLength(1)
		expect(editor.getInstanceState().scribbles).toHaveLength(1)
	})

	it('skips the tick entirely when there is nothing to do', () => {
		const spy = vi.spyOn(editor, 'updateInstanceState')
		tick()
		expect(spy).not.toHaveBeenCalled()
		spy.mockRestore()
	})
})

describe('stop', () => {
	it('moves the scribble to stopping and shrinks it until it disappears', () => {
		const item = scribbles.addScribble({}, 'a')
		drawPoints('a', 9)

		scribbles.stop('a')
		expect(item.scribble.state).toBe('stopping')
		expect(editor.getInstanceState().scribbles[0].points).toHaveLength(9)

		tick()
		expect(item.scribble.points).toHaveLength(8)
		expect(item.scribble.size).toBeCloseTo(18)

		tick()
		expect(item.scribble.points).toHaveLength(7)
		expect(item.scribble.size).toBeCloseTo(16.2)

		tick(6)
		expect(item.scribble.points).toHaveLength(1)

		tick()
		expect(item.scribble.points).toHaveLength(0)
		expect(editor.getInstanceState().scribbles).toEqual([])
	})

	it('removes the session once the stopped scribble is empty', () => {
		scribbles.addScribble({}, 'a')
		drawPoints('a', 2)
		scribbles.stop('a')
		tick(3)

		expect(editor.getInstanceState().scribbles).toEqual([])
		expect(() => scribbles.addPoint('a', 0, 0)).toThrow()
	})

	it('never shrinks the size below one', () => {
		const item = scribbles.addScribble({ size: 2, shrink: 0.5 }, 'a')
		drawPoints('a', 9)
		scribbles.stop('a')

		tick()
		expect(item.scribble.size).toBe(1)
		tick()
		expect(item.scribble.size).toBe(1)
	})

	it('keeps the size when shrink is zero', () => {
		const item = scribbles.addScribble({ shrink: 0 }, 'a')
		drawPoints('a', 9)
		scribbles.stop('a')
		tick(3)

		expect(item.scribble.size).toBe(20)
		expect(item.scribble.points).toHaveLength(6)
	})

	it('waits for the remaining delay before shrinking, capped at 200ms', () => {
		const item = scribbles.addScribble({ delay: 1000 }, 'a')
		drawPoints('a', 9)

		scribbles.stop('a')
		expect(item.delayRemaining).toBe(200)

		tick(12)
		expect(item.scribble.points).toHaveLength(9)

		tick()
		expect(item.delayRemaining).toBe(0)
		expect(item.scribble.points).toHaveLength(8)
	})

	it('still commits pending points for a scribble stopped while starting', () => {
		const item = scribbles.addScribble({}, 'a')
		scribbles.addPoint('a', 0, 0)
		scribbles.stop('a')

		tick()
		expect(item.scribble.points).toEqual([])
		expect(editor.getInstanceState().scribbles).toEqual([])
	})

	it('throws for an unknown scribble id', () => {
		expect(() => scribbles.stop('missing')).toThrow('Scribble with id missing not found')
	})
})

describe('complete', () => {
	it('freezes an active scribble until it is stopped', () => {
		const item = scribbles.addScribble({}, 'a')
		drawPoints('a', 9)

		scribbles.complete('a')
		expect(item.scribble.state).toBe('complete')

		tick(10)
		expect(item.scribble.points).toHaveLength(9)

		scribbles.stop('a')
		tick()
		expect(item.scribble.points).toHaveLength(8)
	})

	it('does not revive a stopping scribble', () => {
		const item = scribbles.addScribble({}, 'a')
		drawPoints('a', 9)
		scribbles.stop('a')
		scribbles.complete('a')
		expect(item.scribble.state).toBe('stopping')
	})

	it('throws for an unknown scribble id', () => {
		expect(() => scribbles.complete('missing')).toThrow()
	})
})

describe('paused', () => {
	it('leaves a paused scribble untouched', () => {
		const item = scribbles.addScribble({}, 'a')
		drawPoints('a', 9)
		item.scribble.state = 'paused'

		scribbles.addPoint('a', 500, 500)
		tick(5)

		expect(item.scribble.points).toHaveLength(9)
		expect(editor.getInstanceState().scribbles[0].points).toHaveLength(9)
	})
})

describe('reset', () => {
	it('drops every session and clears the instance state', () => {
		scribbles.addScribble({}, 'a')
		scribbles.addScribble({}, 'b')
		for (let i = 0; i < 3; i++) {
			scribbles.addPoint('a', i * 10, 0)
			scribbles.addPoint('b', i * 10, 100)
			tick()
		}
		expect(editor.getInstanceState().scribbles).toHaveLength(2)

		scribbles.reset()

		expect(editor.getInstanceState().scribbles).toEqual([])
		expect(() => scribbles.addPoint('a', 0, 0)).toThrow()
		expect(() => scribbles.addPoint('b', 0, 0)).toThrow()
	})

	it('cancels pending idle timeouts', () => {
		const sessionId = scribbles.startSession({ selfConsume: false, idleTimeoutMs: 100 })
		scribbles.reset()
		expect(() => vi.advanceTimersByTime(200)).not.toThrow()
		expect(scribbles.isSessionActive(sessionId)).toBe(false)
	})

	it('drops a scribble that has no committed points on the first tick', () => {
		scribbles.addScribble({}, 'a')
		tick()
		expect(() => scribbles.addPoint('a', 0, 0)).toThrow('Scribble with id a not found')
	})

	it('drops a session with no scribbles on the first tick', () => {
		const sessionId = scribbles.startSession({ selfConsume: false })
		expect(scribbles.isSessionActive(sessionId)).toBe(true)
		tick()
		expect(scribbles.isSessionActive(sessionId)).toBe(false)
	})
})

describe('sessions', () => {
	it('uses the provided id and reports the session as active', () => {
		const id = scribbles.startSession({ id: 'laser' })
		expect(id).toBe('laser')
		expect(scribbles.isSessionActive('laser')).toBe(true)
		expect(scribbles.isSessionActive('other')).toBe(false)
	})

	it('throws when adding to an unknown session', () => {
		expect(() => scribbles.addScribbleToSession('missing', {})).toThrow('Session missing not found')
		expect(() => scribbles.addPointToSession('missing', 'a', 0, 0)).toThrow(
			'Session missing not found'
		)
	})

	it('throws when adding a point to an unknown scribble in a known session', () => {
		const sessionId = scribbles.startSession()
		expect(() => scribbles.addPointToSession(sessionId, 'nope', 0, 0)).toThrow(
			`Scribble nope not found in session ${sessionId}`
		)
	})

	it('persists points when self-consume is off', () => {
		const sessionId = scribbles.startSession({ selfConsume: false })
		const item = scribbles.addScribbleToSession(sessionId, {}, 'a')

		for (let i = 0; i < 20; i++) {
			scribbles.addPointToSession(sessionId, 'a', i * 10, 0)
			tick()
		}
		tick(10)

		expect(item.scribble.state).toBe('active')
		expect(item.scribble.points).toHaveLength(20)
		expect(editor.getInstanceState().scribbles[0].points).toHaveLength(20)
	})

	it('self-consumes by default', () => {
		const sessionId = scribbles.startSession()
		const item = scribbles.addScribbleToSession(sessionId, {}, 'a')

		for (let i = 0; i < 20; i++) {
			scribbles.addPointToSession(sessionId, 'a', i * 10, 0)
			tick()
		}

		expect(item.scribble.points).toHaveLength(9)
	})

	it('fades persistent scribbles individually after stopSession', () => {
		const sessionId = scribbles.startSession({ selfConsume: false })
		const a = scribbles.addScribbleToSession(sessionId, {}, 'a')
		const b = scribbles.addScribbleToSession(sessionId, {}, 'b')
		for (let i = 0; i < 10; i++) {
			scribbles.addPointToSession(sessionId, 'a', i * 10, 0)
			scribbles.addPointToSession(sessionId, 'b', i * 10, 100)
			tick()
		}

		scribbles.stopSession(sessionId)
		expect(scribbles.isSessionActive(sessionId)).toBe(false)
		expect(a.scribble.state).toBe('stopping')
		expect(b.scribble.state).toBe('stopping')

		tick()
		expect(a.scribble.points).toHaveLength(9)
		expect(b.scribble.points).toHaveLength(9)

		tick(20)
		expect(editor.getInstanceState().scribbles).toEqual([])
		expect(scribbles.isSessionActive(sessionId)).toBe(false)
	})

	it('ignores stopSession for unknown or already stopped sessions', () => {
		const sessionId = scribbles.startSession({ selfConsume: false })
		scribbles.stopSession(sessionId)
		expect(() => scribbles.stopSession(sessionId)).not.toThrow()
		expect(() => scribbles.stopSession('missing')).not.toThrow()
	})

	it('clears a session immediately', () => {
		const sessionId = scribbles.startSession({ selfConsume: false })
		const item = scribbles.addScribbleToSession(sessionId, {}, 'a')
		for (let i = 0; i < 5; i++) {
			scribbles.addPointToSession(sessionId, 'a', i * 10, 0)
			tick()
		}
		expect(editor.getInstanceState().scribbles).toHaveLength(1)

		scribbles.clearSession(sessionId)
		expect(item.scribble.points).toEqual([])
		expect(scribbles.isSessionActive(sessionId)).toBe(false)

		tick()
		expect(editor.getInstanceState().scribbles).toEqual([])
		expect(() => scribbles.addScribbleToSession(sessionId, {})).toThrow()
	})

	describe('idle timeout', () => {
		// Timer-driven editor ticks drop empty sessions, so give each session a
		// scribble with a committed point before advancing the clock.
		function startIdleSession(idleTimeoutMs?: number) {
			const sessionId = scribbles.startSession({ selfConsume: false, idleTimeoutMs })
			scribbles.addScribbleToSession(sessionId, {}, 'a')
			scribbles.addPointToSession(sessionId, 'a', 0, 0)
			tick()
			return sessionId
		}

		it('stops the session after the idle timeout', () => {
			const sessionId = startIdleSession(1000)
			vi.advanceTimersByTime(999)
			expect(scribbles.isSessionActive(sessionId)).toBe(true)
			vi.advanceTimersByTime(1)
			expect(scribbles.isSessionActive(sessionId)).toBe(false)
		})

		it('is reset by adding scribbles, adding points, and extendSession', () => {
			const sessionId = startIdleSession(1000)

			vi.advanceTimersByTime(800)
			scribbles.addScribbleToSession(sessionId, {}, 'b')
			scribbles.addPointToSession(sessionId, 'b', 0, 100)
			vi.advanceTimersByTime(800)
			expect(scribbles.isSessionActive(sessionId)).toBe(true)

			scribbles.addPointToSession(sessionId, 'a', 10, 0)
			vi.advanceTimersByTime(800)
			expect(scribbles.isSessionActive(sessionId)).toBe(true)

			scribbles.addPoint('a', 20, 0)
			vi.advanceTimersByTime(800)
			expect(scribbles.isSessionActive(sessionId)).toBe(true)

			scribbles.extendSession(sessionId)
			vi.advanceTimersByTime(800)
			expect(scribbles.isSessionActive(sessionId)).toBe(true)

			vi.advanceTimersByTime(200)
			expect(scribbles.isSessionActive(sessionId)).toBe(false)
		})

		it('does nothing for sessions without an idle timeout', () => {
			const sessionId = startIdleSession()
			scribbles.extendSession(sessionId)
			scribbles.extendSession('missing')
			vi.advanceTimersByTime(100_000)
			expect(scribbles.isSessionActive(sessionId)).toBe(true)
		})
	})

	describe('grouped fade', () => {
		function startGroupedSession(options: Parameters<ScribbleManager['startSession']>[0] = {}) {
			const sessionId = scribbles.startSession({
				selfConsume: false,
				fadeMode: 'grouped',
				fadeDurationMs: 500,
				...options,
			})
			const a = scribbles.addScribbleToSession(sessionId, {}, 'a')
			const b = scribbles.addScribbleToSession(sessionId, {}, 'b')
			for (let i = 0; i < 10; i++) {
				scribbles.addPointToSession(sessionId, 'a', i * 10, 0)
				scribbles.addPointToSession(sessionId, 'b', i * 10, 100)
				tick()
			}
			return { sessionId, a, b }
		}

		it('removes points from the oldest scribble first using ease-in by default', () => {
			const { sessionId, a, b } = startGroupedSession()

			scribbles.stopSession(sessionId)
			expect(a.scribble.state).toBe('stopping')
			expect(b.scribble.state).toBe('stopping')

			// halfway through, ease-in progress is 0.25 of 20 points
			tick(1, 250)
			expect(a.scribble.points).toHaveLength(5)
			expect(b.scribble.points).toHaveLength(10)

			tick(1, 250)
			expect(a.scribble.points).toHaveLength(0)
			expect(b.scribble.points).toHaveLength(0)
			expect(editor.getInstanceState().scribbles).toEqual([])
			expect(scribbles.isSessionActive(sessionId)).toBe(false)
		})

		it('removes points proportionally with linear easing', () => {
			const { sessionId, a, b } = startGroupedSession({ fadeEasing: 'linear' })
			scribbles.stopSession(sessionId)

			tick(1, 250)
			expect(a.scribble.points).toHaveLength(0)
			expect(b.scribble.points).toHaveLength(10)

			tick(1, 125)
			expect(b.scribble.points).toHaveLength(5)
		})

		it('always removes at least one point per tick', () => {
			const { sessionId, a } = startGroupedSession()
			scribbles.stopSession(sessionId)

			tick(1, 1)
			expect(a.scribble.points).toHaveLength(9)
		})

		it('falls back to the editor laser fadeout duration', () => {
			const sessionId = scribbles.startSession({ selfConsume: false, fadeMode: 'grouped' })
			const a = scribbles.addScribbleToSession(sessionId, {}, 'a')
			for (let i = 0; i < 10; i++) {
				scribbles.addPointToSession(sessionId, 'a', i * 10, 0)
				tick()
			}
			scribbles.stopSession(sessionId)

			tick(1, editor.options.laserFadeoutMs - 1)
			expect(a.scribble.points.length).toBeGreaterThan(0)
			tick(1, 1)
			expect(a.scribble.points).toHaveLength(0)
		})

		it('keeps empty items in the session until the fade is done', () => {
			const { sessionId, a, b } = startGroupedSession({ fadeEasing: 'linear' })
			scribbles.stopSession(sessionId)

			tick(1, 250)
			expect(a.scribble.points).toHaveLength(0)
			expect(editor.getInstanceState().scribbles.map((s) => s.id)).toEqual(['b'])
			expect(b.scribble.points).toHaveLength(10)
		})
	})
})
