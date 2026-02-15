import { useCallback, useEffect, useRef, useState } from 'react'
import type { Editor, TLInstancePresence } from 'tldraw'
import { pullRemoteTracks, useVideoChat, type TrackMetadata } from '../hooks/useVideoChat'
import { setTrackMetadata } from '../hooks/videoChatState'
import { MediaControls } from './MediaControls'
import { ParticipantTile } from './ParticipantTile'

const PRESENCE_KEY = 'videoChatTracks'

interface RemotePeer {
	userId: string
	userName: string
	meta: TrackMetadata
	stream: MediaStream
	cleanup: () => void
}

export function VideoOverlay({ editor }: { editor: Editor | null }) {
	const roomId = window.location.pathname.slice(1)
	const [remotePeers, setRemotePeers] = useState<RemotePeer[]>([])
	const remotePeersRef = useRef<RemotePeer[]>([])
	const pulledSessionsRef = useRef<Set<string>>(new Set())

	const broadcastTracks = useCallback((meta: TrackMetadata) => {
		setTrackMetadata(meta)
	}, [])

	const videoChat = useVideoChat(roomId, broadcastTracks)

	// Watch other users' presence for track metadata and pull their streams
	useEffect(() => {
		if (!editor || !videoChat.joined) return

		const pulledSessions = pulledSessionsRef.current
		const interval = setInterval(() => {
			const presenceRecords = editor.store
				.allRecords()
				.filter((r): r is TLInstancePresence => r.typeName === 'instance_presence')

			for (const peer of presenceRecords) {
				const meta = peer.meta?.[PRESENCE_KEY] as unknown as TrackMetadata | undefined
				if (!meta?.sessionId) continue
				if (pulledSessionsRef.current.has(meta.sessionId)) continue

				// Don't pull our own tracks
				const localMeta = remotePeersRef.current.find((p) => p.userId === peer.userId)
				if (localMeta) continue

				pulledSessionsRef.current.add(meta.sessionId)
				const userId = peer.userId
				const userName = peer.userName

				const stream = new MediaStream()
				pullRemoteTracks(meta, (track) => {
					stream.addTrack(track)
					setRemotePeers([...remotePeersRef.current])
				}).then((result) => {
					if (!result) return
					const newPeer: RemotePeer = {
						userId,
						userName,
						meta,
						stream,
						cleanup: () => {
							result.pc.close()
							pulledSessionsRef.current.delete(meta.sessionId)
						},
					}
					remotePeersRef.current = [...remotePeersRef.current, newPeer]
					setRemotePeers([...remotePeersRef.current])
				})
			}

			// Clean up peers who left
			const activeUserIds = new Set(presenceRecords.map((p) => p.userId))
			const removed = remotePeersRef.current.filter((p) => !activeUserIds.has(p.userId))
			if (removed.length > 0) {
				for (const r of removed) r.cleanup()
				remotePeersRef.current = remotePeersRef.current.filter((p) => activeUserIds.has(p.userId))
				setRemotePeers([...remotePeersRef.current])
			}
		}, 2000)

		return () => {
			clearInterval(interval)
			for (const peer of remotePeersRef.current) {
				peer.cleanup()
			}
			remotePeersRef.current = []
			pulledSessions.clear()
		}
	}, [editor, videoChat.joined])

	// Clean up when leaving
	useEffect(() => {
		if (!videoChat.joined) {
			setTrackMetadata(null)
			for (const peer of remotePeersRef.current) {
				peer.cleanup()
			}
			remotePeersRef.current = []
			pulledSessionsRef.current.clear()
			setRemotePeers([])
		}
	}, [videoChat.joined])

	return (
		<div className="video-overlay">
			{!videoChat.joined ? (
				<button className="video-join-btn" onClick={videoChat.join}>
					<CameraIcon />
					Join video
				</button>
			) : (
				<>
					<div className="video-tiles">
						{videoChat.localMedia && (
							<ParticipantTile
								stream={videoChat.localMedia.stream}
								label="You"
								muted
								mirrored
								videoEnabled={videoChat.localMedia.videoEnabled}
							/>
						)}
						{remotePeers.map((peer) => (
							<ParticipantTile
								key={peer.meta.sessionId}
								stream={peer.stream}
								label={peer.userName}
								videoEnabled={peer.stream.getVideoTracks().length > 0}
							/>
						))}
					</div>
					<MediaControls
						audioEnabled={videoChat.localMedia?.audioEnabled ?? false}
						videoEnabled={videoChat.localMedia?.videoEnabled ?? false}
						onToggleAudio={videoChat.toggleAudio}
						onToggleVideo={videoChat.toggleVideo}
						onLeave={videoChat.leave}
					/>
				</>
			)}
		</div>
	)
}

function CameraIcon() {
	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			fill="none"
			viewBox="0 0 24 24"
			strokeWidth="1.5"
			stroke="currentColor"
			width={16}
		>
			<path
				strokeLinecap="round"
				strokeLinejoin="round"
				d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z"
			/>
		</svg>
	)
}
