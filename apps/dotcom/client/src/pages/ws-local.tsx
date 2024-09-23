import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getFromLocalStorage, setInLocalStorage, uniqueId } from 'tldraw'
import '../../styles/globals.css'
import { TlaLoggedOutWrapper } from '../components-tla/TlaLoggedOutWrapper'
import { TlaSpinner } from '../components-tla/TlaSpinner'
import { useApp } from '../hooks/useAppState'
import { TldrawAppFileRecordType } from '../utils/tla/schema/TldrawAppFile'
import { TldrawAppWorkspaceRecordType } from '../utils/tla/schema/TldrawAppWorkspace'
import { TEMPORARY_FILE_KEY } from '../utils/tla/temporary-files'

export function Component() {
	const app = useApp()
	const navigate = useNavigate()

	useEffect(() => {
		let temporaryFileId = getFromLocalStorage(TEMPORARY_FILE_KEY)
		if (!temporaryFileId) {
			temporaryFileId = uniqueId()
			setInLocalStorage(TEMPORARY_FILE_KEY, temporaryFileId)
		}

		if (!temporaryFileId) throw Error('Temporary file id not found')

		const fileId = TldrawAppFileRecordType.createId(temporaryFileId)

		const file = app.store.get(fileId)

		if (!file) {
			app.createFile('temporary', TldrawAppWorkspaceRecordType.createId('0'), fileId)
		}

		navigate(`/t/${temporaryFileId}`)
	}, [app, navigate])

	return (
		<TlaLoggedOutWrapper>
			<div className="tla-local-wrapper">
				<TlaSpinner />
			</div>
		</TlaLoggedOutWrapper>
	)
}
