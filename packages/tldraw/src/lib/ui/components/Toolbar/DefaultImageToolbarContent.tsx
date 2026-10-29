import {
	defineMessages,
	modulate,
	TLI18nMessage,
	TLImageShape,
	TLShapePartial,
	track,
	useEditor,
	useValue,
} from '@tldraw/editor'
import { useCallback, useEffect, useRef } from 'react'
import {
	applyImageAspectRatio,
	ASPECT_RATIO_OPTION,
	ASPECT_RATIO_OPTIONS,
	getCroppedImageDataWhenZooming,
	isImageAspectRatioChecked,
	MAX_ZOOM,
} from '../../../shapes/shared/crop'
import { useActions } from '../../context/actions'
import { useUiEvents } from '../../context/events'
import { useTranslation } from '../../hooks/useTranslation/useTranslation'
import { TldrawUiButtonIcon } from '../primitives/Button/TldrawUiButtonIcon'
import { TldrawUiButtonLabel } from '../primitives/Button/TldrawUiButtonLabel'
import {
	TldrawUiDropdownMenuCheckboxItem,
	TldrawUiDropdownMenuContent,
	TldrawUiDropdownMenuRoot,
	TldrawUiDropdownMenuTrigger,
} from '../primitives/TldrawUiDropdownMenu'
import { TldrawUiSlider } from '../primitives/TldrawUiSlider'
import { TldrawUiToolbarButton } from '../primitives/TldrawUiToolbar'

const messages = defineMessages({
	actionDownloadOriginal: { id: 'action.download-original', defaultMessage: 'Download original' },
	toolReplaceMedia: { id: 'tool.replace-media', defaultMessage: 'Replace media…' },
	toolAspectRatio: { id: 'tool.aspect-ratio', defaultMessage: 'Aspect ratio' },
	toolImageCrop: { id: 'tool.image-crop', defaultMessage: 'Crop image' },
	toolImageCropConfirm: { id: 'tool.image-crop-confirm', defaultMessage: 'Confirm' },
	toolImageZoom: { id: 'tool.image-zoom', defaultMessage: 'Zoom' },
	toolMediaAltText: { id: 'tool.media-alt-text', defaultMessage: 'Alternative text' },
})

/** @public */
export interface DefaultImageToolbarContentProps {
	imageShapeId: TLImageShape['id']
	isManipulating: boolean
	onEditAltTextStart(): void
	onManipulatingStart(): void
	onManipulatingEnd(): void
}

// Keyed on the option rather than written at the call site, which used to compose the id from
// `aspectRatio` and so hid every one of these from the extractor. The `Record` keeps it complete:
// a new option won't compile until it has a label.
export const aspectRatioMessages: Record<ASPECT_RATIO_OPTION, TLI18nMessage> = defineMessages({
	original: { id: 'tool.aspect-ratio.original', defaultMessage: 'Original' },
	square: { id: 'tool.aspect-ratio.square', defaultMessage: 'Square (1:1)' },
	circle: { id: 'tool.aspect-ratio.circle', defaultMessage: 'Circle (1:1)' },
	landscape: { id: 'tool.aspect-ratio.landscape', defaultMessage: 'Landscape (4:3)' },
	portrait: { id: 'tool.aspect-ratio.portrait', defaultMessage: 'Portrait (3:4)' },
	wide: { id: 'tool.aspect-ratio.wide', defaultMessage: 'Wide (16:9)' },
})

const MAX_RATIO_CONVERSION = MAX_ZOOM / (MAX_ZOOM - 1)

// Apply an easing function to smooth out the zoom curve,
// otherwise the zoom slider has a cubic drag feel to it which feels off.
function easeZoom(value: number, maxValue: number): number {
	// Use an easing function for a more natural zoom feel
	return Math.pow(value / maxValue, MAX_RATIO_CONVERSION) * maxValue
}

