import { Box2d, Matrix2d, Vec2d } from '@tldraw/primitives'
import { TLGroupShape } from '@tldraw/tlschema'
import { SVGContainer } from '../../../components/SVGContainer'
import { ShapeUtil, TLOnChildrenChangeHandler } from '../ShapeUtil'
import { DashedOutlineBox } from '../shared/DashedOutlineBox'

/** @public */
export class GroupShapeUtil extends ShapeUtil<TLGroupShape> {
	static override type = 'group' as const

	type = 'group' as const

	hideSelectionBoundsBg = () => false
	hideSelectionBoundsFg = () => true

	canBind = () => false

	getDefaultProps(): TLGroupShape['props'] {
		return {}
	}

	getBounds(shape: TLGroupShape): Box2d {
		const children = this.editor.getSortedChildIds(shape.id)
		if (children.length === 0) {
			return new Box2d()
		}

		const allChildPoints = children.flatMap((childId) => {
			const shape = this.editor.getShapeById(childId)!
			return this.editor
				.getOutlineById(childId)
				.map((point) => Matrix2d.applyToPoint(this.editor.getTransform(shape), point))
		})

		return Box2d.FromPoints(allChildPoints)
	}

	getCenter(shape: TLGroupShape): Vec2d {
		return this.editor.getBounds(shape).center
	}

	getOutline(shape: TLGroupShape): Vec2d[] {
		return this.editor.getBounds(shape).corners
	}

	component(shape: TLGroupShape) {
		// Not a class component, but eslint can't tell that :(
		const {
			erasingIdsSet,
			pageState: { hintingIds, focusLayerId },
			zoomLevel,
		} = this.editor

		const isErasing = erasingIdsSet.has(shape.id)

		const isHintingOtherGroup =
			hintingIds.length > 0 &&
			hintingIds.some(
				(id) =>
					id !== shape.id &&
					this.editor.isShapeOfType(this.editor.getShapeById(id)!, GroupShapeUtil)
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

	onChildrenChange: TLOnChildrenChangeHandler<TLGroupShape> = (group) => {
		const children = this.editor.getSortedChildIds(group.id)
		if (children.length === 0) {
			if (this.editor.pageState.focusLayerId === group.id) {
				this.editor.popFocusLayer()
			}
			this.editor.deleteShapes([group.id])
			return
		} else if (children.length === 1) {
			if (this.editor.pageState.focusLayerId === group.id) {
				this.editor.popFocusLayer()
			}
			this.editor.reparentShapesById(children, group.parentId)
			this.editor.deleteShapes([group.id])
			return
		}
	}
}
