import { ReactRenderer } from '@tiptap/react'
import { SuggestionKeyDownProps, SuggestionProps } from '@tiptap/suggestion'
import { Picker } from 'emoji-mart'
import {
	Suspense,
	forwardRef,
	lazy,
	useCallback,
	useEffect,
	useImperativeHandle,
	useRef,
	useState,
} from 'react'
import { useEditor, useValue } from 'tldraw'
import { EmojiMartData } from './EmojiDialog'
import { Emoji } from './emoji'

const EmojiDialog = lazy(() => import('./EmojiDialog'))

interface EmojiDialogWrapperHandle {
	onKeyDown(props: SuggestionKeyDownProps): boolean
}

const EmojiDialogWrapper = forwardRef((props: SuggestionProps, ref) => {
	const [emojiSearchText, setEmojiSearchText] = useState('')
	const [emojiPicker, setEmojiPicker] = useState<any>(null)
	const emojiSearchLength = useRef(0)
	const editor = useEditor()
	const currentCamera = useValue('camera', () => editor.getCamera(), [editor])

	// Use the initial rect so we don't keep moving the dialog as we type.
	const clientRect = useRef(props.clientRect?.())

	const handlePickerLoaded = useCallback((ep: Picker) => {
		setEmojiPicker(ep)
	}, [])

	const resetSearch = useCallback(() => {
		setEmojiSearchText('')
		emojiSearchLength.current = 0
	}, [])

	useEffect(() => {
		clientRect.current = props.clientRect?.()
	}, [props, currentCamera])

	useEffect(() => {
		emojiSearchLength.current = emojiSearchText.length
	}, [emojiSearchText])

	const selectItem = useCallback(
		(emoji: EmojiMartData) => {
			props.range.to += emojiSearchLength.current
			props.command({ emoji: emoji.native })
			resetSearch()
		},
		[props, resetSearch]
	)

	useImperativeHandle(
		ref,
		() => {
			return {
				onKeyDown: (props: SuggestionKeyDownProps) => {
					const picker = emojiPicker?.component
					if (!picker) return false

					switch (props.event.key) {
						case 'Enter':
						case 'ArrowLeft':
						case 'ArrowRight':
						case 'ArrowUp':
						case 'ArrowDown': {
							picker.handleSearchKeyDown({
								key: props.event.key,
								repeat: props.event.repeat,
								currentTarget: picker.refs.searchInput.current,
								preventDefault: () => {
									/* shim */
								},
								stopImmediatePropagation: () => {
									/* shim */
								},
							})

							return true
						}

						case 'Backspace': {
							if (!emojiSearchText) {
								resetSearch()
								break
							}

							const text = emojiSearchText.slice(0, -1)
							if (picker) {
								picker.refs.searchInput.current.value = text
								picker.handleSearchInput()
							}
							setEmojiSearchText(text)

							break
						}

						default: {
							if (props.event.key.length === 1 && props.event.key.match(/[a-z0-9-_]/i)) {
								picker.refs.searchInput.current.value = emojiSearchText + props.event.key
								picker.handleSearchInput()
								setEmojiSearchText(emojiSearchText + props.event.key)
							}
							break
						}
					}

					return false
				},
			}
		},
		[emojiPicker, emojiSearchText, resetSearch]
	)

	if (!clientRect.current) return null

	// We have this wrapper around EmojiDialog because the import is heavier and we want
	// to load it on demand.
	return (
		<Suspense fallback={<div />}>
			<EmojiDialog
				top={clientRect.current.bottom}
				left={clientRect.current.left}
				onEmojiSelect={selectItem}
				onClickOutside={resetSearch}
				onPickerLoaded={handlePickerLoaded}
			/>
		</Suspense>
	)
})

export default Emoji.configure({
	suggestion: {
		allowSpaces: false,

		render: () => {
			let component: ReactRenderer<
				typeof EmojiDialogWrapper & EmojiDialogWrapperHandle,
				SuggestionProps
			> | null = null

			const unmount = () => document.getElementById('tl-emoji-menu-root')?.remove()

			return {
				onStart: (props: SuggestionProps) => {
					component = new ReactRenderer<
						typeof EmojiDialogWrapper & EmojiDialogWrapperHandle,
						SuggestionProps
					>(EmojiDialogWrapper, { props, editor: props.editor })

					document.getElementById('tl-emoji-menu-root')?.remove()
					const div = document.createElement('div')
					div.id = 'tl-emoji-menu-root'
					div.appendChild(component.element)
					document.body.appendChild(div)
				},

				onKeyDown(props: SuggestionKeyDownProps) {
					if (props.event.key === 'Escape') {
						unmount()
						return true
					}

					return !!component?.ref?.onKeyDown(props)
				},

				onExit() {
					unmount()
				},
			}
		},
	},
})
