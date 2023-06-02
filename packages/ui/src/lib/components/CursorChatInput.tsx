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

	// --- Fading the chat bubble ---------------
	const [timeoutId, setTimeoutId] = useState<NodeJS.Timeout | null>(null)
	const stopFade = useCallback(() => {
		if (timeoutId === null) {
			return
		}
		clearTimeout(timeoutId)
		setTimeoutId(null)
		ref.current?.classList.remove('tl-cursor-chat-fade')
	}, [timeoutId])

	const startFade = useCallback(() => {
		if (timeoutId !== null) {
			stopFade()
		}
		const id = setTimeout(() => {
			app.updateInstanceState({ chatMessage: '' })
		}, CHAT_MESSAGE_TIMEOUT)
		setTimeoutId(id)
		ref.current?.classList.add('tl-cursor-chat-fade')
	}, [app, timeoutId, stopFade])

	// --- Auto-focussing the chat input ----------------------------
	useLayoutEffect(() => {
		if (isChatting) {
			// If the context menu is closing, then we need to wait a bit before focusing
			// TODO: Do this in a better way
			requestAnimationFrame(() => {
				requestAnimationFrame(() => ref.current?.focus())
			})
			stopFade()
		}
	}, [isChatting, stopFade])

	// --- Setting the placeholder text --------------------------
	useLayoutEffect(() => {
		const defaultPlaceholder = msg('cursor-chat.type-to-chat')
		const placeholder = chatMessage || defaultPlaceholder
		container.style.setProperty('--tl-cursor-chat-placeholder', `'${placeholder}'`)
		return () => {
			container.style.setProperty('--tl-cursor-chat-placeholder', `'${defaultPlaceholder}'`)
		}
	}, [chatMessage, container, msg])

	// --- Positioning the chat input ----------------------------
	const handlePointerMove = useCallback((e: PointerEvent) => {
		ref.current?.style.setProperty('left', e.clientX + 'px')
		ref.current?.style.setProperty('top', e.clientY + 'px')
	}, [])

	useEffect(() => {
		window.addEventListener('pointermove', handlePointerMove)
		return () => window.removeEventListener('pointermove', handlePointerMove)
	}, [handlePointerMove])

	// --- Helpers for handling the chat message -------------------
	const stopChatting = useCallback(() => {
		app.updateInstanceState({ isChatting: false, chatMessageTimestamp: Date.now() })
		startFade()
		container.focus()
	}, [app, startFade, container])

	const updateChatMessage = useCallback(
		(chatMessage: string) => {
			app.updateInstanceState({ chatMessage, chatMessageTimestamp: null })
			stopFade()
		},
		[app, stopFade]
	)

	// --- Handling user interactions below this line ---------------

	// Update the chat message as the user types
	const handleInput = useCallback(
		(e) => updateChatMessage(e.currentTarget.textContent),
		[updateChatMessage]
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
						stopChatting()
						return
					}

					// Otherwise, 'send' the message
					ref.current.textContent = ''
					break
				}
				case 'Escape': {
					preventDefault(e)
					e.stopPropagation()
					if (!ref.current) return

					// If the user has typed something, cancel it!
					if (ref.current.textContent !== '') {
						updateChatMessage('')
					}

					// Either way, stop chatting
					stopChatting()
					break
				}
			}
		},
		[isChatting, stopChatting, updateChatMessage]
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
			onBlur={stopChatting}
			onInput={handleInput}
			onKeyDown={handleKeyDown}
			spellCheck={false}
			onPaste={handlePaste}
		>
			{isChatting ? null : chatMessage}
		</div>
	)
})
