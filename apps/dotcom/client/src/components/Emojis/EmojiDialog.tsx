import { Picker } from 'emoji-mart'
import React, { RefObject, useEffect } from 'react'
import {
	PORTRAIT_BREAKPOINT,
	TLEventInfo,
	useBreakpoint,
	useEditor,
	usePassThroughMouseOverEvents,
	usePassThroughWheelEvents,
	useValue,
} from 'tldraw'
import EmojiData from './emoji-data-version-14.json'

/** @internal */
export interface EmojiMartData {
	emoticons: string[]
	id: string
	keywords: string[]
	name: string
	native: string
	shortcodes: string
	unified: string
}

export interface EmojiDialogProps {
	top: number
	left: number
	onEmojiSelect(emoji: EmojiMartData): void
	onClickOutside(): void
	onPickerLoaded(picker: Picker): void
}

const EmojiDialog = React.forwardRef<HTMLDivElement, EmojiDialogProps>(function EmojiDialog(
	{ top, left, onEmojiSelect, onClickOutside, onPickerLoaded }: EmojiDialogProps,
	ref
) {
	const editor = useEditor()
	const breakpoint = useBreakpoint()
	const isDarkMode = useValue('isDarkMode', () => editor.user.getIsDarkMode(), [editor])
	usePassThroughMouseOverEvents(ref as RefObject<HTMLDivElement>)
	usePassThroughWheelEvents(ref as RefObject<HTMLDivElement>)
	const theme = isDarkMode ? 'dark' : 'light'

	useEffect(() => {
		// Sorry, disabled on mobile, no room.
		if (breakpoint < PORTRAIT_BREAKPOINT.TABLET_SM) return

		const eventListener = (event: TLEventInfo) => {
			if (event.name === 'pointer_down') {
				onClickOutside()
			}
		}
		editor.on('event', eventListener)

		const picker = new Picker({
			data: EmojiData,
			maxFrequentRows: 0,
			onEmojiSelect,
			onClickOutside,
			theme,
			searchPosition: 'static',
			// I had this off before but we want the skin tones to be available
			// and it's tied with this bit of the UI.
			// previewPosition: 'none',
			ref,
		})

		onPickerLoaded(picker)

		return () => {
			editor.off('event', eventListener)
		}
	}, [editor, breakpoint, theme, onEmojiSelect, onClickOutside, onPickerLoaded, ref])

	if (breakpoint < PORTRAIT_BREAKPOINT.TABLET_SM) return null

	return (
		<div
			ref={ref}
			style={{
				position: 'absolute',
				inset: 0,
				transform: `translate(${left}px, ${top}px)`,
				zIndex: 400,
				pointerEvents: 'all',
			}}
		/>
	)
})

export default EmojiDialog
