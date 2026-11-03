import { useEffect, useRef } from 'react'
import { sanitizeSvg } from 'tldraw'

// SPIKE: an SVG thumbnail is drawn inline so its colour variables follow the page's theme. An
// <img> would draw it as a separate document that can't see them (it still shows the colours it was
// saved with: each variable falls back to them).
//
// A thumbnail is stored content that other people in a workspace open, and anyone can store any
// bytes by calling the API directly, so nothing about how our client saved it can be trusted:
// - the host's sanitiser (tldraw's sanitizeSvg by default) cleans it;
// - prepareThumbnailSvg then refuses anything that could still run script, whichever sanitiser
//   the host passed, so a weak one fails closed;
// - it's drawn in a shadow root, so a <style> inside it can't restyle the app and its ids can't
//   collide with the page's. The colour variables still reach it: custom properties inherit
//   through shadow boundaries.

const MAX_THUMBNAIL_LENGTH = 1_000_000

const SHADOW_CSS = `
:host { display: block; width: 100%; height: 100%; pointer-events: none; }
svg, img { display: block; width: 100%; height: 100%; object-fit: contain; }
`

const FORBIDDEN_ELEMENTS = new Set([
	'script',
	'iframe',
	'frame',
	'frameset',
	'object',
	'embed',
	'base',
	'meta',
	'link',
	'form',
	'portal',
])

// Control characters and whitespace that browsers drop inside a URL scheme, so `java\tscript:`
// still runs.
const IGNORED_IN_SCHEME = /[\s\p{Cc}\p{Cf}]/gu
const SCRIPT_SCHEME = /(?:java|vb)script:|data:text\/html/i

// What an image in a thumbnail may load once its asset is resolved. An <image> never runs script,
// but a resolved URL comes from item content, which is as untrusted as the thumbnail.
const SAFE_IMAGE_URL =
	/^(?:https?:|blob:|data:image\/(?:png|jpe?g|gif|webp|avif|svg\+xml)[;,]|\/(?!\/))/i

const textCache = new Map<string, Promise<string | null>>()

function loadSvgText(url: string): Promise<string | null> {
	let promise = textCache.get(url)
	if (!promise) {
		promise = fetch(url)
			.then(async (res) => {
				if (!res.ok || !res.headers.get('content-type')?.includes('image/svg+xml')) return null
				const text = await res.text()
				return text.length > MAX_THUMBNAIL_LENGTH ? null : text
			})
			.catch(() => null)
		textCache.set(url, promise)
	}
	return promise
}

/**
 * Sanitises stored SVG markup and returns its root, or null when it should not be drawn inline.
 * @internal
 */
export function prepareThumbnailSvg(
	markup: string,
	sanitize: (svg: string) => string
): SVGSVGElement | null {
	if (markup.length > MAX_THUMBNAIL_LENGTH) return null
	let clean: string
	try {
		clean = sanitize(markup)
	} catch {
		return null
	}
	if (!clean) return null
	const doc = new DOMParser().parseFromString(clean, 'image/svg+xml')
	const svg = doc.documentElement
	if (
		doc.querySelector('parsererror') ||
		svg.namespaceURI !== 'http://www.w3.org/2000/svg' ||
		svg.localName !== 'svg' ||
		!isInert(svg)
	) {
		return null
	}
	svg.removeAttribute('width')
	svg.removeAttribute('height')
	return svg as unknown as SVGSVGElement
}

function isInert(root: Element) {
	for (const el of [root, ...root.querySelectorAll('*')]) {
		if (FORBIDDEN_ELEMENTS.has(el.localName.toLowerCase())) return false
		for (const attr of el.attributes) {
			if (attr.name.toLowerCase().startsWith('on')) return false
			if (SCRIPT_SCHEME.test(attr.value.replace(IGNORED_IN_SCHEME, ''))) return false
		}
	}
	return true
}

/**
 * An image a thumbnail points at rather than carries: an asset in the item's content (or one of its
 * fields, such as a bookmark's `image`), or the icon for an embed type.
 * @public
 */
export interface ThumbnailImageRef {
	assetId?: string
	field?: string
	embedIcon?: string
}

function resolveImages(
	svg: Element,
	resolveImage: ((ref: ThumbnailImageRef) => Promise<string | null>) | undefined,
	isCancelled: () => boolean
) {
	if (!resolveImage) return
	for (const image of svg.querySelectorAll('image[data-tl-asset-id], image[data-tl-embed-icon]')) {
		resolveImage({
			assetId: image.getAttribute('data-tl-asset-id') ?? undefined,
			field: image.getAttribute('data-tl-asset-field') ?? undefined,
			embedIcon: image.getAttribute('data-tl-embed-icon') ?? undefined,
		})
			.then((src) => {
				if (!isCancelled() && src && SAFE_IMAGE_URL.test(src)) image.setAttribute('href', src)
			})
			.catch(() => {})
	}
}

export function ThumbnailImage({
	url,
	sanitize = sanitizeSvg,
	resolveImage,
}: {
	url: string
	sanitize?(svg: string): string
	/** Gives the URL for an image the thumbnail points at. */
	resolveImage?(ref: ThumbnailImageRef): Promise<string | null>
}) {
	const hostRef = useRef<HTMLSpanElement>(null)
	// Read at load time rather than as an effect dependency: callers pass a new function each render.
	const resolveImageRef = useRef(resolveImage)
	resolveImageRef.current = resolveImage

	useEffect(() => {
		const host = hostRef.current
		if (!host) return
		const root = host.shadowRoot ?? host.attachShadow({ mode: 'open' })
		const style = document.createElement('style')
		style.textContent = SHADOW_CSS
		root.replaceChildren(style)

		let cancelled = false
		loadSvgText(url).then((markup) => {
			if (cancelled) return
			const svg = markup && prepareThumbnailSvg(markup, sanitize)
			if (svg) {
				const node = document.importNode(svg, true)
				root.append(node)
				resolveImages(node, resolveImageRef.current, () => cancelled)
			} else {
				// Not an SVG, or one we won't draw inline. An <img> never runs script or loads
				// anything else, so it's safe for any stored bytes; it just can't follow the theme.
				const img = document.createElement('img')
				img.src = url
				img.alt = ''
				img.draggable = false
				root.append(img)
			}
		})
		return () => {
			cancelled = true
		}
	}, [url, sanitize])

	return <span ref={hostRef} className="tlui-collections-tile__image" aria-hidden />
}
