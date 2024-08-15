import {
	Group2d,
	Polygon2d,
	RecordPropsType,
	Rectangle2d,
	ShapeUtil,
	T,
	TLBaseShape,
	TLResizeInfo,
	Tldraw,
	Vec,
	resizeBox,
	structuredClone,
} from 'tldraw'
import 'tldraw/tldraw.css'

const houseShapeProps = {
	w: T.number,
	h: T.number,
}

type HouseShapeProps = RecordPropsType<typeof houseShapeProps>
type HouseShape = TLBaseShape<'house', HouseShapeProps>
class HouseShapeUtil extends ShapeUtil<HouseShape> {
	static override type = 'house' as const
	static override props = houseShapeProps

	override canResize() {
		return true
	}
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
	override indicator(shape: HouseShape) {
		const { house: houseVertices, door: doorVertices } = getHouseVertices(shape)
		const housePathData = 'M' + houseVertices[0] + 'L' + houseVertices.slice(1) + 'Z'
		const doorPathData = 'M' + doorVertices[0] + 'L' + doorVertices.slice(1) + 'Z'
		return <path d={housePathData + doorPathData} />
	}
	override onResize(shape: HouseShape, info: TLResizeInfo<HouseShape>) {
		const resized = resizeBox(shape, info)
		const next = structuredClone(info.initialShape)
		next.x = resized.x
		next.y = resized.y
		next.props.w = resized.props.w
		next.props.h = resized.props.h
		return next
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
Introduction:
This file demonstrates how to create a shape with custom geometry in tldraw. The 
shape we're creating is a simple house shape with a door. The HouseShapeUtil class 
defines the behavior and appearance of our custom house shape.

[1]
The getGeometry method defines the geometric representation of our shape. This geometry
is used for hit-testing, intersection checking and other geometric calculations. We use 
Polygon2d for the house body and Rectangle2d for the door. These are combined into a 
Group2d to form the complete house geometry.

[2]
The component method determines how our shape is rendered. We create SVG paths for 
both the house body and the door, combining them into a single path element. This 
method is called when the shape needs to be drawn on the canvas. The tl-svg-container
class contains some helpful styles for rendering the svg correctly.

[3]
The indicator method renders the same path as a thin blue line when the shape is selected.

[4]
The getHouseVertices function calculates the vertices for both the house body and the door 
based on the shape's dimensions. This is used by both the geometry and rendering methods 
to ensure consistency in the shape's appearance.

*/
