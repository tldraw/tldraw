import classNames from 'classnames'
import { useCallback, useEffect, useRef, useState } from 'react'
import {
	DefaultPageMenu,
	EditSubmenu,
	ExportFileContentSubMenu,
	ExtrasGroup,
	TldrawUiButton,
	TldrawUiIcon,
	TldrawUiInput,
	ViewSubmenu,
	useEditor,
	usePassThroughWheelEvents,
	useValue,
} from 'tldraw'
import { useApp } from '../../hooks/useAppState'
import { useCurrentFileId } from '../../hooks/useCurrentFileId'
import { useRaw } from '../../hooks/useRaw'
import { TlaFileMenu } from '../TlaFileMenu/TlaFileMenu'
import { TlaFileShareMenu } from '../TlaFileShareMenu/TlaFileShareMenu'
import { TlaIcon } from '../TlaIcon/TlaIcon'
import { TlaSidebarToggle, TlaSidebarToggleMobile } from '../TlaSidebar/TlaSidebar'
import styles from './top.module.css'

// There are some styles in tla.css that adjust the regular tlui top panels

export function TlaEditorTopLeftPanel({ isAnonUser }: { isAnonUser: boolean }) {
	const ref = useRef<HTMLDivElement>(null)
	usePassThroughWheelEvents(ref)

	return (
		<div ref={ref} className={classNames(styles.topPanelLeft)}>
			<div className={classNames(styles.topPanelLeftButtons, 'tlui-buttons__horizontal')}>
				{isAnonUser ? <TlaEditorTopLeftPanelAnonymous /> : <TlaEditorTopLeftPanelSignedIn />}
			</div>
		</div>
	)
}

export function TlaEditorTopLeftPanelAnonymous() {
	const raw = useRaw()
	const editor = useEditor()
	const fileName = useValue('fileName', () => editor.getDocumentSettings().name || 'New board', [])
	const handleFileNameChange = useCallback(
		(name: string) => editor.updateDocumentSettings({ name }),
		[editor]
	)

	return (
		<>
			<TlaFileShareMenu fileId={'' as any} source="file-header" isAnonUser>
				<TldrawUiButton type="icon">
					<TldrawUiIcon icon="share-1" />
				</TldrawUiButton>
			</TlaFileShareMenu>
			<TlaFileNameEditor fileName={fileName} onChange={handleFileNameChange} />
			<span className={styles.topPanelSeparator}>{raw('/')}</span>
			<DefaultPageMenu />
		</>
	)
}

export function TlaEditorTopLeftPanelSignedIn() {
	const raw = useRaw()
	const editor = useEditor()
	const [isRenaming, setIsRenaming] = useState(false)

	const app = useApp()
	const fileId = useCurrentFileId()
	const fileName = useValue(
		'fileName',
		// TODO(david): This is a temporary fix for allowing guests to see the file name.
		// We update the name in the document record on it's DO when the file record changes.
		// We should figure out a way to have a single source of truth for the file name.
		// And to allow guests to 'subscribe' to file metadata updates somehow.
		() => app.getFileName(fileId) ?? editor.getDocumentSettings().name,
		[app, editor, fileId]
	)
	const handleFileNameChange = useCallback(
		(name: string) => {
			setIsRenaming(false)
			// don't allow guests to update the file name
			const file = app.getFileName(fileId)
			if (!file) return
			app.store.update(fileId, (file) => ({ ...file, name }))
		},
		[app, fileId]
	)

	const handleRenameAction = () => setIsRenaming(true)
	const handleRenameEnd = () => setIsRenaming(false)

	return (
		<>
			<TlaSidebarToggle />
			<TlaSidebarToggleMobile />
			<TlaFileNameEditor
				isRenaming={isRenaming}
				fileName={fileName ?? 'FIXME'}
				onChange={handleFileNameChange}
				onEnd={handleRenameEnd}
			/>
			<span className={styles.topPanelSeparator}>{raw('/')}</span>
			<DefaultPageMenu />
			<TlaFileMenu
				fileId={fileId}
				source="file-header"
				onRenameAction={handleRenameAction}
				trigger={
					<button className={styles.linkMenu}>
						<TlaIcon icon="dots-vertical-strong" />
					</button>
				}
			>
				<EditSubmenu />
				<ViewSubmenu />
				<ExportFileContentSubMenu />
				<ExtrasGroup />
			</TlaFileMenu>
		</>
	)
}

function TlaFileNameEditor({
	fileName,
	onChange,
	onEnd,
	isRenaming,
}: {
	fileName: string
	onChange(name: string): void
	onEnd?(): void
	isRenaming?: boolean
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
			onEnd?.()
		},
		[onChange, onEnd]
	)

	useEffect(() => {
		if (isRenaming !== undefined && isRenaming !== isEditing) {
			// Wait a tick, otherwise the blur event immediately exits the input.
			setTimeout(() => setIsEditing(isRenaming), 0)
		}
	}, [isRenaming, isEditing])

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
