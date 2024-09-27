import { SignInButton, SignedIn, SignedOut, UserButton } from '@clerk/clerk-react'
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

	const isSidebarOpen = useValue('sidebar open', () => app.getSessionState().isSidebarOpen, [app])

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
					<div className="tla-file-header__share">
						<SignedOut>
							{/* @ts-ignore this is fine */}
							<SignInButton className="tla-button tla-button__secondary tla-text_ui__regular" />
						</SignedOut>
						<SignedIn>
							<UserButton />
						</SignedIn>
						<TlaButton>Share</TlaButton>
					</div>
				</div>
				<div className={`tla-file__wrapper ${isSidebarOpen ? `tla-file__wrapper-sidebar` : ''}`}>
					<TlaEditor file={file} />
				</div>
			</div>
		</TlaWrapperWithSidebar>
	)
}
