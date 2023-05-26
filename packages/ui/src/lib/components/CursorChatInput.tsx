import { useApp } from '@tldraw/editor'
import { track } from 'signia-react'

export const CursorChatInput = track(function CursorChatInput() {
	const app = useApp()

	const $pointer = app.store.query.record('pointer')
	const pointer = $pointer.value

	if (!pointer) return null

	return (
		<div
			className="tl-nametag"
			style={{
				position: 'absolute',
				pointerEvents: 'none',
				backgroundColor: app.user.color,
				zIndex: 100000,
				top: '50vh',
				left: '50vw',
			}}
		>
			HELLO WORLD
		</div>
	)
})
