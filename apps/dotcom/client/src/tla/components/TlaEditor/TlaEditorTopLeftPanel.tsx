import { TldrawAppFileId, TldrawAppFileRecordType } from '@tldraw/dotcom-shared'
import classNames from 'classnames'
import { useCallback, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { DefaultPageMenu, TldrawUiInput, useValue } from 'tldraw'
import { useApp } from '../../hooks/useAppState'
import { useRaw } from '../../hooks/useRaw'
import { TlaButton } from '../TlaButton/TlaButton'
import { TlaFileMenu } from '../TlaFileMenu/TlaFileMenu'
import { TlaFileShareMenu } from '../TlaFileShareMenu/TlaFileShareMenu'
import { TlaIcon } from '../TlaIcon/TlaIcon'
import { TlaSidebarToggle, TlaSidebarToggleMobile } from '../TlaSidebar/TlaSidebar'
import styles from './top.module.css'

export function TlaEditorTopPanel({ fileId }: { fileId: TldrawAppFileId }) {
	const app = useApp()
	const raw = useRaw()

	return (
		<div className={styles.topPanel}>
			<div className={styles.header}>
				<div className={classNames(styles.headerFileInfo, 'tla-text_ui__section')}>
					<span className={styles.headerFolder}>{raw('My files /')}</span>
					{/* TODO(david): fix this when adding support for shared files */}
					<TlaFileNameEditor
						fileName={app.getFileName(fileId) ?? 'SHARED_FILE_TODO'}
						onChange={() => void null}
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
		</div>
	)
}

function TlaFileNameEditor({
	fileName,
	onChange,
}: {
	fileName: string
	onChange(name: string): void
}) {
	const [isEditing, setIsEditing] = useState(false)

	const handleEditingStart = useCallback(() => {
		setIsEditing(true)
	}, [])

	const handleEditingEnd = useCallback(() => {
		setIsEditing(false)
	}, [])

	const handleEditingComplete = useCallback(
		(name: string) => {
			setIsEditing(false)
			onChange(name)
		},
		[onChange]
	)

	return (
		<div className={styles.inputWrapper}>
			{isEditing ? (
				<TlaFileNameEditorInput
					fileName={fileName}
					onComplete={handleEditingComplete}
					onBlur={handleEditingEnd}
				/>
			) : (
				<button className={styles.nameWidthSetter} onClick={handleEditingStart}>
					{fileName.replace(/ /g, '\u00a0')}
				</button>
			)}
		</div>
	)
}

function TlaFileNameEditorInput({
	fileName,
	onComplete,
	onBlur,
}: {
	fileName: string
	onComplete(name: string): void
	onBlur(): void
}) {
	const rTemporaryName = useRef<string>(fileName)
	const [temporaryFileName, setTemporaryFileName] = useState(fileName)

	const handleBlur = useCallback(() => {
		// dispatch the new filename via onComplete
		const newFileName = rTemporaryName.current.replace(/ /g, '\u00a0')
		setTemporaryFileName(newFileName)
		rTemporaryName.current = newFileName
		onComplete(newFileName)
		onBlur()
	}, [onBlur, onComplete])

	const handleCancel = useCallback(() => {
		// restore original filename from file
		setTemporaryFileName(fileName)
		rTemporaryName.current = fileName
		onBlur()
	}, [onBlur, fileName])

	const handleValueChange = useCallback((value: string) => {
		setTemporaryFileName(value)
		rTemporaryName.current = value
	}, [])

	return (
		<>
			<TldrawUiInput
				className={styles.nameInput}
				value={temporaryFileName.replace(/ /g, '\u00a0')}
				onValueChange={handleValueChange}
				onCancel={handleCancel}
				onBlur={handleBlur}
				autoSelect
				autoFocus
			/>
			<div className={styles.nameWidthSetter}>{temporaryFileName.replace(/ /g, '\u00a0')}</div>
		</>
	)
}

// There are some styles in tla.css that adjust the regular tlui top panels

export function TlaEditorTopLeftPanel() {
	const app = useApp()

	const raw = useRaw()

	const { fileSlug } = useParams<{ fileSlug: TldrawAppFileId }>()
	if (!fileSlug) throw Error('File id not found')
	const fileId = TldrawAppFileRecordType.createId(fileSlug)

	const fileName = useValue('fileName', () => app.getFileName(fileId), [fileId])

	if (!fileName) throw Error('File name not found')

	const handleNameChange = useCallback(
		(name: string) => {
			app.store.update(fileId, (file) => {
				return {
					...file,
					name,
				}
			})
		},
		[app, fileId]
	)

	return (
		<div className={classNames(styles.topPanelLeft)}>
			<div className={classNames(styles.topPanelLeftButtons, 'tlui-buttons__horizontal')}>
				<TlaSidebarToggle />
				<TlaSidebarToggleMobile />
				<TlaFileNameEditor fileName={fileName} onChange={handleNameChange} />
				<span className={styles.topPanelSeparator}>{raw('/')}</span>
				<DefaultPageMenu />
				<TlaFileMenu fileId={fileId} source="file-header">
					<button className={styles.linkMenu}>
						<TlaIcon icon="dots-vertical-strong" />
					</button>
				</TlaFileMenu>
			</div>
		</div>
	)
}
