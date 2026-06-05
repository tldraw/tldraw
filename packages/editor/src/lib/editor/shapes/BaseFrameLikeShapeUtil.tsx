import { TLShape, TLShapeId } from '@tldraw/tlschema'
import { IndexKey, compact } from '@tldraw/utils'
import { Vec } from '../../primitives/Vec'
import { BaseBoxShapeUtil, TLBaseBoxShape } from './BaseBoxShapeUtil'
import { TLDragShapesInInfo, TLDragShapesOutInfo } from './ShapeUtil'

/**
 * A base class for frame-like shapes — containers that clip their children,
 * require full-brush selection, block erasure from inside, and support
 * drag-and-drop reparenting.
 *
 * Extending this class is the easiest way to create a custom frame-like shape.
 * It provides sensible defaults for all frame-like behaviors:
 *
 * - `isFrameLike()` returns `true`
 * - `providesBackgroundForChildren()` returns `true`
 * - `canReceiveNewChildrenOfType()` returns `true` unless the container is locked
 * - `canRemoveChildrenOfType()` returns `true` unless the container is locked
 * - `getClipPath()` returns the shape geometry's vertices
 * - `onDragShapesIn()` reparents shapes into the frame (with index restoration)
 * - `onDragShapesOut()` reparents shapes back to the page
 *
 * All methods can be overridden for custom behavior.
 *
 * @example
 * ```ts
 * class MyContainerUtil extends BaseFrameLikeShapeUtil<MyContainerShape> {
 *   static override type = 'my-container' as const
 *   static override props = myContainerShapeProps
 *
 *   override getDefaultProps() {
 *     return { w: 300, h: 200 }
 *   }
 *
 *   override component(shape: MyContainerShape) {
 *     return <SVGContainer>...</SVGContainer>
 *   }
 *
 *   override getIndicatorPath(shape: MyContainerShape) {
 *     const path = new Path2D()
 *     path.rect(0, 0, shape.props.w, shape.props.h)
 *     return path
 *   }
 * }
 * ```
 *
 * @public
 */
export abstract class BaseFrameLikeShapeUtil<
	Shape extends TLBaseBoxShape,
> extends BaseBoxShapeUtil<Shape> {
	override isFrameLike(_shape: Shape): boolean {
		return true
	}

	override providesBackgroundForChildren(): boolean {
		return true
	}

	override canReceiveNewChildrenOfType(shape: Shape, _type: TLShape['type']): boolean {
		return !shape.isLocked
	}

	override canRemoveChildrenOfType(shape: Shape, _type: TLShape['type']): boolean {
		return !shape.isLocked
	}

	override getClipPath(shape: Shape): Vec[] | undefined {
		return this.editor.getShapeGeometry(shape.id).vertices
	}

	override onDragShapesIn(
		shape: Shape,
		draggingShapes: TLShape[],
		{ initialParentIds, initialIndices }: TLDragShapesInInfo
	): void {
		const { editor } = this

		if (draggingShapes.every((s) => s.parentId === shape.id)) return

		// Check to see whether any of the shapes can have their old index restored
		let canRestoreOriginalIndices = false
		const previousChildren = draggingShapes.filter(
			(s) => shape.id === (initialParentIds.get(s.id) as TLShapeId)
		)

		if (previousChildren.length > 0) {
			const currentChildren = compact(
				editor.getSortedChildIdsForParent(shape).map((id) => editor.getShape(id))
			)
			if (previousChildren.every((s) => !currentChildren.find((c) => c.index === s.index))) {
				canRestoreOriginalIndices = true
			}
		}

		// If any of the children are the ancestor of the frame, quit here
		if (draggingShapes.some((s) => editor.hasAncestor(shape, s.id))) return

		editor.reparentShapes(draggingShapes, shape.id)

		if (canRestoreOriginalIndices) {
			for (const s of previousChildren) {
				editor.updateShape({
					id: s.id,
					type: s.type,
					index: initialIndices.get(s.id) as IndexKey,
				})
			}
		}
	}

	override onDragShapesOut(
		shape: Shape,
		draggingShapes: TLShape[],
		info: TLDragShapesOutInfo
	): void {
		const { editor } = this
		// When a user drags shapes out and we're not dragging into a new shape,
		// reparent the dragging shapes onto the current page instead
		if (!info.nextDraggingOverShapeId) {
			// Locked shapes are already filtered out upstream by DragAndDropManager.
			editor.reparentShapes(
				draggingShapes.filter((s) => s.parentId === shape.id),
				editor.getCurrentPageId()
			)
		}
	}
}
