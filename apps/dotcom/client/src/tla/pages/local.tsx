import { useState } from 'react'
import { getFromLocalStorage, setInLocalStorage, uniqueId } from 'tldraw'
import { TlaEditor } from '../components/TlaEditor'
import { TlaWrapperLoggedOut } from '../components/TlaWrapperLoggedOut'
import { TEMPORARY_FILE_KEY } from '../utils/temporary-files'

export function Component() {
	// Try to load a temporary file; or otherwise create one
	const [fileSlug] = useState(() => {
		return getFromLocalStorage(TEMPORARY_FILE_KEY) ?? uniqueId()
	})

	return (
		<TlaWrapperLoggedOut>
			<TlaEditor
				key={fileSlug}
				fileSlug={fileSlug}
				onDocumentChange={() => {
					// Save the file slug to local storage if they actually make changes
					setInLocalStorage(TEMPORARY_FILE_KEY, fileSlug)
				}}
			/>
		</TlaWrapperLoggedOut>
	)
}
