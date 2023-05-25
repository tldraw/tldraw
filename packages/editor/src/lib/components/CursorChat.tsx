import { track } from 'signia-react'

export const CursorChat = track(function CursorChat() {
	return (
		<div
			style={{
				position: 'absolute',
				top: '50vh',
				left: '50vw',
			}}
		>
			Hello world!
		</div>
	)
})
