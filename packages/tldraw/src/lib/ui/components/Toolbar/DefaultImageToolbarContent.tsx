import {
	approximately,
	HALF_PI,
	modulate,
	TLImageShape,
	TLShapePartial,
	track,
	useEditor,
} from '@tldraw/editor'
import isEqual from 'lodash.isequal'
import { useCallback, useEffect, useState } from 'react'
import {
	ASPECT_RATIO_OPTION,
	ASPECT_RATIO_OPTIONS,
	ASPECT_RATIO_TO_VALUE,
	getCroppedImageDataForAspectRatio,
	getCroppedImageDataWhenZooming,
	getDefaultCrop,
	MAX_ZOOM,
} from '../../../shapes/shared/crop'
import { useUiEvents } from '../../context/events'
import { useInsertMedia } from '../../hooks/useInsertMedia'
import { useTranslation } from '../../hooks/useTranslation/useTranslation'
import { TldrawUiButton } from '../primitives/Button/TldrawUiButton'
import { TldrawUiButtonIcon } from '../primitives/Button/TldrawUiButtonIcon'
import { TldrawUiButtonLabel } from '../primitives/Button/TldrawUiButtonLabel'
import {
	TldrawUiDropdownMenuCheckboxItem,
	TldrawUiDropdownMenuContent,
	TldrawUiDropdownMenuRoot,
	TldrawUiDropdownMenuTrigger,
} from '../primitives/TldrawUiDropdownMenu'
import { TldrawUiSlider } from '../primitives/TldrawUiSlider'

/** @public */
export interface DefaultImageToolbarContentProps {
	imageShape: TLImageShape
	isManipulating: boolean
	onEditAltTextStart(): void
	onManipulatingStart(): void
	onManipulatingEnd(): void
}

