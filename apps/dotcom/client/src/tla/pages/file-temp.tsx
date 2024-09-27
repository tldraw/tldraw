import { useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { useValue } from 'tldraw'
import { TlaEditor } from '../components/TlaEditor'
import { TlaErrorPage } from '../components/TlaErrorPage'
import { useApp } from '../hooks/useAppState'
import { TlaWrapperLoggedOut } from '../layouts/TlaLoggedOut.tsx/TlaWrapperLoggedOut'
import { TldrawAppFileId, TldrawAppFileRecordType } from '../utils/schema/TldrawAppFile'

export function Component() {
	const { fileId } = useParams<{ fileId: TldrawAppFileId }>()
	if (!fileId) throw Error('File id not found')

	const app = useApp()

	const file = useValue(
		'file',
		() => {
			return app.store.get(TldrawAppFileRecordType.createId(fileId))
		},
		[app, fileId]
	)

	useEffect(() => {
		let cancelled = false
		setTimeout(() => {
			if (cancelled) return
			const { auth } = app.getSessionState()
			if (!auth) return false
			app.onFileExit(auth.userId, TldrawAppFileRecordType.createId(fileId))
		}, 500)
		return () => {
			cancelled = true
		}
	}, [app, fileId])

	// todo: handle viewing permissions—is this file owned by the user, or is it part of a group that they belong to?

	if (!file) {
		// throw Error(`oops ${fileId}`)
		// navigate('/404')
		return <TlaErrorPage error="file-not-found" />
	}

	return (
		<TlaWrapperLoggedOut>
			<TlaEditor file={file} />
		</TlaWrapperLoggedOut>
	)
}
