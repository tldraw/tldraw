import { TldrawAppFileId, TldrawAppFileRecordType } from '@tldraw/dotcom-shared'
import classNames from 'classnames'
import { useCallback, useEffect, useState } from 'react'
import { TldrawUiInput, useValue } from 'tldraw'
import { useApp } from '../../hooks/useAppState'
import { useRaw } from '../../hooks/useRaw'
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
			<div className={styles.header}>
				<div className={classNames(styles.headerFileInfo, 'tla-text_ui__section')}>
					<span className={styles.headerFolder}>{raw('My files /')}</span>
					{/* TODO(david): fix this when adding support for shared files */}
					<TlaFileNameEditor
						fileId={fileId}
						fileName={app.getFileName(fileId) ?? 'SHARED_FILE_TODO'}
					/>
					<TlaFileMenu fileId={fileId} source="file-header">
						<button className={styles.linkMenu}>
							<TlaIcon icon="dots-vertical-strong" />
						</button>
					</TlaFileMenu>
				</div>
				<TlaSidebarToggle />
				<TlaSidebarToggleMobile />
				<div className={styles.rightSide}>
					<TlaFileShareMenu fileId={fileId} source="file-header">
						<TlaButton>
							<span>{raw('Share')}</span>
						</TlaButton>
					</TlaFileShareMenu>
				</div>
			</div>
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

function TlaFileNameEditor({ fileId, fileName }: { fileName: string; fileId: TldrawAppFileId }) {
	const [isEditing, setIsEditing] = useState(false)

	const handleEditingStart = useCallback(() => {
		setIsEditing(true)
	}, [])

	const handleEditingEnd = useCallback(() => {
		setIsEditing(false)
	}, [])

	return (
		<div className={styles.inputWrapper}>
			{isEditing ? (
				<>
					<TlaFileNameEditorInput fileId={fileId} fileName={fileName} onBlur={handleEditingEnd} />
					<div className={styles.nameWidthSetter}>{fileName.replace(/ /g, '\u00a0')}</div>
				</>
			) : (
				<button className={styles.nameWidthSetter} onClick={handleEditingStart}>
					{fileName.replace(/ /g, '\u00a0')}
				</button>
			)}
		</div>
	)
}

function TlaFileNameEditorInput({
	fileId,
	fileName,
	onBlur,
}: {
	fileName: string
	fileId: TldrawAppFileId
	onBlur(): void
}) {
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
			onBlur()
		},
		[app, fileId, onBlur]
	)

	const handleCancel = useCallback(() => {
		setTemporaryFileName(TldrawApp.getFileName(app.store.get(fileId)!))
		onBlur()
	}, [app, fileId, onBlur])

	return (
		<TldrawUiInput
			className={styles.nameInput}
			value={temporaryFileName.replace(/ /g, '\u00a0')}
			onValueChange={setTemporaryFileName}
			onCancel={handleCancel}
			onBlur={handleNameValueChange}
			autoSelect
			autoFocus
		/>
	)
}
