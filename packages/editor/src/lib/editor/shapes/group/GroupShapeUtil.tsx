import { TLGroupShape, groupShapeMigrations, groupShapeProps } from '@tldraw/tlschema'
import { SVGContainer } from '../../../components/SVGContainer'
import { Geometry2d } from '../../../primitives/geometry/Geometry2d'
import { Group2d } from '../../../primitives/geometry/Group2d'
import { Polygon2d } from '../../../primitives/geometry/Polygon2d'
import { Polyline2d } from '../../../primitives/geometry/Polyline2d'
import { Rectangle2d } from '../../../primitives/geometry/Rectangle2d'
import { ShapeUtil, TLOnChildrenChangeHandler } from '../ShapeUtil'
import { DashedOutlineBox } from './DashedOutlineBox'

/** @public */
export class GroupShapeUtil extends ShapeUtil<TLGroupShape> {
	static override type = 'group' as const
	static override props = groupShapeProps
	static override migrations = groupShapeMigrations

	override hideSelectionBoundsFg = () => true

	override canBind = () => false

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
				const geometry = this.editor.getShapeGeometry(childId)
				const points = this.editor.getShapeLocalTransform(shape)!.applyToPoints(geometry.vertices)

				if (geometry.isClosed) {
					return new Polygon2d({
						points,
						isFilled: true,
					})
				}

				return new Polyline2d({
					points,
				})
			}),
		})
	}

	component(shape: TLGroupShape) {
		// Not a class component, but eslint can't tell that :(
		const {
			erasingShapeIds,
			currentPageState: { hintingShapeIds, focusedGroupId },
			zoomLevel,
		} = this.editor

		const isErasing = erasingShapeIds.includes(shape.id)

		const isHintingOtherGroup =
			hintingShapeIds.length > 0 &&
			hintingShapeIds.some(
				(id) =>
					id !== shape.id &&
					this.editor.isShapeOfType<TLGroupShape>(this.editor.getShape(id)!, 'group')
			)

		if (
			// always show the outline while we're erasing the group
			!isErasing &&
			// show the outline while the group is focused unless something outside of the group is being hinted
			// this happens dropping shapes from a group onto some outside group
			(shape.id !== focusedGroupId || isHintingOtherGroup)
		) {
			return null
		}

		const bounds = this.editor.getShapeGeometry(shape).bounds

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

		const bounds = this.editor.getShapeGeometry(shape).bounds

		return <DashedOutlineBox className="" bounds={bounds} zoomLevel={zoomLevel} />
	}

	override onChildrenChange: TLOnChildrenChangeHandler<TLGroupShape> = (group) => {
		const children = this.editor.getSortedChildIdsForParent(group.id)
		if (children.length === 0) {
			if (this.editor.currentPageState.focusedGroupId === group.id) {
				this.editor.popFocusedGroupId()
			}
			this.editor.deleteShapes([group.id])
			return
		} else if (children.length === 1) {
			if (this.editor.currentPageState.focusedGroupId === group.id) {
				this.editor.popFocusedGroupId()
			}
			this.editor.reparentShapes(children, group.parentId)
			this.editor.deleteShapes([group.id])
			return
		}
	}
}
