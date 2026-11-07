export const RECEIVED_AT_HEADER = 'x-tldraw-received-at'
export const EDGE_COLO_HEADER = 'x-tldraw-edge-colo'

const COLO = /^[A-Z]{3}$/

function isWebSocketUpgrade(request: Request) {
	return request.headers.get('upgrade')?.toLowerCase() === 'websocket'
}

/** Always overwrites, so a browser can't forge the room's route timing or colo. */
export function stampRoomRequest(request: Request, receivedAt: number): Request {
	if (!isWebSocketUpgrade(request)) return request
	const stamped = new Request(request)
	stamped.headers.set(RECEIVED_AT_HEADER, String(receivedAt))
	const colo = (request as Request & { cf?: { colo?: unknown } }).cf?.colo
	if (typeof colo === 'string' && COLO.test(colo)) stamped.headers.set(EDGE_COLO_HEADER, colo)
	else stamped.headers.delete(EDGE_COLO_HEADER)
	return stamped
}

// Another machine's clock: anything outside this window is skew or forgery, not a route time.
export function readReceivedAt(headers: Headers, now: number): number | undefined {
	const raw = headers.get(RECEIVED_AT_HEADER)
	if (!raw || !/^\d{1,16}$/.test(raw)) return undefined
	const at = Number(raw)
	return at >= now - 60_000 && at <= now + 5_000 ? at : undefined
}

export function readEdgeColo(headers: Headers): string | undefined {
	const colo = headers.get(EDGE_COLO_HEADER)
	return colo && COLO.test(colo) ? colo : undefined
}

export function parseTraceColo(body: string): string | undefined {
	return /^colo=([A-Z]{3})$/m.exec(body)?.[1]
}
