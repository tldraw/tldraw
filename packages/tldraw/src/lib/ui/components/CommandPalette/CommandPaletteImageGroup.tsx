import { defineMessages, TLImageShape, useEditor, useValue } from '@tldraw/editor'
import {
	applyImageAspectRatio,
	ASPECT_RATIO_OPTIONS,
	isImageAspectRatioChecked,
} from '../../../shapes/shared/crop'
import { useUiEvents } from '../../context/events'
import { useReadonly } from '../../hooks/useReadonly'
import { TldrawUiMenuActionItem } from '../primitives/menus/TldrawUiMenuActionItem'
import { TldrawUiMenuCheckboxItem } from '../primitives/menus/TldrawUiMenuCheckboxItem'
import { TldrawUiMenuGroup } from '../primitives/menus/TldrawUiMenuGroup'
import { TldrawUiMenuSubmenu } from '../primitives/menus/TldrawUiMenuSubmenu'
import { aspectRatioMessages } from '../Toolbar/DefaultImageToolbarContent'
import { CommandPalettePromptItem } from './CommandPalettePromptItem'

const messages = defineMessages({
	toolImageToolbarTitle: { id: 'tool.image-toolbar-title', defaultMessage: 'Image tools' },
	toolAspectRatio: { id: 'tool.aspect-ratio', defaultMessage: 'Aspect ratio' },
	toolMediaAltText: { id: 'tool.media-alt-text', defaultMessage: 'Alternative text' },
	toolMediaAltTextDesc: { id: 'tool.media-alt-text-desc', defaultMessage: 'Give a description…' },
})

/**
 * The image toolbar's commands, while one unlocked image is selected: replace, crop, aspect ratio
 * and alternative text. Needs an editor.
 *
 * @public @react
 */
export function CommandPaletteImageGroup() {
	const editor = useEditor()
	const trackEvent = useUiEvents()
	const isReadonly = useReadonly()
	const image = useValue(
		'selected image',
		() => {
			if (!editor.isIn('select')) return null
			const shape = editor.getOnlySelectedShape()
			return shape && shape.type === 'image' && !shape.isLocked ? (shape as TLImageShape) : null
		},
		[editor]
	)
	if (isReadonly || !image) return null

	return (
		<TldrawUiMenuGroup id="command-palette-image" label={messages.toolImageToolbarTitle.id}>
			<TldrawUiMenuActionItem actionId="image-replace" />
			<TldrawUiMenuActionItem actionId="crop-image" />
			<TldrawUiMenuSubmenu id="aspect-ratio" label={messages.toolAspectRatio.id}>
				{ASPECT_RATIO_OPTIONS.map((aspectRatio) => (
					<TldrawUiMenuCheckboxItem
						key={aspectRatio}
						id={`aspect-ratio-${aspectRatio}`}
						label={aspectRatioMessages[aspectRatio].id}
						checked={isImageAspectRatioChecked(image, aspectRatio)}
						onSelect={() => applyImageAspectRatio(editor, image, aspectRatio)}
					/>
				))}
			</TldrawUiMenuSubmenu>
			<CommandPalettePromptItem
				id="image-alt-text"
				label={messages.toolMediaAltText.id}
				placeholder={messages.toolMediaAltTextDesc.id}
				initialValue={image.props.altText}
				onSubmit={(altText) => {
					if (altText === image.props.altText) return
					editor.markHistoryStoppingPoint('set alt text')
					editor.updateShapes([{ id: image.id, type: 'image', props: { altText } }])
					trackEvent('set-alt-text', { source: 'command-palette' })
				}}
			/>
		</TldrawUiMenuGroup>
	)
}
