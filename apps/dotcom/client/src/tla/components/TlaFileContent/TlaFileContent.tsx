import { SignInButton, SignedIn, SignedOut, UserButton } from '@clerk/clerk-react'
import classNames from 'classnames'
import { useEffect } from 'react'
import { useValue } from 'tldraw'
import { useApp } from '../../hooks/useAppState'
import { TldrawApp } from '../../utils/TldrawApp'
import { TldrawAppFile } from '../../utils/schema/TldrawAppFile'
import { TlaEditor } from '../TlaEditor/TlaEditor'
import { TlaFileShareMenu } from '../TlaFileShareMenu/TlaFileShareMenu'
import { TlaSidebarToggle, TlaSidebarToggleMobile } from '../TlaSidebar/TlaSidebar'
import styles from './file.module.css'

export function TlaFileContent({ file }: { file: TldrawAppFile }) {
	const app = useApp()
	const isSidebarOpen = useValue('sidebar open', () => app.getSessionState().isSidebarOpen, [app])
	const isSidebarOpenMobile = useValue(
		'mobile sidebar open',
		() => app.getSessionState().isSidebarOpenMobile,
		[app]
	)

	useEffect(() => {
		let cancelled = false
		setTimeout(() => {
			if (cancelled) return
			const { auth } = app.getSessionState()
			if (!auth) throw Error('expected auth')
			app.onFileExit(auth.userId, file.id)
		}, 500)
		return () => {
			cancelled = true
		}
	}, [app, file.id])

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
				<SignedOut>
					{/* @ts-ignore this is fine */}
					<SignInButton className="tla-button tla-button__secondary tla-text_ui__regular" />
				</SignedOut>
				<SignedIn>
					<UserButton />
				</SignedIn>
				<TlaFileShareMenu fileId={file.id} />
			</div>
			<div
				className={styles.editorWrapper}
				data-sidebar={isSidebarOpen}
				data-sidebarmobile={isSidebarOpenMobile}
			>
				<TlaEditor file={file} />
			</div>
		</div>
	)
}
