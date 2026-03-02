import { useEffect, useRef } from 'react'

interface ParticipantTileProps {
	stream: MediaStream
	label: string
	muted?: boolean
	mirrored?: boolean
	videoEnabled?: boolean
}

export function ParticipantTile({
	stream,
	label,
	muted = false,
	mirrored = false,
	videoEnabled = true,
}: ParticipantTileProps) {
	const videoRef = useRef<HTMLVideoElement>(null)

	useEffect(() => {
		const el = videoRef.current
		if (!el) return
		el.srcObject = stream

		// Re-assign srcObject when tracks change
		const handleTrack = () => {
			el.srcObject = stream
		}
		stream.addEventListener('addtrack', handleTrack)
		stream.addEventListener('removetrack', handleTrack)
		return () => {
			stream.removeEventListener('addtrack', handleTrack)
			stream.removeEventListener('removetrack', handleTrack)
		}
	}, [stream])

	return (
		<div className={`participant-tile ${mirrored ? 'mirrored' : ''}`}>
			<video
				ref={videoRef}
				autoPlay
				playsInline
				muted={muted}
				className={videoEnabled ? '' : 'hidden'}
			/>
			{!videoEnabled && <div className="participant-avatar">{label.charAt(0).toUpperCase()}</div>}
			<div className="participant-label">{label}</div>
		</div>
	)
}
