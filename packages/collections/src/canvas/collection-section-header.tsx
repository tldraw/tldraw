import {
	defineMessages,
	TldrawUiIcon,
	useDialogs,
	useEditor,
	useToasts,
	useTranslation,
	useValue,
} from 'tldraw'
import type { CollectionSource } from '../lib/CollectionSource'
import { copyCollection } from '../lib/copyCollection'
import type { PackCatalogue } from '../lib/PackCatalogue'
import type { TLCollection } from '../lib/schema'
import { CollectionMenu, type CollectionMenuSort } from '../ui/collection-menu'
import { RenameInput } from '../ui/rename-input'
import { ConfirmDeleteDialog } from './confirm-delete-dialog'
import { renamingCollectionId } from './state'

const messages = defineMessages({
	deleteTitle: {
		id: 'collections.delete-collection-dialog.title',
		defaultMessage: 'Delete collection',
	},
	deleteBody: {
		id: 'collections.delete-collection-dialog.body',
		defaultMessage:
			'Delete “{name}” and its {count, plural, one {# item} other {# items}}? Copies already placed on canvases stay.',
	},
	movedTitle: { id: 'collections.moved.title', defaultMessage: 'Moved' },
	movedDescription: { id: 'collections.moved.description', defaultMessage: 'Moved to {name}.' },
	copiedTitle: { id: 'collections.copied.title', defaultMessage: 'Copied' },
	copiedDescription: { id: 'collections.copied.description', defaultMessage: 'Copied to {name}.' },
	changeErrorTitle: {
		id: 'collections.collection-error.title',
		defaultMessage: "Couldn't change collections",
	},
	changeErrorDescription: {
		id: 'collections.collection-error.description',
		defaultMessage: 'You may not be allowed to, or the collection no longer exists.',
	},
})

export interface CollectionSectionHeaderProps {
	source: CollectionSource
	collection: TLCollection
	collapsed: boolean
	onToggleCollapsed(): void
	/** The menu's "Sort items by" submenu. */
	sort: CollectionMenuSort
	/** Packs, when `collection` is one, which the menu offers to remove from the panel. */
	catalogue?: PackCatalogue
}

/**
 * A collection's section header: its name, which folds the section, and its ⋯ menu to rename,
 * delete, sort, move and copy it. The name turns into an input while it's being renamed.
 */
export function CollectionSectionHeader({
	source,
	collection,
	collapsed,
	onToggleCollapsed,
	sort,
	catalogue,
}: CollectionSectionHeaderProps) {
	const editor = useEditor()
	const msg = useTranslation()
	const { addToast } = useToasts()
	const { addDialog } = useDialogs()
	const collectionId = collection.id
	const packId = catalogue?.getPackId(collectionId)
	const renaming = useValue(
		'renaming collection',
		() => renamingCollectionId.get(editor) === collectionId,
		[editor, collectionId]
	)
	const stopRenaming = () => renamingCollectionId.set(editor, null)

	const can = useValue(
		'collection permissions',
		() => ({
			rename: source.can('renameCollection', collectionId),
			delete: source.can('deleteCollection', collectionId),
			copy: source.can('createCollection'),
		}),
		[source, collectionId]
	)
	const owners = useValue(
		'collection owners',
		() => (source.getCollectionOwners ? source.getCollectionOwners() : []),
		[source]
	)

	const showError = () =>
		addToast({
			title: msg(messages.changeErrorTitle),
			description: msg(messages.changeErrorDescription),
			severity: 'error',
		})

	const renameCollection = (name: string) => {
		stopRenaming()
		const trimmed = name.trim()
		// Collection names are never blank, so clearing the input keeps the old name.
		if (trimmed === '' || trimmed === collection.name) return
		source.renameCollection(collectionId, trimmed).catch(showError)
	}

	const deleteCollection = () => {
		const count = source.getItems(collectionId).length
		addDialog({
			component: ({ onClose }) => (
				<ConfirmDeleteDialog
					title={msg(messages.deleteTitle)}
					body={msg(messages.deleteBody, { name: collection.name, count })}
					onClose={onClose}
					onConfirm={() => source.deleteCollection(collectionId).catch(showError)}
				/>
			),
		})
	}

	const moveCollection = (ownerId: string) => {
		const owner = owners.find((o) => o.id === ownerId)
		if (!source.moveCollection) return
		source.moveCollection(collectionId, ownerId).then(() => {
			addToast({
				title: msg(messages.movedTitle),
				description: owner ? msg(messages.movedDescription, { name: owner.name }) : undefined,
			})
		}, showError)
	}

	const copyToOwner = (ownerId: string) => {
		const owner = owners.find((o) => o.id === ownerId)
		copyCollection(source, collectionId, ownerId).then(() => {
			addToast({
				title: msg(messages.copiedTitle),
				description: owner ? msg(messages.copiedDescription, { name: owner.name }) : undefined,
			})
		}, showError)
	}

	const moveTargets = owners.filter((o) => !o.readOnly || o.id === collection.ownerId)
	const copyTargets = owners.filter((o) => !o.readOnly && o.id !== collection.ownerId)

	return (
		<header className="tlui-collections-panel__header">
			{renaming ? (
				<RenameInput
					className="tlui-collections-panel__rename"
					defaultValue={collection.name}
					onComplete={renameCollection}
					onCancel={stopRenaming}
				/>
			) : (
				<button
					type="button"
					className="tlui-collections-panel__title tlui-collections-panel__toggle"
					aria-expanded={!collapsed}
					onClick={onToggleCollapsed}
				>
					<span className="tlui-collections-panel__name">{collection.name}</span>
					<TldrawUiIcon icon="chevron-down" label="" small className="tlui-collections-chevron" />
				</button>
			)}
			<div className="tlui-collections-panel__header-actions">
				{/* Hidden while renaming: a closing menu hands focus back to its trigger, which would blur
				    the input straight away. */}
				{!renaming && (
					<CollectionMenu
						id={`collections-collection-menu-${collectionId}`}
						onRemoveFromPanel={
							catalogue && packId !== undefined ? () => catalogue.removePack(packId) : undefined
						}
						onRename={can.rename ? () => renamingCollectionId.set(editor, collectionId) : undefined}
						onDelete={can.delete ? deleteCollection : undefined}
						sort={sort}
						move={
							source.moveCollection && can.delete && moveTargets.length > 1
								? {
										owners: moveTargets,
										value: collection.ownerId,
										onValueChange: moveCollection,
									}
								: undefined
						}
						copy={
							can.copy && copyTargets.length > 0
								? { owners: copyTargets, onSelect: copyToOwner }
								: undefined
						}
					/>
				)}
			</div>
		</header>
	)
}
