import { useCallback } from 'react'
import { useToasts } from 'tldraw'
import { defineMessages, useMsg } from './i18n'

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

/**
 * Returns a function that drops any tldraw offline files from a list and tells the user why,
 * handing back the files we can actually handle. Filtering them out here keeps them away from the
 * default file handling, which would otherwise stack a generic "file type not allowed" toast on
 * top of this one.
 */
export function useRejectTldrawOfflineFiles() {
	const { addToast } = useToasts()
	const title = useMsg(messages.title)
	const description = useMsg(messages.description)

	return useCallback(
		(files: File[]) => {
			// Case-insensitive: file dialogs on macOS and Windows match their filters that way, so a
			// `.TLDRAW` file is selectable and has to be caught here too.
			const supported = files.filter(
				(file) => !file.name.toLowerCase().endsWith(TLDRAW_OFFLINE_FILE_EXTENSION)
			)
			if (supported.length < files.length) {
				addToast({
					id: 'tldraw-offline-file-unsupported',
					title,
					description,
					severity: 'warning',
				})
			}
			return supported
		},
		[addToast, title, description]
	)
}
