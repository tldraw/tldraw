import {
	approximately,
	HALF_PI,
	structuredClone,
	TLCamera,
	TLImageShape,
	TLShape,
	TLShapePartial,
	track,
	useEditor,
	Vec,
} from '@tldraw/editor'
import isEqual from 'lodash.isequal'
import { useCallback, useEffect, useState } from 'react'
import { getOriginalUncroppedSize } from '../../../tools/SelectTool/childStates/Crop/children/crop_helpers'
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

/** @public @react */
export const ImageToolbar = track(function ImageToolbar() {
	const editor = useEditor()
	const trackEvent = useUiEvents()
	const msg = useTranslation()
	const source = 'image-menu'
	const [currentShape, setCurrentShape] = useState<TLShape | null>()
	const [currentCoordinates, setCurrentCoordinates] = useState<Vec>()
	const [currentCamera, setCurrentCamera] = useState<TLCamera>(editor.getCamera())

	const showToolbar = editor.isInAny('select.idle', 'select.pointing_shape', 'select.crop')
	const selectionRotatedPageBounds = editor.getSelectionRotatedPageBounds()
	const camera = editor.getCamera()
	const selectedShape = editor.getOnlySelectedShape()
	const pageCoordinates = selectionRotatedPageBounds
		? editor.pageToViewport(selectionRotatedPageBounds.point)
		: null
	const insertMedia = useInsertMedia({ shapeIdToReplace: selectedShape?.id })

	useEffect(() => {
		if (
			pageCoordinates &&
			((selectedShape && !currentShape) ||
				selectedShape?.id !== currentShape?.id ||
				currentCamera.x !== camera.x ||
				currentCamera.y !== camera.y ||
				currentCamera.z !== camera.z)
		) {
			if (!currentCoordinates || !currentCoordinates.equals(pageCoordinates)) {
				setCurrentCoordinates(pageCoordinates)
			}
		}
		if (!showToolbar) {
			setCurrentShape(null)
		} else {
			setCurrentShape(selectedShape)
		}
		setCurrentCamera(camera)
	}, [
		selectedShape,
		currentShape,
		currentCoordinates,
		pageCoordinates,
		showToolbar,
		camera,
		currentCamera,
	])

	const onHistoryMark = useCallback((id: string) => editor.markHistoryStoppingPoint(id), [editor])

	const handleZoomChange = useCallback(
		(value: number) => {
			if (!selectedShape) return
			editor.setCurrentTool('select.crop.idle')
			const zoom = value / 100
			const shape = selectedShape as TLImageShape
			const oldCrop = shape.props.crop
			if (oldCrop) {
				const newCrop = structuredClone(oldCrop)
				const xCropSize = oldCrop.bottomRight.x - oldCrop.topLeft.x
				const yCropSize = oldCrop.bottomRight.y - oldCrop.topLeft.y
				const min = 0.5 * (shape.props.zoom - 1)
				const max = min * -1
				const xMinWithCrop = min + (1 - xCropSize)
				const yMinWithCrop = min + (1 - yCropSize)
				const topLeftXCrop = Math.min(xMinWithCrop, Math.max(max, oldCrop.topLeft.x))
				const topLeftYCrop = Math.min(yMinWithCrop, Math.max(max, oldCrop.topLeft.y))

				newCrop.topLeft = {
					x: topLeftXCrop,
					y: topLeftYCrop,
				}
				newCrop.bottomRight = {
					x: topLeftXCrop + xCropSize,
					y: topLeftYCrop + yCropSize,
				}
				editor.updateShape({
					id: selectedShape.id,
					props: {
						zoom,
						crop: newCrop,
					},
				} as TLShapePartial)
			} else {
				editor.updateShape({
					id: selectedShape.id,
					props: {
						zoom,
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
		[editor, trackEvent, selectedShape]
	)

	const defaultCrop = {
		topLeft: { x: 0, y: 0 },
		bottomRight: { x: 1, y: 1 },
	}
	const handleAspectRatioChange = (aspectRatio: ASPECT_RATIO_OPTION) => {
		if (!selectedShape) return
		editor.setCurrentTool('select.crop.idle')

		const shape = selectedShape as TLImageShape
		const { w, h } = getOriginalUncroppedSize(shape.props.crop ?? defaultCrop, shape)
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
				id: shape.id,
				props: {
					crop: defaultCrop,
					w,
					h,
				},
			} as TLShapePartial)
		} else {
			editor.updateShape({
				id: shape.id,
				props: {
					crop,
					w: (crop.bottomRight.x - crop.topLeft.x) * w,
					h: (crop.bottomRight.y - crop.topLeft.y) * h,
				},
			} as TLShapePartial)
		}
	}

	if (!showToolbar) return null
	if (!selectionRotatedPageBounds) return null
	if (!currentCoordinates) return null
	if (!selectedShape || selectedShape.type !== 'image') return null
	const shape = selectedShape as TLImageShape
	const crop = shape.props.crop
	const shapeAspectRatio = shape.props.w / shape.props.h
	const isOriginalCrop = !crop || isEqual(crop, defaultCrop)

	return (
		<div
			className="tl-image__toolbar"
			style={{
				top: Math.floor(Math.max(16, currentCoordinates.y - 64)),
				left: Math.floor(Math.max(16, currentCoordinates.x)),
				width: Math.floor(selectionRotatedPageBounds.width * editor.getZoomLevel()),
			}}
			onPointerDown={(e) => e.stopPropagation()}
		>
			<div className="tlui-toolbar__tools" role="radiogroup">
				<TldrawUiSlider
					value={(selectedShape as TLImageShape).props.zoom * 100}
					label="tool.image-zoom"
					onValueChange={handleZoomChange}
					onHistoryMark={onHistoryMark}
					min={100}
					steps={300}
					title={msg('tool.image-zoom')}
				/>
				<TldrawUiDropdownMenuRoot id="image-toolbar-aspect-ratio">
					<TldrawUiDropdownMenuTrigger>
						<TldrawUiButton title={msg('tool.aspect-ratio')} type="tool">
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
				<TldrawUiButton
					type="icon"
					onClick={() => {
						trackEvent('replace-media', { source })
						insertMedia()
					}}
				>
					<TldrawUiButtonIcon small icon="image" />
				</TldrawUiButton>
				<TldrawUiButton
					type="icon"
					onClick={() => {
						trackEvent('flip-shapes', { operation: 'horizontal', source })
						editor.markHistoryStoppingPoint('flip horizontal')
						editor.flipShapes([selectedShape.id], 'horizontal')
					}}
				>
					<TldrawUiButtonIcon small icon="width" />
				</TldrawUiButton>
				<TldrawUiButton
					type="icon"
					onClick={() => {
						trackEvent('flip-shapes', { operation: 'vertical', source })
						editor.markHistoryStoppingPoint('flip vertical')
						editor.flipShapes([selectedShape.id], 'vertical')
					}}
				>
					<TldrawUiButtonIcon small icon="height" />
				</TldrawUiButton>
				<TldrawUiButton
					type="icon"
					onClick={() => {
						trackEvent('rotate-cw', { source })
						editor.markHistoryStoppingPoint('rotate-cw')
						const offset = selectedShape.rotation % (HALF_PI / 2)
						const dontUseOffset = approximately(offset, 0) || approximately(offset, HALF_PI / 2)
						editor.rotateShapesBy([selectedShape.id], HALF_PI / 2 - (dontUseOffset ? 0 : offset))
					}}
				>
					<TldrawUiButtonIcon small icon="rotate-cw" />
				</TldrawUiButton>
			</div>
		</div>
	)
})
