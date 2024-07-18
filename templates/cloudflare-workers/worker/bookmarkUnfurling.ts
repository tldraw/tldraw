import { IRequest, error } from 'itty-router'

export async function handleUnfurlUrl(request: IRequest) {
	const url = request.query.url
	if (typeof url !== 'string' || !url.startsWith('http://') || !url.startsWith('https://')) {
		return error(400, 'Invalid URL')
	}

	// cloudflare has a built-in HTML parser/rewriter called HTMLRewriter. in order to use it, we
	// need to define classes that act as event handlers for certain elements, attributes, etc.
	// see https://developers.cloudflare.com/workers/runtime-apis/html-rewriter/
	const meta$ = new MetaExtractor()
	const title$ = new TextExtractor()
	const icon$ = new IconExtractor()

	try {
		await new HTMLRewriter()
			.on('meta', meta$)
			.on('title', title$)
			.on('link', icon$)
			.transform((await fetch(url)) as any)
			.blob()
	} catch {
		return null
	}

	// we don't know exactly what we'll end up with, so this is a best-effort extraction
	const { og, twitter } = meta$
	const title = og['og:title'] ?? twitter['twitter:title'] ?? title$.string ?? undefined
	const description =
		og['og:description'] ?? twitter['twitter:description'] ?? meta$.description ?? undefined
	let image = og['og:image:secure_url'] ?? og['og:image'] ?? twitter['twitter:image'] ?? undefined
	let favicon = icon$.appleIcon ?? icon$.icon ?? undefined

	if (image && !image?.startsWith('http')) {
		image = new URL(image, url).href
	}
	if (favicon && !favicon?.startsWith('http')) {
		favicon = new URL(favicon, url).href
	}

	return {
		title,
		description,
		image,
		favicon,
	}
}

class TextExtractor {
	string = ''
	text({ text }: any) {
		// An incoming piece of text
		this.string += text
	}
}

class MetaExtractor {
	og: { [key: string]: string | undefined } = {}
	twitter: { [key: string]: string | undefined } = {}
	description = null as string | null

	element(element: Element) {
		// An incoming element, such as `div`
		const property = element.getAttribute('property')
		const name = element.getAttribute('name')

		if (property && property.startsWith('og:')) {
			this.og[property] = element.getAttribute('content')!
		} else if (name && name.startsWith('twitter:')) {
			this.twitter[name] = element.getAttribute('content')!
		} else if (name === 'description') {
			this.description = element.getAttribute('content')
		}
	}
}

class IconExtractor {
	appleIcon = null as string | null
	icon = null as string | null
	element(element: Element) {
		if (element.getAttribute('rel') === 'icon') {
			this.icon = element.getAttribute('href')!
		} else if (element.getAttribute('rel') === 'apple-touch-icon') {
			this.appleIcon = element.getAttribute('href')!
		}
	}
}
