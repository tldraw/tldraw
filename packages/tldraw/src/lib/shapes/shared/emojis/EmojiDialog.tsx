import { TLEventInfo, track, useEditor } from '@tldraw/editor'
import { Picker } from 'emoji-mart'
import { useEffect, useRef } from 'react'
import { useDefaultColorTheme } from '../ShapeFill'

export type EmojiDialogProps = {
	onClose: () => void
	text: string
	top: number
	left: number
	onEmojiSelect: (emoji: any) => void
	onClickOutside: () => void
}

export default track(function EmojiDialog({
	top,
	left,
	onEmojiSelect,
	onClickOutside,
}: EmojiDialogProps) {
	const editor = useEditor()
	const theme = useDefaultColorTheme()
	const ref = useRef(null)
	const instance = useRef<any>(null)

	useEffect(() => {
		const eventListener = (event: TLEventInfo) => {
			if (event.name === 'pointer_down') {
				onClickOutside()
			}
		}
		editor.on('event', eventListener)

		instance.current = new Picker({
			maxFrequentRows: 0,
			onEmojiSelect,
			onClickOutside,
			theme: theme.id,
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
	}, [editor, theme.id, onEmojiSelect, onClickOutside])

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
