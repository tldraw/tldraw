import { useApp, useQuickReactor } from '@tldraw/editor'
import { useCallback, useEffect, useRef } from 'react'
import { track } from 'signia-react'

export const CursorChatInput = track(function CursorChatInput() {
	const app = useApp()

	const ref = useRef<HTMLDivElement>(null)

	const isChatting = app.instanceState.isChatting

	useQuickReactor(
		'focus cursor chat input',
		() => {
			ref.current?.focus()
		},
		[isChatting]
	)

	const handlePointerMove = useCallback((e: PointerEvent) => {
		ref.current?.style.setProperty('left', e.clientX + 'px')
		ref.current?.style.setProperty('top', e.clientY + 'px')
	}, [])

	const handleBlur = useCallback(() => {
		app.updateInstanceState({ isChatting: false })
	}, [app])

	const handleInput = useCallback(
		(e) => {
			app.updateInstanceState({ chatMessage: e.currentTarget.innerText })
		},
		[app]
	)

	useEffect(() => {
		window.addEventListener('pointermove', handlePointerMove)
		return () => window.removeEventListener('pointermove', handlePointerMove)
	})

	return (
		<div
			ref={ref}
			className="tl-cursor-chat"
			style={{
				visibility: isChatting ? 'visible' : 'hidden',
				position: 'absolute',
				pointerEvents: 'all',
				backgroundColor: app.user.color,
				zIndex: 'var(--layer-cursor)',
				marginTop: 16,
				marginLeft: 13,
			}}
			contentEditable
			suppressContentEditableWarning
			onBlur={handleBlur}
			onInput={handleInput}
			spellCheck={false}
		></div>
	)
})
