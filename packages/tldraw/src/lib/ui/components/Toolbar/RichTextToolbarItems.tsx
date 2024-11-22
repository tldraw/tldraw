import { Editor as TextEditor } from '@tiptap/core'
import { useUiEvents } from '../../context/events'
import { useTranslation } from '../../hooks/useTranslation/useTranslation'
import { TldrawUiButton } from '../primitives/Button/TldrawUiButton'
import { TldrawUiButtonIcon } from '../primitives/Button/TldrawUiButtonIcon'

export interface RichTextToolbarItemsProps {
	onEditLinkIntent(): void
	textEditor: TextEditor
}

/** @public @react */
export function RichTextToolbarItems({ textEditor, onEditLinkIntent }: RichTextToolbarItemsProps) {
	const trackEvent = useUiEvents()
	const msg = useTranslation()
	const source = 'rich-text-menu'

	const actions = [
		{ name: 'bold', op: 'toggleBold' },
		{ name: 'strike', op: 'toggleStrike' },
		{ name: 'highlight', op: 'toggleHighlight' },
		{ name: 'code', op: 'toggleCode' },
		{ name: 'link', customOp: () => onEditLinkIntent() },
		{ name: 'heading', op: 'toggleHeading', attrs: { level: 3 as const } },
		{ name: 'bulletList', op: 'toggleBulletList' },
	]

	return actions.map(({ name, op, attrs, customOp }) => {
		return (
			<TldrawUiButton
				key={name}
				title={msg(`tool.rich-text-${name}`)}
				type="icon"
				isActive={textEditor.isActive(name, attrs)}
				onClick={() => {
					trackEvent('rich-text', { operation: name as any, source })

					if (customOp) {
						customOp()
					} else if (op === 'toggleHeading' && attrs) {
						textEditor.chain().focus().toggleHeading(attrs).run()
					} else {
						const cmd = op as 'toggleBold' | 'toggleStrike' | 'toggleBulletList'
						textEditor.chain().focus()[cmd]().run()
					}
				}}
			>
				<TldrawUiButtonIcon small icon={name} />
			</TldrawUiButton>
		)
	})
}
