import { useApp, useContainer, useQuickReactor } from '@tldraw/editor'
import { useCallback, useEffect, useRef } from 'react'
import { track } from 'signia-react'

export const CursorChatInput = track(function CursorChatInput() {
	const app = useApp()
	const container = useContainer()
	const ref = useRef<HTMLDivElement>(null)

	const { isChatting, chatMessage } = app.instanceState

	useQuickReactor(
		'focus cursor chat input',
		() => {
			if (isChatting) ref.current?.focus()
		},
		[isChatting]
	)

	const handlePointerMove = useCallback((e: PointerEvent) => {
		ref.current?.style.setProperty('left', e.clientX + 'px')
		ref.current?.style.setProperty('top', e.clientY + 'px')
	}, [])

	const handleBlur = useCallback(() => {
		app.updateInstanceState({ isChatting: false })
		if (!ref.current) return
		ref.current.textContent = ''
	}, [app])

	const handleInput = useCallback(
		(e) => {
			app.updateInstanceState({ chatMessage: e.currentTarget.textContent })
		},
		[app]
	)

	const handleKeyDown = useCallback(
		(e) => {
			if (!isChatting) return
			switch (e.key) {
				case 'Enter': {
					e.preventDefault()
					if (!ref.current) return
					container.style.setProperty('--tl-cursor-chat-placeholder', `'${chatMessage}'`)
					ref.current.textContent = ''
					break
				}
				case 'Escape': {
					e.preventDefault()
					if (!ref.current) return

					// If the user has typed something, cancel it!
					if (ref.current.textContent !== '') {
						container.style.setProperty('--tl-cursor-chat-placeholder', `'Type to chat...'`)
						app.updateInstanceState({ chatMessage: '' })
					}

					ref.current.textContent = ''
					break
				}
			}
		},
		[app, isChatting, chatMessage, container]
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
			onKeyDown={handleKeyDown}
			spellCheck={false}
		></div>
	)
})
