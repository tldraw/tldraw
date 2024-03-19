import { Editor, TLEventInfo, track, useValue } from '@tldraw/editor'
import { Picker } from 'emoji-mart'
import { useEffect, useRef } from 'react'

export type EmojiDialogProps = {
	editor: Editor
	onClose: () => void
	text: string
	top: number
	left: number
	onEmojiSelect: (emoji: any) => void
	onClickOutside: () => void
	disableFrequentRows?: boolean
}

export default track(function EmojiDialog({
	editor,
	top,
	left,
	onEmojiSelect,
	onClickOutside,
	disableFrequentRows,
}: EmojiDialogProps) {
	const isDarkMode = useValue('isDarkMode', () => editor.user.getIsDarkMode(), [editor])
	const ref = useRef(null)
	const instance = useRef<any>(null)
	const theme = isDarkMode ? 'light' : 'dark'

	useEffect(() => {
		const eventListener = (event: TLEventInfo) => {
			if (event.name === 'pointer_down') {
				onClickOutside()
			}
		}
		editor.on('event', eventListener)

		instance.current = new Picker({
			maxFrequentRows: disableFrequentRows ? 0 : undefined,
			onEmojiSelect,
			onClickOutside,
			theme,
			searchPosition: 'static',
			previewPosition: 'none',
			ref,
		})
		EmojiDialogSingleton = instance.current

		return () => {
			instance.current = null
			EmojiDialogSingleton = null
			editor.off('event', eventListener)
		}
	}, [editor, theme, onEmojiSelect, onClickOutside, disableFrequentRows])

	return (
		<div
			ref={ref}
			style={{
				position: 'absolute',
				top,
				left,
				zIndex: 400,
				pointerEvents: 'all',
				transformOrigin: '0 0',
				transform: 'scale(0.85)',
			}}
		/>
	)
})

export let EmojiDialogSingleton: { component: any } | null = null
