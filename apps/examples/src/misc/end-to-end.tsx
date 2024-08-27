import { getLicenseKey } from '@tldraw/dotcom-shared'
import { useEffect, useLayoutEffect } from 'react'
import {
	BaseBoxShapeUtil,
	TLBaseShape,
	Tldraw,
	createShapeId,
	exportAs,
	useActions,
	useEditor,
	useSafeId,
} from 'tldraw'
import 'tldraw/tldraw.css'
import { EndToEndApi } from './EndToEndApi'
;(window as any).__tldraw_ui_event = { id: 'NOTHING_YET' }
;(window as any).__tldraw_editor_events = []

type HtmlCssShape = TLBaseShape<'html', { html: string; css: string; w: number; h: number }>
class HtmlCssShapeUtil extends BaseBoxShapeUtil<HtmlCssShape> {
	static override type = 'html'

	override getDefaultProps(): { html: string; css: string; w: number; h: number } {
		return { w: 100, h: 100, html: '', css: '' }
	}
	override component(shape: HtmlCssShape) {
		return <HtmlCssShapeComponent shape={shape} />
	}
	override indicator(shape: HtmlCssShape) {
		return <rect width={shape.props.w} height={shape.props.h} />
	}
}
function HtmlCssShapeComponent({ shape }: { shape: HtmlCssShape }) {
	// eslint-disable-next-line local/no-at-internal
	const id = useSafeId()

	useLayoutEffect(() => {
		const style = document.createElement('style')
		style.textContent = shape.props.css.replace(/#self/g, `#${id}`)
		document.head.appendChild(style)
		return () => {
			document.head.removeChild(style)
		}
	}, [shape.props.css, id])

	return <div id={id} dangerouslySetInnerHTML={{ __html: shape.props.html }} />
}

export default function EndToEnd() {
	return (
		<div className="tldraw__editor">
			<Tldraw
				licenseKey={getLicenseKey()}
				onMount={(editor) => {
					;(window as any).app = editor
					;(window as any).editor = editor

					editor.on('event', (info) => {
						;(window as any).__tldraw_editor_events.push(info)
					})
				}}
				onUiEvent={(name, data) => {
					;(window as any).__tldraw_ui_event = { name, data }
				}}
				shapeUtils={[HtmlCssShapeUtil]}
			>
				<SneakyExportButton />
			</Tldraw>
		</div>
	)
}

function SneakyExportButton() {
	const editor = useEditor()
	const actions = useActions()

	useEffect(() => {
		const api: EndToEndApi = {
			exportAsSvg: () => actions['export-as-svg'].onSelect('unknown'),
			exportAsFormat: (format) =>
				exportAs(editor, editor.selectAll().getSelectedShapeIds(), format, 'test'),
			createShapeId: () => createShapeId(),
		}
		;(window as any).tldrawApi = api
	}, [actions, editor])

	return null
}
