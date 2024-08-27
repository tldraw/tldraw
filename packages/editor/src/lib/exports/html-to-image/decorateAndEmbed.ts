import { MediaHelpers } from '@tldraw/utils'
import { clonePseudoElements } from './clonePseudos'
import {
	embedCssValueUrlsIfNeeded,
	parseCssFontFamilyValue,
	shouldIncludeCssProperty,
} from './embedCss'
import { resourceToDataUrl } from './fetchCache'

interface ForeignObjectEmbedOpts {
	onFoundUsedFont(fontFamily: string): void
}

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

async function createImage(dataUrl: string | null, cloneAttributesFrom?: HTMLElement) {
	const image = document.createElement('img')

	if (cloneAttributesFrom) {
		copyAttrs(cloneAttributesFrom, image)
	}

	image.setAttribute('src', dataUrl ?? 'data:')
	image.setAttribute('decoding', 'sync')
	image.setAttribute('loading', 'eager')

	try {
		await image.decode()
	} catch (err: any) {
		// this is fine
	}
	return image
}

async function getCanvasReplacement(canvas: HTMLCanvasElement) {
	try {
		const dataURL = canvas.toDataURL()
		return await createImage(dataURL, canvas)
	} catch {
		return await createImage(null, canvas)
	}
}

async function getVideoReplacement(video: HTMLVideoElement) {
	try {
		const dataUrl = await MediaHelpers.getVideoFrameAsDataUrl(video)
		return createImage(dataUrl, video)
	} catch (err) {
		console.error('Could not get video frame', err)
	}

	if (video.poster) {
		const dataUrl = await resourceToDataUrl(video.poster)
		return createImage(dataUrl, video)
	}

	return createImage(null, video)
}

async function replaceNodeAndEmbedContentIfNeeded(node: HTMLElement) {
	if (node instanceof HTMLCanvasElement) {
		return replace(node, await getCanvasReplacement(node))
	} else if (node instanceof HTMLVideoElement) {
		return replace(node, await getVideoReplacement(node))
	} else if (node instanceof HTMLImageElement) {
		const src = node.currentSrc || node.src
		const dataUrl = await resourceToDataUrl(src)
		node.setAttribute('src', dataUrl ?? 'data:')
		node.setAttribute('decoding', 'sync')
		node.setAttribute('loading', 'eager')
		try {
			await node.decode()
		} catch (err: any) {
			// this is fine
		}
		return node
	}

	// no support for iframes
	return node
}

function applyInputValue(node: HTMLElement) {
	if (node instanceof HTMLInputElement) {
		node.setAttribute('value', node.value)
	} else if (node instanceof HTMLTextAreaElement) {
		node.textContent = node.value
	}
}

async function applyCss(node: HTMLElement, opts: ForeignObjectEmbedOpts) {
	const source = window.getComputedStyle(node)
	const target = node.style

	if (!target) return
	for (const property of source) {
		if (!shouldIncludeCssProperty(property)) continue
		let value = source.getPropertyValue(property)

		const replaced = embedCssValueUrlsIfNeeded(value)
		if (replaced) value = await replaced

		target.setProperty(property, value, source.getPropertyPriority(property))
	}

	if (node.style.fontFamily) {
		const parsed = parseCssFontFamilyValue(node.style.fontFamily)
		for (const font of parsed) {
			opts.onFoundUsedFont(font)
		}
	}

	if (node.style.fontKerning === 'auto') {
		node.style.fontKerning = 'normal'
	}

	await clonePseudoElements(node)
}

export async function decorateAndEmbed(node: HTMLElement, opts: ForeignObjectEmbedOpts) {
	node = await replaceNodeAndEmbedContentIfNeeded(node)
	await Promise.all(
		Array.from(node.children, (child) => decorateAndEmbed(child as HTMLElement, opts))
	)
	applyInputValue(node)
	await applyCss(node, opts)
}
