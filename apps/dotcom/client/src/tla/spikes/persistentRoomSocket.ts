// SPIKE / PROOF-OF-CONCEPT — not wired into the app, not for merge.
//
// Goal of this spike: show the *direction* of the structural fix for the ~150ms
// per-navigation auth cost — authenticate ONCE per session and switch document
// rooms over a single persistent WebSocket, instead of tearing down and
// recreating an authenticated socket on every file navigation.
//
// WHY THIS IS BIG (and only a sketch here):
// Today each file is its own Durable Object (`TLFileDurableObject`), reached at
// `GET /app/file/:roomId` and forwarded by `forwardRoomRequest`. The client's
// `useSync` (packages/sync) owns one socket per room via `ClientWebSocketAdapter`
// (packages/sync-core), and `TlaEditor` force-remounts per file (`key={fileSlug}`),
// so the socket — and its `?accessToken=` auth handshake — is recreated each time.
//
// Reusing one socket across rooms therefore requires, on the SERVER, a
// session-level entrypoint that authenticates once and then proxies framed
// messages to the right per-room Durable Object (DO-to-DO routing / a session DO).
// That is a real project. This file only models the CLIENT protocol so the
// payoff and shape are legible next to the cookie-decouple and warm-cache spikes.
//
// ─────────────────────────────────────────────────────────────────────────────
// Protocol sketch
//
//   client → server   { type: 'join',  room, sessionId }   // after one auth handshake
//   client → server   { type: 'leave', room }
//   server → client   { type: 'joined', room }
//   both directions   { room, payload }                     // existing per-room protocol, wrapped
//
// The per-room `payload` is the unchanged tldraw sync message; multiplexing only
// adds the outer `{ room }` envelope so one socket can carry many rooms.
// ─────────────────────────────────────────────────────────────────────────────

/* eslint-disable no-console */

type ControlFrame =
	| { type: 'join'; room: string; sessionId: string }
	| { type: 'leave'; room: string }

interface RoomEnvelope {
	room: string
	payload: unknown
}

export interface RoomHandler {
	/** Called with each inbound per-room message (the unwrapped `payload`). */
	onMessage(payload: unknown): void
	/** Called once the server confirms the room was joined. */
	onJoined?(): void
}

/**
 * One WebSocket, authenticated once, multiplexing many document rooms.
 *
 * The auth cost (cookie handshake, or a single token) is paid only by
 * `ensureOpen()` on the FIRST room of the session. Subsequent `joinRoom` calls —
 * i.e. every later file navigation — send a tiny control frame over the already
 * open, already authenticated socket, so they pay ~0ms of auth.
 */
export class PersistentRoomSocket {
	private socket: WebSocket | null = null
	private openPromise: Promise<void> | null = null
	private readonly rooms = new Map<string, RoomHandler>()

	constructor(
		private readonly opts: {
			/**
			 * Session-level endpoint. In production this is same-origin, so the
			 * `__session` cookie authenticates the handshake with no token in the URL
			 * (see the cookie-decouple spike). One connect per session, not per file.
			 */
			getSocketUrl(): string
			sessionId: string
		}
	) {}

	/** Connect (and authenticate) exactly once; later callers await the same promise. */
	private ensureOpen(): Promise<void> {
		if (!this.openPromise) {
			this.openPromise = new Promise<void>((resolve, reject) => {
				const socket = new WebSocket(this.opts.getSocketUrl())
				this.socket = socket
				socket.addEventListener('open', () => resolve())
				socket.addEventListener('error', (e) => reject(e))
				socket.addEventListener('message', (ev) => this.handleMessage(ev))
				socket.addEventListener('close', () => {
					// GAP: reconnect + rejoin every active room, re-authenticating once.
					this.socket = null
					this.openPromise = null
				})
			})
		}
		return this.openPromise
	}

	/**
	 * Join a room. The first call pays the auth/connect cost; every later call
	 * (the per-navigation hot path) is just a control frame on the live socket.
	 * Returns a disposer that leaves the room.
	 */
	async joinRoom(room: string, handler: RoomHandler): Promise<() => void> {
		const start = performance.now()
		await this.ensureOpen()
		this.rooms.set(room, handler)
		this.send({ type: 'join', room, sessionId: this.opts.sessionId })
		console.log(
			`[spike-auth] joinRoom(${room}) ready in ${(performance.now() - start).toFixed(1)}ms`
		)
		return () => this.leaveRoom(room)
	}

	private leaveRoom(room: string) {
		this.rooms.delete(room)
		if (this.socket?.readyState === WebSocket.OPEN) {
			this.send({ type: 'leave', room })
		}
	}

	/** Send a per-room data message (the existing sync protocol) over the shared socket. */
	sendToRoom(room: string, payload: unknown) {
		this.send({ room, payload } satisfies RoomEnvelope)
	}

	private send(frame: ControlFrame | RoomEnvelope) {
		this.socket?.send(JSON.stringify(frame))
	}

	private handleMessage(ev: MessageEvent) {
		const frame = JSON.parse(ev.data as string) as { type: 'joined'; room: string } | RoomEnvelope
		if ('type' in frame && frame.type === 'joined') {
			this.rooms.get(frame.room)?.onJoined?.()
			return
		}
		const envelope = frame as RoomEnvelope
		this.rooms.get(envelope.room)?.onMessage(envelope.payload)
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// WHAT'S STUBBED (the real project, deliberately not built here):
//
//  • Server session entrypoint that authenticates once and routes framed
//    messages to per-room `TLFileDurableObject`s (DO-to-DO or a session DO).
//  • Integration with `ClientWebSocketAdapter` / `useSync` so the editor's store
//    rides this shared socket instead of opening its own per-room socket.
//  • Store hydration on room switch (initial snapshot, presence handoff) without
//    a full reconnect.
//  • Reconnect + auth-refresh: on socket close, reconnect once and rejoin all
//    active rooms; refresh auth on the session, not per room.
//  • Backpressure / message ordering guarantees across multiplexed rooms.
//  • Auth model: confirm cookie-only handshake is acceptable for the session
//    socket (same trade-off as the cookie-decouple spike), incl. Safari/ITP.
//
// PAYOFF if built: auth happens once per session; every file navigation after the
// first pays zero auth latency — strictly better than caching the token, at the
// cost of a real protocol/server change.
// ─────────────────────────────────────────────────────────────────────────────
