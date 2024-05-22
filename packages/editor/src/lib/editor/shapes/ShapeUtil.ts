/* eslint-disable @typescript-eslint/no-unused-vars */
import { LegacyMigrations, MigrationSequence } from '@tldraw/store'
import {
	RecordProps,
	TLHandle,
	TLPropsMigrations,
	TLShape,
	TLShapePartial,
	TLUnknownShape,
} from '@tldraw/tlschema'
import { ReactElement } from 'react'
import { Box } from '../../primitives/Box'
import { Vec } from '../../primitives/Vec'
import { Geometry2d } from '../../primitives/geometry/Geometry2d'
import type { Editor } from '../Editor'
import { BoundsSnapGeometry } from '../managers/SnapManager/BoundsSnaps'
import { HandleSnapGeometry } from '../managers/SnapManager/HandleSnaps'
import { SvgExportContext } from '../types/SvgExportContext'
import { TLResizeHandle } from '../types/selection-types'

/** @public */
export interface TLShapeUtilConstructor<
	T extends TLUnknownShape,
	U extends ShapeUtil<T> = ShapeUtil<T>,
> {
	new (editor: Editor): U
	type: T['type']
	props?: RecordProps<T>
	migrations?: LegacyMigrations | TLPropsMigrations | MigrationSequence
}

/** @public */
export type TLShapeUtilFlag<T> = (shape: T) => boolean

/** @public */
export interface TLShapeUtilCanvasSvgDef {
	key: string
	component: React.ComponentType
}

/** @public */
export abstract class ShapeUtil<Shape extends TLUnknownShape = TLUnknownShape> {
	constructor(public editor: Editor) {}
	static props?: RecordProps<TLUnknownShape>
	static migrations?: LegacyMigrations | TLPropsMigrations | MigrationSequence

	/**
	 * The type of the shape util, which should match the shape's type.
	 *
	 * @public
	 */
	static type: string

	/**
	 * Get the default props for a shape.
	 *
	 * @public
	 */
	abstract getDefaultProps(): Shape['props']

	/**
	 * Get the shape's geometry.
	 *
	 * @param shape - The shape.
	 * @public
	 */
	abstract getGeometry(shape: Shape): Geometry2d

	/**
	 * Get a JSX element for the shape (as an HTML element).
	 *
	 * @param shape - The shape.
	 * @public
	 */
	abstract component(shape: Shape): any

	/**
	 * Get JSX describing the shape's indicator (as an SVG element).
	 *
	 * @param shape - The shape.
	 * @public
	 */
	abstract indicator(shape: Shape): any

	/**
	 * Whether the shape can be snapped to by another shape.
	 *
	 * @public
	 */
	canSnap: TLShapeUtilFlag<Shape> = () => true

	/**
	 * Whether the shape can be scrolled while editing.
	 *
	 * @public
	 */
	canScroll: TLShapeUtilFlag<Shape> = () => false

	/**
	 * Whether the shape can be bound to by an arrow.
	 *
	 * @param _otherShape - The other shape attempting to bind to this shape.
	 * @public
	 */
	canBind = <K>(_shape: Shape, _otherShape?: K) => true

	/**
	 * Whether the shape can be double clicked to edit.
	 *
	 * @public
	 */
	canEdit: TLShapeUtilFlag<Shape> = () => false

	/**
	 * Whether the shape can be resized.
	 *
	 * @public
	 */
	canResize: TLShapeUtilFlag<Shape> = () => true

	/**
	 * Whether the shape can be edited in read-only mode.
	 *
	 * @public
	 */
	canEditInReadOnly: TLShapeUtilFlag<Shape> = () => false

	/**
	 * Whether the shape can be cropped.
	 *
	 * @public
	 */
	canCrop: TLShapeUtilFlag<Shape> = () => false

	/**
	 * Whether the shape participates in stacking, aligning, and distributing.
	 *
	 * @public
	 */
	canBeLaidOut: TLShapeUtilFlag<Shape> = () => true

	/**
	 * Does this shape provide a background for its children? If this is true,
	 * then any children with a `renderBackground` method will have their
	 * backgrounds rendered _above_ this shape. Otherwise, the children's
	 * backgrounds will be rendered above either the next ancestor that provides
	 * a background, or the canvas background.
	 *
	 * @internal
	 */
	providesBackgroundForChildren(shape: Shape): boolean {
		return false
	}

	/**
	 * Whether the shape should hide its resize handles when selected.
	 *
	 * @public
	 */
	hideResizeHandles: TLShapeUtilFlag<Shape> = () => false

