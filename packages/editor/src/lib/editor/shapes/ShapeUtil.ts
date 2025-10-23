/* eslint-disable @typescript-eslint/no-unused-vars */
import { EMPTY_ARRAY } from '@tldraw/state'
import { LegacyMigrations, MigrationSequence } from '@tldraw/store'
import {
	RecordProps,
	TLHandle,
	TLParentId,
	TLPropsMigrations,
	TLShape,
	TLShapeCrop,
	TLShapeId,
	TLShapePartial,
	TLUnknownShape,
} from '@tldraw/tlschema'
import { IndexKey } from '@tldraw/utils'
import { ReactElement } from 'react'
import { Box, SelectionHandle } from '../../primitives/Box'
import { Vec } from '../../primitives/Vec'
import { Geometry2d } from '../../primitives/geometry/Geometry2d'
import type { Editor } from '../Editor'
import { TLFontFace } from '../managers/FontManager/FontManager'
import { BoundsSnapGeometry } from '../managers/SnapManager/BoundsSnaps'
import { HandleSnapGeometry } from '../managers/SnapManager/HandleSnaps'
import { SvgExportContext } from '../types/SvgExportContext'
import { TLClickEventInfo } from '../types/event-types'
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

/**
 * Options passed to {@link ShapeUtil.canBind}. A binding that could be made. At least one of
 * `fromShapeType` or `toShapeType` will belong to this shape util.
 *
 * @public
 */
export interface TLShapeUtilCanBindOpts<Shape extends TLUnknownShape = TLUnknownShape> {
	/** The type of shape referenced by the `fromId` of the binding. */
	fromShapeType: string
	/** The type of shape referenced by the `toId` of the binding. */
	toShapeType: string
	/** The type of binding. */
	bindingType: string
}

/**
 * Options passed to {@link ShapeUtil.canBeLaidOut}.
 *
 * @public
 */
export interface TLShapeUtilCanBeLaidOutOpts {
	/** The type of action causing the layout. */
	type?: 'align' | 'distribute' | 'pack' | 'stack' | 'flip' | 'stretch'
	/** The other shapes being laid out */
	shapes?: TLShape[]
}

/** Additional options for the {@link ShapeUtil.getGeometry} method.
 *
 * @public
 */
export interface TLGeometryOpts {
	/** The context in which the geometry is being requested. */
	context?: string
}

/** @public */
export interface TLShapeUtilCanvasSvgDef {
	key: string
	component: React.ComponentType
}

/** @public */
export abstract class ShapeUtil<Shape extends TLUnknownShape = TLUnknownShape> {
	/** Configure this shape utils {@link ShapeUtil.options | `options`}. */
	static configure<T extends TLShapeUtilConstructor<any, any>>(
		this: T,
		options: T extends new (...args: any[]) => { options: infer Options } ? Partial<Options> : never
	): T {
		// @ts-expect-error -- typescript has no idea what's going on here but it's fine
		return class extends this {
			// @ts-expect-error
			options = { ...this.options, ...options }
		}
	}

	constructor(public editor: Editor) {}

	/**
	 * Options for this shape util. If you're implementing a custom shape util, you can override
	 * this to provide customization options for your shape. If using an existing shape util, you
	 * can customizing this by calling {@link ShapeUtil.configure}.
	 */
	options = {}

	/**
	 * Props allow you to define the shape's properties in a way that the editor can understand.
	 * This has two main uses:
	 *
	 * 1. Validation. Shapes will be validated using these props to stop bad data from being saved.
	 * 2. Styles. Each {@link @tldraw/tlschema#StyleProp} in the props can be set on many shapes at
	 *    once, and will be remembered from one shape to the next.
	 *
	 * @example
	 * ```tsx
	 * import {T, TLBaseShape, TLDefaultColorStyle, DefaultColorStyle, ShapeUtil} from 'tldraw'
	 *
	 * type MyShape = TLBaseShape<'mine', {
	 *      color: TLDefaultColorStyle,
	 *      text: string,
	 * }>
	 *
	 * class MyShapeUtil extends ShapeUtil<MyShape> {
	 *     static props = {
	 *         // we use tldraw's built-in color style:
	 *         color: DefaultColorStyle,
	 *         // validate that the text prop is a string:
	 *         text: T.string,
	 *     }
	 * }
	 * ```
	 */
	static props?: RecordProps<TLUnknownShape>

