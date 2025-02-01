import { preventDefault, TiptapEditor } from '@tldraw/editor'
import { useEffect, useMemo, useState } from 'react'
import { useUiEvents } from '../../context/events'
import { useTranslation } from '../../hooks/useTranslation/useTranslation'
import { TldrawUiButton } from '../primitives/Button/TldrawUiButton'
import { TldrawUiButtonIcon } from '../primitives/Button/TldrawUiButtonIcon'

/** @public */
export interface DefaultRichTextToolbarContentProps {
	onEditLinkIntent?(): void
	textEditor: TiptapEditor
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

	// We need to force this one to update when the editor updates or when selection changes
	const [_, set] = useState(0)
	useEffect(() => {
		function forceUpdate() {
			set((t) => t + 1)
		}
		textEditor.on('update', forceUpdate)
		textEditor.on('selectionUpdate', forceUpdate)
	}, [textEditor])

	const actions = useMemo(
		() =>
			[
				// { name: 'heading', op: 'toggleHeading', attrs: { level: 3 as const } },
				{ name: 'bold', op: 'toggleBold' },
				{ name: 'italic', op: 'toggleItalic' },
				// { name: 'underline', op: 'toggleUnderline' },
				// { name: 'strike', op: 'toggleStrike' },
				{ name: 'code', op: 'toggleCode' },
				onEditLinkIntent ? { name: 'link', customOp: () => onEditLinkIntent() } : undefined,
				{ name: 'bulletList', op: 'toggleBulletList' },
				{ name: 'highlight', op: 'toggleHighlight' },
			].filter(Boolean) as {
				name: string
				op?: string
				attrs?: { level: 3 }
				customOp?(): void
			}[],
		[onEditLinkIntent]
	)

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
