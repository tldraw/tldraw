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
} from 'tldraw'
import 'tldraw/tldraw.css'
import { EndToEndApi } from './EndToEndApi'
;(window as any).__tldraw_ui_event = { id: 'NOTHING_YET' }
;(window as any).__tldraw_editor_events = []

type HtmlShape = TLBaseShape<'html', { html: string; css: string; w: number; h: number }>
class HtmlShapeUtil extends BaseBoxShapeUtil<HtmlShape> {
	override getDefaultProps() {
		return { html: '', css: '', w: 100, h: 100 }
	}
	override component(shape: HtmlShape) {
		return <HtmlShapeRenderer shape={shape} />
	}
	override indicator(shape: HtmlShape) {
		return <rect x={0} y={0} width={shape.props.w} height={shape.props.h} />
	}
}

function HtmlShapeRenderer({ shape }: { shape: HtmlShape }) {
	useLayoutEffect(() => {
		const style = document.createElement('style')
		style.innerHTML = shape.props.css
		document.head.appendChild(style)
		return () => {
			document.head.removeChild(style)
		}
	}, [shape.props.css])

	return <div dangerouslySetInnerHTML={{ __html: shape.props.html }} />
}

export default function EndToEnd() {
	return (
		<div className="tldraw__editor">
			<Tldraw
				licenseKey={getLicenseKey()}
				shapeUtils={[HtmlShapeUtil]}
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
