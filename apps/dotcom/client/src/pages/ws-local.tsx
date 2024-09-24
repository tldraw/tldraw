import { useEffect, useState } from 'react'
import { getFromLocalStorage, setInLocalStorage, uniqueId, useValue } from 'tldraw'
import '../../styles/globals.css'
import { TlaEditor } from '../components-tla/TlaEditor'
import { TlaLoggedOutWrapper } from '../components-tla/TlaLoggedOutWrapper'
import { useApp } from '../hooks/useAppState'
import { TldrawAppFileId, TldrawAppFileRecordType } from '../utils/tla/schema/TldrawAppFile'
import { TldrawAppWorkspaceRecordType } from '../utils/tla/schema/TldrawAppWorkspace'
import { TEMPORARY_FILE_KEY } from '../utils/tla/temporary-files'

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
			app.createFile('temporary', TldrawAppWorkspaceRecordType.createId('0'), fileId)
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

	return <TlaLoggedOutWrapper>{file && <TlaEditor file={file} />}</TlaLoggedOutWrapper>
}
