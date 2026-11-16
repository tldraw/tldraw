import {
	type ASPECT_RATIO_OPTION,
	type TLI18nMessage,
	defineMessages,
	TLImageShape,
	useEditor,
	useValue,
	applyImageAspectRatio,
	ASPECT_RATIO_OPTIONS,
	isImageAspectRatioChecked,
	useUiEvents,
	useReadonly,
	TldrawUiMenuActionItem,
	TldrawUiMenuCheckboxItem,
	TldrawUiMenuGroup,
	TldrawUiMenuSubmenu,
} from 'tldraw'
import { CommandPalettePromptItem } from './CommandPalettePromptItem'

const messages = defineMessages({
	toolImageToolbarTitle: { id: 'tool.image-toolbar-title', defaultMessage: 'Image tools' },
	toolAspectRatio: { id: 'tool.aspect-ratio', defaultMessage: 'Aspect ratio' },
	toolMediaAltText: { id: 'tool.media-alt-text', defaultMessage: 'Alternative text' },
	toolMediaAltTextDesc: { id: 'tool.media-alt-text-desc', defaultMessage: 'Give a description…' },
})

const aspectRatioMessages: Record<ASPECT_RATIO_OPTION, TLI18nMessage> = defineMessages({
	original: { id: 'tool.aspect-ratio.original', defaultMessage: 'Original' },
	square: { id: 'tool.aspect-ratio.square', defaultMessage: 'Square (1:1)' },
	circle: { id: 'tool.aspect-ratio.circle', defaultMessage: 'Circle (1:1)' },
	landscape: { id: 'tool.aspect-ratio.landscape', defaultMessage: 'Landscape (4:3)' },
	portrait: { id: 'tool.aspect-ratio.portrait', defaultMessage: 'Portrait (3:4)' },
	wide: { id: 'tool.aspect-ratio.wide', defaultMessage: 'Wide (16:9)' },
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
