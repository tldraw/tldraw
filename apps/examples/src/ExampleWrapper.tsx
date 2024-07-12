import { useState } from 'react'
import { Example } from './examples'

export function ExampleWrapper({
	example,
	component: Component,
}: {
	example: Example
	component: React.ComponentType<{ roomId?: string }>
}) {
	if (!example.multiplayer) {
		return <Component />
	}

	return <MultiplayerExampleWrapper component={Component} example={example} />
}

const hour = 60 * 1000 * 1000
function MultiplayerExampleWrapper({
	component: Component,
	example,
}: {
	example: Example
	component: React.ComponentType<{ roomId?: string }>
}) {
	const prefix = `tldraw-example-${example.path.replace(/\//g, '-')}-${process.env.TLDRAW_DEPLOY_ID}`

	const [roomId, setRoomId] = useState(String(Math.floor(Date.now() / hour)))
	const [nextRoomId, setNextRoomId] = useState(roomId)

	const trimmed = nextRoomId.trim()
	const canSet = trimmed && roomId !== trimmed
	function setIfPossible() {
		if (!canSet) return
		setRoomId(trimmed)
	}

	return (
		<div className="MultiplayerExampleWrapper">
			<div className="MultiplayerExampleWrapper-picker">
				<label>
					<div>Room ID:</div>
					<input
						value={nextRoomId}
						onChange={(e) => setNextRoomId(e.target.value)}
						onKeyDown={(e) => {
							if (e.key === 'Enter' && canSet) {
								e.preventDefault()
								setIfPossible()
							}
							if (e.key === 'Escape') {
								e.preventDefault()
								setNextRoomId(roomId)
								e.currentTarget.blur()
							}
						}}
					/>
				</label>
				<button onClick={() => setIfPossible()} disabled={!canSet} aria-label="join">
					<ArrowIcon />
				</button>
			</div>
			<div className="MultiplayerExampleWrapper-example">
				<div>
					<Component roomId={`${prefix}_${encodeURIComponent(roomId)}`} />
				</div>
			</div>
		</div>
	)
}

function ArrowIcon() {
	return (
		<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
			<path
				d="M9.25012 4.75L12.5001 8M12.5001 8L9.25012 11.25M12.5001 8H3.5"
				stroke="currentColor"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
		</svg>
	)
}
