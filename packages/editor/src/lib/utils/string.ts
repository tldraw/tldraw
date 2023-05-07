/** @public */
export function defaultEmptyAs(str: string, dflt: string) {
	if (str.match(/^\s*$/)) {
		return dflt
	}
	return str
}

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

/** @public */
export async function dataTransferItemAsString(item: DataTransferItem) {
	return new Promise<string>((resolve) => {
		item.getAsString((text) => {
			resolve(text)
		})
	})
}

/** @public */
export function correctSpacesToNbsp(input: string) {
	return input.replace(/\s/g, '\xa0')
}
