import { useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { useValue } from 'tldraw'
import '../../styles/globals.css'
import { TlaEditor } from '../components-tla/TlaEditor'
import { useApp } from '../hooks/useAppState'
import { TldrawAppFileId, TldrawAppFileRecordType } from '../utils/tla/schema/TldrawAppFile'

export function Component() {
	const { fileId } = useParams<{ fileId: TldrawAppFileId }>()
	if (!fileId) throw Error('File id not found')

	const app = useApp()
	const file = useValue(
		'file',
		() => {
			const session = app.getSession()
			if (!session) return
			return app.store.get(TldrawAppFileRecordType.createId(fileId))
		},
		[app, fileId]
	)
	if (!file) throw Error('File not found')

	useEffect(() => {
		let cancelled = false
		setTimeout(() => {
			if (cancelled) return
			const session = app.getSession()
			if (!session) return
			app.logVisit(session.userId, session.workspaceId, TldrawAppFileRecordType.createId(fileId))
		}, 500)
		return () => {
			cancelled = true
		}
	}, [app, fileId])

	// todo: handle viewing permissions—is this file owned by the user, or is it part of a group that they belong to?

	return (
		<div className="tla_content">
			<TlaEditor key={'file_' + file.id} file={file} />
		</div>
	)
}
