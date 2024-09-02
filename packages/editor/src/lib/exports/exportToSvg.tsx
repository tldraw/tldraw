import { TLShapeId } from '@tldraw/tlschema'
import { assert } from '@tldraw/utils'
import { flushSync } from 'react-dom'
import { createRoot } from 'react-dom/client'
import { Editor } from '../editor/Editor'
import { TLImageExportOptions } from '../editor/types/misc-types'
import { StyleEmbedder } from './StyleEmbedder'
import { embedMedia } from './embedMedia'
import { getSvgJsx } from './getSvgJsx'

export async function exportToSvg(
	editor: Editor,
	shapeIds: TLShapeId[],
	opts: TLImageExportOptions = {}
) {
	const result = await getSvgJsx(editor, shapeIds, opts)
	if (!result) return undefined

	const container = editor.getContainer()
	const renderTarget = document.createElement('div')
	renderTarget.className = 'tldraw-svg-export'
	renderTarget.inert = true
	renderTarget.tabIndex = -1
	Object.assign(renderTarget.style, {
		position: 'absolute',
		top: '0px',
		left: '0px',
		width: result.width + 'px',
		height: result.height + 'px',
		pointerEvents: 'none',
		opacity: 0,
	})
	container.appendChild(renderTarget)
	const root = createRoot(renderTarget)
	try {
		flushSync(() => {
			root.render(result.jsx)
		})

		await result.exportDelay.resolve()

		const svg = renderTarget.firstElementChild
		assert(svg instanceof SVGSVGElement, 'Expected an SVG element')
		await applyChangesToForeignObjects(svg)

		return { svg, width: result.width, height: result.height }
	} finally {
		// eslint-disable-next-line no-restricted-globals
		setTimeout(() => {
			// we wait for a cycle of the event loop to allow the svg to be cloned etc. before
			// unmounting
			root.unmount()
			container.removeChild(renderTarget)
		}, 0)
	}
}

async function applyChangesToForeignObjects(svg: SVGSVGElement) {
	const foreignObjectChildren = [
		...svg.querySelectorAll('foreignObject.tl-shape-foreign-object > *'),
	]
	if (!foreignObjectChildren.length) return

	const styleEmbedder = new StyleEmbedder(svg)

	await Promise.all(foreignObjectChildren.map((el) => embedMedia(el as HTMLElement)))
	for (const el of foreignObjectChildren) {
		styleEmbedder.readRoot(el as HTMLElement)
	}

	await styleEmbedder.fetchResources()
	const css = await styleEmbedder.embedStyles()

	if (css) {
		const style = document.createElementNS('http://www.w3.org/2000/svg', 'style')
		style.textContent = css
		svg.prepend(style)
	}
}
