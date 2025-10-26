import { useCallback } from 'react'
import {
	BaseBoxShapeUtil,
	defaultHandleExternalTextContent,
	Editor,
	HTMLContainer,
	Tldraw,
	TLShape,
} from 'tldraw'
import 'tldraw/tldraw.css'

const DANGEROUS_HTML_TYPE = 'dangerous-html'

declare module '@tldraw/tlschema' {
	export interface GlobalShapePropsMap {
		[DANGEROUS_HTML_TYPE]: { w: number; h: number; html: string }
	}
}

// There's a guide at the bottom of this page!

// [1]
export type IDangerousHtmlShape = TLShape<typeof DANGEROUS_HTML_TYPE>

// [2]
class DangerousHtmlExample extends BaseBoxShapeUtil<IDangerousHtmlShape> {
	static override type = DANGEROUS_HTML_TYPE

	override getDefaultProps()s {
		return {
			type: DANGEROUS_HTML_TYPE,
			w: 500,
			h: 300,
			html: '<div>hello</div>',
		}
	}

	override component(shape: IDangerousHtmlShape) {
		return (
			<HTMLContainer style={{ overflow: 'auto' }}>
				<div dangerouslySetInnerHTML={{ __html: shape.props.html }}></div>
			</HTMLContainer>
		)
	}

	override indicator(shape: IDangerousHtmlShape) {
		return <rect width={shape.props.w} height={shape.props.h} />
	}
}

// [3]

export default function ExternalContentSourcesExample() {
	const handleMount = useCallback((editor: Editor) => {
		// We will register a new handler for text content. When a user pastes `text/html` content into the editor,
		// we will create a new shape with that html content.
		// To test this copy some html content from VS Code or some other text editor.
		editor.registerExternalContentHandler('text', async (content) => {
			const htmlSource = content.sources?.find((s) => s.type === 'text' && s.subtype === 'html')

			if (htmlSource) {
				const center = content.point ?? editor.getViewportPageBounds().center

				editor.createShape({
					type: 'dangerous-html',
					x: center.x - 250,
					y: center.y - 150,
					props: {
						html: htmlSource.data,
					},
				})
			} else {
				// otherwise, we'll fall back to the default handler
				await defaultHandleExternalTextContent(editor, content)
			}
		})
	}, [])

	return (
		<div className="tldraw__editor">
			<Tldraw onMount={handleMount} shapeUtils={[DangerousHtmlExample]} />
		</div>
	)
}

/*
Introduction:
This example shows how to handle content pasted from external sources, this could be
embeds, files, svgs, text, images, or urls. In this case we will handle text/html content.

[1]
We want to render our html on the canvas, the best way to do that is to create a new shape util.
Here's where we define the type for our shape.

[2]
This is our shape util. It's a class that extends BaseBoxShapeUtil. For a more detailed
example of how to create a custom shape, see the custom config example.

[3]
We use the onMount prop to get access to the editor instance via
the handleMount callback (check out the API example for a more detailed look at this). Then we
call the registerExternalContentHandler method, we could choose to handle embeds, files, svgs,
text, images, or urls. For this example we will handle text/html content. The handler is called
with the point where the user pasted the content and an array of sources. We will find and
return the html source, then create a new shape with that html content.

*/
