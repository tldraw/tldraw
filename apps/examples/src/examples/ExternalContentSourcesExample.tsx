import { BaseBoxShapeUtil, Editor, HTMLContainer, TLBaseShape, Tldraw } from '@tldraw/tldraw'
import '@tldraw/tldraw/tldraw.css'
import { useCallback } from 'react'

export type IDangerousHtmlShape = TLBaseShape<
	'html',
	{
		w: number
		h: number
		html: string
	}
>

class DangerousHtmlExample extends BaseBoxShapeUtil<IDangerousHtmlShape> {
	static override type = 'html' as const

	override getDefaultProps() {
		return {
			type: 'html',
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

export default function ExternalContentSourcesExample() {
	const handleMount = useCallback((editor: Editor) => {
		// When a user uploads a file, create an asset from it
		editor.registerExternalContentHandler('text', async ({ point, sources }) => {
			const htmlSource = sources?.find((s) => s.type === 'text' && s.subtype === 'html')

			if (htmlSource) {
				const center = point ?? editor.viewportPageCenter

				editor.createShape({
					type: 'html',
					x: center.x - 250,
					y: center.y - 150,
					props: {
						html: htmlSource.data,
					},
				})
			}
		})
	}, [])

	return (
		<div className="tldraw__editor">
			<Tldraw autoFocus onMount={handleMount} shapeUtils={[DangerousHtmlExample]} />
		</div>
	)
}