	/**
	 * Migrations allow you to make changes to a shape's props over time. Read the
	 * {@link https://www.tldraw.dev/docs/persistence#Shape-props-migrations | shape prop migrations}
	 * guide for more information.
	 */
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
	 * @param opts - Additional options for the request.
	 * @public
	 */
	abstract getGeometry(shape: Shape, opts?: TLGeometryOpts): Geometry2d

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
	 * Get the font faces that should be rendered in the document in order for this shape to render
	 * correctly.
	 *
	 * @param shape - The shape.
	 * @public
	 */
	getFontFaces(shape: Shape): TLFontFace[] {
		return EMPTY_ARRAY
	}

	/**
	 * Whether the shape can be snapped to by another shape.
	 *
	 * @param shape - The shape.
	 * @public
	 */
	canSnap(_shape: Shape): boolean {
		return true
	}

	/**
	 * Whether the shape can be tabbed to.
	 *
	 * @param shape - The shape.
	 * @public
	 */
	canTabTo(_shape: Shape): boolean {
		return true
	}

	/**
	 * Whether the shape can be scrolled while editing.
	 *
	 * @public
	 */
	canScroll(_shape: Shape): boolean {
		return false
	}

	/**
	 * Whether the shape can be bound to. See {@link TLShapeUtilCanBindOpts} for details.
	 *
	 * @public
	 */
	canBind(_opts: TLShapeUtilCanBindOpts): boolean {
		return true
	}

	/**
	 * Whether the shape can be double clicked to edit.
	 *
	 * @public
	 */
	canEdit(_shape: Shape): boolean {
		return false
	}

	/**
	 * Whether the shape can be resized.
	 *
	 * @public
	 */
	canResize(_shape: Shape): boolean {
		return true
	}

	/**
	 * When the shape is resized, whether the shape's children should also be resized.
	 *
	 * @public
	 */
	canResizeChildren(_shape: Shape): boolean {
		return true
	}

	/**
	 * Whether the shape can be edited in read-only mode.
	 *
	 * @public
	 */
	canEditInReadonly(_shape: Shape): boolean {
		return false
	}

	/**
	 * Whether the shape can be cropped.
	 *
	 * @public
	 */
	canCrop(_shape: Shape): boolean {
		return false
	}

	/**
	 * Whether the shape can participate in layout functions such as alignment or distribution.
	 *
	 * @param shape - The shape.
	 * @param info - Additional context information: the type of action causing the layout and the
	 * @public
	 *
	 * @public
	 */
	canBeLaidOut(_shape: Shape, _info: TLShapeUtilCanBeLaidOutOpts): boolean {
		return true
	}

	/**
	 * Whether this shape can be culled. By default, shapes are culled for
	 * performance reasons when they are outside of the viewport. Culled shapes are still rendered
	 * to the DOM, but have their `display` property set to `none`.
	 *
	 * @param shape - The shape.
	 */
	canCull(_shape: Shape): boolean {
		return true
	}

	/**
	 * Does this shape provide a background for its children? If this is true,
	 * then any children with a `renderBackground` method will have their
	 * backgrounds rendered _above_ this shape. Otherwise, the children's
	 * backgrounds will be rendered above either the next ancestor that provides
	 * a background, or the canvas background.
	 *
	 * @internal
	 */
	providesBackgroundForChildren(_shape: Shape): boolean {
		return false
	}

	/**
	 * Get the clip path to apply to this shape's children.
	 *
	 * @param shape - The shape to get the clip path for
	 * @returns Array of points defining the clipping polygon in local coordinates, or undefined if no clipping
	 * @public
	 */
	getClipPath?(shape: Shape): Vec[] | undefined

	/**
	 * Whether a specific child shape should be clipped by this shape.
	 * Only called if getClipPath returns a valid polygon.
	 *
	 * If not defined, the default behavior is to clip all children.
	 *
	 * @param child - The child shape to check
	 * @returns boolean indicating if this child should be clipped
	 * @public
	 */
	shouldClipChild?(child: TLShape): boolean

	/**
	 * Whether a specific shape should hide in the minimap.
	 *
	 * If not defined, the default behavior is to show all shapes in the minimap.
	 *
	 * @returns boolean indicating if this shape should hide in the minimap
	 * @public
	 */
	hideInMinimap?(_shape: Shape): boolean

	/**
	 * Whether the shape should hide its resize handles when selected.
	 *
	 * @public
	 */
	hideResizeHandles(_shape: Shape): boolean {
		return false
	}

	/**
	 * Whether the shape should hide its rotation handles when selected.
	 *
	 * @public
	 */
	hideRotateHandle(_shape: Shape): boolean {
		return false
	}

