import { useEditor, useValue } from 'tldraw'
import { getThumbnailForColorMode } from '../lib/schema'
import { armedStamp, LIBRARY_STAMP_TOOL_ID } from './arm-item'
import { fitSize } from './stamp-item'
import { stampDragBox } from './stamp-tool'

/**
 * A faint copy of the stamp tool's item under the pointer, at the size it will be placed: its own
 * size, or fitted to the box being dragged out. Shows the item's thumbnail, or an outline for an
 * item without one. Render it in front of the canvas, e.g. in `InFrontOfTheCanvas`.
 * @public @react
 */
export function LibraryStampPreview() {
	const editor = useEditor()
	const preview = useValue(
		'library stamp preview',
		() => {
			if (editor.getCurrentToolId() !== LIBRARY_STAMP_TOOL_ID) return null
			const stamp = armedStamp.get(editor)
			if (!stamp) return null
			const thumbnail = stamp.item?.thumbnail
			const thumbnailUrl =
				stamp.thumbnailUrl ??
				(thumbnail && getThumbnailForColorMode(thumbnail, editor.getColorMode()))
			const zoom = editor.getZoomLevel()
			const box = stampDragBox.get(editor)
			if (box) {
				const { w, h } = fitSize(stamp.size, box)
				const center = editor.pageToViewport(box.center)
				const corner = editor.pageToViewport(box.point)
				return {
					thumbnailUrl,
					x: center.x - (w * zoom) / 2,
					y: center.y - (h * zoom) / 2,
					w: w * zoom,
					h: h * zoom,
					box: { x: corner.x, y: corner.y, w: box.w * zoom, h: box.h * zoom },
				}
			}
			const pointer = editor.inputs.getCurrentScreenPoint()
			const w = stamp.size.w * zoom
			const h = stamp.size.h * zoom
			return { thumbnailUrl, x: pointer.x - w / 2, y: pointer.y - h / 2, w, h, box: undefined }
		},
		[editor]
	)
	if (!preview) return null
	const { thumbnailUrl, x, y, w, h, box } = preview
	return (
		<div className="tlui-libraries-stamp-preview" aria-hidden>
			{box && (
				<div
					className="tlui-libraries-stamp-preview__box"
					style={{ transform: `translate(${box.x}px, ${box.y}px)`, width: box.w, height: box.h }}
				/>
			)}
			<div
				className="tlui-libraries-stamp-preview__item"
				data-has-thumbnail={thumbnailUrl !== undefined}
				style={{ transform: `translate(${x}px, ${y}px)`, width: w, height: h }}
			>
				{thumbnailUrl && <img src={thumbnailUrl} alt="" draggable={false} />}
			</div>
		</div>
	)
}
