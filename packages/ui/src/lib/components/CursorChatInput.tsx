import { preventDefault, useApp, useContainer } from '@tldraw/editor'
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { track } from 'signia-react'
import { useTranslation } from '../hooks/useTranslation/useTranslation'

const CHAT_MESSAGE_TIMEOUT = 5000

export const CursorChatInput = track(function CursorChatInput() {
	const app = useApp()
	const container = useContainer()
	const ref = useRef<HTMLDivElement>(null)
	const msg = useTranslation()

	const { isChatting, chatMessage } = app.instanceState

	// Auto-focus the chat input
	// We need to do this manually because we're using a contentEditable
	useLayoutEffect(() => {
		if (isChatting) {
			// If the context menu is closing, then we need to wait a bit before focusing
			// TODO: Do this in a better way
			requestAnimationFrame(() => {
				requestAnimationFrame(() => ref.current?.focus())
			})
		}
	}, [isChatting])

	// Set the placeholder text for the chat input
	// We need to do this manually because we're using a contentEditable
	useLayoutEffect(() => {
		const defaultPlaceholder = msg('cursor-chat.type-to-chat')
		const placeholder = chatMessage || defaultPlaceholder
		container.style.setProperty('--tl-cursor-chat-placeholder', `'${placeholder}'`)
		return () => {
			container.style.setProperty('--tl-cursor-chat-placeholder', `'${defaultPlaceholder}'`)
		}
	}, [chatMessage, container, msg])

	// --- Managing the timeout for chat messages ---------------
	const [timeoutId, setTimeoutId] = useState<NodeJS.Timeout | null>(null)
	const stopTimeout = useCallback(() => {
		if (timeoutId === null) {
			return
		}
		clearTimeout(timeoutId)
		setTimeoutId(null)
	}, [timeoutId])

	const startTimeout = useCallback(() => {
		if (timeoutId !== null) {
			stopTimeout()
		}
		const id = setTimeout(() => {
			app.updateInstanceState({ chatMessage: '' })
		}, CHAT_MESSAGE_TIMEOUT)
		setTimeoutId(id)
	}, [app, timeoutId, stopTimeout])

	// --- Positioning the chat input ----------------------------
	const handlePointerMove = useCallback((e: PointerEvent) => {
		ref.current?.style.setProperty('left', e.clientX + 'px')
		ref.current?.style.setProperty('top', e.clientY + 'px')
	}, [])

	useEffect(() => {
		window.addEventListener('pointermove', handlePointerMove)
		return () => window.removeEventListener('pointermove', handlePointerMove)
	}, [handlePointerMove])

	// --- Handling user interactions ----------------------------

	// Stop chatting when the user clicks away
	const handleBlur = useCallback(() => {
		app.updateInstanceState({ isChatting: false })
		startTimeout()
		if (!ref.current) return
		ref.current.textContent = ''
	}, [app, startTimeout])

	// Update the chat message as the user types
	const handleInput = useCallback(
		(e) => app.updateInstanceState({ chatMessage: e.currentTarget.textContent }),
		[app]
	)

	// Handle some keyboard shortcuts
	const handleKeyDown = useCallback(
		(e) => {
			if (!isChatting) return
			switch (e.key) {
				case 'Enter': {
					preventDefault(e)
					e.stopPropagation()
					if (!ref.current) return

					// If the user hasn't typed anything, stop chatting
					if (ref.current.textContent === '') {
						app.updateInstanceState({ isChatting: false })
						container.focus()
						return
					}

					startTimeout()
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

					// Either way, stop chatting
					app.updateInstanceState({ isChatting: false })
					container.focus()
					break
				}
			}
		},
		[app, isChatting, container, startTimeout]
	)

	// Convert all pasted content to plain text
	const handlePaste = useCallback(() => {
		// TODO
	}, [])

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
