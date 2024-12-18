import { Editor as TextEditor } from '@tiptap/core'
import { preventDefault } from '@tldraw/editor'
import { useUiEvents } from '../../context/events'
import { useTranslation } from '../../hooks/useTranslation/useTranslation'
import { TldrawUiButton } from '../primitives/Button/TldrawUiButton'
import { TldrawUiButtonIcon } from '../primitives/Button/TldrawUiButtonIcon'

/** @public */
export interface DefaultRichTextToolbarContentProps {
	onEditLinkIntent?(): void
	textEditor: TextEditor
}

/**
 * Rich text toolbar items that have the basics.
 *
 * @public @react
 */
export function DefaultRichTextToolbarContent({
	textEditor,
	onEditLinkIntent,
}: DefaultRichTextToolbarContentProps) {
	const trackEvent = useUiEvents()
	const msg = useTranslation()
	const source = 'rich-text-menu'

	const actions = [
		{ name: 'bold', op: 'toggleBold' },
		{ name: 'strike', op: 'toggleStrike' },
		{ name: 'highlight', op: 'toggleHighlight' },
		{ name: 'code', op: 'toggleCode' },
		onEditLinkIntent ? { name: 'link', customOp: () => onEditLinkIntent() } : undefined,
		{ name: 'heading', op: 'toggleHeading', attrs: { level: 3 as const } },
		{ name: 'bulletList', op: 'toggleBulletList' },
	].filter(Boolean) as {
		name: string
		op?: string
		attrs?: { level: 3 }
		customOp?(): void
	}[]

	return actions.map(({ name, op, attrs, customOp }) => {
		return (
			<TldrawUiButton
				key={name}
				title={msg(`tool.rich-text-${name}`)}
				data-testid={`rich-text.${name}`}
				type="icon"
				isActive={textEditor.isActive(name, attrs)}
				onPointerDown={preventDefault}
				onClick={() => {
					trackEvent('rich-text', { operation: name as any, source })

					if (customOp) {
						customOp()
					} else if (op === 'toggleHeading' && attrs) {
						textEditor.chain().focus().toggleHeading(attrs).run()
					} else {
						// @ts-ignore typing this is annoying at the moment.
						textEditor.chain().focus()[op]().run()
					}
				}}
			>
				<TldrawUiButtonIcon small icon={name} />
			</TldrawUiButton>
		)
	})
}
