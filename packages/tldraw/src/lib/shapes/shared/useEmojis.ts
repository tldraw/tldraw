import { useState } from 'react'
import { useDialogs } from '../../ui/hooks/useDialogsProvider'
import EmojiDialog from './emojis'
import { EmojiDialogSingleton } from './emojis/EmojiDialog'

export function useEmojis(inputEl: HTMLTextAreaElement | null, onComplete: (text: string) => void) {
	const { addDialog, removeDialog } = useDialogs()
	const [emojiSearchText, setEmojiSearchText] = useState('')
	const [isEmojiMenuOpen, setIsEmojiMenuOpen] = useState(false)

	const closeMenu = () => {
		setIsEmojiMenuOpen(false)
		removeDialog('emoji')
		setEmojiSearchText('')
	}

	const onEmojiSelect = (emoji: any) => {
		if (!inputEl) return

		const searchText = EmojiDialogSingleton?.component.refs.searchInput.current.value
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

	const onKeyDown = (
		e: React.KeyboardEvent<HTMLTextAreaElement>,
		coords: { top: number; left: number } | null
	) => {
		const emojiPicker = EmojiDialogSingleton?.component

		switch (e.key) {
			case ':': {
				if (isEmojiMenuOpen) {
					closeMenu()
					return false
				}

				setEmojiSearchText('')
				addDialog({
					id: 'emoji',
					component: EmojiDialog,
					isCustomDialog: true,
					dialogProps: {
						onEmojiSelect,
						onClickOutside: closeMenu,
						top: coords?.top,
						left: coords?.left,
					},
				})
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
					emojiPicker.handleSearchKeyDown({
						...e,
						preventDefault: () => {
							/* shim */
						},
						stopImmediatePropagation: () => {
							/* shim */
						},
					})
					e.preventDefault()
					return true
				}

				return false
			}

			case 'Backspace':
				if (isEmojiMenuOpen) {
					if (!emojiSearchText) {
						closeMenu()
						return true
					}

					const text = emojiSearchText.slice(0, -1)
					emojiPicker.refs.searchInput.current.value = text
					emojiPicker.handleSearchInput()
					setEmojiSearchText(text)
					return true
				}

				return false

			default:
				if (isEmojiMenuOpen && e.key.length === 1 && e.key.match(/[a-zA-Z0-9]/)) {
					emojiPicker.refs.searchInput.current.value = emojiSearchText + e.key
					emojiPicker.handleSearchInput()
					setEmojiSearchText(emojiSearchText + e.key)
					return true
				}

				return isEmojiMenuOpen
		}
	}

	return { onKeyDown }
}
