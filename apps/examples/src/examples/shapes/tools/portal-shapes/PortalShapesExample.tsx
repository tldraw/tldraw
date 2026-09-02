import { createShapeId, TLContent, TLRichText, Tldraw } from 'tldraw'
import 'tldraw/tldraw.css'
import companionCube from './companion-cube.json'
import { PortalShapeUtil } from './PortalShapeUtil'

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
					editor.createShapes([
						{
							id: createShapeId('blue-portal'),
							type: 'portal',
							x: 100,
							y: 150,
							props: { w: 200, h: 300, color: 'blue' },
						},
						{
							id: createShapeId('orange-portal'),
							type: 'portal',
							x: 500,
							y: 150,
							props: { w: 200, h: 300, color: 'orange' },
						},
					])

					editor.createShape({
						type: 'text',
						x: 100,
						y: 500,
						props: { size: 'l', richText: tagline },
					})

					// [3]
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
The shape util array is defined outside the component so it keeps the same identity across
renders.

[2]
Create a pair of linked portals, one blue and one orange. They find each other by color, so
only one of each should exist on a page.

[3]
The companion cube is a group of shapes saved as `TLContent` (the format used by copy/paste).
`putContentOntoCurrentPage` places it on the canvas for the user to drag into the portals.
*/
