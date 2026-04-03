import { Editor } from '../../editor/Editor'

/** @public */
export function prepareCanvas(editor: Editor, canvas: HTMLCanvasElement, w: number, h: number) {
	const dpr = editor.getInstanceState().devicePixelRatio
	const zoom = editor.getCamera().z
	canvas.width = Math.ceil(w * zoom * dpr)
	canvas.height = Math.ceil(h * zoom * dpr)
	canvas.style.width = w + 'px'
	canvas.style.height = h + 'px'
	const ctx = canvas.getContext('2d')!
	ctx.scale(zoom * dpr, zoom * dpr)
	return { ctx, zoom, style: getComputedStyle(canvas) }
}

function getComputedStyle(element: Element) {
	return element.ownerDocument.defaultView!.getComputedStyle(element)
}
