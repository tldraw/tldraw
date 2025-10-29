export function getLocalFiles(options?: {
	allowMultiple?: boolean
	mimeTypes?: string[] | readonly string[]
}) {
	return new Promise<File[]>((resolve) => {
		const { allowMultiple = true, mimeTypes = [] } = options || {}

		const input = document.createElement('input')
		input.type = 'file'
		input.accept = mimeTypes?.join(',')
		input.multiple = allowMultiple
		input.style.display = 'none'

		async function onchange(e: Event) {
			const fileList = (e.target as HTMLInputElement).files
			if (!fileList || fileList.length === 0) {
				resolve([])
				return
			}
			const files = Array.from(fileList)
			input.value = ''
			resolve(files)
			input.removeEventListener('change', onchange)
			input.remove()
		}

		document.body.appendChild(input)
		input.addEventListener('change', onchange)
		input?.click()
	})
}
