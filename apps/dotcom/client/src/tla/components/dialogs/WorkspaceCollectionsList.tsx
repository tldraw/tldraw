import {
	CollectionMenu,
	RenameInput,
	type CollectionSource,
	type TLCollection,
	type TLCollectionId,
} from '@tldraw/collections'
import { useState } from 'react'
import { defineMessages, F, useDialogs, useToasts, useTranslation, useValue } from 'tldraw'
import { useApp } from '../../hooks/useAppState'
import { ConfirmDialog } from './ConfirmDialog'
import styles from './dialogs.module.css'

const messages = defineMessages({
	itemCount: { defaultMessage: '{count, plural, one {# item} other {# items}}' },
	moved: { defaultMessage: 'Moved to {name}' },
	changeError: { defaultMessage: "Couldn't change the collection" },
	changeErrorDescription: {
		defaultMessage: 'You may not be allowed to, or the collection no longer exists.',
	},
})

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
			const workspaceIds = new Set(app.getWorkspaceMemberships().map((m) => m.groupId))
			const owners = source.getCollectionOwners ? source.getCollectionOwners() : []
			return owners.filter((owner) => !owner.readOnly && workspaceIds.has(owner.id))
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
							defaultMessage="Delete <strong>{name}</strong>? {count, plural, =0 {} one {Its # item is deleted for everyone in this workspace.} other {Its # items are deleted for everyone in this workspace.}}"
							values={{
								name: collection.name,
								count: itemCount,
								strong: (chunks) => <strong>{chunks}</strong>,
							}}
						/>
					}
					confirmLabel={<F defaultMessage="Delete" />}
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
							className={styles.collectionRename}
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
					<CollectionMenu
						id={`workspace-collection-menu-${collection.id}`}
						onRename={canRename ? () => setRenamingId(collection.id) : undefined}
						onDelete={canDelete ? () => openDeleteConfirmDialog(collection, itemCount) : undefined}
						move={
							source.moveCollection && canDelete && workspaceOwners.length > 1
								? {
										owners: workspaceOwners,
										value: collection.ownerId,
										onValueChange: (ownerId) => moveCollection(collection, ownerId),
									}
								: undefined
						}
					/>
				</div>
			))}
		</div>
	)
}
