import { TldrawAppFileId, TldrawAppFileRecordType } from '@tldraw/dotcom-shared'
import { useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { useValue } from 'tldraw'
import { TlaEditor } from '../components/TlaEditor'
import { TlaErrorPage } from '../components/TlaErrorPage'
import { TlaWrapperLoggedOut } from '../components/TlaWrapperLoggedOut'
import { useApp } from '../hooks/useAppState'

export function Component() {
	const { fileSlug } = useParams<{ fileSlug: TldrawAppFileId }>()
	if (!fileSlug) throw Error('File id not found')

	const app = useApp()

	const file = useValue(
		'file',
		() => {
			return app.store.get(TldrawAppFileRecordType.createId(fileSlug))
		},
		[app, fileSlug]
	)

	useEffect(() => {
		let cancelled = false
		setTimeout(() => {
			if (cancelled) return
			const { auth } = app.getSessionState()
			if (!auth) return false
			app.onFileExit(auth.userId, TldrawAppFileRecordType.createId(fileSlug))
		}, 500)
		return () => {
			cancelled = true
		}
	}, [app, fileSlug])

	// todo: handle viewing permissions—is this file owned by the user, or is it part of a group that they belong to?

	if (!file) {
		// throw Error(`oops ${fileId}`)
		// navigate('/404')
		return <TlaErrorPage error="file-not-found" />
	}

	return (
		<TlaWrapperLoggedOut>
			<TlaEditor fileSlug={fileSlug} />
		</TlaWrapperLoggedOut>
	)
}
