import {
	approximately,
	isEqual,
	kickoutOccludedShapes,
	modulate,
	TLImageShape,
	TLShapePartial,
	track,
	useEditor,
	useValue,
} from '@tldraw/editor'
import { useCallback, useEffect, useRef, useState } from 'react'
import {
	ASPECT_RATIO_OPTION,
	ASPECT_RATIO_OPTIONS,
	ASPECT_RATIO_TO_VALUE,
	getCroppedImageDataForAspectRatio,
	getCroppedImageDataWhenZooming,
	getDefaultCrop,
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

/** @public */
export interface DefaultImageToolbarContentProps {
	imageShapeId: TLImageShape['id']
	isManipulating: boolean
	onEditAltTextStart(): void
	onManipulatingStart(): void
	onManipulatingEnd(): void
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
	const [maxZoom, setMaxZoom] = useState<number | undefined>(
		crop ? Math.max(zoom, 1 - 1 / MAX_ZOOM) : MAX_ZOOM
	)
	const actions = useActions()

	// So, we set a maxZoom here in case there's been a manual crop applied.
	// Typically, you can zoom 3x into the image size (MAX_ZOOM's value).
	// If you go deeper than that zoom level, we need to set that as the new 100%
	// value on the zoom slider (otherwise you could zoom into infinity).
	// This balances usage of the zoom slider with manual cropping.
	useEffect(() => {
		setMaxZoom(crop ? Math.max(zoom, 1 - 1 / MAX_ZOOM) : MAX_ZOOM)
	}, [crop, zoom, maxZoom])

	const onHistoryMark = useCallback((id: string) => editor.markHistoryStoppingPoint(id), [editor])

	// Apply an easing function to smooth out the zoom curve,
	// otherwise the zoom slider has a cubic drag feel to it which feels off.
	const easeZoom = useCallback((value: number, maxValue: number): number => {
		const maxRatioConversion = MAX_ZOOM / (MAX_ZOOM - 1)
		// Use an easing function for a more natural zoom feel
		return Math.pow(value / maxValue, maxRatioConversion) * maxValue
	}, [])

	const displayValue =
		crop && maxZoom
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
			const clampedMaxZoom = Math.min(maxDimension, maxZoom ?? maxDimension)
			const maxRatioConversion = MAX_ZOOM / (MAX_ZOOM - 1)
			const zOut = Math.pow(sliderPercent, 1 / maxRatioConversion) * clampedMaxZoom
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
			const change = getCroppedImageDataForAspectRatio(aspectRatio, imageShape)
			editor.markHistoryStoppingPoint('aspect ratio')
			editor.updateShape({
				id: imageShapeId,
				type: 'image',
				x: change.x,
				y: change.y,
				props: {
					crop: change.crop,
					w: change.w,
					h: change.h,
				},
			} as TLShapePartial)
			kickoutOccludedShapes(editor, [imageShapeId])
		})
	}

	const altText = useValue(
		'altText',
		() => editor.getShape<TLImageShape>(imageShapeId)!.props.altText,
		[editor, imageShapeId]
	)
	const shapeAspectRatio = useValue(
		'shapeAspectRatio',
		() => {
			const imageShape = editor.getShape<TLImageShape>(imageShapeId)!
			return imageShape.props.w / imageShape.props.h
		},
		[editor, imageShapeId]
	)
	const isOriginalCrop = !crop || isEqual(crop, getDefaultCrop())

	useEffect(() => {
		if (isManipulating) {
			editor.timers.setTimeout(() => sliderRef.current?.focus(), 0)
		}
	}, [editor, isManipulating])

	useEffect(() => {
		function handleKeyDown(e: KeyboardEvent) {
			if (isManipulating) {
				if (e.key === 'Escape') {
					editor.cancel()
					onManipulatingEnd()
				} else if (e.key === 'Enter') {
					editor.complete()
					onManipulatingEnd()
				}
			}
		}
		const elm = sliderRef.current
		if (elm) {
			elm.addEventListener('keydown', handleKeyDown)
		}
		return () => {
			if (elm) {
				elm.removeEventListener('keydown', handleKeyDown)
			}
		}
	}, [editor, isManipulating, onManipulatingEnd])

	if (isManipulating) {
		return (
			<>
				<TldrawUiSlider
					ref={sliderRef}
					value={displayValue}
					label="tool.image-zoom"
					onValueChange={handleZoomChange}
					onHistoryMark={onHistoryMark}
					min={0}
					steps={100}
					data-testid="tool.image-zoom"
					title={msg('tool.image-zoom')}
				/>
				<TldrawUiDropdownMenuRoot id="image-toolbar-aspect-ratio">
					<TldrawUiDropdownMenuTrigger>
						<TldrawUiToolbarButton
							title={msg('tool.aspect-ratio')}
							type="icon"
							data-testid="tool.image-aspect-ratio"
						>
							<TldrawUiButtonIcon icon="corners" />
						</TldrawUiToolbarButton>
					</TldrawUiDropdownMenuTrigger>
					<TldrawUiDropdownMenuContent side="top" align="center">
						{ASPECT_RATIO_OPTIONS.map((aspectRatio) => {
							let checked = false
							if (isOriginalCrop) {
								if (aspectRatio === 'original') {
									checked = true
								}
							} else {
								if (aspectRatio === 'circle') {
									checked = !!crop.isCircle
								} else if (aspectRatio === 'square') {
									checked =
										!crop?.isCircle &&
										approximately(shapeAspectRatio, ASPECT_RATIO_TO_VALUE[aspectRatio], 0.1)
								} else if (aspectRatio === 'original') {
									checked = false
								} else {
									checked =
										!isOriginalCrop &&
										approximately(shapeAspectRatio, ASPECT_RATIO_TO_VALUE[aspectRatio], 0.01)
								}
							}

							return (
								<TldrawUiDropdownMenuCheckboxItem
									key={aspectRatio}
									onSelect={() => handleAspectRatioChange(aspectRatio as ASPECT_RATIO_OPTION)}
									checked={checked}
									title={msg(`tool.aspect-ratio.${aspectRatio}`)}
								>
									<TldrawUiButtonLabel>
										{msg(`tool.aspect-ratio.${aspectRatio}`)}
									</TldrawUiButtonLabel>
								</TldrawUiDropdownMenuCheckboxItem>
							)
						})}
					</TldrawUiDropdownMenuContent>
				</TldrawUiDropdownMenuRoot>
				<TldrawUiToolbarButton
					type="icon"
					onClick={onManipulatingEnd}
					data-testid="tool.image-crop-confirm"
					style={{ borderLeft: '1px solid var(--tl-color-divider)', marginLeft: '2px' }}
					title={msg('tool.image-crop-confirm')}
				>
					<TldrawUiButtonIcon small icon="check" />
				</TldrawUiToolbarButton>
			</>
		)
	}

	return (
		<>
			{!isReadonly && (
				<TldrawUiToolbarButton
					type="icon"
					data-testid="tool.image-replace"
					onClick={handleImageReplace}
					title={msg('tool.replace-media')}
				>
					<TldrawUiButtonIcon small icon="tool-media" />
				</TldrawUiToolbarButton>
			)}
			{!isReadonly && (
				<TldrawUiToolbarButton
					type="icon"
					title={msg('tool.image-crop')}
					onClick={onManipulatingStart}
					data-testid="tool.image-crop"
				>
					<TldrawUiButtonIcon small icon="crop" />
				</TldrawUiToolbarButton>
			)}
			<TldrawUiToolbarButton
				type="icon"
				title={msg('action.download-original')}
				onClick={handleImageDownload}
				data-testid="tool.image-download"
			>
				<TldrawUiButtonIcon small icon="download" />
			</TldrawUiToolbarButton>
			{(altText || !isReadonly) && (
				<TldrawUiToolbarButton
					type="icon"
					title={msg('tool.media-alt-text')}
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
