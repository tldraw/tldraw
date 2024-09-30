import { SignInButton, SignedIn, SignedOut, UserButton } from '@clerk/clerk-react'
import { TldrawAppFileRecordType } from '@tldraw/dotcom-shared'
import classNames from 'classnames'
import { useEffect } from 'react'
import { useValue } from 'tldraw'
import { useApp } from '../../hooks/useAppState'
import { TldrawApp } from '../../utils/TldrawApp'
import { TlaButton } from '../TlaButton/TlaButton'
import { TlaEditor } from '../TlaEditor/TlaEditor'
import { TlaFileShareMenu } from '../TlaFileShareMenu/TlaFileShareMenu'
import { TlaSidebarToggle, TlaSidebarToggleMobile } from '../TlaSidebar/TlaSidebar'
import styles from './file.module.css'

export function TlaFileContent({ fileSlug }: { fileSlug: string }) {
	const app = useApp()
	const isSidebarOpen = useValue('sidebar open', () => app.getSessionState().isSidebarOpen, [app])
	const isSidebarOpenMobile = useValue(
		'mobile sidebar open',
		() => app.getSessionState().isSidebarOpenMobile,
		[app]
	)

	const fileId = TldrawAppFileRecordType.createId(fileSlug)

	const file = useValue(
		'file',
		() => {
			return app.store.get(TldrawAppFileRecordType.createId(fileSlug))
		},
		[app, fileSlug]
	)

	if (!file) throw Error('expected a file')

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
			<div className={styles.header}>
				<TlaSidebarToggle />
				<TlaSidebarToggleMobile />
				<div className={classNames(styles.headerFileInfo, 'tla-text_ui__section')}>
					<span className={styles.headerFolder}>My files / </span>
					<span className={styles.headerTitle}>{TldrawApp.getFileName(file)}</span>
				</div>
				<div className={styles.rightSide}>
					<SignedOut>
						<SignInButton>
							<TlaButton>Sign in</TlaButton>
						</SignInButton>
					</SignedOut>
					<SignedIn>
						<UserButton />
					</SignedIn>
					<TlaFileShareMenu fileId={fileId} />
				</div>
			</div>
			<div
				className={styles.editorWrapper}
				data-sidebar={isSidebarOpen}
				data-sidebarmobile={isSidebarOpenMobile}
			>
				<TlaEditor fileSlug={fileId} />
			</div>
		</div>
	)
}
