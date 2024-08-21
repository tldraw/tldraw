import { TLShapeId } from '@tldraw/tlschema'
import { assert } from '@tldraw/utils'
import { flushSync } from 'react-dom'
import { createRoot } from 'react-dom/client'
import { Editor } from '../editor/Editor'
import { TLSvgOptions } from '../editor/types/misc-types'
import { getSvgJsx } from './getSvgJsx'
import { decorateAndEmbed } from './html-to-image/decorateAndEmbed'
import { FontEmbedder } from './html-to-image/embedCss'

export async function exportToSvg(editor: Editor, shapeIds: TLShapeId[], opts: TLSvgOptions = {}) {
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
		zIndex: '110000000',
		pointerEvents: 'none',
		opacity: 0,
	})
	container.appendChild(renderTarget)
	const root = createRoot(renderTarget)

	try {
		flushSync(() => {
			root.render(result.jsx)
		})

		const svg = renderTarget.firstElementChild
		assert(svg instanceof SVGSVGElement, 'Expected an SVG element')
		await applyChangesToForeignObjects(svg)

		renderTarget.appendChild(svg)
		return { svg, width: result.width, height: result.height }
	} finally {
		root.unmount()
		container.removeChild(renderTarget)
	}
}

async function applyChangesToForeignObjects(svg: SVGSVGElement) {
	const foreignObjectChildren = svg.querySelectorAll('foreignObject.tl-shape-foreign-object > *')

	const fontEmbedder = new FontEmbedder()

	await Promise.all(
		Array.from(foreignObjectChildren, (child) =>
			decorateAndEmbed(child as HTMLElement, { onFoundUsedFont: fontEmbedder.onFoundUsedFont })
		)
	)

	const fontCss = await fontEmbedder.createCss()
	if (fontCss) {
		const style = document.createElementNS('http://www.w3.org/2000/svg', 'style')
		style.textContent = fontCss
		svg.prepend(style)
	}
}
