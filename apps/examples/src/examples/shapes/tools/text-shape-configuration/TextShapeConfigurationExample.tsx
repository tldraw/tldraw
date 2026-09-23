import { Tldraw, toRichText } from 'tldraw'
import 'tldraw/tldraw.css'

export default function TextShapeConfigurationExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw
				onMount={(editor) => {
					// [1]
					editor.createShape({
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
						type: 'text',
						x: 100,
						y: 500,
						props: {
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
Text shapes store their content as rich text (a TipTap/ProseMirror document), so the
`richText` prop takes a TLRichText object rather than a string. `toRichText()` converts
a plain string; for formatting, build the document yourself as in [4].

[1]
An auto-sized text shape (autoSize: true, the default) grows its width to fit the content.
Any `w` you pass is ignored.

[2]
With autoSize: false the shape keeps the given `w` and wraps text inside it. There is no
`h` prop; the height is measured from the wrapped content.

[3]
textAlign controls horizontal alignment within the shape's width: 'start', 'middle', or
'end'. It only has a visible effect on fixed-width shapes, since an auto-sized shape is
exactly as wide as its text.

[4]
Formatting is expressed with marks on text nodes. Marks available in the default rich text
extensions include 'bold', 'italic', 'code', 'strike', 'underline', 'link', and
'highlight'.

[5]
The font style is 'draw', 'sans', 'serif', or 'mono'; size is 's', 'm', 'l', or 'xl'.
These are tldraw's default style props, so the style panel shows and edits them when the
shape is selected.
*/
