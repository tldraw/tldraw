import { useCallback } from 'react'
import { useToasts } from 'tldraw'
import { defineMessages, useMsg } from '../tla/utils/i18n'

/**
 * The extension used by tldraw offline. Unlike a `.tldr` file, which is JSON, a `.tldraw` file is
 * an archive containing a SQLite database and its assets, so none of our `.tldr` handling can read
 * one.
 */
export const TLDRAW_OFFLINE_FILE_EXTENSION = '.tldraw'

const messages = defineMessages({
	title: { defaultMessage: 'Can’t open .tldraw files yet' },
	description: {
		defaultMessage: 'We’re still working on support for files from tldraw offline.',
	},
})

export function isTldrawOfflineFile(file: File) {
	return file.name.endsWith(TLDRAW_OFFLINE_FILE_EXTENSION)
}

/**
 * Returns a function that tells the user we can't open tldraw offline files yet, and reports back
 * whether any of the given files were ones we had to turn away. Callers should leave those files
 * out of whatever they do next, so the user doesn't also get a generic "file type not allowed"
 * toast on top of this one.
 */
export function useNotifyTldrawOfflineFiles() {
	const { addToast } = useToasts()
	const title = useMsg(messages.title)
	const description = useMsg(messages.description)

	return useCallback(
		(files: File[]) => {
			if (!files.some(isTldrawOfflineFile)) return false
			addToast({
				id: 'tldraw-offline-file-unsupported',
				title,
				description,
				severity: 'info',
			})
			return true
		},
		[addToast, title, description]
	)
}
