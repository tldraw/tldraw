import { useEffect, useState } from 'react'

/**
 * A compact header for the sidebar showing the current room and a button to copy
 * the room link. Anyone who opens the link joins the same canvas in real time.
 */
export function RoomBar({ roomId }: { roomId?: string }) {
	const [copied, setCopied] = useState(false)

	useEffect(() => {
		if (!copied) return
		const timeout = setTimeout(() => setCopied(false), 2000)
		return () => clearTimeout(timeout)
	}, [copied])

	return (
		<div className="RoomBar">
			<div className="RoomBar-room" title={roomId}>
				<WifiIcon />
				<span>{roomId}</span>
			</div>
			<button
				className="RoomBar-copy"
				onClick={() => {
					navigator.clipboard.writeText(window.location.href)
					setCopied(true)
				}}
				aria-label="Copy room link"
			>
				{copied ? 'Copied' : 'Copy link'}
			</button>
		</div>
	)
}

function WifiIcon() {
	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			fill="none"
			viewBox="0 0 24 24"
			strokeWidth="1.5"
			stroke="currentColor"
			width={14}
			height={14}
		>
			<path
				strokeLinecap="round"
				strokeLinejoin="round"
				d="M8.288 15.038a5.25 5.25 0 0 1 7.424 0M5.106 11.856c3.807-3.808 9.98-3.808 13.788 0M1.924 8.674c5.565-5.565 14.587-5.565 20.152 0M12.53 18.22l-.53.53-.53-.53a.75.75 0 0 1 1.06 0Z"
			/>
		</svg>
	)
}
