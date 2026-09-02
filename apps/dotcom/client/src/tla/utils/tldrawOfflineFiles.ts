import { useCallback } from 'react'
import { useDialogs } from 'tldraw'
import { TlaTldrawOfflineFileDialog } from '../components/dialogs/TlaTldrawOfflineFileDialog'

/**
 * The extension used by tldraw offline. Unlike a `.tldr` file, which is JSON, a `.tldraw` file is
 * an archive containing a SQLite database and its assets, so none of our `.tldr` handling can read
 * one.
 */
export const TLDRAW_OFFLINE_FILE_EXTENSION = '.tldraw'

/**
 * Returns a function that drops any tldraw offline files from a list and tells the user why,
 * handing back the files we can actually handle. Filtering them out here keeps them away from the
 * default file handling, which would otherwise stack a generic "file type not allowed" toast on
 * top of the dialog.
 */
export function useRejectTldrawOfflineFiles() {
	const { addDialog } = useDialogs()

	return useCallback(
		(files: File[]) => {
			// Case-insensitive: file dialogs on macOS and Windows match their filters that way, so a
			// `.TLDRAW` file is selectable and has to be caught here too.
			const supported = files.filter(
				(file) => !file.name.toLowerCase().endsWith(TLDRAW_OFFLINE_FILE_EXTENSION)
			)
			if (supported.length < files.length) {
				addDialog({
					id: 'tldraw-offline-file-unsupported',
					component: TlaTldrawOfflineFileDialog,
				})
			}
			return supported
		},
		[addDialog]
	)
}
