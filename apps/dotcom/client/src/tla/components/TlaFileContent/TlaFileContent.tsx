import classNames from 'classnames'
import { useEffect } from 'react'
import { useValue } from 'tldraw'
import { useApp } from '../../hooks/useAppState'
import { TldrawApp } from '../../utils/TldrawApp'
import { TldrawAppFile } from '../../utils/schema/TldrawAppFile'
import { TlaEditor } from '../TlaEditor/TlaEditor'
import { TlaFileShareMenu } from '../TlaFileShareMenu/TlaFileShareMenu'
import { TlaSidebarToggle } from '../TlaSidebar/TlaSidebar'
import styles from './file.module.css'

export function TlaFileContent({ file }: { file: TldrawAppFile }) {
	const app = useApp()
	const isSidebarOpen = useValue('sidebar open', () => app.getSessionState().isSidebarOpen, [app])

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
		<>
			<div className={styles.header}>
				<TlaSidebarToggle />
				<div className={classNames(styles.headerFileInfo, 'tla-text_ui__section')}>
					<span className={styles.headerFolder}>My files / </span>
					<span className={styles.headerTitle}>{TldrawApp.getFileName(file)}</span>
				</div>
				<TlaFileShareMenu fileId={file.id} />
			</div>
			<div className={styles.editorWrapper} data-sidebar={isSidebarOpen}>
				<TlaEditor file={file} />
			</div>
		</>
	)
}