	/**
	 * Whether the shape should hide its rotation handles when selected.
	 *
	 * @public
	 */
	hideRotateHandle: TLShapeUtilFlag<Shape> = () => false

	/**
	 * Whether the shape should hide its selection bounds background when selected.
	 *
	 * @public
	 */
	hideSelectionBoundsBg: TLShapeUtilFlag<Shape> = () => false

	/**
	 * Whether the shape should hide its selection bounds foreground when selected.
	 *
	 * @public
	 */
	hideSelectionBoundsFg: TLShapeUtilFlag<Shape> = () => false

	/**
	 * Whether the shape's aspect ratio is locked.
	 *
	 * @public
	 */
	isAspectRatioLocked: TLShapeUtilFlag<Shape> = () => false

	/**
	 * Get a JSX element for the shape (as an HTML element) to be rendered as part of the canvas background - behind any other shape content.
	 *
	 * @param shape - The shape.
	 * @internal
	 */
	backgroundComponent?(shape: Shape): any

	/**
	 * Get an array of handle models for the shape. This is an optional method.
	 *
	 * @example
	 *
	 * ```ts
	 * util.getHandles?.(myShape)
	 * ```
	 *
	 * @param shape - The shape.
	 * @public
	 */
	getHandles?(shape: Shape): TLHandle[]

	/**
	 * Get whether the shape can receive children of a given type.
	 *
	 * @param type - The shape type.
	 * @public
	 */
	canReceiveNewChildrenOfType(shape: Shape, type: TLShape['type']) {
		return false
	}

	/**
	 * Get whether the shape can receive children of a given type.
	 *
	 * @param shape - The shape type.
	 * @param shapes - The shapes that are being dropped.
	 * @public
	 */
	canDropShapes(shape: Shape, shapes: TLShape[]) {
		return false
	}

	/**
	 * Get the shape as an SVG object.
	 *
	 * @param shape - The shape.
	 * @param ctx - The export context for the SVG - used for adding e.g. \<def\>s
	 * @returns An SVG element.
	 * @public
	 */
	toSvg?(shape: Shape, ctx: SvgExportContext): ReactElement | null | Promise<ReactElement | null>

	/**
	 * Get the shape's background layer as an SVG object.
	 *
	 * @param shape - The shape.
	 * @param ctx - ctx - The export context for the SVG - used for adding e.g. \<def\>s
	 * @returns An SVG element.
	 * @public
	 */
	toBackgroundSvg?(
		shape: Shape,
		ctx: SvgExportContext
	): ReactElement | null | Promise<ReactElement | null>

	/** @internal */
	expandSelectionOutlinePx(shape: Shape): number {
		return 0
	}

	/**
	 * Return elements to be added to the \<defs\> section of the canvases SVG context. This can be
	 * used to define SVG content (e.g. patterns & masks) that can be referred to by ID from svg
	 * elements returned by `component`.
	 *
	 * Each def should have a unique `key`. If multiple defs from different shapes all have the same
	 * key, only one will be used.
	 */
	getCanvasSvgDefs(): TLShapeUtilCanvasSvgDef[] {
		return []
	}

	/**
	 * Get the geometry to use when snapping to this this shape in translate/resize operations. See
	 * {@link BoundsSnapGeometry} for details.
	 */
	getBoundsSnapGeometry(shape: Shape): BoundsSnapGeometry {
		return {}
	}

	/**
	 * Get the geometry to use when snapping handles to this shape. See {@link HandleSnapGeometry}
	 * for details.
	 */
	getHandleSnapGeometry(shape: Shape): HandleSnapGeometry {
		return {}
	}

	//  Events

	/**
	 * A callback called just before a shape is created. This method provides a last chance to modify
	 * the created shape.
	 *
	 * @example
	 *
	 * ```ts
	 * onBeforeCreate = (next) => {
	 * 	return { ...next, x: next.x + 1 }
	 * }
	 * ```
	 *
	 * @param next - The next shape.
	 * @returns The next shape or void.
	 * @public
	 */
	onBeforeCreate?: TLOnBeforeCreateHandler<Shape>

	/**
	 * A callback called just before a shape is updated. This method provides a last chance to modify
	 * the updated shape.
	 *
	 * @example
	 *
	 * ```ts
	 * onBeforeUpdate = (prev, next) => {
	 * 	if (prev.x === next.x) {
	 * 		return { ...next, x: next.x + 1 }
	 * 	}
	 * }
	 * ```
	 *
	 * @param prev - The previous shape.
	 * @param next - The next shape.
	 * @returns The next shape or void.
	 * @public
	 */
	onBeforeUpdate?: TLOnBeforeUpdateHandler<Shape>

