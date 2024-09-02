import {
	approximately,
	HALF_PI,
	TLCamera,
	TLImageShape,
	TLShape,
	TLShapePartial,
	track,
	useEditor,
	Vec,
} from '@tldraw/editor'
import { useCallback, useEffect, useState } from 'react'
import { useUiEvents } from '../../context/events'
import { useInsertMedia } from '../../hooks/useInsertMedia'
import { useTranslation } from '../../hooks/useTranslation/useTranslation'
import { TldrawUiButton } from '../primitives/Button/TldrawUiButton'
import { TldrawUiButtonIcon } from '../primitives/Button/TldrawUiButtonIcon'
import { TldrawUiSlider } from '../primitives/TldrawUiSlider'

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

	const handleZoomChange = useCallback(
		(value: number) => {
			if (!selectedShape) return
			editor.setCurrentTool('select.crop.idle')
			const zoom = value / 100
			const shape = selectedShape as TLImageShape
			const oldCrop = shape.props.crop
			if (oldCrop) {
				const xCropSize = oldCrop.bottomRight.x - oldCrop.topLeft.x
				const yCropSize = oldCrop.bottomRight.y - oldCrop.topLeft.y
				const min = 0.5 * (shape.props.zoom - 1)
				const max = min * -1
				const xMinWithCrop = min + (1 - xCropSize)
				const yMinWithCrop = min + (1 - yCropSize)
				const topLeftXCrop = Math.min(xMinWithCrop, Math.max(max, oldCrop.topLeft.x))
				const topLeftYCrop = Math.min(yMinWithCrop, Math.max(max, oldCrop.topLeft.y))

				const crop = {
					topLeft: {
						x: topLeftXCrop,
						y: topLeftYCrop,
					},
					bottomRight: {
						x: topLeftXCrop + xCropSize,
						y: topLeftYCrop + yCropSize,
					},
				}
				editor.updateShape({
					id: selectedShape.id,
					props: {
						zoom,
						crop,
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

	if (!showToolbar) return null
	if (!selectionRotatedPageBounds) return null
	if (!currentCoordinates) return null
	if (!selectedShape || selectedShape.type !== 'image') return null

	return (
		<div
			className="tl-image__toolbar"
			style={{
				top: Math.floor(Math.max(16, currentCoordinates.y - 48)),
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
					min={100}
					steps={300}
					title={msg('tool.image-zoom')}
				/>
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
