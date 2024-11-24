import classNames from 'classnames'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import {
	DefaultPageMenu,
	EditSubmenu,
	ExportFileContentSubMenu,
	ExtrasGroup,
	PreferencesGroup,
	TldrawUiButton,
	TldrawUiDropdownMenuContent,
	TldrawUiDropdownMenuRoot,
	TldrawUiDropdownMenuTrigger,
	TldrawUiIcon,
	TldrawUiInput,
	TldrawUiMenuContextProvider,
	TldrawUiMenuGroup,
	ViewSubmenu,
	useEditor,
	usePassThroughWheelEvents,
	useValue,
} from 'tldraw'
import { useApp } from '../../hooks/useAppState'
import { useCurrentFileId } from '../../hooks/useCurrentFileId'
import { useIsFileOwner } from '../../hooks/useIsFileOwner'
import { TLAppUiEventSource, useTldrawAppUiEvents } from '../../utils/app-ui-events'
import { defineMessages, useIntl } from '../../utils/i18n'
import { TlaFileMenu } from '../TlaFileMenu/TlaFileMenu'
import { TlaFileShareMenu } from '../TlaFileShareMenu/TlaFileShareMenu'
import { TlaIcon } from '../TlaIcon/TlaIcon'
import { TlaSidebarToggle } from '../TlaSidebar/components/TlaSidebarToggle'
import { TlaSidebarToggleMobile } from '../TlaSidebar/components/TlaSidebarToggleMobile'
import styles from './top.module.css'

const messages = defineMessages({
	pageMenu: { defaultMessage: 'Page menu' },
})

// There are some styles in tla.css that adjust the regular tlui top panels

export function TlaEditorTopLeftPanel({ isAnonUser }: { isAnonUser: boolean }) {
	const ref = useRef<HTMLDivElement>(null)
	usePassThroughWheelEvents(ref)

	return (
		<div ref={ref} className={classNames(styles.topPanelLeft)}>
			<div className={classNames(styles.topPanelLeftButtons)}>
				{isAnonUser ? <TlaEditorTopLeftPanelAnonymous /> : <TlaEditorTopLeftPanelSignedIn />}
			</div>
		</div>
	)
}

export function TlaEditorTopLeftPanelAnonymous() {
	const editor = useEditor()
	const intl = useIntl()
	const pageMenuLbl = intl.formatMessage(messages.pageMenu)
	const isTempFile = !useParams<{ fileSlug: string }>().fileSlug
	const fileName = useValue('fileName', () => editor.getDocumentSettings().name || 'New board', [])
	const handleFileNameChange = useCallback(
		(name: string) => editor.updateDocumentSettings({ name }),
		[editor]
	)

	const separator = '/'
	return (
		<>
			<TlaFileShareMenu fileId={'' as any} source="file-header" isAnonUser>
				<TldrawUiButton type="icon">
					<TldrawUiIcon icon="share-1" />
				</TldrawUiButton>
			</TlaFileShareMenu>
			<TlaFileNameEditor
				source="file-header"
				fileName={fileName}
				onChange={isTempFile ? handleFileNameChange : undefined}
			/>
			<span className={styles.topPanelSeparator}>{separator}</span>
			<DefaultPageMenu />
			<TldrawUiDropdownMenuRoot id={`file-menu-anon`}>
				<TldrawUiMenuContextProvider type="menu" sourceId="dialog">
					<TldrawUiDropdownMenuTrigger>
						<button className={styles.linkMenu} title={pageMenuLbl}>
							<TlaIcon icon="dots-vertical-strong" />
						</button>
					</TldrawUiDropdownMenuTrigger>
					<TldrawUiDropdownMenuContent side="bottom" align="start" alignOffset={0} sideOffset={0}>
						<EditSubmenu />
						<ViewSubmenu />
						<ExportFileContentSubMenu />
						<ExtrasGroup />
					</TldrawUiDropdownMenuContent>
				</TldrawUiMenuContextProvider>
			</TldrawUiDropdownMenuRoot>
		</>
	)
}

