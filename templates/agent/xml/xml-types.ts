import {
	TLDefaultColorStyle,
	TLDefaultDashStyle,
	TLDefaultFillStyle,
	TLDefaultFontStyle,
	TLDefaultHorizontalAlignStyle,
	TLDefaultSizeStyle,
	TLDefaultVerticalAlignStyle,
	TLGeoShapeGeoStyle,
	TLLineShapeSplineStyle,
} from '@tldraw/tlschema'
import { TLShape } from 'tldraw'

// Thoughts

export interface IThought {
	type: 'thought'
	text: string
}

export interface IXmlThoughtActionAttributes {
	text: string
}

// Statements

export interface IStatement {
	type: 'statement'
	text: string
}

export interface IXmlStatementActionAttributes {
	text: string
}

// Shapes

// Use types from tldraw schema instead of defining our own
export type IColor = TLDefaultColorStyle
export type IGeoType = TLGeoShapeGeoStyle
export type ISize = TLDefaultSizeStyle
export type IDashStyle = TLDefaultDashStyle
export type IFillStyle = TLDefaultFillStyle
export type IFontStyle = TLDefaultFontStyle
export type IAlignStyle = TLDefaultHorizontalAlignStyle
export type IVerticalAlignStyle = TLDefaultVerticalAlignStyle
export type ISplineStyle = TLLineShapeSplineStyle

export type IShapeId = string

interface IBaseShape {
	id: IShapeId
	x: number
	y: number
}

// Geo shape

export interface IGeoShape extends IBaseShape {
	id: IShapeId
	type: 'geo'
	x: number
	y: number
	width?: number
	height?: number
	// Geometry properties
	geo?: IGeoType
	// Styling properties
	fill?: IFillStyle
	color?: IColor
	labelColor?: IColor
	dash?: IDashStyle
	size?: ISize
	// Text properties
	text?: string
	font?: IFontStyle
	align?: IAlignStyle
	verticalAlign?: IVerticalAlignStyle
	// Transform properties
	scale?: number
	growY?: number
	// URL property
	url?: string
}

// Base interface for all geo shape XML attributes
interface IXmlBaseGeoShapeAttributes {
	id: string
	x: string
	y: string
	width?: string
	height?: string
	// Styling properties
	fill?: IFillStyle
	color?: IColor
	labelColor?: IColor
	dash?: IDashStyle
	size?: ISize
	// Text properties
	text?: string
	font?: IFontStyle
	align?: IAlignStyle
	verticalAlign?: IVerticalAlignStyle
	// Transform properties
	scale?: string
	growY?: string
	// URL property
	url?: string
}

// Individual geo type interfaces (type aliases to avoid empty interface linting errors)
export type IXmlRectangleShapeAttributes = IXmlBaseGeoShapeAttributes
export type IXmlEllipseShapeAttributes = IXmlBaseGeoShapeAttributes
export type IXmlTriangleShapeAttributes = IXmlBaseGeoShapeAttributes
export type IXmlDiamondShapeAttributes = IXmlBaseGeoShapeAttributes
export type IXmlPentagonShapeAttributes = IXmlBaseGeoShapeAttributes
export type IXmlHexagonShapeAttributes = IXmlBaseGeoShapeAttributes
export type IXmlOctagonShapeAttributes = IXmlBaseGeoShapeAttributes
export type IXmlStarShapeAttributes = IXmlBaseGeoShapeAttributes
export type IXmlRhombusShapeAttributes = IXmlBaseGeoShapeAttributes
export type IXmlRhombus2ShapeAttributes = IXmlBaseGeoShapeAttributes
export type IXmlOvalShapeAttributes = IXmlBaseGeoShapeAttributes
export type IXmlTrapezoidShapeAttributes = IXmlBaseGeoShapeAttributes
export type IXmlArrowRightShapeAttributes = IXmlBaseGeoShapeAttributes
export type IXmlArrowLeftShapeAttributes = IXmlBaseGeoShapeAttributes
export type IXmlArrowUpShapeAttributes = IXmlBaseGeoShapeAttributes
export type IXmlArrowDownShapeAttributes = IXmlBaseGeoShapeAttributes
export type IXmlXBoxShapeAttributes = IXmlBaseGeoShapeAttributes
export type IXmlCheckBoxShapeAttributes = IXmlBaseGeoShapeAttributes
export type IXmlHeartShapeAttributes = IXmlBaseGeoShapeAttributes
export type IXmlCloudShapeAttributes = IXmlBaseGeoShapeAttributes

// Legacy geo interface for backward compatibility
export interface IXmlGeoShapeAttributes extends IXmlBaseGeoShapeAttributes {
	geo?: IGeoType
}

// Text shape

export interface ITextShape extends IBaseShape {
	id: IShapeId
	type: 'text'
	text: string
	color?: IColor
}

export interface IXmlTextShapeAttributes {
	id: string
	x: string
	y: string
	text: string
	color?: IColor
}

// Note shape

export interface INoteShape extends IBaseShape {
	id: IShapeId
	type: 'note'
	x: number
	y: number
	// Styling properties
	color?: IColor
	labelColor?: IColor
	size?: ISize
	font?: IFontStyle
	fontSizeAdjustment?: number
	align?: IAlignStyle
	verticalAlign?: IVerticalAlignStyle
	// Transform properties
	growY?: number
	scale?: number
	// Content properties
	text?: string
	url?: string
}

