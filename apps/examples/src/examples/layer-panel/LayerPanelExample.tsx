import { capitalize } from 'lodash'
import { useState } from 'react'
import { TLComponents, TLParentId, TLShape, Tldraw, track, useEditor } from 'tldraw'
import 'tldraw/tldraw.css'
import './layer-panel.css'

function getShapeName(shape: TLShape) {
	const { name, title, text } = shape.props as any
	return name || title || text || (shape.meta.name as string) || capitalize(shape.type + ' shape')
}

const selected = '#E8F4FE'
const childSelected = '#F3F9FE'

const ShapeTree = track(function ({
	rootId,
	depth,
	parentIsHidden,
	parentIsSelected,
}: {
	rootId: TLParentId
	depth: number
	parentIsHidden?: boolean
	parentIsSelected?: boolean
}) {
	const editor = useEditor()
	const root = editor.getShape(rootId)
	const children = editor.getSortedChildIdsForParent(rootId)

	const isHidden = root && editor.isShapeHidden(root)
	const isSelected = editor.getSelectedShapeIds().includes(rootId as any)

	const [isEditing, setIsEditing] = useState(false)

	return (
		<>
			{!!root && (
				<div
					className="shape-item"
					onDoubleClick={() => {
						setIsEditing(true)
					}}
					onClick={() => {
						if (editor.inputs.ctrlKey || editor.inputs.shiftKey) {
							if (isSelected) {
								editor.deselect(root)
							} else {
								editor.select(...editor.getSelectedShapes(), root)
							}
						} else {
							editor.select(root)
						}
					}}
					style={{
						paddingLeft: depth * 10,
						background: isSelected
							? selected
							: parentIsSelected
								? childSelected
								: depth > 1
									? '#00000006'
									: undefined,
					}}
				>
					{isEditing ? (
						<input
							autoFocus
							className="shape-name-input"
							defaultValue={getShapeName(root)}
							onBlur={() => setIsEditing(false)}
							onChange={(ev) => {
								editor.updateShape({ ...root, meta: { ...root.meta, name: ev.target.value } })
							}}
							// finish editing on enter
							onKeyDown={(ev) => {
								if (ev.key === 'Enter' || ev.key === 'Escape') {
									ev.currentTarget.blur()
								}
							}}
						/>
					) : (
						<div>{getShapeName(root)}</div>
					)}
					<button
						className="shape-visibility-toggle"
						style={parentIsHidden ? { opacity: 0.5 } : {}}
						onClick={(ev) => {
							editor.updateShape({ ...root, meta: { ...root.meta, hidden: !root.meta.hidden } })
							ev.stopPropagation()
						}}
					>
						{root.meta.hidden ? '🙈' : '👁️'}
					</button>
				</div>
			)}
			{!!children?.length && (
				<div className="shape-tree">
					{children.map((childId) => (
						<ShapeTree
							key={childId}
							rootId={childId}
							depth={depth + 1}
							parentIsHidden={isHidden || parentIsHidden}
							parentIsSelected={isSelected || parentIsSelected}
						/>
					))}
				</div>
			)}
		</>
	)
})

const components: TLComponents = {
	InFrontOfTheCanvas: track(() => {
		return (
			<div className="layer-panel">
				<div className="layer-panel-title">Shapes</div>
				<ShapeTree rootId={useEditor().getCurrentPageId()} depth={0} />
			</div>
		)
	}),
}

export default function LayerPanelExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw
				persistenceKey="layer-panel-example"
				components={components}
				isShapeHidden={(s) => !!s.meta.hidden}
			/>
		</div>
	)
}
