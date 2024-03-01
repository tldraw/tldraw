export async function getDataURIFromURL(url: string): Promise<string> {
	const response = await fetch(url)
	const blob = await response.blob()
	return new Promise((resolve, reject) => {
		const reader = new FileReader()
		reader.onloadend = () => resolve(reader.result as string)
		reader.onerror = reject
		reader.readAsDataURL(blob)
	})
}

export function getSvgFromString(htmlString: string) {
	const parser = new DOMParser()
	const doc = parser.parseFromString(htmlString, 'image/svg+xml').documentElement
	return doc
}
