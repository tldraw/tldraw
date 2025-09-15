import { Tldraw } from 'tldraw'
import 'tldraw/tldraw.css'
import { PlainTextLabelUtil } from './PlainTextLabelUtil'
import { PlainTextNoteUtil } from './PlainTextNoteUtil'

// [1]
const customShapeUtils = [PlainTextNoteUtil, PlainTextLabelUtil]

export default function PlainTextShapesExample() {
	return (
		<div className="tldraw__editor">
			{/* [2] */}
			<Tldraw
				shapeUtils={customShapeUtils}
				onMount={(editor) => {
					// [3]
					editor.createShape({
						type: 'plain-text-note',
						x: 100,
						y: 100,
						props: {
							text: 'This is a plain text note.\n\nDouble-click to edit.\nUse Ctrl+Enter to finish editing.',
							color: 'blue',
							size: 'm',
							font: 'draw',
						},
					})

					editor.createShape({
						type: 'plain-text-label',
						x: 400,
						y: 150,
						props: {
							text: 'Simple Label',
							color: 'red',
							size: 'l',
							font: 'sans',
						},
					})

					editor.createShape({
						type: 'plain-text-label',
						x: 400,
						y: 250,
						props: {
							text: 'Another Label',
							color: 'green',
							size: 's',
							font: 'mono',
						},
					})
				}}
			/>
		</div>
	)
}

/*
[1] 
Import and define the custom shape utilities for plain text shapes.

[2]
Pass the custom shape utilities to Tldraw via the shapeUtils prop.

[3]
Create some example shapes on mount to demonstrate the plain text functionality.
The shapes can be double-clicked to edit, and use Ctrl+Enter to finish editing.
*/