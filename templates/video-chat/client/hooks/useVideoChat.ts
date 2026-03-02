import { useCallback, useEffect, useRef, useState } from 'react'
import {
	addCallsTracks,
	closeCallsSession,
	createCallsSession,
	renegotiateCalls,
	type CallsSessionDescription,
	type CallsTrackInfo,
} from './callsApi'

export interface LocalMedia {
	stream: MediaStream
	audioEnabled: boolean
	videoEnabled: boolean
}

export interface RemoteParticipant {
	sessionId: string
	audioTrack: MediaStreamTrack | null
	videoTrack: MediaStreamTrack | null
}

interface PushState {
	sessionId: string
	pc: RTCPeerConnection
}

interface PullState {
	sessionId: string
	pc: RTCPeerConnection
}

export interface VideoChatState {
	joined: boolean
	localMedia: LocalMedia | null
	remoteParticipants: RemoteParticipant[]
	join: () => Promise<void>
	leave: () => void
	toggleAudio: () => void
	toggleVideo: () => void
}

// Track metadata that gets broadcast to other participants via tldraw presence
export interface TrackMetadata {
	sessionId: string
	audioTrackName: string | null
	videoTrackName: string | null
}

export function useVideoChat(
	roomId: string,
	onLocalTracksReady?: (meta: TrackMetadata) => void
): VideoChatState {
	const [joined, setJoined] = useState(false)
	const [localMedia, setLocalMedia] = useState<LocalMedia | null>(null)
	const [remoteParticipants, setRemoteParticipants] = useState<RemoteParticipant[]>([])

	const pushRef = useRef<PushState | null>(null)
	const pullRef = useRef<PullState | null>(null)
	const localStreamRef = useRef<MediaStream | null>(null)

	// Clean up on unmount
	useEffect(() => {
		return () => {
			cleanupPush()
			cleanupPull()
		}
	}, [])

	function cleanupPush() {
		const push = pushRef.current
		if (!push) return
		push.pc.close()
		if (push.sessionId) {
			closeCallsSession(push.sessionId).catch(() => {})
		}
		pushRef.current = null
	}

	function cleanupPull() {
		const pull = pullRef.current
		if (!pull) return
		pull.pc.close()
		if (pull.sessionId) {
			closeCallsSession(pull.sessionId).catch(() => {})
		}
		pullRef.current = null
	}

	const join = useCallback(async () => {
		if (joined) return

		// Get user media
		let stream: MediaStream
		try {
			stream = await navigator.mediaDevices.getUserMedia({
				audio: true,
				video: { width: { ideal: 320 }, height: { ideal: 240 }, frameRate: { ideal: 20 } },
			})
		} catch {
			// If video fails, try audio only
			try {
				stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false })
			} catch {
				console.error('Could not access any media devices')
				return
			}
		}

		localStreamRef.current = stream
		setLocalMedia({
			stream,
			audioEnabled: stream.getAudioTracks().length > 0,
			videoEnabled: stream.getVideoTracks().length > 0,
		})

		// Create a Calls session for pushing our local tracks
		const pushSessionId = await createCallsSession()

		// Create a peer connection for pushing
		const pushPc = new RTCPeerConnection({
			iceServers: [{ urls: 'stun:stun.cloudflare.com:3478' }],
			bundlePolicy: 'max-bundle',
		})
		pushRef.current = { sessionId: pushSessionId, pc: pushPc }

		// Add local tracks to the peer connection
		const tracks: CallsTrackInfo[] = []
		for (const track of stream.getTracks()) {
			pushPc.addTransceiver(track, { direction: 'sendonly' })
			tracks.push({
				location: 'local',
				trackName: `${roomId}-${pushSessionId}-${track.kind}`,
			})
		}

		// Create and send the SDP offer
		const offer = await pushPc.createOffer()
		await pushPc.setLocalDescription(offer)

		const pushResponse = await addCallsTracks(pushSessionId, {
			tracks,
			sessionDescription: {
				type: 'offer',
				sdp: offer.sdp!,
			},
		})

		// Set the remote description from the SFU's answer
		if (pushResponse.sessionDescription) {
			await pushPc.setRemoteDescription(new RTCSessionDescription(pushResponse.sessionDescription))
		}

		// Handle renegotiation if needed
		if (pushResponse.requiresImmediateRenegotiation) {
			const newOffer = await pushPc.createOffer()
			await pushPc.setLocalDescription(newOffer)
			await renegotiateCalls(pushSessionId, {
				type: 'offer',
				sdp: newOffer.sdp!,
			})
		}

		// Notify the room about our tracks so others can subscribe
		const audioTrackName =
			tracks.find((_, i) => stream.getTracks()[i]?.kind === 'audio')?.trackName ?? null
		const videoTrackName =
			tracks.find((_, i) => stream.getTracks()[i]?.kind === 'video')?.trackName ?? null

		onLocalTracksReady?.({
			sessionId: pushSessionId,
			audioTrackName,
			videoTrackName,
		})

		setJoined(true)
	}, [joined, roomId, onLocalTracksReady])

	const leave = useCallback(() => {
		// Stop local media
		if (localStreamRef.current) {
			for (const track of localStreamRef.current.getTracks()) {
				track.stop()
			}
			localStreamRef.current = null
		}

		cleanupPush()
		cleanupPull()

		setLocalMedia(null)
		setRemoteParticipants([])
		setJoined(false)
	}, [])

	const toggleAudio = useCallback(() => {
		const stream = localStreamRef.current
		if (!stream) return
		for (const track of stream.getAudioTracks()) {
			track.enabled = !track.enabled
		}
		setLocalMedia((prev) => (prev ? { ...prev, audioEnabled: !prev.audioEnabled } : null))
	}, [])

	const toggleVideo = useCallback(() => {
		const stream = localStreamRef.current
		if (!stream) return
		for (const track of stream.getVideoTracks()) {
			track.enabled = !track.enabled
		}
		setLocalMedia((prev) => (prev ? { ...prev, videoEnabled: !prev.videoEnabled } : null))
	}, [])

	return {
		joined,
		localMedia,
		remoteParticipants,
		join,
		leave,
		toggleAudio,
		toggleVideo,
	}
}