/** @public @react */
export const DefaultImageToolbarContent = track(function DefaultImageToolbarContent({
	imageShape,
	isManipulating,
	onEditAltTextStart,
	onManipulatingStart,
	onManipulatingEnd,
}: DefaultImageToolbarContentProps) {
	const editor = useEditor()
	const trackEvent = useUiEvents()
	const msg = useTranslation()
	const source = 'image-menu'
	const [maxZoom, setMaxZoom] = useState<number | undefined>(undefined)

	const crop = imageShape.props.crop
	const zoom = crop
		? Math.min(1 - (crop.bottomRight.x - crop.topLeft.x), 1 - (crop.bottomRight.y - crop.topLeft.y))
		: 0

	// So, we set a maxZoom here in case there's been a manual crop applied.
	// Typically, you can zoom 3x into the image size (MAX_ZOOM's value).
	// If you go deeper than that zoom level, we need to set that as the new 100%
	// value on the zoom slider (otherwise you could zoom into infinity).
	// This balances usage of the zoom slider with manual cropping.
	useEffect(() => {
		if (isManipulating && maxZoom === undefined) {
			setMaxZoom(Math.max(zoom, 1 - 1 / MAX_ZOOM))
		} else if (!isManipulating) {
			setMaxZoom(undefined)
		}
	}, [isManipulating, zoom, maxZoom])

	const insertMedia = useInsertMedia({ shapeIdToReplace: imageShape?.id })

	const onHistoryMark = useCallback((id: string) => editor.markHistoryStoppingPoint(id), [editor])

	// Apply an easing function to smooth out the zoom curve,
	// otherwise the zoom slider has a cubic drag feel to it which feels off.
	const easeZoom = useCallback((value: number, maxValue: number): number => {
		// Use a square root easing for a more natural zoom feel
		return Math.sqrt(value / maxValue) * maxValue
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

			// Apply inverse easing to get zoom in range [0, 1]
			// No need to multiply by maxZoom since getCroppedImageDataWhenZooming handles that
			const zoom = sliderPercent * sliderPercent

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

			trackEvent('set-style', { source: 'image-menu', id: 'zoom', value })
		},
		[editor, trackEvent, imageShape, maxZoom]
	)

	const handleAspectRatioChange = (aspectRatio: ASPECT_RATIO_OPTION) => {
		editor.setCurrentTool('select.crop.idle')
		const change = getCroppedImageDataForAspectRatio(aspectRatio, imageShape)

		editor.markHistoryStoppingPoint('aspect ratio')
		editor.updateShape({
			id: imageShape.id,
			type: imageShape.type,
			x: change.x,
			y: change.y,
			props: {
				crop: change.crop,
				w: change.w,
				h: change.h,
			},
		} as TLShapePartial)
	}

	const shapeAspectRatio = imageShape.props.w / imageShape.props.h
	const isOriginalCrop = !crop || isEqual(crop, getDefaultCrop())

	const croppingTools = (
		<>
			<TldrawUiSlider
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
					<TldrawUiButton title={msg('tool.aspect-ratio')} type="icon">
						<TldrawUiButtonIcon icon="corners" />
					</TldrawUiButton>
				</TldrawUiDropdownMenuTrigger>
				<TldrawUiDropdownMenuContent side="top" align="center">
					{ASPECT_RATIO_OPTIONS.map((aspectRatio) => {
						let checked = false
						if (aspectRatio === 'circle' && crop) {
							checked = !!crop.isCircle
						} else if (aspectRatio === 'original') {
							checked = isOriginalCrop
						} else if (aspectRatio === 'square') {
							checked =
								!crop?.isCircle &&
								approximately(shapeAspectRatio, ASPECT_RATIO_TO_VALUE[aspectRatio], 0.1)
						} else {
							checked =
								!isOriginalCrop &&
								approximately(shapeAspectRatio, ASPECT_RATIO_TO_VALUE[aspectRatio], 0.01)
						}

						return (
							<TldrawUiDropdownMenuCheckboxItem
								key={aspectRatio}
								onSelect={() => handleAspectRatioChange(aspectRatio as ASPECT_RATIO_OPTION)}
								checked={checked}
								title={msg(`tool.aspect-ratio.${aspectRatio}`)}
							>
								<TldrawUiButtonLabel>{msg(`tool.aspect-ratio.${aspectRatio}`)}</TldrawUiButtonLabel>
							</TldrawUiDropdownMenuCheckboxItem>
						)
					})}
				</TldrawUiDropdownMenuContent>
			</TldrawUiDropdownMenuRoot>
			<TldrawUiButton
				type="icon"
				title={msg('tool.rotate-cw')}
				onClick={() => {
					trackEvent('rotate-cw', { source })
					editor.markHistoryStoppingPoint('rotate-cw')
					const offset = imageShape.rotation % (HALF_PI / 2)
					const dontUseOffset = approximately(offset, 0) || approximately(offset, HALF_PI / 2)
					editor.rotateShapesBy([imageShape.id], HALF_PI / 2 - (dontUseOffset ? 0 : offset))
				}}
			>
				<TldrawUiButtonIcon small icon="rotate-cw" />
			</TldrawUiButton>
			<TldrawUiButton
				type="icon"
				onClick={onManipulatingEnd}
				style={{ borderLeft: '1px solid var(--color-divider)', marginLeft: '2px' }}
			>
				<TldrawUiButtonIcon small icon="check" />
			</TldrawUiButton>
		</>
	)

	return (
		<>
			{!isManipulating && (
				<TldrawUiButton
					type="icon"
					title={msg('tool.replace-media')}
					onClick={() => {
						trackEvent('replace-media', { source })
						insertMedia()
					}}
				>
					<TldrawUiButtonIcon small icon="tool-media" />
				</TldrawUiButton>
			)}
			{!isManipulating && (
				<TldrawUiButton type="icon" title={msg('tool.image-crop')} onClick={onManipulatingStart}>
					<TldrawUiButtonIcon small icon="crop" />
				</TldrawUiButton>
			)}
			{isManipulating && croppingTools}
			<TldrawUiButton
				type="normal"
				isActive={!!imageShape.props.altText}
				onClick={() => {
					trackEvent('alt-text-start', { source })
					onEditAltTextStart()
				}}
			>
				{msg('tool.image-alt-text')}
			</TldrawUiButton>
		</>
	)
})
