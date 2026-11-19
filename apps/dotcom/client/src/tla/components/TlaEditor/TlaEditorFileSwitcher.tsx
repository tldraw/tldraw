import classNames from 'classnames'
import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
	defineMessages,
	TldrawUiPopover,
	TldrawUiPopoverContent,
	TldrawUiPopoverTrigger,
	useEditor,
	useMenuIsOpen,
	useTranslation,
	useValue,
} from 'tldraw'
import { routes } from '../../../routeDefs'
import { useActiveWorkspaceId } from '../../hooks/useActiveWorkspaceId'
import { useApp } from '../../hooks/useAppState'
import { useTldrawAppUiEvents } from '../../utils/app-ui-events'
import { getIsCoarsePointer } from '../../utils/getIsCoarsePointer'
import { TlaFileMenu } from '../TlaFileMenu/TlaFileMenu'
import {
	messages as sidebarMessages,
	useHandleSidebarCreateFile,
} from '../TlaSidebar/components/sidebar-shared'
import {
	TlaSwitcherList,
	TlaSwitcherRow,
	TlaSwitcherRowButton,
	TlaSwitcherRowInput,
	TlaSwitcherRowMenu,
	TlaSwitcherRowMenuTrigger,
} from './TlaEditorSwitcherList'
import styles from './top.module.css'

const messages = defineMessages({
	newFile: { defaultMessage: 'New file' },
})

const MENU_ID = 'files'

/**
 * The file crumb as a list of the current workspace's files, for the fileSwitcher design switch.
 * Renaming moves from the crumb to each row's menu, which is the one a sidebar row had.
 */
export function TlaEditorFileSwitcher({ fileId, fileName }: { fileId: string; fileName: string }) {
	const app = useApp()
	const editor = useEditor()
	const msg = useTranslation()
	const navigate = useNavigate()
	const trackEvent = useTldrawAppUiEvents()
	const workspaceId = useActiveWorkspaceId()
	const files = useValue('workspace files', () => app.getWorkspaceFilesSorted(workspaceId), [
		app,
		workspaceId,
	])
	const [editingFileId, setEditingFileId] = useState<string | null>(null)

	// The popover keeps its open state under the same id, so this closes it.
	const [, setIsOpen] = useMenuIsOpen(MENU_ID)
	const handleCreateFile = useHandleSidebarCreateFile()

	const rename = (id: string, value: string) => {
		const name = value.replace(/\s+/g, ' ').trim()
		if (!name || name === app.getFileName(id)) return
		app.updateFile(id, { name })
		// The open file's document carries its name too, for guests who can't read the file record.
		if (id === fileId) editor.updateDocumentSettings({ name })
		trackEvent('rename-file', { name, source: 'file-header' })
	}

	const handleRenameAction = (id: string) => {
		if (getIsCoarsePointer()) {
			const name = prompt(msg(sidebarMessages.renameFile), app.getFileName(id))
			if (name) rename(id, name)
			return
		}
		// The row's menu hands focus back to its button as it closes, which would blur the input
		// the moment it mounted.
		setTimeout(() => setEditingFileId(id), 0)
	}

	return (
		<TldrawUiPopover
			id={MENU_ID}
			className={classNames(styles.topLeftInputWrapper, styles.topLeftInputWrapperEditable)}
			onOpenChange={(isOpen) => {
				if (!isOpen) setEditingFileId(null)
			}}
		>
			<TldrawUiPopoverTrigger>
				<button
					className={classNames(styles.topLeftInputNameWidthSetter, 'notranslate')}
					data-testid="tla-file-name"
				>
					{fileName.replace(/ /g, '\u00a0')}
				</button>
			</TldrawUiPopoverTrigger>
			<TldrawUiPopoverContent
				side="bottom"
				align="start"
				sideOffset={0}
				disableEscapeKeyDown={editingFileId !== null}
			>
				<TlaSwitcherList
					rowCount={files.length}
					createLabel={msg(messages.newFile)}
					createTestId="tla-file-switcher-create"
					onCreate={() => {
						setIsOpen(false)
						handleCreateFile({ source: 'file-header' })
					}}
					data-testid="tla-file-switcher-list"
				>
					{files.map((file, index) => (
						<FileSwitcherItem
							key={file.fileId}
							fileId={file.fileId}
							workspaceId={workspaceId}
							index={index}
							isCurrent={file.fileId === fileId}
							isEditing={file.fileId === editingFileId}
							onSelect={() => {
								setIsOpen(false)
								if (file.fileId !== fileId) navigate(routes.tlaFile(file.fileId))
							}}
							onRenameAction={() => handleRenameAction(file.fileId)}
							onRename={(name) => {
								rename(file.fileId, name)
								setEditingFileId(null)
							}}
						/>
					))}
				</TlaSwitcherList>
			</TldrawUiPopoverContent>
		</TldrawUiPopover>
	)
}

function FileSwitcherItem({
	fileId,
	workspaceId,
	index,
	isCurrent,
	isEditing,
	onSelect,
	onRenameAction,
	onRename,
}: {
	fileId: string
	workspaceId: string
	index: number
	isCurrent: boolean
	isEditing: boolean
	onSelect(): void
	onRenameAction(): void
	/** Called with the name as typed, or with an empty string when the rename is abandoned. */
	onRename(name: string): void
}) {
	const app = useApp()
	const name = useValue('file name', () => app.getFileName(fileId), [app, fileId])

	return (
		<TlaSwitcherRow
			index={index}
			isCurrent={isCurrent}
			isEditing={isEditing}
			data-testid="tla-file-switcher-item"
		>
			{isEditing ? (
				<FileNameInput name={name} onRename={onRename} />
			) : (
				<>
					<TlaSwitcherRowButton onClick={onSelect}>{name}</TlaSwitcherRowButton>
					<TlaSwitcherRowMenu>
						<TlaFileMenu
							fileId={fileId}
							workspaceId={workspaceId}
							// Only the open file's link can carry the editor's current view (see FileItems).
							source={isCurrent ? 'file-header' : 'file-menu'}
							onRenameAction={onRenameAction}
							align="start"
							trigger={<TlaSwitcherRowMenuTrigger data-testid="tla-file-switcher-item-menu" />}
						/>
					</TlaSwitcherRowMenu>
				</>
			)}
		</TlaSwitcherRow>
	)
}

function FileNameInput({ name, onRename }: { name: string; onRename(name: string): void }) {
	// Enter commits and then the input blurs as it unmounts: only the first of the two counts.
	const rIsDone = useRef(false)
	const finish = (value: string) => {
		if (rIsDone.current) return
		rIsDone.current = true
		onRename(value)
	}
	return (
		<TlaSwitcherRowInput
			defaultValue={name}
			onComplete={finish}
			onCancel={() => finish('')}
			onBlur={finish}
		/>
	)
}
