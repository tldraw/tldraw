/** @public */
export async function blobAsString(blob: Blob) {
	return new Promise<string>((resolve, reject) => {
		const reader = new FileReader()
		reader.addEventListener('loadend', () => {
			const text = reader.result
			resolve(text as string)
		})
		reader.addEventListener('error', () => {
			reject(reader.error)
		})
		reader.readAsText(blob)
	})
}
