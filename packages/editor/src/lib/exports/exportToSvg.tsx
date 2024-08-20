import { TLShapeId } from '@tldraw/tlschema'
import { assert } from '@tldraw/utils'
import { flushSync } from 'react-dom'
import { createRoot } from 'react-dom/client'
import { Editor } from '../editor/Editor'
import { TLSvgOptions } from '../editor/types/misc-types'
import { getSvgJsx } from './getSvgJsx'
import { replaceAndDecorate } from './html-to-image/cloneNode'

export async function exportToSvg(editor: Editor, shapeIds: TLShapeId[], opts: TLSvgOptions = {}) {
	const result = await getSvgJsx(editor, shapeIds, opts)
	if (!result) return undefined

	const container = editor.getContainer()
	container.querySelector('.tldraw-svg-export')?.remove()
	const renderTarget = document.createElement('div')
	renderTarget.className = 'tldraw-svg-export'
	Object.assign(renderTarget.style, {
		position: 'absolute',
		top: '0px',
		left: '0px',
		width: result.width + 'px',
		height: result.height + 'px',
		zIndex: '110000000',
		transform: `scale(${500 / result.width})`,
		transformOrigin: 'top left',
	})
	container.appendChild(renderTarget)

	const root = createRoot(renderTarget)
	flushSync(() => {
		root.render(result.jsx)
	})

	const svg = renderTarget.firstElementChild
	assert(svg instanceof SVGSVGElement, 'Expected an SVG element')
	await applyChangesToForeignObjects(svg)

	root.unmount()
	renderTarget.appendChild(svg)
	return { svg, width: result.width, height: result.height }
}

async function applyChangesToForeignObjects(svg: SVGSVGElement) {
	const foreignObjectChildren = svg.querySelectorAll('foreignObject.tl-shape-foreign-object > *')
	await Promise.all(
		Array.from(foreignObjectChildren, (child) => replaceAndDecorate(child as HTMLElement))
	)
}
