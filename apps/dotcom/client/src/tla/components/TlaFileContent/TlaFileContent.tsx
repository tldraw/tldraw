import { TldrawAppFileId, TldrawAppFileRecordType } from '@tldraw/dotcom-shared'
import classNames from 'classnames'
import { useCallback, useEffect, useState } from 'react'
import { TldrawUiInput, useValue } from 'tldraw'
import { useApp } from '../../hooks/useAppState'
import { TldrawApp } from '../../utils/TldrawApp'
import { TlaButton } from '../TlaButton/TlaButton'
import { TlaEditor } from '../TlaEditor/TlaEditor'
import { TlaFileMenu } from '../TlaFileMenu/TlaFileMenu'
import { TlaFileShareMenu } from '../TlaFileShareMenu/TlaFileShareMenu'
import { TlaIcon } from '../TlaIcon/TlaIcon'
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
				<div className={classNames(styles.headerFileInfo, 'tla-text_ui__section')}>
					<span className={styles.headerFolder}>My files / </span>
					<TlaFileNameEditor fileId={file.id} fileName={TldrawApp.getFileName(file)} />
					<TlaFileMenu fileId={file.id} source="file-header">
						<button className={styles.linkMenu}>
							<TlaIcon icon="dots-vertical-strong" />
						</button>
					</TlaFileMenu>
				</div>
				<TlaSidebarToggle />
				<TlaSidebarToggleMobile />
				<TlaFileShareMenu fileId={file.id} source="file-header">
					<TlaButton>
						<span>Share</span>
					</TlaButton>
				</TlaFileShareMenu>
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

function TlaFileNameEditor({ fileId, fileName }: { fileName: string; fileId: TldrawAppFileId }) {
	const app = useApp()

	const [temporaryFileName, setTemporaryFileName] = useState(fileName)

	const handleNameValueChange = useCallback(
		(value: string) => {
			app.store.update(fileId, (file) => {
				return {
					...file,
					name: value,
				}
			})
			setTemporaryFileName(TldrawApp.getFileName(app.store.get(fileId)!))
		},
		[app, fileId]
	)

	const handleCancel = useCallback(() => {
		setTemporaryFileName(TldrawApp.getFileName(app.store.get(fileId)!))
	}, [app, fileId])

	return (
		<div className={styles.inputWrapper}>
			<TldrawUiInput
				className={styles.nameInput}
				value={temporaryFileName.replace(/ /g, '\u00a0')}
				onValueChange={setTemporaryFileName}
				onCancel={handleCancel}
				onBlur={handleNameValueChange}
				autoSelect
			/>
			<div className={styles.nameWidthSetter}>{temporaryFileName.replace(/ /g, '\u00a0')}</div>
		</div>
	)
}
