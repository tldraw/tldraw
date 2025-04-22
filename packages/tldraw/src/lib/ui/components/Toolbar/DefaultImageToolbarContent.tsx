import {
	approximately,
	HALF_PI,
	structuredClone,
	TLImageShape,
	TLShapePartial,
	track,
	useEditor,
} from '@tldraw/editor'
import isEqual from 'lodash.isequal'
import { useCallback } from 'react'
import { getUncroppedSize } from '../../../shapes/shared/crop'
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

type ASPECT_RATIO_OPTION = 'original' | 'square' | 'circle' | 'landscape' | 'portrait' | 'wide'
const ASPECT_RATIO_OPTIONS: ASPECT_RATIO_OPTION[] = [
	'original',
	'square',
	'circle',
	'landscape',
	'portrait',
	'wide',
]
const ASPECT_RATIO_TO_VALUE: Record<ASPECT_RATIO_OPTION, number> = {
	original: 0,
	square: 1,
	circle: 1,
	landscape: 4 / 3,
	portrait: 3 / 4,
	wide: 16 / 9,
}

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

	const insertMedia = useInsertMedia({ shapeIdToReplace: imageShape?.id })

	const onHistoryMark = useCallback((id: string) => editor.markHistoryStoppingPoint(id), [editor])

	const handleZoomChange = useCallback(
		(value: number) => {
			editor.setCurrentTool('select.crop.idle')
			const zoom = value / 100
			const oldCrop = imageShape.props.crop
			if (oldCrop) {
				const newCrop = structuredClone(oldCrop)
				const xCropSize = oldCrop.bottomRight.x - oldCrop.topLeft.x
				const yCropSize = oldCrop.bottomRight.y - oldCrop.topLeft.y

				// Calculate the center point of the current crop
				const centerX = oldCrop.topLeft.x + xCropSize / 2
				const centerY = oldCrop.topLeft.y + yCropSize / 2

				// Calculate new crop size based on zoom
				const newXCropSize = Math.max(0.1, 1 - zoom)
				const newYCropSize = Math.max(0.1, 1 - zoom)

				// Calculate new top-left position, keeping the center point fixed
				const newTopLeftX = centerX - newXCropSize / 2
				const newTopLeftY = centerY - newYCropSize / 2

				// Ensure the crop stays within bounds [0,1]
				const topLeftXCrop = Math.max(0, Math.min(1 - newXCropSize, newTopLeftX))
				const topLeftYCrop = Math.max(0, Math.min(1 - newYCropSize, newTopLeftY))

				newCrop.topLeft = {
					x: topLeftXCrop,
					y: topLeftYCrop,
				}
				newCrop.bottomRight = {
					x: topLeftXCrop + newXCropSize,
					y: topLeftYCrop + newYCropSize,
				}
				editor.updateShape({
					id: imageShape.id,
					props: {
						crop: newCrop,
					},
				} as TLShapePartial)
			} else {
				editor.updateShape({
					id: imageShape.id,
					props: {
						crop: {
							topLeft: {
								x: 0,
								y: 0,
							},
							bottomRight: {
								x: 1,
								y: 1,
							},
						},
					},
				} as TLShapePartial)
			}
			trackEvent('set-style', { source: 'image-menu', id: 'zoom', value })
		},
		[editor, trackEvent, imageShape]
	)

	const defaultCrop = {
		topLeft: { x: 0, y: 0 },
		bottomRight: { x: 1, y: 1 },
	}
	const handleAspectRatioChange = (aspectRatio: ASPECT_RATIO_OPTION) => {
		editor.setCurrentTool('select.crop.idle')

		const { w, h } = getUncroppedSize(imageShape.props, imageShape.props.crop ?? defaultCrop)
		const imageRatio = w / h
		const isNewRatioSmaller = ASPECT_RATIO_TO_VALUE[aspectRatio] < imageRatio
		const ratio = ASPECT_RATIO_TO_VALUE[aspectRatio]
		const inverseRatio = 1 / ASPECT_RATIO_TO_VALUE[aspectRatio]
		const originalRatio = w / h
		const ratioDiff = isNewRatioSmaller
			? (inverseRatio - 1 / originalRatio) / (inverseRatio * 2)
			: (ratio - originalRatio) / (ratio * 2)

		const crop = {
			topLeft: { x: isNewRatioSmaller ? ratioDiff : 0, y: isNewRatioSmaller ? 0 : ratioDiff },
			bottomRight: {
				x: isNewRatioSmaller ? 1 - ratioDiff : 1,
				y: isNewRatioSmaller ? 1 : 1 - ratioDiff,
			},
			isCircle: aspectRatio === 'circle',
		}

		editor.markHistoryStoppingPoint('aspect ratio')
		if (aspectRatio === 'original') {
			editor.updateShape({
				id: imageShape.id,
				props: {
					crop: defaultCrop,
					w,
					h,
				},
			} as TLShapePartial)
		} else {
			editor.updateShape({
				id: imageShape.id,
				props: {
					crop,
					w: (crop.bottomRight.x - crop.topLeft.x) * w,
					h: (crop.bottomRight.y - crop.topLeft.y) * h,
				},
			} as TLShapePartial)
		}
	}

	const crop = imageShape.props.crop
	const shapeAspectRatio = imageShape.props.w / imageShape.props.h
	const isOriginalCrop = !crop || isEqual(crop, defaultCrop)

	const zoom = crop
		? Math.max(1 - (crop.bottomRight.x - crop.topLeft.x), 1 - (crop.bottomRight.y - crop.topLeft.y))
		: 0
	const croppingTools = (
		<>
			<TldrawUiSlider
				value={zoom * 100}
				label="tool.image-zoom"
				onValueChange={handleZoomChange}
				onHistoryMark={onHistoryMark}
				// This is 90 instead of 100 because our smallest crop is .1
				steps={90}
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