/** @public @react */
export const DefaultImageToolbarContent = track(function DefaultImageToolbarContent({
	imageShapeId,
	isManipulating,
	onEditAltTextStart,
	onManipulatingStart,
	onManipulatingEnd,
}: DefaultImageToolbarContentProps) {
	const editor = useEditor()
	const trackEvent = useUiEvents()
	const msg = useTranslation()
	const source = 'image-toolbar'
	const sliderRef = useRef<HTMLDivElement>(null)
	const isReadonly = editor.getIsReadonly()

	const crop = useValue('crop', () => editor.getShape<TLImageShape>(imageShapeId)!.props.crop, [
		editor,
		imageShapeId,
	])
	const zoom = crop
		? Math.min(1 - (crop.bottomRight.x - crop.topLeft.x), 1 - (crop.bottomRight.y - crop.topLeft.y))
		: 0
	// So, we set a maxZoom here in case there's been a manual crop applied.
	// Typically, you can zoom 3x into the image size (MAX_ZOOM's value).
	// If you go deeper than that zoom level, we need to set that as the new 100%
	// value on the zoom slider (otherwise you could zoom into infinity).
	// This balances usage of the zoom slider with manual cropping.
	const maxZoom = crop ? Math.max(zoom, 1 - 1 / MAX_ZOOM) : MAX_ZOOM
	const actions = useActions()

	const onHistoryMark = useCallback((id: string) => editor.markHistoryStoppingPoint(id), [editor])

	const displayValue = crop
		? modulate(easeZoom(zoom, maxZoom), [0, maxZoom], [0, 100], true /* clamp */)
		: 0

	const handleZoomChange = useCallback(
		(value: number) => {
			editor.setCurrentTool('select.crop.idle')
			// Convert the eased slider value back to the actual zoom value
			const sliderPercent = value / 100

			// Convert the slider position back into the "zoom" value expected by
			// getCroppedImageDataWhenZooming.
			// 1. Undo the easing: z_out = sliderPercent^(1/maxRatioConversion) * maxZoom
			// 2. Translate z_out into the function's input domain. The helper computes
			//    the *resulting* zoom (z_out) using:
			//        z_out = 2 * z_in / (1 + 2 * z_in)
			//    Solving for z_in gives:
			//        z_in = z_out / (2 * (1 - z_out))
			const maxDimension = 1 - 1 / MAX_ZOOM
			const clampedMaxZoom = Math.min(maxDimension, maxZoom)
			const zOut = Math.pow(sliderPercent, 1 / MAX_RATIO_CONVERSION) * clampedMaxZoom
			const zoom = zOut >= 1 ? 1 : zOut / (2 * (1 - zOut))
			const imageShape = editor.getShape<TLImageShape>(imageShapeId)
			if (!imageShape) return

			const change = getCroppedImageDataWhenZooming(zoom, imageShape, maxZoom)

			editor.updateShape({
				id: imageShape.id,
				type: imageShape.type,
				x: change.x,
				y: change.y,
				props: {
					w: change.w,
					h: change.h,
					crop: change.crop,
				},
			} as TLShapePartial)

			trackEvent('set-style', { source: 'image-toolbar', id: 'zoom', value })
		},
		[editor, trackEvent, imageShapeId, maxZoom]
	)

	const handleImageReplace = useCallback(
		() => actions['image-replace'].onSelect('image-toolbar'),
		[actions]
	)

	const handleImageDownload = useCallback(
		() => actions['download-original'].onSelect('image-toolbar'),
		[actions]
	)

	const handleAspectRatioChange = (aspectRatio: ASPECT_RATIO_OPTION) => {
		const imageShape = editor.getShape<TLImageShape>(imageShapeId)
		if (!imageShape) return
		editor.run(() => {
			editor.setCurrentTool('select.crop.idle')
			applyImageAspectRatio(editor, imageShape, aspectRatio)
		})
	}

	const altText = useValue(
		'altText',
		() => editor.getShape<TLImageShape>(imageShapeId)!.props.altText,
		[editor, imageShapeId]
	)

	useEffect(() => {
		if (isManipulating) {
			editor.timers.setTimeout(() => sliderRef.current?.focus(), 0)
		}
	}, [editor, isManipulating])

	useEffect(() => {
		function handleKeyDown(e: KeyboardEvent) {
			if (!isManipulating) return
			if (e.key === 'Escape') {
				editor.cancel()
			} else if (e.key === 'Enter') {
				editor.complete()
			} else {
				return
			}
			onManipulatingEnd()
			// Otherwise the keydown bubbles to the container's handler, which cancels again
			// against select.idle and clears the selection (#10405). Leaving crop mode also
			// unmounts the slider, so refocus the container to keep shortcuts working.
			e.stopPropagation()
			editor.getContainer().focus()
		}
		const elm = sliderRef.current
		if (!elm) return
		elm.addEventListener('keydown', handleKeyDown)
		return () => elm.removeEventListener('keydown', handleKeyDown)
	}, [editor, isManipulating, onManipulatingEnd])

	if (isManipulating) {
		const image = editor.getShape<TLImageShape>(imageShapeId)!
		return (
			<>
				<TldrawUiSlider
					ref={sliderRef}
					value={displayValue}
					label={messages.toolImageZoom.id}
					onValueChange={handleZoomChange}
					onHistoryMark={onHistoryMark}
					min={0}
					steps={100}
					data-testid="tool.image-zoom"
					title={msg(messages.toolImageZoom)}
				/>
				<TldrawUiDropdownMenuRoot id="image-toolbar-aspect-ratio">
					<TldrawUiDropdownMenuTrigger>
						<TldrawUiToolbarButton
							title={msg(messages.toolAspectRatio)}
							type="icon"
							data-testid="tool.image-aspect-ratio"
						>
							<TldrawUiButtonIcon icon="corners" />
						</TldrawUiToolbarButton>
					</TldrawUiDropdownMenuTrigger>
					<TldrawUiDropdownMenuContent side="top" align="center">
						{ASPECT_RATIO_OPTIONS.map((aspectRatio) => (
							<TldrawUiDropdownMenuCheckboxItem
								key={aspectRatio}
								onSelect={() => handleAspectRatioChange(aspectRatio as ASPECT_RATIO_OPTION)}
								checked={isImageAspectRatioChecked(image, aspectRatio)}
								title={msg(aspectRatioMessages[aspectRatio as ASPECT_RATIO_OPTION])}
							>
								<TldrawUiButtonLabel>
									{msg(aspectRatioMessages[aspectRatio as ASPECT_RATIO_OPTION])}
								</TldrawUiButtonLabel>
							</TldrawUiDropdownMenuCheckboxItem>
						))}
					</TldrawUiDropdownMenuContent>
				</TldrawUiDropdownMenuRoot>
				<TldrawUiToolbarButton
					type="icon"
					onClick={onManipulatingEnd}
					data-testid="tool.image-crop-confirm"
					style={{ borderLeft: '1px solid var(--tl-color-divider)', marginLeft: '2px' }}
					title={msg(messages.toolImageCropConfirm)}
				>
					<TldrawUiButtonIcon small icon="check" />
				</TldrawUiToolbarButton>
			</>
		)
	}

	return (
		<>
			{!isReadonly && (
				<>
					<TldrawUiToolbarButton
						type="icon"
						data-testid="tool.image-replace"
						onClick={handleImageReplace}
						title={msg(messages.toolReplaceMedia)}
					>
						<TldrawUiButtonIcon small icon="tool-media" />
					</TldrawUiToolbarButton>
					<TldrawUiToolbarButton
						type="icon"
						title={msg(messages.toolImageCrop)}
						onClick={onManipulatingStart}
						data-testid="tool.image-crop"
					>
						<TldrawUiButtonIcon small icon="crop" />
					</TldrawUiToolbarButton>
				</>
			)}
			<TldrawUiToolbarButton
				type="icon"
				title={msg(messages.actionDownloadOriginal)}
				onClick={handleImageDownload}
				data-testid="tool.image-download"
			>
				<TldrawUiButtonIcon small icon="download" />
			</TldrawUiToolbarButton>
			{(altText || !isReadonly) && (
				<TldrawUiToolbarButton
					type="icon"
					title={msg(messages.toolMediaAltText)}
					data-testid="tool.image-alt-text"
					onClick={() => {
						trackEvent('alt-text-start', { source })
						onEditAltTextStart()
					}}
				>
					<TldrawUiButtonIcon small icon="alt" />
				</TldrawUiToolbarButton>
			)}
		</>
	)
})
