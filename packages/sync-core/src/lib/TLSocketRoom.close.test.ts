import { TLRecord, createTLSchema } from '@tldraw/tlschema'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { WebSocketMinimal } from './ServerSocketAdapter'
import { TLSocketRoom } from './TLSocketRoom'

afterEach(() => {
	vi.useRealTimers()
})

describe('TLSocketRoom.close', () => {
	it('schedules no timers when a socket close event dispatches synchronously from close()', () => {
		vi.useFakeTimers()
		const room = new TLSocketRoom<TLRecord, void>({ schema: createTLSchema() })

		// A socket whose close() dispatches its close event synchronously, like in-process
		// sockets and some non-Node hosts. This re-enters cancelSession from inside
		// room.close(), which used to re-arm the session prune timer after the disposables
		// had already cleared it, keeping a Node process alive for the 5s removal grace.
		let closeListener: ((event: any) => void) | undefined
		const socket: WebSocketMinimal = {
			readyState: 1, // OPEN
			send: () => void 0,
			close: () => closeListener?.({}),
			addEventListener: (type, listener) => {
				if (type === 'close') closeListener = listener
			},
			removeEventListener: () => void 0,
		}
		room.handleSocketConnect({ sessionId: 'session', socket })

		room.close()

		expect(room.isClosed()).toBe(true)
		expect(vi.getTimerCount()).toBe(0)
	})

	it('schedules no snapshot timer for a message that arrives after close()', async () => {
		vi.useFakeTimers()
		const onSessionSnapshot = vi.fn()
		const room = new TLSocketRoom<TLRecord, void>({ schema: createTLSchema(), onSessionSnapshot })

		let messageListener: ((event: any) => void) | undefined
		let closeListener: ((event: any) => void) | undefined
		const socket: WebSocketMinimal = {
			readyState: 1, // OPEN
			send: () => void 0,
			// dispatch close synchronously (like test 1) so the room fully removes the session
			// during close(); the late message below is then the only possible timer source
			close: () => closeListener?.({}),
			addEventListener: (type, listener) => {
				if (type === 'message') messageListener = listener
				if (type === 'close') closeListener = listener
			},
			removeEventListener: () => void 0,
		}
		room.handleSocketConnect({ sessionId: 'session', socket })

		room.close()

		// A socket message racing close() used to re-arm the debounced snapshot timer, keeping
		// a Node process alive for its 5s window after the room was drained.
		messageListener?.({ data: '{"type":"ping"}' })
		expect(vi.getTimerCount()).toBe(0)
		await vi.runAllTimersAsync()
		expect(onSessionSnapshot).not.toHaveBeenCalled()
	})
})
