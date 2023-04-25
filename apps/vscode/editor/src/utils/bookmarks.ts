import { rpc } from './rpc'

async function onCreateBookmarkFromUrlFallback(
	url: string
): Promise<{ image: string; title: string; description: string }> {
	const meta = {
		image: '',
		title: '',
		description: '',
	}

	try {
		const resp = await fetch(url, { method: 'GET', mode: 'no-cors' })
		const html = await resp.text()
		const doc = new DOMParser().parseFromString(html, 'text/html')

		meta.image = doc.head
			.querySelector('meta[property="og:image"]')
			?.getAttribute('content') as string
		meta.title = doc.head
			.querySelector('meta[property="og:title"]')
			?.getAttribute('content') as string
		meta.description = doc.head
			.querySelector('meta[property="og:description"]')
			?.getAttribute('content') as string

		return meta
	} catch (error) {
		console.error(error)
	}

	return meta
}

export async function onCreateBookmarkFromUrl(url: string) {
	try {
		const data = await rpc('vscode:bookmark', { url })

		return {
			title: data.title || '',
			description: data.description || '',
			image: data.image || '',
		}
	} catch (error) {
		return onCreateBookmarkFromUrlFallback(url)
	}
}
