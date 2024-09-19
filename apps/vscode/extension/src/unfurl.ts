import { load } from 'cheerio'

export async function unfurl(url: string) {
	// Let's see if this URL was an image to begin with.
	if (url.match(/\.(a?png|jpe?g|gif|svg|webp|avif)$/i)) {
		return {
			title: undefined,
			description: undefined,
			image: url,
			favicon: undefined,
		}
	}

	const response = await fetch(url)
	if (response.status >= 400) {
		throw new Error(`Error fetching url: ${response.status}`)
	}
	const contentType = response.headers.get('content-type')
	if (!contentType?.includes('text/html')) {
		throw new Error(`Content-type not right: ${contentType}`)
	}
	if (contentType?.startsWith('image/')) {
		return {
			title: undefined,
			description: undefined,
			image: url,
			favicon: undefined,
		}
	}

	const content = await response.text()
	const $ = load(content)

	const og: { [key: string]: string | undefined } = {}
	const twitter: { [key: string]: string | undefined } = {}

	$('meta[property^=og:]').each((_, el) => {
		og[$(el).attr('property')!] = $(el).attr('content')
	})
	$('meta[name^=twitter:]').each((_, el) => {
		twitter[$(el).attr('name')!] = $(el).attr('content')
	})

	const title = og['og:title'] ?? twitter['twitter:title'] ?? $('title').text() ?? undefined
	const description =
		og['og:description'] ??
		twitter['twitter:description'] ??
		$('meta[name="description"]').attr('content') ??
		undefined
	let image = og['og:image:secure_url'] ?? og['og:image'] ?? twitter['twitter:image'] ?? undefined
	let favicon =
		$('link[rel="apple-touch-icon"]').attr('href') ??
		$('link[rel="icon"]').attr('href') ??
		undefined

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