	/**
	 * Whether the shape should hide its selection bounds background when selected.
	 *
	 * @public
	 */
	hideSelectionBoundsBg(_shape: Shape): boolean {
		return false
	}

	/**
	 * Whether the shape should hide its selection bounds foreground when selected.
	 *
	 * @public
	 */
	hideSelectionBoundsFg(_shape: Shape): boolean {
		return false
	}

	/**
	 * Whether the shape's aspect ratio is locked.
	 *
	 * @public
	 */
	isAspectRatioLocked(_shape: Shape): boolean {
		return false
	}

	/**
	 * By default, the bounds of an image export are the bounds of all the shapes it contains, plus
	 * some padding. If an export includes a shape where `isExportBoundsContainer` is true, then the
	 * padding is skipped _if the bounds of that shape contains all the other shapes_. This is
	 * useful in cases like annotating on top of an image, where you usually want to avoid extra
	 * padding around the image if you don't need it.
	 *
	 * @param _shape - The shape to check
	 * @returns True if this shape should be treated as an export bounds container
	 */
	isExportBoundsContainer(_shape: Shape): boolean {
		return false
	}

	/**
	 * Get a JSX element for the shape (as an HTML element) to be rendered as part of the canvas background - behind any other shape content.
	 *
	 * @param shape - The shape.
	 * @internal
	 */
	backgroundComponent?(shape: Shape): any

