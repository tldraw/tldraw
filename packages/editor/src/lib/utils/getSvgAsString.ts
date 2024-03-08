/** @public */
export async function getSvgAsString(svg: SVGElement) {
	const clone = svg.cloneNode(true) as SVGGraphicsElement

	svg.setAttribute('width', +svg.getAttribute('width')! + '')
	svg.setAttribute('height', +svg.getAttribute('height')! + '')

	const fileReader = new FileReader()
	const imgs = Array.from(clone.querySelectorAll('image')) as SVGImageElement[]

	for (const img of imgs) {
		const src = img.getAttribute('xlink:href')
		if (src) {
			if (!src.startsWith('data:')) {
				const blob = await (await fetch(src)).blob()
				const base64 = await new Promise<string>((resolve, reject) => {
					fileReader.onload = () => resolve(fileReader.result as string)
					fileReader.onerror = () => reject(fileReader.error)
					fileReader.readAsDataURL(blob)
				})
				img.setAttribute('xlink:href', base64)
			}
		}
	}

	const out = new XMLSerializer()
		.serializeToString(clone)
		.replaceAll('&#10;      ', '')
		.replaceAll(/((\s|")[0-9]*\.[0-9]{2})([0-9]*)(\b|"|\))/g, '$1')

	return out
}
