import { Tldraw, createShapeId, toRichText } from 'tldraw'
import 'tldraw/tldraw.css'

export default function ProgrammaticTextShapeCreationAndConfigurationExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw
				onMount={(editor) => {
					// [1]
					editor.createShape({
						id: createShapeId(),
						type: 'text',
						x: 100,
						y: 100,
						props: {
							richText: toRichText('Auto-sized text'),
							size: 'l',
							color: 'blue',
							autoSize: true,
						},
					})

					// [2]
					editor.createShape({
						id: createShapeId(),
						type: 'text',
						x: 100,
						y: 200,
						props: {
							richText: toRichText(
								'Fixed-width text that wraps when it reaches the specified width. This text will wrap to multiple lines.'
							),
							size: 'm',
							color: 'green',
							w: 300,
							autoSize: false,
						},
					})

					// [3]
					editor.createShape({
						id: createShapeId(),
						type: 'text',
						x: 100,
						y: 400,
						props: {
							richText: toRichText('Center aligned'),
							size: 's',
							color: 'red',
							textAlign: 'middle',
							w: 200,
							autoSize: false,
						},
					})

					// [4]
					editor.createShape({
						id: createShapeId(),
						type: 'text',
						x: 100,
						y: 500,
						props: {
							// Rich text with bold formatting using marks
							richText: {
								type: 'doc',
								content: [
									{
										type: 'paragraph',
										content: [{ type: 'text', text: 'Bold text', marks: [{ type: 'bold' }] }],
									},
								],
							},
							size: 'xl',
							color: 'orange',
							autoSize: true,
						},
					})

					// [5]
					editor.createShape({
						id: createShapeId(),
						type: 'text',
						x: 100,
						y: 600,
						props: {
							richText: toRichText('Monospace font'),
							size: 'm',
							color: 'violet',
							font: 'mono',
							autoSize: true,
						},
					})

					editor.zoomToFit({ animation: { duration: 0 } })
				}}
			/>
		</div>
	)
}

/*
[1]
Create an auto-sized text shape. When autoSize is true, the text shape automatically
adjusts its width to fit the content. This is the default behavior for text shapes.
Use toRichText() to convert plain text strings to the required rich text format.

[2]
Create a fixed-width text shape by setting autoSize to false and specifying a width.
The text will wrap when it reaches the specified width. This is useful for creating
text blocks with consistent formatting.

[3]
Create a text shape with center alignment. The textAlign property controls horizontal
text alignment within the shape: 'start' (left), 'middle' (center), or 'end' (right).

[4]
Create a text shape with bold formatting. To apply formatting like bold, italic, or
code, you need to construct the rich text document manually with marks. The marks array
on a text node specifies which formatting to apply. Available marks include 'bold',
'italic', 'code', 'link', and 'highlight'.

[5]
Create a text shape with a specific font. The font property supports 'draw' (handdrawn),
'sans' (sans-serif), 'serif' (serif), and 'mono' (monospace). The size property controls
the font size: 's', 'm', 'l', or 'xl'.

Note: The richText property requires a TLRichText object. Use toRichText('your text')
to convert plain text strings. For rich formatting with marks, construct the document
structure directly as shown in example [4].
*/
