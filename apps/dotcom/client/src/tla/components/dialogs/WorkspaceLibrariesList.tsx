import {
	getLibraryItemCount,
	getLibraryPreviewItems,
	getThumbnailForColorMode,
	RenameInput,
	type LibrarySource,
	type TLLibrary,
	type TLLibraryId,
} from '@tldraw/libraries'
import { useMemo, useState } from 'react'
import {
	defineMessages,
	F,
	TldrawUiButton,
	TldrawUiDropdownMenuContent,
	TldrawUiDropdownMenuRoot,
	TldrawUiDropdownMenuTrigger,
	TldrawUiMenuContextProvider,
	TldrawUiMenuGroup,
	TldrawUiMenuItem,
	useDialogs,
	useToasts,
	useTranslation,
	useValue,
} from 'tldraw'
import { useApp } from '../../hooks/useAppState'
import { getLocalSessionState } from '../../utils/local-session-state'
import { TLA_MENU_POSITION } from '../tla-menu/tla-menu-position'
import { TlaIcon } from '../TlaIcon/TlaIcon'
import { rowId } from '../TlaLibraries/librariesSource'
import { TrackedLibrarySource } from '../TlaLibraries/trackedLibrarySource'
import { ConfirmDialog } from './ConfirmDialog'
import styles from './dialogs.module.css'

const messages = defineMessages({
	itemCount: { defaultMessage: '{count, plural, one {# item} other {# items}}' },
	notInAnyFile: { defaultMessage: '· Not in any file' },
	libraryMenu: { defaultMessage: 'Library menu' },
	rename: { defaultMessage: 'Rename' },
	delete: { defaultMessage: 'Delete' },
	changeError: { defaultMessage: "Couldn't change library" },
})

const PREVIEW_COUNT = 4

export function WorkspaceLibrariesList({
	source: userLibraries,
	workspaceId,
}: {
	source: LibrarySource
	workspaceId: string
}) {
	const msg = useTranslation()
	const app = useApp()
	const source = useMemo(
		() => new TrackedLibrarySource(userLibraries, app, { eventSource: 'workspace-settings' }),
		[userLibraries, app]
	)
	const { addDialog } = useDialogs()
	const { addToast } = useToasts()
	const [renamingId, setRenamingId] = useState<TLLibraryId>()
	const colorMode = useValue('color mode', () => getLocalSessionState().theme, [])

	const rows = useValue(
		'workspace libraries',
		() => {
			const libraryRows = new Map(app.getLibraryRows().map((row) => [row.id, row]))
			return source
				.getLibraries()
				.filter(
					(library) =>
						library.ownerId === workspaceId && !libraryRows.get(rowId(library.id))?.isDefault
				)
				.map((library) => {
					return {
						library,
						itemCount: getLibraryItemCount(userLibraries, library.id),
						notInAnyFile: libraryRows.get(rowId(library.id))?.fileCount === 0,
						thumbnailUrls: getLibraryPreviewItems(userLibraries, library.id, PREVIEW_COUNT).map(
							(item) => item.thumbnail && getThumbnailForColorMode(item.thumbnail, colorMode)
						),
						canRename: source.can('renameLibrary', library.id),
						canDelete: source.can('deleteLibrary', library.id),
					}
				})
		},
		[source, userLibraries, app, workspaceId, colorMode]
	)

	const showError = () => {
		addToast({
			title: msg(messages.changeError),
			severity: 'error',
		})
	}

	const renameLibrary = (library: TLLibrary, name: string) => {
		setRenamingId(undefined)
		const trimmed = name.trim()
		if (trimmed === '' || trimmed === library.name) return
		source.renameLibrary(library.id, trimmed).catch(showError)
	}

	const openDeleteConfirmDialog = (library: TLLibrary, itemCount: number) => {
		addDialog({
			component: ({ onClose }) => (
				<ConfirmDialog
					title={<F defaultMessage="Delete library" />}
					description={
						<F
							defaultMessage="Delete <strong>{name}</strong> and its {count, plural, one {# item} other {# items}}?"
							values={{
								name: library.name,
								count: itemCount,
								strong: (chunks) => <strong>{chunks}</strong>,
							}}
						/>
					}
					confirmLabel={<F {...messages.delete} />}
					cancelLabel={<F defaultMessage="Cancel" />}
					confirmType="danger"
					onConfirm={() => source.deleteLibrary(library.id).catch(showError)}
					onClose={onClose}
				/>
			),
		})
	}

	if (rows.length === 0) {
		return (
			<p className={styles.librariesEmpty}>
				<F defaultMessage="No libraries yet." />
			</p>
		)
	}

	return (
		<div className={styles.librariesList}>
			{rows.map(({ library, itemCount, notInAnyFile, thumbnailUrls, canRename, canDelete }) => (
				<div key={library.id} className={styles.libraryItem}>
					<div className={styles.libraryThumbnails} aria-hidden>
						{Array.from({ length: PREVIEW_COUNT }, (_, i) => (
							<span key={i} className={styles.libraryThumbnail}>
								{thumbnailUrls[i] && <img src={thumbnailUrls[i]} alt="" draggable={false} />}
							</span>
						))}
					</div>
					<div className={styles.libraryFooter}>
						<div className={styles.libraryText}>
							{renamingId === library.id ? (
								<RenameInput
									className={styles.dialogInput}
									defaultValue={library.name}
									onComplete={(name) => renameLibrary(library, name)}
									onCancel={() => setRenamingId(undefined)}
								/>
							) : (
								<span className={styles.libraryName}>{library.name}</span>
							)}
							<span className={styles.libraryCount}>
								{msg(messages.itemCount, { count: itemCount })}
								{notInAnyFile && (
									<span className={styles.libraryNotInAnyFile}>{msg(messages.notInAnyFile)}</span>
								)}
							</span>
						</div>
						<LibraryRowMenu
							library={library}
							onRename={canRename ? () => setRenamingId(library.id) : undefined}
							onDelete={canDelete ? () => openDeleteConfirmDialog(library, itemCount) : undefined}
						/>
					</div>
				</div>
			))}
		</div>
	)
}

function LibraryRowMenu({
	library,
	onRename,
	onDelete,
}: {
	library: TLLibrary
	onRename?(): void
	onDelete?(): void
}) {
	const msg = useTranslation()
	const label = msg(messages.libraryMenu)
	if (!onRename && !onDelete) return null

	return (
		<TldrawUiDropdownMenuRoot id={`workspace-library-menu-${library.id}`}>
			<TldrawUiMenuContextProvider type="menu" sourceId="dialog">
				<TldrawUiDropdownMenuTrigger>
					<TldrawUiButton
						type="icon"
						className={styles.libraryMenuTrigger}
						tooltip={label}
						title={label}
					>
						<TlaIcon icon="dots-vertical-strong" />
					</TldrawUiButton>
				</TldrawUiDropdownMenuTrigger>
				<TldrawUiDropdownMenuContent
					className={styles.libraryMenu}
					side="bottom"
					align="end"
					{...TLA_MENU_POSITION}
				>
					<TldrawUiMenuGroup id="library-actions">
						{onRename && (
							<TldrawUiMenuItem
								id="rename"
								label={msg(messages.rename)}
								readonlyOk
								onSelect={onRename}
							/>
						)}
						{onDelete && (
							<TldrawUiMenuItem
								id="delete"
								label={msg(messages.delete)}
								readonlyOk
								onSelect={onDelete}
							/>
						)}
					</TldrawUiMenuGroup>
				</TldrawUiDropdownMenuContent>
			</TldrawUiMenuContextProvider>
		</TldrawUiDropdownMenuRoot>
	)
}