// Pull remote tracks from other participants. Called when we learn about
// a new participant's track metadata (via tldraw presence).
export async function pullRemoteTracks(
	trackMeta: TrackMetadata,
	onTrack: (track: MediaStreamTrack) => void
): Promise<{ pc: RTCPeerConnection; sessionId: string } | null> {
	const { sessionId: remoteSessionId, audioTrackName, videoTrackName } = trackMeta
	if (!audioTrackName && !videoTrackName) return null

	// Create a new session for pulling
	const pullSessionId = await createCallsSession()
	const pullPc = new RTCPeerConnection({
		iceServers: [{ urls: 'stun:stun.cloudflare.com:3478' }],
		bundlePolicy: 'max-bundle',
	})

	// Listen for incoming tracks
	pullPc.ontrack = (event) => {
		onTrack(event.track)
	}

	// Build the list of remote tracks we want to pull
	const tracks: CallsTrackInfo[] = []
	if (audioTrackName) {
		tracks.push({
			location: 'remote',
			trackName: audioTrackName,
			sessionId: remoteSessionId,
		})
	}
	if (videoTrackName) {
		tracks.push({
			location: 'remote',
			trackName: videoTrackName,
			sessionId: remoteSessionId,
		})
	}

	// Ask the SFU for these tracks - it will give us an offer
	const pullResponse = await addCallsTracks(pullSessionId, { tracks })

	if (pullResponse.sessionDescription) {
		// The SFU sends an offer, we create an answer
		await pullPc.setRemoteDescription(new RTCSessionDescription(pullResponse.sessionDescription))
		const answer = await pullPc.createAnswer()
		await pullPc.setLocalDescription(answer)

		// Send our answer back
		await renegotiateCalls(pullSessionId, {
			type: 'answer',
			sdp: answer.sdp!,
		} as CallsSessionDescription)
	}

	return { pc: pullPc, sessionId: pullSessionId }
}
