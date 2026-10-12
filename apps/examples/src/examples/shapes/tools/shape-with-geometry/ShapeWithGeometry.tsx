import {
	Group2d,
	Polygon2d,
	RecordPropsType,
	Rectangle2d,
	ShapeUtil,
	T,
	TLResizeInfo,
	TLShape,
	Tldraw,
	Vec,
	resizeBox,
} from 'tldraw'
import 'tldraw/tldraw.css'

const HOUSE_TYPE = 'house'

declare module 'tldraw' {
	export interface TLGlobalShapePropsMap {
		[HOUSE_TYPE]: HouseShapeProps
	}
}

const houseShapeProps = {
	w: T.number,
	h: T.number,
}

type HouseShapeProps = RecordPropsType<typeof houseShapeProps>
type HouseShape = TLShape<typeof HOUSE_TYPE>
class HouseShapeUtil extends ShapeUtil<HouseShape> {
	static override type = HOUSE_TYPE
	static override props = houseShapeProps

	override getDefaultProps() {
		return {
			w: 100,
			h: 100,
		}
	}
	//[1]
	override getGeometry(shape: HouseShape) {
		const { house: houseGeometry } = getHouseVertices(shape)
		const house = new Polygon2d({
			points: houseGeometry,
			isFilled: true,
		})
		const door = new Rectangle2d({
			x: shape.props.w / 2 - shape.props.w / 10,
			y: shape.props.h - shape.props.h / 4,
			width: shape.props.w / 5,
			height: shape.props.h / 4,
			isFilled: true,
		})
		const geometry = new Group2d({
			children: [house, door],
		})
		return geometry
	}
	// [2]
	override component(shape: HouseShape) {
		const { house: houseVertices, door: doorVertices } = getHouseVertices(shape)
		const housePathData = 'M' + houseVertices[0] + 'L' + houseVertices.slice(1) + 'Z'
		const doorPathData = 'M' + doorVertices[0] + 'L' + doorVertices.slice(1) + 'Z'
		return (
			<svg className="tl-svg-container">
				<path strokeWidth={3} stroke="black" d={housePathData + doorPathData} fill="none" />
			</svg>
		)
	}
	// [3]
	override getIndicatorPath(shape: HouseShape) {
		const { house: houseVertices, door: doorVertices } = getHouseVertices(shape)
		const housePathData = 'M' + houseVertices[0] + 'L' + houseVertices.slice(1) + 'Z'
		const doorPathData = 'M' + doorVertices[0] + 'L' + doorVertices.slice(1) + 'Z'
		return new Path2D(housePathData + doorPathData)
	}
	override onResize(shape: HouseShape, info: TLResizeInfo<HouseShape>) {
		return resizeBox(shape, info)
	}
}
// [4]
function getHouseVertices(shape: HouseShape): { house: Vec[]; door: Vec[] } {
	const { w, h } = shape.props
	const halfW = w / 2
	const roofStart = h / 2.5
	const house = [
		new Vec(0, roofStart), // Roof start (left)
		new Vec(w, roofStart), // Roof start (right)
		new Vec(w, h), // Bottom-right corner
		new Vec(0, h), // Bottom-left corner
		new Vec(0, roofStart), // Roof start (left)
		new Vec(halfW, 0), // Roof peak
		new Vec(w, roofStart), // Roof start (right)
	]
	const door = [
		new Vec(halfW - w / 10, h), // Bottom-left corner
		new Vec(halfW + w / 10, h), // Bottom-right corner
		new Vec(halfW + w / 10, h - h / 4), // Top-right corner
		new Vec(halfW - w / 10, h - h / 4), // Top-left corner
		new Vec(halfW - w / 10, h), // Bottom-left corner
	]
	return { house, door }
}

const shapeUtils = [HouseShapeUtil]

export default function ShapeWithGeometryExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw
				onMount={(editor) => {
					editor.createShape({
						type: 'house',
						x: 100,
						y: 100,
						props: {
							w: 100,
							h: 100,
						},
					})
				}}
				shapeUtils={shapeUtils}
			/>
		</div>
	)
}

/*
This file shows a shape with custom (non-rectangular) geometry: a house with a door.

[1]
getGeometry returns the geometry the editor uses for hit testing, selection bounds,
snapping, and arrow binding. It does not have to match a rectangle: here the house body
is a Polygon2d and the door is a Rectangle2d, combined into a Group2d. Because the
geometry is a polygon rather than the bounding box, clicking in the empty corners
either side of the roof does not select the shape.

[2]
The component draws the same vertices as an SVG path. Vec's toString() gives "x, y", so
joining the vertices produces valid path data. The tl-svg-container class sizes the svg
to the shape and turns off pointer events on it.

[3]
getIndicatorPath returns a Path2D for the same outline; tldraw strokes it onto the canvas
overlay as the blue selection outline.

[4]
Both the geometry and the rendering derive from getHouseVertices, so hit testing always
matches what the user sees. Keep them in sync when you change how a shape looks.
*/