	/**
	 * A callback called when some other shapes are dragged over this one.
	 *
	 * @example
	 *
	 * ```ts
	 * onDragShapesOver = (shape, shapes) => {
	 * 	this.editor.reparentShapes(shapes, shape.id)
	 * }
	 * ```
	 *
	 * @param shape - The shape.
	 * @param shapes - The shapes that are being dragged over this one.
	 * @public
	 */
	onDragShapesOver?: TLOnDragHandler<Shape>

	/**
	 * A callback called when some other shapes are dragged out of this one.
	 *
	 * @param shape - The shape.
	 * @param shapes - The shapes that are being dragged out.
	 * @public
	 */
	onDragShapesOut?: TLOnDragHandler<Shape>

	/**
	 * A callback called when some other shapes are dropped over this one.
	 *
	 * @param shape - The shape.
	 * @param shapes - The shapes that are being dropped over this one.
	 * @public
	 */
	onDropShapesOver?: TLOnDragHandler<Shape>

	/**
	 * A callback called when a shape starts being resized.
	 *
	 * @param shape - The shape.
	 * @returns A change to apply to the shape, or void.
	 * @public
	 */
	onResizeStart?: TLOnResizeStartHandler<Shape>

	/**
	 * A callback called when a shape changes from a resize.
	 *
	 * @param shape - The shape at the start of the resize.
	 * @param info - Info about the resize.
	 * @returns A change to apply to the shape, or void.
	 * @public
	 */
	onResize?: TLOnResizeHandler<Shape>

	/**
	 * A callback called when a shape finishes resizing.
	 *
	 * @param initial - The shape at the start of the resize.
	 * @param current - The current shape.
	 * @returns A change to apply to the shape, or void.
	 * @public
	 */
	onResizeEnd?: TLOnResizeEndHandler<Shape>

	/**
	 * A callback called when a shape starts being translated.
	 *
	 * @param shape - The shape.
	 * @returns A change to apply to the shape, or void.
	 * @public
	 */
	onTranslateStart?: TLOnTranslateStartHandler<Shape>

	/**
	 * A callback called when a shape changes from a translation.
	 *
	 * @param initial - The shape at the start of the translation.
	 * @param current - The current shape.
	 * @returns A change to apply to the shape, or void.
	 * @public
	 */
	onTranslate?: TLOnTranslateHandler<Shape>

	/**
	 * A callback called when a shape finishes translating.
	 *
	 * @param initial - The shape at the start of the translation.
	 * @param current - The current shape.
	 * @returns A change to apply to the shape, or void.
	 * @public
	 */
	onTranslateEnd?: TLOnTranslateEndHandler<Shape>

	/**
	 * A callback called when a shape's handle changes.
	 *
	 * @param shape - The current shape.
	 * @param info - An object containing the handle and whether the handle is 'precise' or not.
	 * @returns A change to apply to the shape, or void.
	 * @public
	 */
	onHandleDrag?: TLOnHandleDragHandler<Shape>

	/**
	 * A callback called when a shape starts being rotated.
	 *
	 * @param shape - The shape.
	 * @returns A change to apply to the shape, or void.
	 * @public
	 */
	onRotateStart?: TLOnRotateStartHandler<Shape>

	/**
	 * A callback called when a shape changes from a rotation.
	 *
	 * @param initial - The shape at the start of the rotation.
	 * @param current - The current shape.
	 * @returns A change to apply to the shape, or void.
	 * @public
	 */
	onRotate?: TLOnRotateHandler<Shape>

	/**
	 * A callback called when a shape finishes rotating.
	 *
	 * @param initial - The shape at the start of the rotation.
	 * @param current - The current shape.
	 * @returns A change to apply to the shape, or void.
	 * @public
	 */
	onRotateEnd?: TLOnRotateEndHandler<Shape>

	/**
	 * Not currently used.
	 *
	 * @internal
	 */
	onBindingChange?: TLOnBindingChangeHandler<Shape>

	/**
	 * A callback called when a shape's children change.
	 *
	 * @param shape - The shape.
	 * @returns An array of shape updates, or void.
	 * @public
	 */
	onChildrenChange?: TLOnChildrenChangeHandler<Shape>

	/**
	 * A callback called when a shape's handle is double clicked.
	 *
	 * @param shape - The shape.
	 * @param handle - The handle that is double-clicked.
	 * @returns A change to apply to the shape, or void.
	 * @public
	 */
	onDoubleClickHandle?: TLOnDoubleClickHandleHandler<Shape>

