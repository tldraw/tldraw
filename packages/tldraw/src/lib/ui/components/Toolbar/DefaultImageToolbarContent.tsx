import {
	approximately,
	AssetRecordType,
	Editor,
	fetch,
	getHashForBuffer,
	modulate,
	TLImageShape,
	TLShapePartial,
	track,
	useEditor,
	useValue,
} from '@tldraw/editor'
import isEqual from 'lodash.isequal'
import { useCallback, useState } from 'react'
import { getMediaAssetInfoPartial } from '../../../defaultExternalContentHandlers'
import {
	ASPECT_RATIO_OPTION,
	ASPECT_RATIO_OPTIONS,
	ASPECT_RATIO_TO_VALUE,
	getCroppedImageDataForAspectRatio,
	getCroppedImageDataWhenZooming,
	getDefaultCrop,
	MAX_ZOOM,
} from '../../../shapes/shared/crop'
import { downloadFile } from '../../../utils/export/exportAs'
import { useActions } from '../../context/actions'
import { useUiEvents } from '../../context/events'
import { useTranslation } from '../../hooks/useTranslation/useTranslation'
import { TldrawUiButton } from '../primitives/Button/TldrawUiButton'
import { TldrawUiButtonIcon } from '../primitives/Button/TldrawUiButtonIcon'
import { TldrawUiButtonLabel } from '../primitives/Button/TldrawUiButtonLabel'
import { TldrawUiMenuActionItem } from '../primitives/menus/TldrawUiMenuActionItem'
import {
	TldrawUiDropdownMenuCheckboxItem,
	TldrawUiDropdownMenuContent,
	TldrawUiDropdownMenuRoot,
	TldrawUiDropdownMenuTrigger,
} from '../primitives/TldrawUiDropdownMenu'
import { TldrawUiSlider } from '../primitives/TldrawUiSlider'

/** @public */
export interface DefaultImageToolbarContentProps {
	imageShapeId: TLImageShape['id']
	onEditAltTextStart(): void
}

/** @public @react */
export const DefaultImageToolbarContent = track(function DefaultImageToolbarContent({
	imageShapeId,
	onEditAltTextStart,
}: DefaultImageToolbarContentProps) {
	const editor = useEditor()
	const trackEvent = useUiEvents()
	const msg = useTranslation()
	const source = 'image-menu'

	const crop = useValue('crop', () => editor.getShape<TLImageShape>(imageShapeId)!.props.crop, [
		editor,
		imageShapeId,
	])

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

	const zoom = crop
		? Math.min(1 - (crop.bottomRight.x - crop.topLeft.x), 1 - (crop.bottomRight.y - crop.topLeft.y))
		: 0
	const [maxZoom] = useState(() => Math.max(zoom, 1 - 1 / MAX_ZOOM))

	const { insertMedia, replaceImage } = useActions()

	const onHistoryMark = useCallback((id: string) => editor.markHistoryStoppingPoint(id), [editor])

	const displayValue =
		crop && maxZoom ? modulate(zoom, [0, maxZoom], [0, 100], true /* clamp */) : 0

	const handleZoomChange = useCallback(
		(value: number) => {
			editor.setCurrentTool('select.crop.idle')
			// Convert the eased slider value back to the actual zoom value
			const sliderPercent = value / 100

			// Apply inverse easing to get zoom in range [0, 1]
			// No need to multiply by maxZoom since getCroppedImageDataWhenZooming handles that
			const zoom = sliderPercent * sliderPercent

			const imageShape = editor.getShape<TLImageShape>(imageShapeId)
			if (!imageShape) return

			const change = getCroppedImageDataWhenZooming(zoom, imageShape, maxZoom)

			editor.updateShape({
				id: imageShapeId,
				type: 'image',
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
		[editor, trackEvent, imageShapeId, maxZoom]
	)

	const handleAspectRatioChange = (aspectRatio: ASPECT_RATIO_OPTION) => {
		editor.setCurrentTool('select.crop.idle')
		const imageShape = editor.getShape<TLImageShape>(imageShapeId)
		if (!imageShape) return
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
	}

	const onImageDownload = useCallback(async () => {
		const imageShape = editor.getShape<TLImageShape>(imageShapeId)
		if (!imageShape) return
		const { assetId } = imageShape.props
		if (!assetId) return
		const asset = editor.getAsset(assetId)
		if (!asset || (asset.type !== 'image' && asset.type !== 'video')) return null
		const url = await editor.resolveAssetUrl(assetId, {})
		if (!url) return null
		const blob = await fetch(url).then((res) => res.blob())
		const file = new File([blob], imageShape.props.altText || 'image', { type: blob.type })
		downloadFile(file)
	}, [editor, imageShapeId])

	const isOriginalCrop = !crop || isEqual(crop, getDefaultCrop())

	return (
		<>
			<TldrawUiMenuActionItem {...replaceImage} />
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
			{/* <TldrawUiButton
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
			</TldrawUiButton> */}
			<TldrawUiButton
				type="normal"
				onClick={() => {
					trackEvent('image-download', { source })
					onImageDownload()
				}}
			>
				<TldrawUiButtonIcon small icon="send-to-back" />
			</TldrawUiButton>
			<TldrawUiButton
				type="normal"
				isActive={!!altText}
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

const replaceImage = async (editor: Editor, shapeId: TLImageShape['id'], files: File[]) => {
	const shape = editor.getShape<TLImageShape>(shapeId)
	if (!shape) return
	const file = files[0]
	const hash = getHashForBuffer(await file.arrayBuffer())
	const assetId = AssetRecordType.createId(hash)
	editor.createTemporaryAssetPreview(assetId, file)
	const assetInfoPartial = await getMediaAssetInfoPartial(
		file,
		assetId,
		true /* isImage */,
		false /* isVideo */
	)
	editor.createAssets([assetInfoPartial])

	// And update the shape
	editor.updateShapes<TLImageShape>([
		{
			id: shape.id,
			type: shape.type,
			props: {
				assetId: assetId,
				crop: { topLeft: { x: 0, y: 0 }, bottomRight: { x: 1, y: 1 } },
				w: assetInfoPartial.props.w,
				h: assetInfoPartial.props.h,
			},
		},
	])

	const asset = await editor.getAssetForExternalContent({ type: 'file', file, assetId })

	if (!asset) {
		return
	}

	editor.updateAssets([{ ...asset, id: assetId }])
}
