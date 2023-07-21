import { TLGroupShape, groupShapeMigrations, groupShapeProps } from '@tldraw/tlschema'
import { SVGContainer } from '../../../components/SVGContainer'
import { Matrix2d } from '../../../primitives/Matrix2d'
import { Vec2d } from '../../../primitives/Vec2d'
import { Geometry2d } from '../../../primitives/geometry/Geometry2d'
import { Rectangle2d } from '../../../primitives/geometry/Rectangle2d'
import { ShapeUtil, TLOnChildrenChangeHandler } from '../ShapeUtil'
import { DashedOutlineBox } from './DashedOutlineBox'

/** @public */
export class GroupShapeUtil extends ShapeUtil<TLGroupShape> {
	static override type = 'group' as const
	static override props = groupShapeProps
	static override migrations = groupShapeMigrations

	override hideSelectionBoundsBg = () => false
	override hideSelectionBoundsFg = () => true

	override canBind = () => false

	getDefaultProps(): TLGroupShape['props'] {
		return {}
	}

	getGeometry(shape: TLGroupShape): Geometry2d {
		const children = this.editor.getSortedChildIds(shape.id)
		if (children.length === 0) {
			return new Rectangle2d({ width: 1, height: 1, isFilled: false, margin: 4 })
		}

		const allChildPoints = children.flatMap((childId) => {
			const shape = this.editor.getShapeById(childId)!
			return this.editor
				.getOutlineById(childId)
				.map((point) => Matrix2d.applyToPoint(this.editor.getTransform(shape), point))
		})

		let minX = Infinity
		let minY = Infinity
		let maxX = -Infinity
		let maxY = -Infinity
		let point: Vec2d
		for (let i = 0, n = allChildPoints.length; i < n; i++) {
			point = allChildPoints[i]
			minX = Math.min(point.x, minX)
			minY = Math.min(point.y, minY)
			maxX = Math.max(point.x, maxX)
			maxY = Math.max(point.y, maxY)
		}

		return new Rectangle2d({
			width: maxX - minX,
			height: maxY - minY,
			isFilled: false,
			margin: 4,
		})
	}

	component(shape: TLGroupShape) {
		// Not a class component, but eslint can't tell that :(
		const {
			erasingIdsSet,
			currentPageState: { hintingIds, focusLayerId },
			zoomLevel,
		} = this.editor

		const isErasing = erasingIdsSet.has(shape.id)

		const isHintingOtherGroup =
			hintingIds.length > 0 &&
			hintingIds.some(
				(id) =>
					id !== shape.id &&
					this.editor.isShapeOfType<TLGroupShape>(this.editor.getShapeById(id)!, 'group')
			)

		if (
			// always show the outline while we're erasing the group
			!isErasing &&
			// show the outline while the group is focused unless something outside of the group is being hinted
			// this happens dropping shapes from a group onto some outside group
			(shape.id !== focusLayerId || isHintingOtherGroup)
		) {
			return null
		}

		const bounds = this.editor.getBounds(shape)

		return (
			<SVGContainer id={shape.id}>
				<DashedOutlineBox className="tl-group" bounds={bounds} zoomLevel={zoomLevel} />
			</SVGContainer>
		)
	}

	indicator(shape: TLGroupShape) {
		// Not a class component, but eslint can't tell that :(
		const {
			camera: { z: zoomLevel },
		} = this.editor

		const bounds = this.editor.getBounds(shape)

		return <DashedOutlineBox className="" bounds={bounds} zoomLevel={zoomLevel} />
	}

	override onChildrenChange: TLOnChildrenChangeHandler<TLGroupShape> = (group) => {
		const children = this.editor.getSortedChildIds(group.id)
		if (children.length === 0) {
			if (this.editor.currentPageState.focusLayerId === group.id) {
				this.editor.popFocusLayer()
			}
			this.editor.deleteShapes([group.id])
			return
		} else if (children.length === 1) {
			if (this.editor.currentPageState.focusLayerId === group.id) {
				this.editor.popFocusLayer()
			}
			this.editor.reparentShapesById(children, group.parentId)
			this.editor.deleteShapes([group.id])
			return
		}
	}
}
