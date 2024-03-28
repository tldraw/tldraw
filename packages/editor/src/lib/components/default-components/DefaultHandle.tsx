import { TLHandle, TLShape, TLShapeId, getDefaultColorTheme } from '@tldraw/tlschema'
import classNames from 'classnames'
import { COARSE_HANDLE_RADIUS, HANDLE_RADIUS } from '../../constants'
import { useEditor } from '../../hooks/useEditor'
import { Box } from '../../primitives/Box'

/** @public */
export type TLHandleProps = {
	shapeId: TLShapeId
	handle: TLHandle
	zoom: number
	isCoarse: boolean
	className?: string
}
export type NoteHandleId =
	| 'note-button-up'
	| 'note-preview-up'
	| 'note-button-down'
	| 'note-preview-down'
	| 'note-button-left'
	| 'note-preview-left'
	| 'note-button-right'
	| 'note-preview-right'
/** @public */
export function DefaultHandle({ handle, isCoarse, className, zoom }: TLHandleProps) {
	const bgRadius = (isCoarse ? COARSE_HANDLE_RADIUS : HANDLE_RADIUS) / zoom
	const fgRadius = (handle.type === 'create' && isCoarse ? 3 : 4) / zoom
	const editor = useEditor()
	// todo: this is bad
	// @ts-expect-error
	if (handle.type === 'note-create') {
		const noteShape = editor.getSelectedShapes()
		const getNoteBox = (id: string, shape: TLShape) => {
			switch (id) {
				case 'note-preview-up':
					return new Box(shape.x, shape.y - 230, 200, 200).expandBy(20)
				case 'note-preview-down':
					return new Box(shape.x, shape.y + 230, 200, 200).expandBy(20)
				case 'note-preview-left':
					return new Box(shape.x - 230, shape.y, 200, 200).expandBy(20)
				case 'note-preview-right':
					return new Box(shape.x + 230, shape.y, 200, 200).expandBy(20)
				default:
					throw new Error('Invalid note handle id')
			}
		}
		const noteBox = getNoteBox(handle.id, noteShape[0])
		const overlappingShapes = editor.getCurrentPageShapes().map((shape) => {
			const bounds = editor.getShapePageBounds(shape)
			if (bounds) {
				return noteBox.contains(bounds)
			} else return false
		})

		const shapesOverlapping = overlappingShapes.some(Boolean)
		const theme = getDefaultColorTheme({ isDarkMode: editor.user.getIsDarkMode() })
		if (!shapesOverlapping) {
			return (
				<rect
					className="tl-handle tl-handle__create tl-handle__note-create"
					width={200}
					height={200}
					// @ts-expect-error
					fill={`${theme[noteShape[0].props.color].solid}`}
				/>
			)
		} else return null
	}

	return (
		<g
			className={classNames(
				'tl-handle',
				{
					'tl-handle__virtual': handle.type === 'virtual',
					'tl-handle__create': handle.type === 'create',
				},
				className
			)}
		>
			<circle className="tl-handle__bg" r={bgRadius} />
			<circle className="tl-handle__fg" r={fgRadius} />
		</g>
	)
}
