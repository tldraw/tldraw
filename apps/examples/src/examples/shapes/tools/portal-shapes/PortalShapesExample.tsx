import {
	createShapeId,
	TLGeoShapeProps,
	TLRichText,
	TLTextShapeProps,
	Tldraw,
	toRichText,
} from 'tldraw'
import 'tldraw/tldraw.css'
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

					editor.createShapes([
						{
							id: blueId,
							type: 'portal',
							x: 100,
							y: 150,
							props: { w: 250, h: 300, color: 'blue' },
						},
						{
							id: orangeId,
							type: 'portal',
							x: 500,
							y: 150,
							props: { w: 250, h: 300, color: 'orange' },
						},
					])

					// [3]
					editor.createShapes([
						{
							type: 'text',
							x: 150,
							y: 500,
							props: {
								size: 'l',
								richText: tagline,
							} satisfies Partial<TLTextShapeProps>,
						},
						{
							type: 'geo',
							x: 120,
							y: 50,
							props: {
								geo: 'star',
								w: 80,
								h: 80,
								fill: 'solid',
								color: 'yellow',
								richText: toRichText(''),
							} satisfies Partial<TLGeoShapeProps>,
						},
						{
							type: 'geo',
							x: 250,
							y: 50,
							props: {
								geo: 'heart',
								w: 80,
								h: 80,
								fill: 'solid',
								color: 'red',
								richText: toRichText(''),
							} satisfies Partial<TLGeoShapeProps>,
						},
						{
							type: 'geo',
							x: 380,
							y: 50,
							props: {
								geo: 'diamond',
								w: 80,
								h: 80,
								fill: 'solid',
								color: 'green',
								richText: toRichText(''),
							} satisfies Partial<TLGeoShapeProps>,
						},
					])

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
Drop a few shapes on the canvas for the user to drag into the portals,
plus a text shape with the Portal tagline.
*/
