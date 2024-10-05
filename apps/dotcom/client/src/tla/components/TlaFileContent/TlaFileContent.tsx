import { TldrawAppFileRecordType } from '@tldraw/dotcom-shared'
import { useEffect } from 'react'
import { useValue } from 'tldraw'
import { useApp } from '../../hooks/useAppState'
import { useRaw } from '../../hooks/useRaw'
import { TlaEditor } from '../TlaEditor/TlaEditor'
import styles from './file.module.css'

export function TlaFileContent({ fileSlug }: { fileSlug: string }) {
	const app = useApp()
	const raw = useRaw()
	const isSidebarOpen = useValue('sidebar open', () => app.getSessionState().isSidebarOpen, [app])
	const isSidebarOpenMobile = useValue(
		'mobile sidebar open',
		() => app.getSessionState().isSidebarOpenMobile,
		[app]
	)

	const fileId = TldrawAppFileRecordType.createId(fileSlug)

	useEffect(() => {
		let cancelled = false
		setTimeout(() => {
			if (cancelled) return
			const { auth } = app.getSessionState()
			if (!auth) throw Error('expected auth')
			app.onFileExit(auth.userId, fileId)
		}, 500)
		return () => {
			cancelled = true
		}
	}, [app, fileId])

	// todo: handle viewing permissions—is this file owned by the user, or is it part of a group that they belong to?

	return (
		<div className={styles.content}>
			<div
				className={styles.editorWrapper}
				data-sidebar={isSidebarOpen}
				data-sidebarmobile={isSidebarOpenMobile}
			>
				<TlaEditor fileSlug={fileSlug} />
			</div>
		</div>
	)
}
