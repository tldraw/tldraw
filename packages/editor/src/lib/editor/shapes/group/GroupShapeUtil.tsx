import { TLGroupShape, groupShapeMigrations, groupShapeProps } from '@tldraw/tlschema'
import { SVGContainer } from '../../../components/SVGContainer'
import { Geometry2d } from '../../../primitives/geometry/Geometry2d'
import { Group2d } from '../../../primitives/geometry/Group2d'
import { Rectangle2d } from '../../../primitives/geometry/Rectangle2d'
import { ShapeUtil } from '../ShapeUtil'
import { getPerfectDashProps } from '../shared/getPerfectDashProps'
import { DashedOutlineBox } from './DashedOutlineBox'

/** @public */
export class GroupShapeUtil extends ShapeUtil<TLGroupShape> {
	static override type = 'group' as const
	static override props = groupShapeProps
	static override migrations = groupShapeMigrations

	override hideSelectionBoundsFg(shape: TLGroupShape) {
		return true
	}

	override canBind() {
		return false
	}

	canResize() {
		return true
	}

	canResizeChildren() {
		return true
	}

	getDefaultProps(): TLGroupShape['props'] {
		return {}
	}

	getGeometry(shape: TLGroupShape): Geometry2d {
		const children = this.editor.getSortedChildIdsForParent(shape.id)
		if (children.length === 0) {
			return new Rectangle2d({ width: 1, height: 1, isFilled: false })
		}

		return new Group2d({
			children: children.map((childId) => {
				const shape = this.editor.getShape(childId)!
				return this.editor
					.getShapeGeometry(childId)
					.transform(this.editor.getShapeLocalTransform(shape)!, { isLabel: false })
			}),
		})
	}

	component(shape: TLGroupShape) {
		const isErasing = this.editor.getErasingShapeIds().includes(shape.id)

		const { hintingShapeIds } = this.editor.getCurrentPageState()
		const isHintingOtherGroup =
			hintingShapeIds.length > 0 &&
			hintingShapeIds.some(
				(id) => id !== shape.id && this.editor.isShapeOfType(this.editor.getShape(id)!, 'group')
			)

		const isFocused = this.editor.getCurrentPageState().focusedGroupId !== shape.id

		if (
			!isErasing && // always show the outline while we're erasing the group
			// show the outline while the group is focused unless something outside of the group is being hinted
			// this happens dropping shapes from a group onto some outside group
			(isFocused || isHintingOtherGroup)
		) {
			return null
		}

		const bounds = this.editor.getShapeGeometry(shape).bounds

		return (
			<SVGContainer>
				<DashedOutlineBox className="tl-group" bounds={bounds} />
			</SVGContainer>
		)
	}

	override getIndicatorPath(shape: TLGroupShape): Path2D {
		const bounds = this.editor.getShapeGeometry(shape).bounds
		const zoomLevel = this.editor.getEfficientZoomLevel()
		const path = new Path2D()

		for (const side of bounds.sides) {
			const [start, end] = side
			const length = start.dist(end)
			if (length <= 0) continue

			const { strokeDasharray, strokeDashoffset } = getPerfectDashProps(length, 1 / zoomLevel, {
				style: 'dashed',
				lengthRatio: 4,
			})

			if (strokeDasharray === 'none') {
				path.moveTo(start.x, start.y)
				path.lineTo(end.x, end.y)
				continue
			}

			const [dashLength, gapLength] = strokeDasharray.split(' ').map(Number)
			const dashOffset = Number(strokeDashoffset)
			const period = dashLength + gapLength
			if (!Number.isFinite(period) || period <= 0) continue

			const dx = (end.x - start.x) / length
			const dy = (end.y - start.y) / length

			for (let dashStart = -dashOffset; dashStart < length; dashStart += period) {
				const dashEnd = Math.min(length, dashStart + dashLength)
				const clippedDashStart = Math.max(0, dashStart)
				if (dashEnd <= clippedDashStart) continue

				path.moveTo(start.x + dx * clippedDashStart, start.y + dy * clippedDashStart)
				path.lineTo(start.x + dx * dashEnd, start.y + dy * dashEnd)
			}
		}

		return path
	}

	override onChildrenChange(group: TLGroupShape) {
		const children = this.editor.getSortedChildIdsForParent(group.id)
		if (children.length === 0) {
			if (this.editor.getCurrentPageState().focusedGroupId === group.id) {
				this.editor.popFocusedGroupId()
			}
			this.editor.deleteShapes([group.id])
			return
		} else if (children.length === 1) {
			if (this.editor.getCurrentPageState().focusedGroupId === group.id) {
				this.editor.popFocusedGroupId()
			}
			this.editor.reparentShapes(children, group.parentId)
			this.editor.deleteShapes([group.id])
			return
		}
	}
}
