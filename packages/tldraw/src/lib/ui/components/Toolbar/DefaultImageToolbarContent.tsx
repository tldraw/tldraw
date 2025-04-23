import {
	approximately,
	HALF_PI,
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
	useEffect(() => {
		if (isManipulating && maxZoom === undefined) {
			setMaxZoom(Math.max(zoom, 1 - 1 / MAX_ZOOM))
		} else if (!isManipulating) {
			setMaxZoom(undefined)
		}
	}, [isManipulating, zoom, maxZoom])

	const insertMedia = useInsertMedia({ shapeIdToReplace: imageShape?.id })

	const onHistoryMark = useCallback((id: string) => editor.markHistoryStoppingPoint(id), [editor])

	const handleZoomChange = useCallback(
		(value: number) => {
			editor.setCurrentTool('select.crop.idle')
			const zoom = value / 100
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
		if (!change) return

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
	const displayValue = crop && maxZoom ? (100 / maxZoom) * zoom : 0

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
					{ASPECT_RATIO_OPTIONS.map((aspectRatio) => (
						<TldrawUiDropdownMenuCheckboxItem
							key={aspectRatio}
							onSelect={() => handleAspectRatioChange(aspectRatio as ASPECT_RATIO_OPTION)}
							checked={
								aspectRatio === 'circle' && crop
									? crop.isCircle
									: aspectRatio === 'original'
										? isOriginalCrop
										: aspectRatio === 'square'
											? !crop?.isCircle &&
												approximately(shapeAspectRatio, ASPECT_RATIO_TO_VALUE[aspectRatio], 0.1)
											: !isOriginalCrop &&
												approximately(shapeAspectRatio, ASPECT_RATIO_TO_VALUE[aspectRatio], 0.01)
							}
							title={msg(`tool.aspect-ratio.${aspectRatio}`)}
						>
							<TldrawUiButtonLabel>{msg(`tool.aspect-ratio.${aspectRatio}`)}</TldrawUiButtonLabel>
						</TldrawUiDropdownMenuCheckboxItem>
					))}
				</TldrawUiDropdownMenuContent>
			</TldrawUiDropdownMenuRoot>
			{/* <TldrawUiButton
				type="icon"
				title={msg('tool.flip-horz')}
				onClick={() => {
					trackEvent('flip-shapes', { operation: 'horizontal', source })
					editor.markHistoryStoppingPoint('flip horizontal')
					editor.flipShapes([imageShape.id], 'horizontal')
				}}
			>
				<TldrawUiButtonIcon small icon="width" />
			</TldrawUiButton>
			<TldrawUiButton
				type="icon"
				title={msg('tool.flip-vert')}
				onClick={() => {
					trackEvent('flip-shapes', { operation: 'vertical', source })
					editor.markHistoryStoppingPoint('flip vertical')
					editor.flipShapes([imageShape.id], 'vertical')
				}}
			>
				<TldrawUiButtonIcon small icon="height" />
			</TldrawUiButton> */}
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
					<TldrawUiButtonIcon small icon="image" />
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