	/**
	 * A callback called when a shape's edge is double clicked.
	 *
	 * @param shape - The shape.
	 * @returns A change to apply to the shape, or void.
	 * @public
	 */
	onDoubleClickEdge?: TLOnDoubleClickHandler<Shape>

	/**
	 * A callback called when a shape is double clicked.
	 *
	 * @param shape - The shape.
	 * @returns A change to apply to the shape, or void.
	 * @public
	 */
	onDoubleClick?: TLOnDoubleClickHandler<Shape>

	/**
	 * A callback called when a shape is clicked.
	 *
	 * @param shape - The shape.
	 * @returns A change to apply to the shape, or void.
	 * @public
	 */
	onClick?: TLOnClickHandler<Shape>

	/**
	 * A callback called when a shape finishes being editing.
	 *
	 * @param shape - The shape.
	 * @public
	 */
	onEditEnd?: TLOnEditEndHandler<Shape>
}

/** @public */
export type TLOnBeforeCreateHandler<T extends TLShape> = (next: T) => T | void
/** @public */
export type TLOnBeforeUpdateHandler<T extends TLShape> = (prev: T, next: T) => T | void
/** @public */
export type TLOnTranslateStartHandler<T extends TLShape> = TLEventStartHandler<T>
/** @public */
export type TLOnTranslateHandler<T extends TLShape> = TLEventChangeHandler<T>
/** @public */
export type TLOnTranslateEndHandler<T extends TLShape> = TLEventChangeHandler<T>
/** @public */
export type TLOnRotateStartHandler<T extends TLShape> = TLEventStartHandler<T>
/** @public */
export type TLOnRotateHandler<T extends TLShape> = TLEventChangeHandler<T>
/** @public */
export type TLOnRotateEndHandler<T extends TLShape> = TLEventChangeHandler<T>

/**
 * The type of resize.
 *
 * 'scale_shape' - The shape is being scaled, usually as part of a larger selection.
 *
 * 'resize_bounds' - The user is directly manipulating an individual shape's bounds using a resize
 * handle. It is up to shape util implementers to decide how they want to handle the two
 * situations.
 *
 * @public
 */
export type TLResizeMode = 'scale_shape' | 'resize_bounds'

/**
 * Info about a resize.
 * @param newPoint - The new local position of the shape.
 * @param handle - The handle being dragged.
 * @param mode - The type of resize.
 * @param scaleX - The scale in the x-axis.
 * @param scaleY - The scale in the y-axis.
 * @param initialBounds - The bounds of the shape at the start of the resize.
 * @param initialShape - The shape at the start of the resize.
 * @public
 */
export interface TLResizeInfo<T extends TLShape> {
	newPoint: Vec
	handle: TLResizeHandle
	mode: TLResizeMode
	scaleX: number
	scaleY: number
	initialBounds: Box
	initialShape: T
}

/** @public */
export type TLOnResizeHandler<T extends TLShape> = (
	shape: T,
	info: TLResizeInfo<T>
) => Omit<TLShapePartial<T>, 'id' | 'type'> | undefined | void

/** @public */
export type TLOnResizeStartHandler<T extends TLShape> = TLEventStartHandler<T>

/** @public */
export type TLOnResizeEndHandler<T extends TLShape> = TLEventChangeHandler<T>

/* -------------------- Dragging -------------------- */

/** @public */
export type TLOnDragHandler<T extends TLShape, R = void> = (shape: T, shapes: TLShape[]) => R

/** @internal */
export type TLOnBindingChangeHandler<T extends TLShape> = (shape: T) => TLShapePartial<T> | void

/** @public */
export type TLOnChildrenChangeHandler<T extends TLShape> = (shape: T) => TLShapePartial[] | void

/** @public */
export type TLOnHandleDragHandler<T extends TLShape> = (
	shape: T,
	info: {
		handle: TLHandle
		isPrecise: boolean
		initial?: T | undefined
	}
) => TLShapePartial<T> | void

/** @public */
export type TLOnClickHandler<T extends TLShape> = (shape: T) => TLShapePartial<T> | void
/** @public */
export type TLOnEditEndHandler<T extends TLShape> = (shape: T) => void
/** @public */
export type TLOnDoubleClickHandler<T extends TLShape> = (shape: T) => TLShapePartial<T> | void
/** @public */
export type TLOnDoubleClickHandleHandler<T extends TLShape> = (
	shape: T,
	handle: TLHandle
) => TLShapePartial<T> | void

type TLEventStartHandler<T extends TLShape> = (shape: T) => TLShapePartial<T> | void
type TLEventChangeHandler<T extends TLShape> = (initial: T, current: T) => TLShapePartial<T> | void