export interface IXmlNoteShapeAttributes {
	id: string
	x: string
	y: string
	// Styling properties
	color?: IColor
	labelColor?: IColor
	size?: ISize
	font?: IFontStyle
	fontSizeAdjustment?: string
	align?: IAlignStyle
	verticalAlign?: IVerticalAlignStyle
	// Transform properties
	growY?: string
	scale?: string
	// Content properties
	text?: string
	url?: string
}

// Frame shape

export interface IFrameShape extends IBaseShape {
	id: IShapeId
	type: 'frame'
	x: number
	y: number
	width?: number
	height?: number
	name?: string
	color?: IColor
}

export interface IXmlFrameShapeAttributes {
	id: string
	x: string
	y: string
	width?: string
	height?: string
	name?: string
	color?: IColor
}

// Line shape

export interface ILinePoint {
	id: string
	x: number
	y: number
}

export interface ILineShape extends IBaseShape {
	id: IShapeId
	type: 'line'
	x: number
	y: number
	// Styling properties
	color?: IColor
	dash?: IDashStyle
	size?: ISize
	spline?: ISplineStyle
	scale?: number
	// Points defining the line
	points?: ILinePoint[]
}

export interface IXmlLineShapeAttributes {
	id: string
	x: string
	y: string
	// Styling properties
	color?: IColor
	dash?: IDashStyle
	size?: ISize
	spline?: ISplineStyle
	scale?: string
	// Points as simplified attributes (start and end)
	startX?: string
	startY?: string
	endX?: string
	endY?: string
}

// Highlight shape

export interface IHighlightShape extends IBaseShape {
	id: IShapeId
	type: 'highlight'
	x: number
	y: number
	// Styling properties
	color?: IColor
	size?: ISize
	scale?: number
	// Drawing properties
	isComplete?: boolean
	isPen?: boolean
	// Points defining the highlight path (simplified)
	points?: ILinePoint[]
}

export interface IXmlHighlightShapeAttributes {
	id: string
	x: string
	y: string
	// Styling properties
	color?: IColor
	size?: ISize
	scale?: string
	// Drawing properties
	isComplete?: string
	isPen?: string
	// Simplified path definition
	path?: string
}

export type IShape =
	| IGeoShape
	| ITextShape
	| INoteShape
	| IFrameShape
	| ILineShape
	| IHighlightShape

// Actions

/**
 * Create a shape.
 */
export interface ICreateShapeAction {
	type: 'create-shape'
	shape: IShape
}

/**
 * Delete shapes.
 */
export interface IDeleteShapesAction {
	type: 'delete-shapes'
	shapeIds: IShapeId[]
}

export interface IXmlDeleteShapesActionAttributes {
	'shape-ids': string
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

export interface IXmlMoveShapeActionAttributes {
	'shape-id': string
	x: string
	y: string
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

export interface IXmlLabelShapeActionAttributes {
	'shape-id': string
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

export interface IXmlPlaceShapeActionAttributes {
	'shape-id': string
	'reference-shape-id': string
	side: 'top' | 'bottom' | 'left' | 'right'
	'side-offset': string
	align: 'start' | 'center' | 'end'
	'align-offset': string
}

/**
 * Align multiple shapes to each other. In the canvas, this should align the shapes to each other
 * based on the alignment parameter. The alignment parameter can be one of the following:
 * - 'top': Align the shapes to the top of each other.
 * - 'bottom': Align the shapes to the bottom of each other.
 * - 'left': Align the shapes to the left of each other.
 * - 'right': Align the shapes to the right of each other.
 * - 'center-horizontal': Align the shapes to the center of the x-axis.
 * - 'center-vertical': Align the shapes to the center of the y-axis.
 */
export interface IAlignShapesAction {
	type: 'align-shapes'
	shapeIds: IShapeId[]
	alignment: 'top' | 'bottom' | 'left' | 'right' | 'center-horizontal' | 'center-vertical'
}

export interface IXmlAlignShapesActionAttributes {
	'shape-ids': string
	alignment: 'top' | 'bottom' | 'left' | 'right' | 'center-horizontal' | 'center-vertical'
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

export interface IXmlStackShapesActionAttributes {
	'shape-ids': string
	direction: 'vertical' | 'horizontal'
	align: 'start' | 'center' | 'end'
	gap: string
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
}

export interface IXmlDistributeShapesActionAttributes {
	'shape-ids': string
	direction: 'vertical' | 'horizontal'
}

export interface IUpdateShapeAction {
	type: 'update-shape'
	shape: IShape
}

export type IAction =
	| ICreateShapeAction
	| IDeleteShapesAction
	| IMoveShapeAction
	| ILabelShapeAction
	| IPlaceShapeAction
	| IAlignShapesAction
	| IStackShapesAction
	| IDistributeShapesAction
	| IUpdateShapeAction

// Response

export type IResponse = (IThought | IStatement | IAction)[]

// XML Attributes

export type IXMLAttributes =
	| IXmlThoughtActionAttributes
	| IXmlStatementActionAttributes
	| IXmlDeleteShapesActionAttributes
	| IXmlMoveShapeActionAttributes
	| IXmlLabelShapeActionAttributes
	| IXmlPlaceShapeActionAttributes
	| IXmlAlignShapesActionAttributes
	| IXmlStackShapesActionAttributes
	| IXmlDistributeShapesActionAttributes
	| IXmlGeoShapeAttributes
	| IXmlTextShapeAttributes

// Prompt

export interface IPromptInfo {
	image: string
	viewport: { id: string; minX: number; minY: number; maxX: number; maxY: number }
	contents: IShapeStub[]
	prompt: string
}

export interface IShapeStub {
	id: string
	type: TLShape['type']
	index: number
	minX: number
	minY: number
	maxX: number
	maxY: number
}
