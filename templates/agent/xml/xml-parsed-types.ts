// Thoughts

export interface IThought {
	type: 'thought'
	text: string
}

// Shapes

export type IShapeId = string

interface IBaseShape {
	id: IShapeId
	x: number
	y: number
}

export interface IGeoShape extends IBaseShape {
	id: IShapeId
	type: 'geo'
	x: number
	y: number
	text?: string
}

export interface ITextShape extends IBaseShape {
	id: IShapeId
	type: 'text'
	text: string
}

export type IShape = IGeoShape | ITextShape

// Actions

/**
 * Create a shape.
 */
export interface ICreateShapeAction {
	type: 'create-shape'
	shape: IShape
}

/**
 * Delete a shape.
 */
export interface IDeleteShapeAction {
	type: 'delete-shape'
	shapeId: IShapeId
}

/**
 * Move a shape to a new position.
 */
export interface IMoveShapeAction {
	type: 'move-shape'
	shapeId: IShapeId
	x: number
	y: number
}

/**
 * Add a label to a shape. In the canvas, this should either set the shape's text (if it has a
 * text property) or else create a new text shape and place it next to the shape.
 */
export interface ILabelShapeAction {
	type: 'label-shape'
	shapeId: IShapeId
	text: string
}

/**
 * Place a shape next to another shape. In the canvas, this should create a new shape and place
 * it next to the reference shape. The new shape should be placed on the side of the reference
 * shape that is specified by the side parameter. The sideOffset parameter specifies the distance
 * from the reference shape to the new shape. The align parameter specifies the alignment of the
 * new shape relative to the reference shape. The alignOffset parameter specifies the distance
 * from the reference shape to the new shape.
 */
export interface IPlaceShapeAction {
	type: 'place-shape'
	shapeId: IShapeId
	referenceShapeId: IShapeId
	side: 'top' | 'bottom' | 'left' | 'right'
	sideOffset: number
	align: 'start' | 'center' | 'end'
	alignOffset: number
}

/**
 * Align multiple shapes to each other. In the canvas, this should align the shapes to each other
 * based on the alignment parameter. The alignment parameter can be one of the following:
 * - 'top': Align the shapes to the top of each other.
 * - 'bottom': Align the shapes to the bottom of each other.
 * - 'left': Align the shapes to the left of each other.
 * - 'right': Align the shapes to the right of each other.
 * - 'center-x': Align the shapes to the center of the x-axis.
 */
export interface IAlignShapesAction {
	type: 'align-shapes'
	shapeIds: IShapeId[]
	alignment: 'top' | 'bottom' | 'left' | 'right' | 'center-x' | 'center-y'
}

/**
 * Stack multiple shapes on top of each other. In the canvas, this should stack the shapes on top
 * of each other based on the direction parameter. The align parameter specifies the alignment of
 * the shapes relative to each other. The gap parameter specifies the distance between the shapes.
 */
export interface IStackShapesAction {
	type: 'stack-shapes'
	shapeIds: IShapeId[]
	direction: 'vertical' | 'horizontal'
	align: 'start' | 'center' | 'end'
	gap: number
}

/**
 * Distribute multiple shapes evenly across the canvas. In the canvas, this should distribute the
 * shapes evenly across the canvas based on the direction parameter. The min and max dimensions of
 * the shapes overall will not change, but the shapes will be positioned in a distributed pattern
 * within those dimensions.
 */
export interface IDistributeShapesAction {
	type: 'distribute-shapes'
	shapeIds: IShapeId[]
	direction: 'vertical' | 'horizontal'
	gap: number
}

export type IAction =
	| ICreateShapeAction
	| IDeleteShapeAction
	| IMoveShapeAction
	| ILabelShapeAction
	| IPlaceShapeAction
	| IAlignShapesAction
	| IStackShapesAction
	| IDistributeShapesAction

// Response

export type IResponse = (IThought | IAction)[]
