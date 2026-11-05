import {
	defineMessages,
	getIncrementedName,
	TldrawUiButton,
	TldrawUiButtonIcon,
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
import { CollectionPicker } from '../ui/collection-picker'
import { RenameInput } from '../ui/rename-input'
import type { GroupCollections } from './collection-groups'
import { ConfirmDeleteDialog } from './confirm-delete-dialog'
import { createNewCollection } from './new-collection'
import { useOpenPackCatalogue } from './pack-catalogue-dialog'
import { activeCollectionId, renamingCollectionId } from './state'
import { type SaveSelectionOptions, useSaveSelection } from './use-save-selection'

const messages = defineMessages({
	title: { id: 'collections.title', defaultMessage: 'Collections' },
	back: { id: 'collections.back', defaultMessage: 'All collections' },
	addSelection: { id: 'collections.add-selection', defaultMessage: 'Add selection' },
	newCollectionName: { id: 'collections.new-collection-name', defaultMessage: 'New collection' },
	close: { id: 'collections.close', defaultMessage: 'Close' },
	readOnly: { id: 'collections.read-only', defaultMessage: "You can't add to this collection" },
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

export interface CollectionsPanelHeaderProps {
	source: CollectionSource
	collections: TLCollection[]
	/** The collection the panel shows, or undefined when there are none. */
	current?: TLCollection
	/** How many items `current` holds, for the delete confirmation. */
	itemCount: number
	/** The menu's "Sort items by" submenu, when items can be ordered more than one way. */
	sort?: CollectionMenuSort
	/** Set when collections are listed: the header shows a back button and the name, not a picker. */
	onBack?(): void
	/** Set for a section of the panel: the header shows a fold toggle and the name, not a picker. */
	onToggleCollapsed?(): void
	collapsed?: boolean
	/** Shown beside the name, e.g. how many items the collection holds. */
	detail?: string
	/** Names each collection's group in the picker. */
	groupCollections?: GroupCollections
	/** What happens around a save from the header's "+". */
	saving?: SaveSelectionOptions
	/** How the header shows a collection the user can't add to. */
	readOnly?: ReadOnlyOptions
	/** Set to name the panel ("Collections") where the header would otherwise hold the picker. */
	title?: boolean
	/** Set to show a close button at the end of the header. */
	onClose?(): void
	/** Whether the header has the "+" that adds the selection. Defaults to true. */
	addButton?: boolean
	/** Packs the menu offers to browse, and to remove from the panel when `current` is one. */
	catalogue?: PackCatalogue
}

/**
 * What the panel's header holds. `'picker'`: the collection picker, with "+" and ⋯. `'title'`: the
 * panel's name, the ⋯ menu and a close button; the navigation chooses the collection, and with the
 * picker navigation, the picker sits under the header.
 * @public
 */
export type PanelHeader = 'picker' | 'title'

/**
 * How the panel shows a collection the user can't add to. Every field is optional; the defaults
 * show a disabled "+" and no marker.
 * @public
 */
export interface ReadOnlyOptions {
	/** `'disable'` shows the "+" greyed out; `'hide'` leaves it out. */
	addButton?: 'disable' | 'hide'
	/** `'lock'` puts a lock beside the collection's name. */
	marker?: 'none' | 'lock'
}

/** The panel's header: the collection picker, adding the selection, and managing collections. */
export function CollectionsPanelHeader({
	source,
	collections,
	current,
	itemCount,
	sort,
	onBack,
	onToggleCollapsed,
	collapsed = false,
	detail,
	groupCollections,
	saving,
	readOnly = {},
	title = false,
	onClose,
	addButton = true,
	catalogue,
}: CollectionsPanelHeaderProps) {
	const editor = useEditor()
	const msg = useTranslation()
	const { addToast } = useToasts()
	const { addDialog } = useDialogs()
	const { saveSelection } = useSaveSelection(source, saving)
	const openCatalogue = useOpenPackCatalogue(catalogue)
	const currentId = current?.id
	const packId = currentId === undefined ? undefined : catalogue?.getPackId(currentId)
	const renaming = useValue(
		'renaming collection',
		() => currentId !== undefined && renamingCollectionId.get(editor) === currentId,
		[editor, currentId]
	)
	const startRenaming = () => renamingCollectionId.set(editor, currentId ?? null)
	const stopRenaming = () => renamingCollectionId.set(editor, null)

	const can = useValue(
		'collection permissions',
		() => ({
			mayAdd: currentId !== undefined && source.can('addItem', currentId),
			add:
				currentId !== undefined &&
				editor.getSelectedShapeIds().length > 0 &&
				source.can('addItem', currentId),
			create: source.can('createCollection'),
			rename: currentId !== undefined && source.can('renameCollection', currentId),
			delete: currentId !== undefined && source.can('deleteCollection', currentId),
			copy: source.can('createCollection'),
		}),
		[editor, source, currentId]
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

	const createCollection = () => {
		const name = getIncrementedName(
			msg(messages.newCollectionName),
			collections.map((collection) => collection.name)
		)
		createNewCollection(source, name).then((collection) => {
			activeCollectionId.set(editor, collection.id)
			renamingCollectionId.set(editor, collection.id)
		}, showError)
	}

	const renameCollection = (name: string) => {
		stopRenaming()
		const trimmed = name.trim()
		// Collection names are never blank, so clearing the input keeps the old name.
		if (!current || trimmed === '' || trimmed === current.name) return
		source.renameCollection(current.id, trimmed).catch(showError)
	}

	const deleteCollection = () => {
		if (!current) return
		addDialog({
			component: ({ onClose }) => (
				<ConfirmDeleteDialog
					title={msg(messages.deleteTitle)}
					body={msg(messages.deleteBody, { name: current.name, count: itemCount })}
					onClose={onClose}
					onConfirm={() => source.deleteCollection(current.id).catch(showError)}
				/>
			),
		})
	}

	const moveCollection = (ownerId: string) => {
		const owner = owners.find((o) => o.id === ownerId)
		if (!current || !source.moveCollection) return
		source.moveCollection(current.id, ownerId).then(() => {
			addToast({
				title: msg(messages.movedTitle),
				description: owner ? msg(messages.movedDescription, { name: owner.name }) : undefined,
			})
		}, showError)
	}

	const copyToOwner = (ownerId: string) => {
		const owner = owners.find((o) => o.id === ownerId)
		if (!current) return
		copyCollection(source, current.id, ownerId).then(() => {
			addToast({
				title: msg(messages.copiedTitle),
				description: owner ? msg(messages.copiedDescription, { name: owner.name }) : undefined,
			})
		}, showError)
	}

	const moveTargets = owners.filter((o) => !o.readOnly || o.id === current?.ownerId)
	const copyTargets = owners.filter((o) => !o.readOnly && o.id !== current?.ownerId)

	const menu = (
		<CollectionMenu
			id={`collections-collection-menu-${currentId ?? 'panel'}`}
			onCreate={can.create && !onToggleCollapsed ? createCollection : undefined}
			onBrowse={onToggleCollapsed ? undefined : openCatalogue}
			onRemoveFromPanel={
				catalogue && packId !== undefined ? () => catalogue.removePack(packId) : undefined
			}
			onRename={can.rename ? startRenaming : undefined}
			onDelete={can.delete ? deleteCollection : undefined}
			sort={sort}
			move={
				current && source.moveCollection && can.delete && moveTargets.length > 1
					? { owners: moveTargets, value: current.ownerId, onValueChange: moveCollection }
					: undefined
			}
			copy={
				current && can.copy && copyTargets.length > 0
					? { owners: copyTargets, onSelect: copyToOwner }
					: undefined
			}
		/>
	)

	const closeButton = onClose && (
		<TldrawUiButton
			type="icon"
			tooltip={msg(messages.close)}
			title={msg(messages.close)}
			onClick={onClose}
		>
			<TldrawUiButtonIcon icon="cross-2" small />
		</TldrawUiButton>
	)

	const nameControl = (collection: TLCollection) => {
		if (renaming) {
			return (
				<RenameInput
					className="tlui-collections-panel__rename"
					defaultValue={collection.name}
					onComplete={renameCollection}
					onCancel={stopRenaming}
				/>
			)
		}
		if (onToggleCollapsed) {
			return (
				<button
					type="button"
					className="tlui-collections-panel__title tlui-collections-panel__toggle"
					aria-expanded={!collapsed}
					onClick={onToggleCollapsed}
				>
					<span className="tlui-collections-panel__name">{collection.name}</span>
					<TldrawUiIcon icon="chevron-down" label="" small className="tlui-collections-chevron" />
					{detail && <span className="tlui-collections-panel__detail">{detail}</span>}
				</button>
			)
		}
		if (onBack) {
			return (
				<span className="tlui-collections-panel__title">
					<span className="tlui-collections-panel__name">{collection.name}</span>
					{detail && <span className="tlui-collections-panel__detail">{detail}</span>}
				</span>
			)
		}
		if (title) {
			return <span className="tlui-collections-panel__title">{msg(messages.title)}</span>
		}
		return (
			<CollectionPicker
				collections={collections.map((c) => ({
					id: c.id,
					name: c.name,
					detail: groupCollections?.(c),
				}))}
				value={collection.id}
				onValueChange={(id) => activeCollectionId.set(editor, id)}
				label={msg(messages.title)}
			/>
		)
	}

	if (!current) {
		return (
			<header className="tlui-collections-panel__header">
				<span className="tlui-collections-panel__title">{msg(messages.title)}</span>
				<div className="tlui-collections-panel__header-actions">
					{menu}
					{closeButton}
				</div>
			</header>
		)
	}

	return (
		<header className="tlui-collections-panel__header">
			{onBack && (
				<TldrawUiButton
					type="icon"
					className="tlui-collections-panel__back"
					tooltip={msg(messages.back)}
					title={msg(messages.back)}
					onClick={onBack}
				>
					<TldrawUiButtonIcon icon="chevron-left" small />
				</TldrawUiButton>
			)}
			{nameControl(current)}
			<div className="tlui-collections-panel__header-actions">
				{readOnly.marker === 'lock' && !can.mayAdd && (
					<TldrawUiIcon
						className="tlui-collections-panel__lock"
						icon="lock"
						label={msg(messages.readOnly)}
						title={msg(messages.readOnly)}
						small
					/>
				)}
				{addButton && (can.mayAdd || readOnly.addButton !== 'hide') && (
					<TldrawUiButton
						type="icon"
						disabled={!can.add}
						tooltip={msg(messages.addSelection)}
						title={msg(messages.addSelection)}
						onClick={() => saveSelection(current.id)}
					>
						<TldrawUiButtonIcon icon="plus" small />
					</TldrawUiButton>
				)}
				{/* Hidden while renaming: a closing menu hands focus back to its trigger, which would blur
				    the input straight away. */}
				{!renaming && menu}
				{closeButton}
			</div>
		</header>
	)
}
