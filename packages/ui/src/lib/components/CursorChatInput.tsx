import { preventDefault, useApp, useContainer, useReactor } from '@tldraw/editor'
import { useCallback, useEffect, useRef } from 'react'
import { track } from 'signia-react'
import { useTranslation } from '../hooks/useTranslation/useTranslation'

export const CursorChatInput = track(function CursorChatInput() {
	const app = useApp()
	const container = useContainer()
	const ref = useRef<HTMLDivElement>(null)
	const msg = useTranslation()

	const { isChatting, chatMessage } = app.instanceState

	useReactor(
		'focus cursor chat input',
		() => {
			if (isChatting) {
				// If the context menu is closing, then we need to wait a bit before focusing
				// TODO: Do this in a better way
				requestAnimationFrame(() => {
					requestAnimationFrame(() => ref.current?.focus())
				})
			}
		},
		[isChatting]
	)

	useEffect(() => {
		const defaultPlaceholder = msg('cursor-chat.type-to-chat')
		const placeholder = chatMessage || defaultPlaceholder
		container.style.setProperty('--tl-cursor-chat-placeholder', `'${placeholder}'`)
		return () => {
			container.style.setProperty('--tl-cursor-chat-placeholder', `'${defaultPlaceholder}'`)
		}
	}, [chatMessage, container, msg])

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
					preventDefault(e)
					e.stopPropagation()
					if (!ref.current) return

					if (ref.current.textContent === '') {
						app.updateInstanceState({ isChatting: false })
						container.focus()
						return
					}

					ref.current.textContent = ''
					break
				}
				case 'Escape': {
					preventDefault(e)
					e.stopPropagation()
					if (!ref.current) return

					// If the user has typed something, cancel it!
					if (ref.current.textContent !== '') {
						app.updateInstanceState({ chatMessage: '' })
					}

					app.updateInstanceState({ isChatting: false })
					container.focus()
					break
				}
			}
		},
		[app, isChatting, container]
	)

	const handlePaste = useCallback(() => {
		// TODO
	}, [])

	useEffect(() => {
		window.addEventListener('pointermove', handlePointerMove)
		return () => window.removeEventListener('pointermove', handlePointerMove)
	})

	return (
		<div
			ref={ref}
			className="tl-cursor-chat"
			style={{
				visibility: isChatting || chatMessage ? 'visible' : 'hidden',
				backgroundColor: app.user.color,
			}}
			contentEditable={isChatting}
			suppressContentEditableWarning
			onBlur={handleBlur}
			onInput={handleInput}
			onKeyDown={handleKeyDown}
			spellCheck={false}
			onPaste={handlePaste}
		>
			{isChatting ? null : chatMessage}
		</div>
	)
})