export function TlaEditorTopLeftPanelSignedIn() {
	const editor = useEditor()
	const [isRenaming, setIsRenaming] = useState(false)
	const intl = useIntl()
	const pageMenuLbl = intl.formatMessage(messages.pageMenu)

	const fileSlug = useParams<{ fileSlug: string }>().fileSlug ?? '_not_a_file_' // fall back to a string that will not match any file
	const isOwner = useIsFileOwner(fileSlug)

	const app = useApp()
	const fileId = useCurrentFileId()!
	const fileName = useValue(
		'fileName',
		// TODO(david): This is a temporary fix for allowing guests to see the file name.
		// We update the name in the document record on it's DO when the file record changes.
		// We should figure out a way to have a single source of truth for the file name.
		// And to allow guests to 'subscribe' to file metadata updates somehow.
		() => {
			// we need that backup file name for empty file names
			return app.getFileName(fileId).trim() || editor.getDocumentSettings().name
		},
		[app, editor, fileId]
	)
	const handleFileNameChange = useCallback(
		(name: string) => {
			if (isOwner) {
				setIsRenaming(false)
				// don't allow guests to update the file name
				app.updateFile(fileId, (file) => ({ ...file, name }))
				editor.updateDocumentSettings({ name })
			}
		},
		[app, editor, fileId, isOwner]
	)

	const handleRenameAction = () => setIsRenaming(true)
	const handleRenameEnd = () => setIsRenaming(false)

	const separator = '/'
	return (
		<>
			<TlaSidebarToggle />
			<TlaSidebarToggleMobile />
			<TlaFileNameEditor
				source="file-header"
				isRenaming={isRenaming}
				fileName={fileName}
				onChange={isOwner ? handleFileNameChange : undefined}
				onEnd={handleRenameEnd}
			/>
			<span className={styles.topPanelSeparator}>{separator}</span>
			<DefaultPageMenu />
			<TlaFileMenu
				fileId={fileId}
				source="file-header"
				onRenameAction={handleRenameAction}
				trigger={
					<button className={styles.linkMenu} title={pageMenuLbl}>
						<TlaIcon icon="dots-vertical-strong" />
					</button>
				}
			>
				<TldrawUiMenuGroup id="regular-stuff">
					<EditSubmenu />
					<ViewSubmenu />
					<ExportFileContentSubMenu />
					<ExtrasGroup />
				</TldrawUiMenuGroup>
				<TldrawUiMenuGroup id="preferences">
					<PreferencesGroup />
				</TldrawUiMenuGroup>
			</TlaFileMenu>
		</>
	)
}

function TlaFileNameEditor({
	fileName,
	onChange,
	onEnd,
	isRenaming,
	source,
}: {
	fileName: string
	onChange?(name: string): void
	onEnd?(): void
	isRenaming?: boolean
	source: TLAppUiEventSource
}) {
	const [isEditing, setIsEditing] = useState(false)
	const trackEvent = useTldrawAppUiEvents()
	const handleEditingStart = useCallback(() => {
		if (!onChange) return
		setIsEditing(true)
	}, [onChange])

	const handleEditingEnd = useCallback(() => {
		if (!onChange) return
		setIsEditing(false)
	}, [onChange])

	const handleEditingComplete = useCallback(
		(name: string) => {
			if (!onChange) return
			setIsEditing(false)
			onChange(name)
			onEnd?.()
			trackEvent('rename-file', { name, source })
		},
		[onChange, onEnd, trackEvent, source]
	)

	useEffect(() => {
		if (isRenaming && !isEditing) {
			// Wait a tick, otherwise the blur event immediately exits the input.
			setTimeout(() => setIsEditing(true), 0)
		}
	}, [isRenaming, isEditing])

	return (
		<div className={classNames(styles.inputWrapper, onChange && styles.inputWrapperEditable)}>
			{isEditing ? (
				<TlaFileNameEditorInput
					fileName={fileName}
					onComplete={handleEditingComplete}
					onBlur={handleEditingEnd}
				/>
			) : (
				<button
					className={styles.nameWidthSetter}
					onClick={onChange ? handleEditingStart : undefined}
					data-testid="tla-file-name"
				>
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
