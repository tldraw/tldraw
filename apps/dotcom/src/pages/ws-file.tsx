import { useEffect } from 'react'
import { useParams } from 'react-router-dom'
import '../../styles/globals.css'
import { TlaEditor } from '../components-tla/TlaEditor'
import { useAppApi, useAppState } from '../hooks/useAppState'
import { TldrawAppFileId, createTlaId } from '../utils/tla/db'

export function Component() {
	const { fileId } = useParams<{ fileId: TldrawAppFileId }>()
	if (!fileId) throw Error('File id not found')

	const { db, session } = useAppState()
	if (!session) throw Error('Session not found')

	const { getFile, logVisit } = useAppApi()

	const file = getFile(db, createTlaId('file', fileId))
	if (!file) throw Error('File not found')

	useEffect(() => {
		logVisit(db, session.userId, file.workspaceId, file.id)
	}, [db, logVisit, session.userId, file.workspaceId, file.id])

	// todo: handle viewing permissions—is this file owned by the user, or is it part of a group that they belong to?

	return (
		<div className="tla_content">
			<TlaEditor key={file.id} file={file} />
		</div>
	)
}
