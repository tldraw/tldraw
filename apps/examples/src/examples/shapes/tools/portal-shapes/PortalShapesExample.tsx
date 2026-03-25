import {
	createShapeId,
	TLContent,
	TLShapePartial,
	TLRichText,
	TLTextShapeProps,
	Tldraw,
} from 'tldraw'
import 'tldraw/tldraw.css'
import companionCube from './companion-cube.json'
import { PortalShapeUtil } from './PortalShapeUtil'
import './portal-shapes.css'

// [1]
const shapeUtils = [PortalShapeUtil]

const tagline: TLRichText = {
	type: 'doc',
	content: [
		{
			type: 'paragraph',
			content: [
				{ type: 'text', text: "Now you're thinking with " },
				{ type: 'text', marks: [{ type: 'strike' }], text: 'portals' },
				{ type: 'text', text: ' frames' },
			],
		},
	],
}

export default function PortalShapesExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw
				shapeUtils={shapeUtils}
				onMount={(editor) => {
					// [2]
					const blueId = createShapeId('blue-portal')
					const orangeId = createShapeId('orange-portal')
					const portalShapes = [
						{
							id: blueId,
							type: 'portal',
							x: 100,
							y: 150,
							props: { w: 200, h: 300, color: 'blue' },
						},
						{
							id: orangeId,
							type: 'portal',
							x: 500,
							y: 150,
							props: { w: 200, h: 300, color: 'orange' },
						},
					] as const

					editor.createShapes(portalShapes as unknown as TLShapePartial[])

					// [3]
					editor.createShape({
						type: 'text',
						x: 100,
						y: 500,
						props: {
							size: 'l',
							richText: tagline,
						} satisfies Partial<TLTextShapeProps>,
					})

					// [4]
					editor.putContentOntoCurrentPage(companionCube as unknown as TLContent, {
						point: { x: 300, y: 20 },
					})
					editor.selectNone()

					editor.zoomToFit({ animation: { duration: 0 } })
					editor.zoomOut(undefined, { animation: { duration: 0 } })
				}}
			/>
		</div>
	)
}

/*
[1]
Register the custom PortalShapeUtil. This array is defined outside of the
component so it stays referentially stable across renders.

[2]
Create a pair of linked portals — one blue, one orange. They find each
other by color, so only one of each should exist on a page.

[3]
Add the Portal tagline as a text shape.

[4]
Load the companion cube from a snapshot and place it on the canvas
for the user to drag into the portals.
*/
