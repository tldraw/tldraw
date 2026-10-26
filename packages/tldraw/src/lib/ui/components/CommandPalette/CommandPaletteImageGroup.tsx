import {
	approximately,
	defineMessages,
	isEqual,
	kickoutOccludedShapes,
	TLImageShape,
	TLShapePartial,
	useEditor,
	useValue,
} from '@tldraw/editor'
import {
	ASPECT_RATIO_OPTION,
	ASPECT_RATIO_OPTIONS,
	ASPECT_RATIO_TO_VALUE,
	getCroppedImageDataForAspectRatio,
	getDefaultCrop,
} from '../../../shapes/shared/crop'
import { useUiEvents } from '../../context/events'
import { useReadonly } from '../../hooks/useReadonly'
import { useTranslation } from '../../hooks/useTranslation/useTranslation'
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

// Same rule as the image toolbar's aspect ratio menu.
function isAspectRatioChecked(image: TLImageShape, aspectRatio: ASPECT_RATIO_OPTION) {
	const { crop, w, h } = image.props
	if (!crop || isEqual(crop, getDefaultCrop())) return aspectRatio === 'original'
	if (aspectRatio === 'original') return false
	if (aspectRatio === 'circle') return !!crop.isCircle
	const tolerance = aspectRatio === 'square' ? 0.1 : 0.01
	return (
		(aspectRatio !== 'square' || !crop.isCircle) &&
		approximately(w / h, ASPECT_RATIO_TO_VALUE[aspectRatio], tolerance)
	)
}

/**
 * The image toolbar's commands, while one unlocked image is selected: replace, crop, aspect ratio
 * and alternative text.
 *
 * @public @react
 */
export function CommandPaletteImageGroup() {
	const editor = useEditor()
	const msg = useTranslation()
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

	const setAspectRatio = (aspectRatio: ASPECT_RATIO_OPTION) => {
		editor.run(() => {
			editor.markHistoryStoppingPoint('aspect ratio')
			const change = getCroppedImageDataForAspectRatio(aspectRatio, image)
			editor.updateShape({
				id: image.id,
				type: 'image',
				x: change.x,
				y: change.y,
				props: { crop: change.crop, w: change.w, h: change.h },
			} as TLShapePartial)
			kickoutOccludedShapes(editor, [image.id])
		})
	}

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
						checked={isAspectRatioChecked(image, aspectRatio)}
						onSelect={() => setAspectRatio(aspectRatio)}
					/>
				))}
			</TldrawUiMenuSubmenu>
			<CommandPalettePromptItem
				id="image-alt-text"
				label={msg(messages.toolMediaAltText)}
				placeholder={msg(messages.toolMediaAltTextDesc)}
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
