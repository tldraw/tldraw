import type { TrackMetadata } from './useVideoChat'

// Simple global state for video chat track metadata.
// This is read by the getUserPresence callback in Room.tsx
// and written by the useVideoChat hook when local tracks are ready.
let _trackMetadata: TrackMetadata | null = null
const _listeners = new Set<() => void>()

export function getTrackMetadata(): TrackMetadata | null {
	return _trackMetadata
}

export function setTrackMetadata(meta: TrackMetadata | null) {
	_trackMetadata = meta
	for (const listener of _listeners) listener()
}

export function subscribeToTrackMetadata(listener: () => void): () => void {
	_listeners.add(listener)
	return () => _listeners.delete(listener)
}
