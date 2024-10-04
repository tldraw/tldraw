import { useAuth } from '@clerk/clerk-react'
import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { getFromLocalStorage, setInLocalStorage, uniqueId } from 'tldraw'
import { TlaEditor } from '../components/TlaEditor/TlaEditor'
import { TlaAnonLayout } from '../layouts/TlaAnonLayout/TlaAnonLayout'
import { TEMPORARY_FILE_KEY } from '../utils/temporary-files'

export function Component() {
	const [fileSlug] = useState(() => {
		return getFromLocalStorage(TEMPORARY_FILE_KEY) ?? uniqueId()
	})

	const auth = useAuth()
	if (auth.isSignedIn) {
		return <Navigate to="/q" />
	}

	return (
		<TlaAnonLayout>
			<TlaEditor
				temporary
				key={fileSlug}
				fileSlug={fileSlug}
				onDocumentChange={() => {
					// Save the file slug to local storage if they actually make changes
					setInLocalStorage(TEMPORARY_FILE_KEY, fileSlug)
				}}
			/>
		</TlaAnonLayout>
	)
}
