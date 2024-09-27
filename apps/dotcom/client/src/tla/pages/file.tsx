import { TldrawAppFileId, TldrawAppFileRecordType } from '@tldraw/dotcom-shared'
import { useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { useValue } from 'tldraw'
import { TlaButton } from '../components/TlaButton'
import { TlaEditor } from '../components/TlaEditor'
import { TlaErrorPage } from '../components/TlaErrorPage'
import { TlaSidebarToggle } from '../components/TlaSidebarToggle'
import { TlaWrapperWithSidebar } from '../components/TlaWrapperWithSidebar'
import { useApp } from '../hooks/useAppState'
import { TldrawApp } from '../utils/TldrawApp'

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

	const isSidebarOpen = useValue('sidebar open', () => app.getSessionState().isSidebarOpen, [app])

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
		return <TlaErrorPage error="file-not-found" />
	}

	return (
		<TlaWrapperWithSidebar collapsable>
			<div className="tla-content tla-file__content">
				<div className="tla-file-header">
					<TlaSidebarToggle />
					<div className="tla-file-header__fileinfo tla-text_ui__section">
						<span className="tla-file-header__folder">My files / </span>
						<span className="tla-file-header__title">{TldrawApp.getFileName(file)}</span>
					</div>
					<TlaButton>Share</TlaButton>
				</div>
				<div className={`tla-file__wrapper ${isSidebarOpen ? `tla-file__wrapper-sidebar` : ''}`}>
					<TlaEditor fileSlug={fileSlug} />
				</div>
			</div>
		</TlaWrapperWithSidebar>
	)
}
