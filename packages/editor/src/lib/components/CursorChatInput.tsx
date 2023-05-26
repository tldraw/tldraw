import { useRef } from 'react'
import { track } from 'signia-react'
import { useApp } from '../hooks/useApp'
import { useTransform } from '../hooks/useTransform'

export const CursorChatInput = track(function CursorChatInput() {
	const app = useApp()
	const rDiv = useRef<HTMLDivElement>(null)

	const { zoomLevel } = app

	const $pointer = app.store.query.record('pointer')
	const pointer = $pointer.value

	const x = pointer?.x ?? 0
	const y = pointer?.y ?? 0

	useTransform(rDiv, x, y, 1 / zoomLevel)

	//const [isEditing, setIsEditing] = useState(false)

	return (
		<div
			ref={rDiv}
			className="tl-nametag"
			style={{
				position: 'absolute',
				pointerEvents: 'none',
				backgroundColor: app.user.color,
				zIndex: 100000,
			}}
		>
			HELLO WORLD
		</div>
	)
})
