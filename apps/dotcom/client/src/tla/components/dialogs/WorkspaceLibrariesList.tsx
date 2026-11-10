import {
	RenameInput,
	type LibrarySource,
	type TLLibrary,
	type TLLibraryId,
	type TLLibraryOwner,
} from '@tldraw/libraries'
import { useState } from 'react'
import {
	defineMessages,
	F,
	TldrawUiButton,
	TldrawUiDropdownMenuContent,
	TldrawUiDropdownMenuRoot,
	TldrawUiDropdownMenuTrigger,
	TldrawUiMenuCheckboxItem,
	TldrawUiMenuContextProvider,
	TldrawUiMenuGroup,
	TldrawUiMenuItem,
	TldrawUiMenuSubmenu,
	useDialogs,
	useToasts,
	useTranslation,
	useValue,
} from 'tldraw'
import { useApp } from '../../hooks/useAppState'
import { TLA_MENU_POSITION } from '../tla-menu/tla-menu'
import { TlaIcon } from '../TlaIcon/TlaIcon'
import { ConfirmDialog } from './ConfirmDialog'
import styles from './dialogs.module.css'

const messages = defineMessages({
	itemCount: { defaultMessage: '{count, plural, one {# item} other {# items}}' },
	libraryMenu: { defaultMessage: 'Library menu' },
	rename: { defaultMessage: 'Rename' },
	moveTo: { defaultMessage: 'Move to' },
	delete: { defaultMessage: 'Delete' },
	moved: { defaultMessage: 'Moved to {name}' },
	changeError: { defaultMessage: "Couldn't change the library" },
	changeErrorDescription: {
		defaultMessage: 'You may not be allowed to, or the library no longer exists.',
	},
})

// Must match the submenu content id the stylesheet raises above the dialog (see dialogs.module.css).
const MOVE_SUBMENU_ID = 'move-library'

export function WorkspaceLibrariesList({
	source,
	workspaceId,
}: {
	source: LibrarySource
	workspaceId: string
}) {
	const msg = useTranslation()
	const app = useApp()
	const { addDialog } = useDialogs()
	const { addToast } = useToasts()
	const [renamingId, setRenamingId] = useState<TLLibraryId>()

	const rows = useValue(
		'workspace libraries',
		() =>
			source
				.getLibraries()
				.filter((library) => library.ownerId === workspaceId)
				.map((library) => ({
					library,
					itemCount: source.getItems(library.id).length,
					canRename: source.can('renameLibrary', library.id),
					canDelete: source.can('deleteLibrary', library.id),
				})),
		[source, workspaceId]
	)

	const workspaceOwners = useValue(
		'workspace library owners',
		() => {
			const names = new Map(
				app.getWorkspaceMemberships().flatMap((m) => (m.group ? [[m.groupId, m.group.name]] : []))
			)
			const owners = source.getLibraryOwners ? source.getLibraryOwners() : []
			return owners.flatMap((owner) => {
				const name = names.get(owner.id)
				return name === undefined ? [] : [{ ...owner, name }]
			})
		},
		[app, source]
	)

	const showError = () => {
		addToast({
			title: msg(messages.changeError),
			description: msg(messages.changeErrorDescription),
			severity: 'error',
		})
	}

	const renameLibrary = (library: TLLibrary, name: string) => {
		setRenamingId(undefined)
		const trimmed = name.trim()
		if (trimmed === '' || trimmed === library.name) return
		source.renameLibrary(library.id, trimmed).catch(showError)
	}

	const moveLibrary = (library: TLLibrary, ownerId: string) => {
		if (!source.moveLibrary) return
		const owner = workspaceOwners.find((o) => o.id === ownerId)
		source.moveLibrary(library.id, ownerId).then(() => {
			if (owner) addToast({ title: msg(messages.moved, { name: owner.name }) })
		}, showError)
	}

	const openDeleteConfirmDialog = (library: TLLibrary, itemCount: number) => {
		addDialog({
			component: ({ onClose }) => (
				<ConfirmDialog
					title={<F defaultMessage="Delete library" />}
					description={
						<F
							defaultMessage="Delete <strong>{name}</strong> and its {count, plural, one {# item} other {# items}}? Copies already placed on canvases stay."
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
				<F defaultMessage="No libraries in this workspace yet." />
			</p>
		)
	}

	return (
		<div className={styles.librariesList}>
			{rows.map(({ library, itemCount, canRename, canDelete }) => (
				<div key={library.id} className={styles.libraryItem}>
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
					</span>
					<LibraryRowMenu
						library={library}
						onRename={canRename ? () => setRenamingId(library.id) : undefined}
						onDelete={canDelete ? () => openDeleteConfirmDialog(library, itemCount) : undefined}
						moveTargets={
							source.moveLibrary && canDelete && workspaceOwners.length > 1
								? workspaceOwners
								: undefined
						}
						onMove={(ownerId) => moveLibrary(library, ownerId)}
					/>
				</div>
			))}
		</div>
	)
}

function LibraryRowMenu({
	library,
	onRename,
	onDelete,
	moveTargets,
	onMove,
}: {
	library: TLLibrary
	onRename?(): void
	onDelete?(): void
	moveTargets?: TLLibraryOwner[]
	onMove(ownerId: string): void
}) {
	const msg = useTranslation()
	const label = msg(messages.libraryMenu)
	if (!onRename && !onDelete && !moveTargets) return null

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
						{moveTargets && (
							<TldrawUiMenuSubmenu id={MOVE_SUBMENU_ID} label={msg(messages.moveTo)} size="small">
								<TldrawUiMenuGroup id="workspaces">
									{moveTargets.map((owner) => (
										<TldrawUiMenuCheckboxItem
											key={owner.id}
											id={`workspace-${owner.id}`}
											label={owner.name}
											checked={owner.id === library.ownerId}
											readonlyOk
											onSelect={() => {
												if (owner.id !== library.ownerId) onMove(owner.id)
											}}
										/>
									))}
								</TldrawUiMenuGroup>
							</TldrawUiMenuSubmenu>
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
