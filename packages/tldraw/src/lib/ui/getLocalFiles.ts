import { getGlobalDocument } from '@tldraw/editor'

export function getLocalFiles(options?: {
	allowMultiple?: boolean
	mimeTypes?: string[] | readonly string[]
	document?: Document
}) {
	return new Promise<File[]>((resolve) => {
		const {
			allowMultiple = true,
			mimeTypes = [],
			document: doc = getGlobalDocument(),
		} = options || {}

		const input = doc.createElement('input')
		input.type = 'file'
		input.accept = mimeTypes?.join(',')
		input.multiple = allowMultiple
		input.style.display = 'none'

		function dispose() {
			input.removeEventListener('change', onchange)
			input.removeEventListener('cancel', oncancel)
			input.remove()
		}

		async function onchange(e: Event) {
			const fileList = (e.target as HTMLInputElement).files
			if (!fileList || fileList.length === 0) {
				resolve([])
				dispose()
				return
			}
			const files = Array.from(fileList)
			input.value = ''
			resolve(files)
			dispose()
		}

		function oncancel() {
			resolve([])
			dispose()
		}

		doc.body.appendChild(input)
		input.addEventListener('cancel', oncancel)
		input.addEventListener('change', onchange)
		input?.click()
	})
}
