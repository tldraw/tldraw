import { useEffect, useState } from 'react'

// SPIKE: an SVG thumbnail is drawn inline so its colour variables follow the page's theme. An
// <img> would draw it as a separate document that can't see them.

const svgCache = new Map<string, Promise<string | null>>()

function loadInlineSvg(url: string): Promise<string | null> {
	let promise = svgCache.get(url)
	if (!promise) {
		promise = fetch(url)
			.then(async (res) => {
				if (!res.ok || !res.headers.get('content-type')?.includes('image/svg+xml')) return null
				return sanitizeSvg(await res.text())
			})
			.catch(() => null)
		svgCache.set(url, promise)
	}
	return promise
}

// SPIKE: not a real sanitiser. Before shipping this needs DOMPurify or similar: thumbnails are
// user content going into the page.
function sanitizeSvg(markup: string): string | null {
	const doc = new DOMParser().parseFromString(markup, 'image/svg+xml')
	const svg = doc.documentElement
	if (svg.nodeName !== 'svg' || doc.querySelector('parsererror')) return null
	for (const el of [...svg.querySelectorAll('script, iframe, object, embed')]) el.remove()
	for (const el of [svg, ...svg.querySelectorAll('*')]) {
		for (const attr of [...el.attributes]) {
			const name = attr.name.toLowerCase()
			const value = attr.value.trim().toLowerCase()
			if (name.startsWith('on')) el.removeAttribute(attr.name)
			else if (
				(name === 'href' || name === 'xlink:href' || name === 'src') &&
				!value.startsWith('#') &&
				!value.startsWith('data:image/')
			) {
				el.removeAttribute(attr.name)
			}
		}
	}
	svg.removeAttribute('width')
	svg.removeAttribute('height')
	return svg.outerHTML
}

export function ThumbnailImage({ url }: { url: string }) {
	const [svg, setSvg] = useState<string | null | undefined>(undefined)

	useEffect(() => {
		let cancelled = false
		setSvg(undefined)
		loadInlineSvg(url).then((result) => {
			if (!cancelled) setSvg(result)
		})
		return () => {
			cancelled = true
		}
	}, [url])

	if (svg === undefined) return null
	if (svg === null) return <img src={url} alt="" draggable={false} />
	return (
		<span
			className="tlui-collections-tile__svg"
			aria-hidden
			// Sanitised above.
			dangerouslySetInnerHTML={{ __html: svg }}
		/>
	)
}
