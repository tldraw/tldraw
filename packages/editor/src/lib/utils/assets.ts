/** @public */
export function dataUrlToFile(url: string, filename: string, mimeType: string) {
	return fetch(url)
		.then(function (res) {
			return res.arrayBuffer()
		})
		.then(function (buf) {
			return new File([buf], filename, { type: mimeType })
		})
}
