import { MediaHelpers } from '@tldraw/utils'
import { getOwnerWindow, getRenderedChildren } from './domUtils'
import { resourceToDataUrl } from './fetchCache'

function copyAttrs(source: Element, target: Element) {
	const attrs = Array.from(source.attributes)
	attrs.forEach((attr) => {
		target.setAttribute(attr.name, attr.value)
	})
}

function replace(original: HTMLElement, replacement: HTMLElement) {
	original.replaceWith(replacement)
	return replacement
}

async function createImage(
	doc: Document,
	dataUrl: string | null,
	cloneAttributesFrom?: HTMLElement
) {
	const image = doc.createElement('img')

	if (cloneAttributesFrom) {
		copyAttrs(cloneAttributesFrom, image)
	}

	image.setAttribute('src', dataUrl ?? 'data:')
	image.setAttribute('decoding', 'sync')
	image.setAttribute('loading', 'eager')

	try {
		await image.decode()
	} catch {
		// this is fine
	}
	return image
}

async function getCanvasReplacement(canvas: HTMLCanvasElement) {
	const doc = canvas.ownerDocument
	try {
		const dataURL = canvas.toDataURL()
		return await createImage(doc, dataURL, canvas)
	} catch {
		return await createImage(doc, null, canvas)
	}
}

async function getVideoReplacement(video: HTMLVideoElement) {
	const doc = video.ownerDocument
	try {
		const dataUrl = await MediaHelpers.getVideoFrameAsDataUrl(video)
		return createImage(doc, dataUrl, video)
	} catch (err) {
		console.error('Could not get video frame', err)
	}

	if (video.poster) {
		const dataUrl = await resourceToDataUrl(video.poster)
		return createImage(doc, dataUrl, video)
	}

	return createImage(doc, null, video)
}

export async function embedMedia(node: HTMLElement) {
	const win = getOwnerWindow(node)
	if (node instanceof win.HTMLCanvasElement) {
		return replace(node, await getCanvasReplacement(node))
	} else if (node instanceof win.HTMLVideoElement) {
		return replace(node, await getVideoReplacement(node))
	} else if (node instanceof win.HTMLImageElement) {
		const src = node.currentSrc || node.src
		const dataUrl = await resourceToDataUrl(src)
		node.setAttribute('src', dataUrl ?? 'data:')
		node.setAttribute('decoding', 'sync')
		node.setAttribute('loading', 'eager')
		try {
			await (node as HTMLImageElement).decode()
		} catch {
			// this is fine
		}
		return node
	} else if (node instanceof win.HTMLInputElement) {
		node.setAttribute('value', (node as HTMLInputElement).value)
	} else if (node instanceof win.HTMLTextAreaElement) {
		node.textContent = (node as HTMLTextAreaElement).value
	}

	await Promise.all(
		Array.from(getRenderedChildren(node), (child) => embedMedia(child as HTMLElement))
	)
}
