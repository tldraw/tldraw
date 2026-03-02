// Client-side wrapper for proxied Cloudflare Calls API routes.

export interface CallsSessionDescription {
	type: 'offer' | 'answer'
	sdp: string
}

export interface CallsTrackInfo {
	location: 'local' | 'remote'
	trackName: string
	mid?: string | null
	sessionId?: string
}

export interface CallsNewTracksResponse {
	sessionDescription?: CallsSessionDescription
	requiresImmediateRenegotiation: boolean
	tracks: Array<{
		trackName: string
		mid: string
		errorCode?: string
		errorDescription?: string
	}>
}

export async function createCallsSession(): Promise<string> {
	const res = await fetch('/api/calls/session', { method: 'POST' })
	const data = (await res.json()) as { sessionId: string }
	return data.sessionId
}

export async function addCallsTracks(
	sessionId: string,
	body: {
		tracks: CallsTrackInfo[]
		sessionDescription?: CallsSessionDescription
	}
): Promise<CallsNewTracksResponse> {
	const res = await fetch(`/api/calls/session/${sessionId}/tracks`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(body),
	})
	return (await res.json()) as CallsNewTracksResponse
}

export async function renegotiateCalls(
	sessionId: string,
	sdp: CallsSessionDescription
): Promise<void> {
	await fetch(`/api/calls/session/${sessionId}/renegotiate`, {
		method: 'PUT',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ sessionDescription: sdp }),
	})
}

export async function closeCallsSession(sessionId: string): Promise<void> {
	await fetch(`/api/calls/session/${sessionId}/close`, { method: 'PUT' })
}
