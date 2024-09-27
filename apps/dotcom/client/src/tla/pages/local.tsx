import { useEffect, useState } from 'react'
import { getFromLocalStorage, setInLocalStorage, uniqueId, useValue } from 'tldraw'
import { TlaEditor } from '../components/TlaEditor'
import { useApp } from '../hooks/useAppState'
import { TlaWrapperLoggedOut } from '../layouts/TlaLoggedOut.tsx/TlaWrapperLoggedOut'
import { TldrawAppFileId, TldrawAppFileRecordType } from '../utils/schema/TldrawAppFile'
import { TEMPORARY_FILE_KEY } from '../utils/temporary-files'

export function Component() {
	const app = useApp()
	const [fileId, setFileId] = useState<TldrawAppFileId | null>(null)

	useEffect(() => {
		// Try to load a temporary file; or otherwise create one
		let temporaryFileId = getFromLocalStorage(TEMPORARY_FILE_KEY)

		if (!temporaryFileId) {
			temporaryFileId = uniqueId()
			setInLocalStorage(TEMPORARY_FILE_KEY, temporaryFileId)
		}

		const fileId = TldrawAppFileRecordType.createId(temporaryFileId)

		const file = app.store.get(fileId)

		if (!file) {
			app.createFile('temporary', fileId)
		}

		setFileId(fileId)
	}, [app])

	const file = useValue(
		'file',
		() => {
			if (!fileId) return null
			return app.store.get(fileId)
		},
		[app, fileId]
	)

	return <TlaWrapperLoggedOut>{file && <TlaEditor file={file} />}</TlaWrapperLoggedOut>
}
