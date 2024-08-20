import { clonePseudoElements } from './clonePseudos'
import { resourceToDataUrl } from './dataurl'

function copyAttrs(source: Element, target: Element) {
	const attrs = Array.from(source.attributes)
	attrs.forEach((attr) => {
		target.setAttribute(attr.name, attr.value)
	})
}

function getCanvasReplacement(canvas: HTMLCanvasElement) {
	const dataURL = canvas.toDataURL()
	if (dataURL === 'data:,') {
		return canvas.cloneNode(false) as HTMLCanvasElement
	}
	const image = document.createElement('img')
	copyAttrs(canvas, image)
	image.src = dataURL
	return image
}

function replace(original: HTMLElement, replacement: HTMLElement) {
	original.replaceWith(replacement)
	return replacement
}

async function getVideoReplacement(video: HTMLVideoElement) {
	if (video.currentSrc) {
		const canvas = document.createElement('canvas')
		const ctx = canvas.getContext('2d')
		canvas.width = video.clientWidth
		canvas.height = video.clientHeight
		ctx?.drawImage(video, 0, 0, canvas.width, canvas.height)
		const dataURL = canvas.toDataURL()
		const image = document.createElement('img')
		copyAttrs(video, image)
		image.src = dataURL
		return image
	}

	if (video.poster) {
		const image = document.createElement('img')
		copyAttrs(video, image)
		image.src = await resourceToDataUrl(video.poster)
		return image
	}

	return video
}

async function replaceNodeIfNeeded(node: HTMLElement) {
	if (node instanceof HTMLCanvasElement) {
		return replace(node, getCanvasReplacement(node))
	} else if (node instanceof HTMLVideoElement) {
		return replace(node, await getVideoReplacement(node))
	}

	// no support for iframes
	return node
}

async function replaceChildrenIfNeeded(node: HTMLElement) {
	await Promise.all(Array.from(node.children, (child) => replaceAndDecorate(child as HTMLElement)))
}

function applyInputValue(node: HTMLElement) {
	if (node instanceof HTMLInputElement) {
		node.setAttribute('value', node.value)
	} else if (node instanceof HTMLTextAreaElement) {
		node.textContent = node.value
	}
}

function applyCss(node: HTMLElement) {
	const source = window.getComputedStyle(node)
	const target = node.style

	if (!target) return
	for (const property of source) {
		target.setProperty(
			property,
			source.getPropertyValue(property),
			source.getPropertyPriority(property)
		)
	}

	if (node.style.fontKerning === 'auto') {
		node.style.fontKerning = 'normal'
	}

	clonePseudoElements(node)
}

export async function replaceAndDecorate(node: HTMLElement) {
	node = await replaceNodeIfNeeded(node)
	await replaceChildrenIfNeeded(node)
	applyInputValue(node)
	applyCss(node)
}