	/**
	 * Get the interpolated props for an animating shape. This is an optional method.
	 *
	 * @example
	 *
	 * ```ts
	 * util.getInterpolatedProps?.(startShape, endShape, t)
	 * ```
	 *
	 * @param startShape - The initial shape.
	 * @param endShape - The initial shape.
	 * @param progress - The normalized progress between zero (start) and 1 (end).
	 * @public
	 */
	getInterpolatedProps?(startShape: Shape, endShape: Shape, progress: number): Shape['props']

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
	 * @param shape - The shape.
	 * @param type - The shape type.
	 * @public
	 */
	canReceiveNewChildrenOfType(_shape: Shape, _type: TLShape['type']) {
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
	expandSelectionOutlinePx(shape: Shape): number | Box {
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
	getBoundsSnapGeometry(_shape: Shape): BoundsSnapGeometry {
		return {}
	}

	/**
	 * Get the geometry to use when snapping handles to this shape. See {@link HandleSnapGeometry}
	 * for details.
	 */
	getHandleSnapGeometry(_shape: Shape): HandleSnapGeometry {
		return {}
	}

	getText(_shape: Shape): string | undefined {
		return undefined
	}

	getAriaDescriptor(_shape: Shape): string | undefined {
		return undefined
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
	onBeforeCreate?(next: Shape): Shape | void

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
	onBeforeUpdate?(prev: Shape, next: Shape): Shape | void

	/**
	 * A callback called when a shape changes from a crop.
	 *
	 * @param shape - The shape at the start of the crop.
	 * @param info - Info about the crop.
	 * @returns A change to apply to the shape, or void.
	 * @public
	 */
	onCrop?(
		shape: Shape,
		info: TLCropInfo<Shape>
	): Omit<TLShapePartial<Shape>, 'id' | 'type'> | undefined | void

	/**
	 * A callback called when some other shapes are dragged into this one. This fires when the shapes are dragged over the shape for the first time.
	 *
	 * @param shape - The shape.
	 * @param shapes - The shapes that are being dragged in.
	 * @public
	 */
	onDragShapesIn?(shape: Shape, shapes: TLShape[], info: TLDragShapesInInfo): void

	/**
	 * A callback called when some other shapes are dragged over this one. This fires when the shapes are dragged over the shape for the first time (after the onDragShapesIn callback), and again on every update while the shapes are being dragged.
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
	onDragShapesOver?(shape: Shape, shapes: TLShape[], info: TLDragShapesOverInfo): void

	/**
	 * A callback called when some other shapes are dragged out of this one.
	 *
	 * @param shape - The shape.
	 * @param shapes - The shapes that are being dragged out.
	 * @public
	 */
	onDragShapesOut?(shape: Shape, shapes: TLShape[], info: TLDragShapesOutInfo): void

	/**
	 * A callback called when some other shapes are dropped over this one.
	 *
	 * @param shape - The shape.
	 * @param shapes - The shapes that are being dropped over this one.
	 * @public
	 */
	onDropShapesOver?(shape: Shape, shapes: TLShape[], info: TLDropShapesOverInfo): void

	/**
	 * A callback called when a shape starts being resized.
	 *
	 * @param shape - The shape.
	 * @returns A change to apply to the shape, or void.
	 * @public
	 */
	onResizeStart?(shape: Shape): TLShapePartial<Shape> | void

	/**
	 * A callback called when a shape changes from a resize.
	 *
	 * @param shape - The shape at the start of the resize.
	 * @param info - Info about the resize.
	 * @returns A change to apply to the shape, or void.
	 * @public
	 */
	onResize?(
		shape: Shape,
		info: TLResizeInfo<Shape>
	): Omit<TLShapePartial<Shape>, 'id' | 'type'> | undefined | void

	/**
	 * A callback called when a shape finishes resizing.
	 *
	 * @param initial - The shape at the start of the resize.
	 * @param current - The current shape.
	 * @returns A change to apply to the shape, or void.
	 * @public
	 */
	onResizeEnd?(initial: Shape, current: Shape): TLShapePartial<Shape> | void

	/**
	 * A callback called when a shape resize is cancelled.
	 *
	 * @param initial - The shape at the start of the resize.
	 * @param current - The current shape.
	 * @public
	 */
	onResizeCancel?(initial: Shape, current: Shape): void

	/**
	 * A callback called when a shape starts being translated.
	 *
	 * @param shape - The shape.
	 * @returns A change to apply to the shape, or void.
	 * @public
	 */
	onTranslateStart?(shape: Shape): TLShapePartial<Shape> | void

	/**
	 * A callback called when a shape changes from a translation.
	 *
	 * @param initial - The shape at the start of the translation.
	 * @param current - The current shape.
	 * @returns A change to apply to the shape, or void.
	 * @public
	 */
	onTranslate?(initial: Shape, current: Shape): TLShapePartial<Shape> | void

	/**
	 * A callback called when a shape finishes translating.
	 *
	 * @param initial - The shape at the start of the translation.
	 * @param current - The current shape.
	 * @returns A change to apply to the shape, or void.
	 * @public
	 */
	onTranslateEnd?(initial: Shape, current: Shape): TLShapePartial<Shape> | void

	/**
	 * A callback called when a shape translation is cancelled.
	 *
	 * @param initial - The shape at the start of the translation.
	 * @param current - The current shape.
	 * @public
	 */
	onTranslateCancel?(initial: Shape, current: Shape): void

	/**
	 * A callback called when a shape's handle starts being dragged.
	 *
	 * @param shape - The shape.
	 * @param info - An object containing the handle and whether the handle is 'precise' or not.
	 * @returns A change to apply to the shape, or void.
	 * @public
	 */
	onHandleDragStart?(shape: Shape, info: TLHandleDragInfo<Shape>): TLShapePartial<Shape> | void

	/**
	 * A callback called when a shape's handle changes.
	 *
	 * @param shape - The current shape.
	 * @param info - An object containing the handle and whether the handle is 'precise' or not.
	 * @returns A change to apply to the shape, or void.
	 * @public
	 */
	onHandleDrag?(shape: Shape, info: TLHandleDragInfo<Shape>): TLShapePartial<Shape> | void

	/**
	 * A callback called when a shape's handle finishes being dragged.
	 *
	 * @param current - The current shape.
	 * @param info - An object containing the handle and whether the handle is 'precise' or not.
	 * @returns A change to apply to the shape, or void.
	 * @public
	 */
	onHandleDragEnd?(current: Shape, info: TLHandleDragInfo<Shape>): TLShapePartial<Shape> | void

	/**
	 * A callback called when a shape's handle drag is cancelled.
	 *
	 * @param current - The current shape.
	 * @param info - An object containing the handle and whether the handle is 'precise' or not.
	 * @public
	 */
	onHandleDragCancel?(current: Shape, info: TLHandleDragInfo<Shape>): void

	/**
	 * A callback called when a shape starts being rotated.
	 *
	 * @param shape - The shape.
	 * @returns A change to apply to the shape, or void.
	 * @public
	 */
	onRotateStart?(shape: Shape): TLShapePartial<Shape> | void

	/**
	 * A callback called when a shape changes from a rotation.
	 *
	 * @param initial - The shape at the start of the rotation.
	 * @param current - The current shape.
	 * @returns A change to apply to the shape, or void.
	 * @public
	 */
	onRotate?(initial: Shape, current: Shape): TLShapePartial<Shape> | void

	/**
	 * A callback called when a shape finishes rotating.
	 *
	 * @param initial - The shape at the start of the rotation.
	 * @param current - The current shape.
	 * @returns A change to apply to the shape, or void.
	 * @public
	 */
	onRotateEnd?(initial: Shape, current: Shape): TLShapePartial<Shape> | void

	/**
	 * A callback called when a shape rotation is cancelled.
	 *
	 * @param initial - The shape at the start of the rotation.
	 * @param current - The current shape.
	 * @public
	 */
	onRotateCancel?(initial: Shape, current: Shape): void

	/**
	 * Not currently used.
	 *
	 * @internal
	 */
	onBindingChange?(shape: Shape): TLShapePartial<Shape> | void

	/**
	 * A callback called when a shape's children change.
	 *
	 * @param shape - The shape.
	 * @returns An array of shape updates, or void.
	 * @public
	 */
	onChildrenChange?(shape: Shape): TLShapePartial[] | void

	/**
	 * A callback called when a shape's handle is double clicked.
	 *
	 * @param shape - The shape.
	 * @param handle - The handle that is double-clicked.
	 * @returns A change to apply to the shape, or void.
	 * @public
	 */
	onDoubleClickHandle?(shape: Shape, handle: TLHandle): TLShapePartial<Shape> | void

	/**
	 * A callback called when a shape's edge is double clicked.
	 *
	 * @param shape - The shape.
	 * @param info - Info about the edge.
	 * @returns A change to apply to the shape, or void.
	 * @public
	 */
	onDoubleClickEdge?(shape: Shape, info: TLClickEventInfo): TLShapePartial<Shape> | void

	/**
	 * A callback called when a shape's corner is double clicked.
	 *
	 * @param shape - The shape.
	 * @param info - Info about the corner.
	 * @returns A change to apply to the shape, or void.
	 * @public
	 */
	onDoubleClickCorner?(shape: Shape, info: TLClickEventInfo): TLShapePartial<Shape> | void

	/**
	 * A callback called when a shape is double clicked.
	 *
	 * @param shape - The shape.
	 * @returns A change to apply to the shape, or void.
	 * @public
	 */
	onDoubleClick?(shape: Shape): TLShapePartial<Shape> | void

	/**
	 * A callback called when a shape is clicked.
	 *
	 * @param shape - The shape.
	 * @returns A change to apply to the shape, or void.
	 * @public
	 */
	onClick?(shape: Shape): TLShapePartial<Shape> | void

	/**
	 * A callback called when a shape starts being edited.
	 *
	 * @param shape - The shape.
	 * @public
	 */
	onEditStart?(shape: Shape): void

	/**
	 * A callback called when a shape finishes being edited.
	 *
	 * @param shape - The shape.
	 * @public
	 */
	onEditEnd?(shape: Shape): void
}

/**
 * Info about a crop.
 * @param handle - The handle being dragged.
 * @param change - The distance the handle is moved.
 * @param initialShape - The shape at the start of the resize.
 * @public
 */
export interface TLCropInfo<T extends TLShape> {
	handle: SelectionHandle
	change: Vec
	crop: TLShapeCrop
	uncroppedSize: { w: number; h: number }
	initialShape: T
	aspectRatioLocked?: boolean
}

/** @public */
export interface TLDragShapesInInfo {
	initialDraggingOverShapeId: TLShapeId | null
	prevDraggingOverShapeId: TLShapeId | null
	initialParentIds: Map<TLShapeId, TLParentId>
	initialIndices: Map<TLShapeId, IndexKey>
}

/** @public */
export interface TLDragShapesOverInfo {
	initialDraggingOverShapeId: TLShapeId | null
	initialParentIds: Map<TLShapeId, TLParentId>
	initialIndices: Map<TLShapeId, IndexKey>
}

/** @public */
export interface TLDragShapesOutInfo {
	nextDraggingOverShapeId: TLShapeId | null
	initialDraggingOverShapeId: TLShapeId | null
	initialParentIds: Map<TLShapeId, TLParentId>
	initialIndices: Map<TLShapeId, IndexKey>
}

/** @public */
export interface TLDropShapesOverInfo {
	initialDraggingOverShapeId: TLShapeId | null
	initialParentIds: Map<TLShapeId, TLParentId>
	initialIndices: Map<TLShapeId, IndexKey>
}

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

/* -------------------- Dragging -------------------- */

/** @public */
export interface TLHandleDragInfo<T extends TLShape> {
	handle: TLHandle
	isPrecise: boolean
	isCreatingShape: boolean
	initial?: T | undefined
}
