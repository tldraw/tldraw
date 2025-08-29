import { getLicenseKey } from '@tldraw/dotcom-shared'
import { useEffect, useLayoutEffect } from 'react'
import {
	BaseBoxShapeUtil,
	TLArrowShape,
	TLBaseShape,
	TLGeoShape,
	Tldraw,
	createShapeId,
	exportAs,
	getArrowInfo,
	toRichText,
	useActions,
	useEditor,
	useUniqueSafeId,
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
	const id = useUniqueSafeId()

	useLayoutEffect(() => {
		const style = document.createElement('style')
		// tests can use #self in their CSS to refer uniquely to this shape so we can test how well
		// CSS in <head> is applied to the shape when exporting.
		style.textContent = shape.props.css.replace(/#self/g, `#${id}`)
		document.head.appendChild(style)
		return () => {
			document.head.removeChild(style)
		}
	}, [shape.props.css, id])

	return <div id={id} dangerouslySetInnerHTML={{ __html: shape.props.html }} />
}

export default function EndToEnd() {
	// Use test license key if available, otherwise use the default
	// Check if __TLDRAW_LICENSE_KEY__ was explicitly set (including null/undefined/empty string)
	const testLicenseKey = (window as any).__TLDRAW_LICENSE_KEY__
	const hasExplicitTestKey = Object.prototype.hasOwnProperty.call(window, '__TLDRAW_LICENSE_KEY__')
	const licenseKey = hasExplicitTestKey ? testLicenseKey : getLicenseKey()

	useLayoutEffect(() => {
		if (customElements.get('custom-element')) return

		const template = document.createElement('template')
		template.innerHTML = `
			<style>
				article {
					margin: 1em;
					display: flex;
					flex-direction: column;
					gap: 1em;
				}
				.list {
					background-color: lightskyblue;
					padding: 1em;
				}
				.choice {
					background-color: lightgreen;
					padding: 1em;
				}
			</style>
			<article>
				<div class="list">
					list: <slot name="list"></slot>
				</div>
				<div class="choice">
					choice: <slot name="choice"></slot>
				</div>
			</article>
		`
		customElements.define(
			'custom-element',
			class extends HTMLElement {
				constructor() {
					super()
					const templateContent = template.content
					const shadowRoot = this.attachShadow({ mode: 'open' })
					shadowRoot.appendChild(templateContent.cloneNode(true))
				}
			}
		)
	}, [])

	return (
		<div className="tldraw__editor">
			<Tldraw
				licenseKey={licenseKey}
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
				exportAs(editor, editor.selectAll().getSelectedShapeIds(), { format, name: 'test' }),
			createShapeId: () => createShapeId(),
			toRichText: (text: string) => toRichText(text),
			markAllArrowBindings: () => {
				const markRadius = 3
				for (const shape of editor.getCurrentPageShapes()) {
					if (!editor.isShapeOfType<TLArrowShape>(shape, 'arrow')) continue

					const info = getArrowInfo(editor, shape)
					if (!info) continue

					const transform = editor.getShapePageTransform(shape.id)

					if (info.bindings.start) {
						const pagePoint = transform.applyToPoint(info.start.handle)
						editor.createShape<TLGeoShape>({
							type: 'geo',
							x: pagePoint.x - markRadius,
							y: pagePoint.y - markRadius,
							props: {
								geo: 'ellipse',
								w: markRadius * 2,
								h: markRadius * 2,
								color: 'light-blue',
								fill: 'none',
								dash: 'solid',
								size: 's',
							},
						})
					}

					if (info.bindings.end) {
						const pagePoint = transform.applyToPoint(info.end.handle)
						editor.createShape<TLGeoShape>({
							type: 'geo',
							x: pagePoint.x - markRadius,
							y: pagePoint.y - markRadius,
							props: {
								geo: 'ellipse',
								w: markRadius * 2,
								h: markRadius * 2,
								color: 'light-blue',
								fill: 'none',
								dash: 'solid',
								size: 's',
							},
						})
					}
				}
			},
		}
		;(window as any).tldrawApi = api
	}, [actions, editor])

	return null
}
