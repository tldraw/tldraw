import React, { useEffect, useState } from 'react'
import { Root, createRoot } from 'react-dom/client'
import { Editor } from 'tldraw'
import EmojiDialog from '../components/Emojis'

// Used in combination with our lazy loading so that we don't import the emoji logic if not needed.
async function getEmojiDialogSingleton() {
	return (await import('../components/Emojis/EmojiDialog')).EmojiDialogSingleton
}

export function useEmojis(
	editor: Editor,
	inputEl: HTMLTextAreaElement | null,
	onComplete: (text: string) => void
) {
	const [emojiSearchText, setEmojiSearchText] = useState('')
	const [isEmojiMenuOpen, setIsEmojiMenuOpen] = useState(false)
	const [renderRoot, setRenderRoot] = useState<Root>()

	useEffect(() => {
		const div = document.createElement('div')
		div.id = 'tl-emoji-menu-root'
		document.body.appendChild(div)
		const root = createRoot(div)
		setRenderRoot(root)

		return () => {
			root.unmount()
			document.body.removeChild(div)
		}
	}, [])

	const closeMenu = () => {
		setIsEmojiMenuOpen(false)
		renderRoot?.render(null)
		setEmojiSearchText('')
	}

	const onEmojiSelect = async (emoji: any) => {
		if (!inputEl) return

		const emojiPicker = (await getEmojiDialogSingleton())?.component
		const searchText = emojiPicker?.refs.searchInput.current.value || ''
		inputEl.focus()
		inputEl.setSelectionRange(
			inputEl.selectionStart - searchText.length - 1,
			inputEl.selectionStart
		)
		inputEl.setRangeText(emoji.native)
		inputEl.setSelectionRange(inputEl.selectionStart + 1, inputEl.selectionStart + 1)
		onComplete(inputEl.value)

		closeMenu()
	}

	const onKeyDown = async (
		e: React.KeyboardEvent<HTMLTextAreaElement>,
		coords: { top: number; left: number } | null
	) => {
		switch (e.key) {
			case ':': {
				if (isEmojiMenuOpen) {
					closeMenu()
					return false
				}

				setEmojiSearchText('')

				renderRoot?.render(
					<EmojiDialog
						editor={editor}
						onEmojiSelect={onEmojiSelect}
						onClickOutside={closeMenu}
						top={coords?.top}
						left={coords?.left}
					/>
				)
				setIsEmojiMenuOpen(true)

				return true
			}

			case ' ':
			// fall-through
			case 'Escape': {
				if (isEmojiMenuOpen) {
					closeMenu()
					return true
				}

				return false
			}

			case 'Enter':
			case 'ArrowLeft':
			case 'ArrowRight':
			case 'ArrowUp':
			case 'ArrowDown': {
				if (isEmojiMenuOpen) {
					e.preventDefault()
					const emojiPicker = (await getEmojiDialogSingleton())?.component
					emojiPicker?.handleSearchKeyDown({
						...e,
						preventDefault: () => {
							/* shim */
						},
						stopImmediatePropagation: () => {
							/* shim */
						},
					})
					return true
				}

				return false
			}

			case 'Backspace':
				if (isEmojiMenuOpen) {
					const emojiPicker = (await getEmojiDialogSingleton())?.component
					if (!emojiSearchText) {
						closeMenu()
						return true
					}

					const text = emojiSearchText.slice(0, -1)
					if (emojiPicker) {
						emojiPicker.refs.searchInput.current.value = text
						emojiPicker.handleSearchInput()
					}
					setEmojiSearchText(text)
					return true
				}

				return false

			default:
				if (isEmojiMenuOpen && e.key.length === 1 && e.key.match(/[a-zA-Z0-9]/)) {
					const emojiPicker = (await getEmojiDialogSingleton())?.component
					if (emojiPicker) {
						emojiPicker.refs.searchInput.current.value = emojiSearchText + e.key
						emojiPicker.handleSearchInput()
					}
					setEmojiSearchText(emojiSearchText + e.key)
					return true
				}

				return isEmojiMenuOpen
		}
	}

	return { onKeyDown }
}
