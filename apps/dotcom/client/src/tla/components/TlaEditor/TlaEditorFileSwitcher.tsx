import classNames from 'classnames'
import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
	defineMessages,
	TldrawUiButton,
	TldrawUiButtonIcon,
	TldrawUiButtonLabel,
	TldrawUiInput,
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
import styles from './top.module.css'

const messages = defineMessages({
	newFile: { defaultMessage: 'New file' },
})

const MENU_ID = 'files'

// The row height `.tlui-page-menu__item` is laid out at.
const ITEM_HEIGHT = 40

/**
 * The fileSwitcher design switch: the file crumb opens the current workspace's files, as the page
 * crumb opens the file's pages, instead of renaming in place. Each row has the menu a sidebar row
 * had, which is where renaming moves to.
 *
 * Built from the page menu's own classes so the two popovers match; that menu positions its rows
 * absolutely, so these are too.
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
					{fileName.replace(/ /g, ' ')}
				</button>
			</TldrawUiPopoverTrigger>
			<TldrawUiPopoverContent
				side="bottom"
				align="start"
				sideOffset={0}
				disableEscapeKeyDown={editingFileId !== null}
			>
				<div className="tlui-page-menu__wrapper">
					<div
						className={classNames('tlui-page-menu__list', styles.switcherList)}
						data-testid="tla-file-switcher-list"
					>
						<div
							className="tlui-page-menu__list__content"
							style={{ height: files.length * ITEM_HEIGHT }}
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
						</div>
					</div>
					<div className={styles.switcherDivider} />
					<TldrawUiButton
						type="menu"
						className="tlui-page-menu__create-button"
						data-testid="tla-file-switcher-create"
						onClick={() => {
							setIsOpen(false)
							handleCreateFile({ source: 'file-header' })
						}}
					>
						<TldrawUiButtonLabel>{msg(messages.newFile)}</TldrawUiButtonLabel>
						<TldrawUiButtonIcon icon="plus" small />
					</TldrawUiButton>
				</div>
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
	const msg = useTranslation()
	const name = useValue('file name', () => app.getFileName(fileId), [app, fileId])
	const menuLbl = msg('page-menu.submenu.title')

	return (
		<div
			className="tlui-page-menu__item"
			data-iscurrent={isCurrent}
			data-editing={isEditing}
			data-testid="tla-file-switcher-item"
			style={{ transform: `translateY(${index * ITEM_HEIGHT}px)` }}
		>
			{isEditing ? (
				<div className="tlui-page-menu__item__title">
					<FileNameInput name={name} onRename={onRename} />
				</div>
			) : (
				<>
					<TldrawUiButton
						type="normal"
						className="tlui-page-menu__item__button notranslate"
						onClick={onSelect}
					>
						<TldrawUiButtonLabel>{name}</TldrawUiButtonLabel>
					</TldrawUiButton>
					<div className="tlui-page-menu__item__submenu">
						<TlaFileMenu
							fileId={fileId}
							workspaceId={workspaceId}
							// Only the open file's link can carry the editor's current view (see FileItems).
							source={isCurrent ? 'file-header' : 'file-menu'}
							onRenameAction={onRenameAction}
							align="start"
							trigger={
								<TldrawUiButton
									type="icon"
									tooltip={menuLbl}
									title={menuLbl}
									data-testid="tla-file-switcher-item-menu"
								>
									<TldrawUiButtonIcon icon="dots-vertical" small />
								</TldrawUiButton>
							}
						/>
					</div>
				</>
			)}
		</div>
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
		<TldrawUiInput
			className="tlui-page-menu__item__input"
			defaultValue={name}
			onComplete={finish}
			onCancel={() => finish('')}
			onBlur={finish}
			autoFocus
			autoSelect
		/>
	)
}
