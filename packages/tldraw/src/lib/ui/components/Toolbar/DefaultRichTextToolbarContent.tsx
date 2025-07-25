import { isAccelKey, preventDefault, TiptapEditor } from '@tldraw/editor'
import { useEffect, useMemo, useState } from 'react'
import { useUiEvents } from '../../context/events'
import { useTranslation } from '../../hooks/useTranslation/useTranslation'
import { TldrawUiButtonIcon } from '../primitives/Button/TldrawUiButtonIcon'
import { TldrawUiToolbarButton } from '../primitives/TldrawUiToolbar'

/** @public */
export interface DefaultRichTextToolbarContentProps {
	onEditLinkStart?(): void
	textEditor: TiptapEditor
}

/**
 * Rich text toolbar items that have the basics.
 *
 * @public @react
 */
export function DefaultRichTextToolbarContent({
	textEditor,
	onEditLinkStart,
}: DefaultRichTextToolbarContentProps) {
	const trackEvent = useUiEvents()
	const msg = useTranslation()
	const source = 'rich-text-menu'

	// We need to force this one to update when the editor updates or when selection changes
	const [_, set] = useState(0)
	useEffect(
		function forceUpdateWhenContentChanges() {
			function forceUpdate() {
				set((t) => t + 1)
			}
			textEditor.on('update', forceUpdate)
			textEditor.on('selectionUpdate', forceUpdate)
		},
		[textEditor]
	)

	useEffect(() => {
		function handleKeyDown(event: KeyboardEvent) {
			if (onEditLinkStart && isAccelKey(event) && event.shiftKey && event.key === 'k') {
				event.preventDefault()
				onEditLinkStart()
			}
		}

		document.addEventListener('keydown', handleKeyDown)
		return () => {
			document.removeEventListener('keydown', handleKeyDown)
		}
	}, [onEditLinkStart])

	// todo: we could make this a prop
	const actions = useMemo(() => {
		function handleOp(name: string, op: string) {
			trackEvent('rich-text', { operation: name as any, source })
			// @ts-expect-error typing this is annoying at the moment.
			textEditor.chain().focus()[op]().run()
		}

		return [
			// { name: 'heading', attrs: { level: 3 }, onSelect() { textEditor.chain().focus().toggleHeading({ level: 3}).run() }},
			{
				name: 'bold',
				onSelect() {
					handleOp('bold', 'toggleBold')
				},
			},
			{
				name: 'italic',
				onSelect() {
					handleOp('bold', 'toggleItalic')
				},
			},
			// { name: 'underline', onSelect() { handleOp('underline', 'toggleUnderline') }},
			// { name: 'strike', onSelect() { handleOp('strike', 'toggleStrike')  }},
			{
				name: 'code',
				onSelect() {
					handleOp('bold', 'toggleCode')
				},
			},
			onEditLinkStart
				? {
						name: 'link',
						onSelect() {
							onEditLinkStart()
						},
					}
				: undefined, // ? is this really optional?
			{
				name: 'bulletList',
				onSelect() {
					handleOp('bulletList', 'toggleBulletList')
				},
			},
			{
				name: 'highlight',
				onSelect() {
					handleOp('bulletList', 'toggleHighlight')
				},
			},
		].filter(Boolean) as {
			name: string
			attrs?: string
			onSelect(): void
		}[]
	}, [textEditor, trackEvent, onEditLinkStart])

	return actions.map(({ name, attrs, onSelect }) => {
		const isActive = textEditor.isActive(name, attrs)
		return (
			<TldrawUiToolbarButton
				key={name}
				title={msg(`tool.rich-text-${name}`)}
				data-testid={`rich-text.${name}`}
				type="icon"
				isActive={isActive} // todo: we need to update this only when the text editor "settles", ie not during a change of selection
				onPointerDown={preventDefault}
				onClick={onSelect}
				role="option"
				aria-pressed={isActive}
			>
				<TldrawUiButtonIcon small icon={name} />
			</TldrawUiToolbarButton>
		)
	})
}
