import {
	RenameInput,
	type CollectionSource,
	type TLCollection,
	type TLCollectionId,
	type TLCollectionOwner,
} from '@tldraw/collections'
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
	collectionMenu: { defaultMessage: 'Collection menu' },
	rename: { defaultMessage: 'Rename' },
	moveTo: { defaultMessage: 'Move to' },
	delete: { defaultMessage: 'Delete' },
	moved: { defaultMessage: 'Moved to {name}' },
	changeError: { defaultMessage: "Couldn't change the collection" },
	changeErrorDescription: {
		defaultMessage: 'You may not be allowed to, or the collection no longer exists.',
	},
})

// Must match the submenu content id the stylesheet raises above the dialog (see dialogs.module.css).
const MOVE_SUBMENU_ID = 'move-collection'

export function WorkspaceCollectionsList({
	source,
	workspaceId,
}: {
	source: CollectionSource
	workspaceId: string
}) {
	const msg = useTranslation()
	const app = useApp()
	const { addDialog } = useDialogs()
	const { addToast } = useToasts()
	const [renamingId, setRenamingId] = useState<TLCollectionId>()

	const rows = useValue(
		'workspace collections',
		() =>
			source
				.getCollections()
				.filter((collection) => collection.ownerId === workspaceId)
				.map((collection) => ({
					collection,
					itemCount: source.getItems(collection.id).length,
					canRename: source.can('renameCollection', collection.id),
					canDelete: source.can('deleteCollection', collection.id),
				})),
		[source, workspaceId]
	)

	const workspaceOwners = useValue(
		'workspace collection owners',
		() => {
			// By the workspaces' own names, which the collections panel replaces for the home one.
			const names = new Map(
				app.getWorkspaceMemberships().flatMap((m) => (m.group ? [[m.groupId, m.group.name]] : []))
			)
			const owners = source.getCollectionOwners ? source.getCollectionOwners() : []
			return owners.flatMap((owner) => {
				const name = names.get(owner.id)
				return !owner.readOnly && name !== undefined ? [{ ...owner, name }] : []
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

	const renameCollection = (collection: TLCollection, name: string) => {
		setRenamingId(undefined)
		const trimmed = name.trim()
		if (trimmed === '' || trimmed === collection.name) return
		source.renameCollection(collection.id, trimmed).catch(showError)
	}

	const moveCollection = (collection: TLCollection, ownerId: string) => {
		if (!source.moveCollection) return
		const owner = workspaceOwners.find((o) => o.id === ownerId)
		source.moveCollection(collection.id, ownerId).then(() => {
			if (owner) addToast({ title: msg(messages.moved, { name: owner.name }) })
		}, showError)
	}

	const openDeleteConfirmDialog = (collection: TLCollection, itemCount: number) => {
		addDialog({
			component: ({ onClose }) => (
				<ConfirmDialog
					title={<F defaultMessage="Delete collection" />}
					description={
						<F
							defaultMessage="Delete <strong>{name}</strong> and its {count, plural, one {# item} other {# items}}? Copies already placed on canvases stay."
							values={{
								name: collection.name,
								count: itemCount,
								strong: (chunks) => <strong>{chunks}</strong>,
							}}
						/>
					}
					confirmLabel={<F {...messages.delete} />}
					cancelLabel={<F defaultMessage="Cancel" />}
					confirmType="danger"
					onConfirm={() => source.deleteCollection(collection.id).catch(showError)}
					onClose={onClose}
				/>
			),
		})
	}

	if (rows.length === 0) {
		return (
			<p className={styles.collectionsEmpty}>
				<F defaultMessage="No collections in this workspace yet." />
			</p>
		)
	}

	return (
		<div className={styles.collectionsList}>
			{rows.map(({ collection, itemCount, canRename, canDelete }) => (
				<div key={collection.id} className={styles.collectionItem}>
					{renamingId === collection.id ? (
						<RenameInput
							className={styles.dialogInput}
							defaultValue={collection.name}
							onComplete={(name) => renameCollection(collection, name)}
							onCancel={() => setRenamingId(undefined)}
						/>
					) : (
						<span className={styles.collectionName}>{collection.name}</span>
					)}
					<span className={styles.collectionCount}>
						{msg(messages.itemCount, { count: itemCount })}
					</span>
					<CollectionRowMenu
						collection={collection}
						onRename={canRename ? () => setRenamingId(collection.id) : undefined}
						onDelete={canDelete ? () => openDeleteConfirmDialog(collection, itemCount) : undefined}
						moveTargets={
							source.moveCollection && canDelete && workspaceOwners.length > 1
								? workspaceOwners
								: undefined
						}
						onMove={(ownerId) => moveCollection(collection, ownerId)}
					/>
				</div>
			))}
		</div>
	)
}

function CollectionRowMenu({
	collection,
	onRename,
	onDelete,
	moveTargets,
	onMove,
}: {
	collection: TLCollection
	onRename?(): void
	onDelete?(): void
	moveTargets?: TLCollectionOwner[]
	onMove(ownerId: string): void
}) {
	const msg = useTranslation()
	const label = msg(messages.collectionMenu)
	if (!onRename && !onDelete && !moveTargets) return null

	return (
		<TldrawUiDropdownMenuRoot id={`workspace-collection-menu-${collection.id}`}>
			<TldrawUiMenuContextProvider type="menu" sourceId="dialog">
				<TldrawUiDropdownMenuTrigger>
					<TldrawUiButton
						type="icon"
						className={styles.collectionMenuTrigger}
						tooltip={label}
						title={label}
					>
						<TlaIcon icon="dots-vertical-strong" />
					</TldrawUiButton>
				</TldrawUiDropdownMenuTrigger>
				<TldrawUiDropdownMenuContent
					className={styles.collectionMenu}
					side="bottom"
					align="end"
					{...TLA_MENU_POSITION}
				>
					<TldrawUiMenuGroup id="collection-actions">
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
											checked={owner.id === collection.ownerId}
											readonlyOk
											onSelect={() => {
												if (owner.id !== collection.ownerId) onMove(owner.id)
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
