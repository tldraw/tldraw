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

declare module 'tldraw' {
	export interface TLGlobalShapePropsMap {
		[DANGEROUS_HTML_TYPE]: { w: number; h: number; html: string }
	}
}

// There's a guide at the bottom of this page!

// [1]
type DangerousHtmlShape = TLShape<typeof DANGEROUS_HTML_TYPE>

// [2]
class DangerousHtmlShapeUtil extends BaseBoxShapeUtil<DangerousHtmlShape> {
	static override type = DANGEROUS_HTML_TYPE

	override getDefaultProps() {
		return {
			w: 500,
			h: 300,
			html: '<div>hello</div>',
		}
	}

	override component(shape: DangerousHtmlShape) {
		return (
			<HTMLContainer style={{ overflow: 'auto' }}>
				<div dangerouslySetInnerHTML={{ __html: shape.props.html }}></div>
			</HTMLContainer>
		)
	}

	override getIndicatorPath(shape: DangerousHtmlShape) {
		const path = new Path2D()
		path.rect(0, 0, shape.props.w, shape.props.h)
		return path
	}
}

const shapeUtils = [DangerousHtmlShapeUtil]

export default function ExternalContentSourcesExample() {
	const handleMount = useCallback((editor: Editor) => {
		// [3]
		editor.registerExternalContentHandler('text', async (content) => {
			// [4]
			const htmlSource = content.sources?.find((s) => s.type === 'text' && s.subtype === 'html')

			if (htmlSource) {
				const center = content.point ?? editor.getViewportPageBounds().center

				editor.createShape({
					type: DANGEROUS_HTML_TYPE,
					x: center.x - 250,
					y: center.y - 150,
					props: {
						html: htmlSource.data,
					},
				})
			} else {
				await defaultHandleExternalTextContent(editor, content)
			}
		})
	}, [])

	return (
		<div className="tldraw__editor">
			<Tldraw onMount={handleMount} shapeUtils={shapeUtils} />
		</div>
	)
}

/*
When content arrives from outside the editor (paste, drop, or `putExternalContent`), it's
classified as text, files, url, svg-text, embed, or tldraw content and routed to the handler
registered for that type. This example replaces the text handler so that pasted `text/html`
becomes a shape that renders the HTML directly.

[1]
The shape type. Its `html` prop holds the raw pasted markup.

[2]
A minimal box shape that renders its `html` with `dangerouslySetInnerHTML`. It's called
"dangerous" for a reason: never do this with HTML you don't trust. See the custom shape
examples for a fuller shape util.

[3]
`registerExternalContentHandler('text', ...)` replaces the built-in text handler for this
editor. The other content types (`files`, `url`, `svg-text`, `embed`, `tldraw`) can be
overridden the same way.

[4]
Pasted text arrives with a `sources` array, one entry per clipboard flavor. Rich text
editors and code editors usually put both `text/plain` and `text/html` on the clipboard.
When there's an HTML source we create our shape at the paste point (or the viewport center
for keyboard paste); otherwise we defer to `defaultHandleExternalTextContent`, which
creates a normal text shape.
*/
