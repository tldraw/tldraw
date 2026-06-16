import { BaseBoxShapeUtil, HTMLContainer, RecordProps, SvgExportContext, T, TLShape } from 'tldraw'

// Letter page at 96dpi, with one-inch margins.
export const DOCUMENT_PAGE_TYPE = 'document-page'
export const PAGE_WIDTH = 816
export const MIN_PAGE_HEIGHT = 1056

declare module 'tldraw' {
	export interface TLGlobalShapePropsMap {
		[DOCUMENT_PAGE_TYPE]: { w: number; h: number; html: string }
	}
}

export type DocumentPageShape = TLShape<typeof DOCUMENT_PAGE_TYPE>

// [1]
export class DocumentPageShapeUtil extends BaseBoxShapeUtil<DocumentPageShape> {
	static override type = DOCUMENT_PAGE_TYPE
	static override props: RecordProps<DocumentPageShape> = {
		w: T.number,
		h: T.number,
		html: T.string,
	}

	getDefaultProps(): DocumentPageShape['props'] {
		return { w: PAGE_WIDTH, h: MIN_PAGE_HEIGHT, html: '' }
	}

	override canResize() {
		return false
	}

	// [2]
	component(shape: DocumentPageShape) {
		return (
			<HTMLContainer className="DocEditor-page">
				<div
					className="DocEditor-page-content"
					dangerouslySetInnerHTML={{ __html: shape.props.html }}
				/>
			</HTMLContainer>
		)
	}

	getIndicatorPath(shape: DocumentPageShape) {
		const path = new Path2D()
		path.rect(0, 0, shape.props.w, shape.props.h)
		return path
	}

	// [3]
	override toSvg(shape: DocumentPageShape, _ctx: SvgExportContext) {
		return (
			<foreignObject
				width={shape.props.w}
				height={shape.props.h}
				className="tl-export-embed-styles"
			>
				<div className="DocEditor-page">
					<div
						className="DocEditor-page-content"
						dangerouslySetInnerHTML={{ __html: shape.props.html }}
					/>
				</div>
			</foreignObject>
		)
	}
}

/*
This is the background "page" for the document editor. It renders the HTML that we
got from the uploaded .docx file, and the user draws their annotations on top of it.

[1]
The shape is a box shape sized to a letter page. The picker measures the rendered
HTML and sets the height, so the page is as tall as the document content.

[2]
The shape's component renders the document HTML. The page is created locked, and the
CSS sets `pointer-events: none` on the content so that drawing and other tools work on
top of it instead of selecting text.

[3]
`toSvg` is what makes the document show up in exports. Without it, a shape that renders
HTML exports as an empty box. We render the same HTML into a `<foreignObject>` and add
the `tl-export-embed-styles` class, which tells tldraw's export pipeline to inline the
page's styles and images so the SVG/PNG is self-contained.
*/
