import { capitalize } from 'lodash'
import { useRef, useState } from 'react'
import { Editor, TLShapeId, useEditor, useValue } from 'tldraw'
import { VisibilityOff, VisibilityOn } from '../../icons/icons'

const selectedBg = '#E8F4FE'
const childSelectedBg = '#F3F9FE'
const childBg = '#00000006'

function ShapeItem({
	shapeId,
	depth,
	parentIsSelected,
	parentIsHidden,
}: {
	shapeId: TLShapeId
	depth: number
	parentIsSelected?: boolean
	parentIsHidden?: boolean
}) {
	const editor = useEditor()

	const shape = useValue('shape', () => editor.getShape(shapeId), [editor])
	const children = useValue('children', () => editor.getSortedChildIdsForParent(shapeId), [editor])
	const isHidden = useValue('isHidden', () => editor.isShapeHidden(shapeId), [editor])
	const isSelected = useValue('isSelected', () => editor.getSelectedShapeIds().includes(shapeId), [
		editor,
	])
	const shapeName = useValue('shapeName', () => getShapeName(editor, shapeId), [editor])

	const [isEditingName, setIsEditingName] = useState(false)

	const timeSinceLastVisibilityToggle = useRef(Date.now())

	if (!shape) return null

	return (
		<>
			{!!shape && (
				<div
					className="shape-item"
					onDoubleClick={() => {
						setIsEditingName(true)
					}}
					onPointerDown={() => {
						// We synchronize the selection state of the layer panel items with the selection state of the shapes in the editor.
						if (editor.inputs.ctrlKey || editor.inputs.shiftKey) {
							if (isSelected) {
								editor.deselect(shape)
							} else {
								editor.select(...editor.getSelectedShapes(), shape)
							}
						} else {
							editor.select(shape)
						}
					}}
					style={{
						paddingLeft: 10 + depth * 20,
						opacity: isHidden ? 0.5 : 1,
						background: isSelected
							? selectedBg
							: parentIsSelected
								? childSelectedBg
								: depth > 0
									? childBg
									: undefined,
					}}
				>
					{isEditingName ? (
						<input
							autoFocus
							className="shape-name-input"
							defaultValue={shapeName}
							onBlur={() => setIsEditingName(false)}
							onChange={(ev) => {
								if (shape.type === 'frame') {
									editor.updateShape({ ...shape, props: { name: ev.target.value } })
								} else {
									editor.updateShape({ ...shape, meta: { name: ev.target.value } })
								}
							}}
							onKeyDown={(ev) => {
								// finish editing on enter
								if (ev.key === 'Enter' || ev.key === 'Escape') {
									ev.currentTarget.blur()
								}
							}}
						/>
					) : (
						<div className="shape-name">{shapeName}</div>
					)}
					<button
						className="shape-visibility-toggle"
						onPointerDown={(ev) => {
							// prevent the event from bubbling up to the shape list item
							ev.stopPropagation()
							const now = Date.now()
							if (now - timeSinceLastVisibilityToggle.current < 200) {
								editor.updateShape({
									...shape,
									meta: { hidden: false, force_show: true },
								})
								timeSinceLastVisibilityToggle.current = 0
							} else {
								editor.updateShape({
									...shape,
									meta: { hidden: !shape.meta.hidden, force_show: false },
								})
								timeSinceLastVisibilityToggle.current = now
							}
						}}
					>
						{shape.meta.hidden ? <VisibilityOff /> : <VisibilityOn />}
					</button>
				</div>
			)}
			{!!children?.length && (
				<ShapeList
					shapeIds={children}
					depth={depth + 1}
					parentIsHidden={parentIsHidden || isHidden}
					parentIsSelected={parentIsSelected || isSelected}
				/>
			)}
		</>
	)
}

export function ShapeList({
	shapeIds,
	depth,
	parentIsSelected,
	parentIsHidden,
}: {
	shapeIds: TLShapeId[]
	depth: number
	parentIsSelected?: boolean
	parentIsHidden?: boolean
}) {
	if (!shapeIds.length) return null
	return (
		<div className="shape-tree">
			{shapeIds.map((shapeId) => (
				<ShapeItem
					key={shapeId}
					shapeId={shapeId}
					depth={depth}
					parentIsHidden={parentIsHidden}
					parentIsSelected={parentIsSelected}
				/>
			))}
		</div>
	)
}

function getShapeName(editor: Editor, shapeId: TLShapeId) {
	const shape = editor.getShape(shapeId)
	if (!shape) return 'Unknown shape'
	return (
		// meta.name is the first choice, then the shape's text, then the capitalized shape type
		(shape.meta.name as string) ||
		editor.getShapeUtil(shape).getText(shape) ||
		capitalize(shape.type + ' shape')
	)
}
