import classNames from 'classnames'
import { useCallback, useEffect } from 'react'
import { TldrawUiInput, useValue } from 'tldraw'
import { useApp } from '../../hooks/useAppState'
import { useEnvironment } from '../../providers/TlaEnvironmentProvider'
import { TldrawAppFile } from '../../utils/schema/TldrawAppFile'
import { TlaEditor } from '../TlaEditor/TlaEditor'
import { TlaFileMenu } from '../TlaFileMenu/TlaFileMenu'
import { TlaFileShareMenu } from '../TlaFileShareMenu/TlaFileShareMenu'
import { TlaIcon } from '../TlaIcon/TlaIcon'
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

	const handleNameValueChange = useCallback(
		(value: string) => {
			app.store.update(file.id, (file) => {
				return {
					...file,
					name: value ?? '',
				}
			})
		},
		[app, file.id]
	)

	const environment = useEnvironment()

	// todo: handle viewing permissions—is this file owned by the user, or is it part of a group that they belong to?

	return (
		<div className={styles.content}>
			<div className={styles.header}>
				<TlaSidebarToggle />
				<TlaSidebarToggleMobile />
				<div className={classNames(styles.headerFileInfo, 'tla-text_ui__section')}>
					<span className={styles.headerFolder}>My files / </span>
					{/* <button className={styles.headerTitle} onClick={handleNameClick}>
						{TldrawApp.getFileName(file)}
					</button> */}
					<div className={styles.inputWrapper}>
						<TldrawUiInput
							className={styles.nameInput}
							value={file.name}
							onValueChange={handleNameValueChange}
							isIos={environment.isIos}
							requestAnimationFrame={requestAnimationFrame}
						/>
						<div className={styles.nameWidthSetter}>{file.name}</div>
					</div>
					<TlaFileMenu fileId={file.id} source="file-header">
						<button className={styles.linkMenu}>
							<TlaIcon icon="dots-vertical-strong" />
						</button>
					</TlaFileMenu>
				</div>
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
