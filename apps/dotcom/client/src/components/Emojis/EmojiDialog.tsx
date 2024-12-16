import { Picker } from 'emoji-mart'
import { useEffect, useRef } from 'react'
import {
	PORTRAIT_BREAKPOINT,
	TLEventInfo,
	track,
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

export default track(function EmojiDialog({
	top,
	left,
	onEmojiSelect,
	onClickOutside,
	onPickerLoaded,
}: EmojiDialogProps) {
	const editor = useEditor()
	const breakpoint = useBreakpoint()
	const isDarkMode = useValue('isDarkMode', () => editor.user.getIsDarkMode(), [editor])
	const ref = useRef(null)
	usePassThroughMouseOverEvents(ref.current)
	usePassThroughWheelEvents(ref.current)
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
	}, [editor, breakpoint, theme, onEmojiSelect, onClickOutside, onPickerLoaded])

	if (breakpoint < PORTRAIT_BREAKPOINT.TABLET_SM) return null

	return (
		<div
			ref={ref}
			style={{
				position: 'absolute',
				top,
				left,
				zIndex: 400,
				pointerEvents: 'all',
			}}
		/>
	)
})
