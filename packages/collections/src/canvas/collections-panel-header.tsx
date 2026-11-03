import {
	defineMessages,
	getIncrementedName,
	TldrawUiButton,
	TldrawUiButtonIcon,
	useDialogs,
	useEditor,
	useToasts,
	useTranslation,
	useValue,
} from 'tldraw'
import type { CollectionSource } from '../lib/CollectionSource'
import type { TLCollection } from '../lib/schema'
import { CollectionMenu, type CollectionMenuSort } from '../ui/collection-menu'
import { CollectionPicker } from '../ui/collection-picker'
import { RenameInput } from '../ui/rename-input'
import { ConfirmDeleteDialog } from './confirm-delete-dialog'
import { activeCollectionId, renamingCollectionId } from './state'
import { useSaveSelection } from './use-save-selection'

const messages = defineMessages({
	title: { id: 'collections.title', defaultMessage: 'Collections' },
	back: { id: 'collections.back', defaultMessage: 'All collections' },
	expand: { id: 'collections.expand', defaultMessage: 'Show items' },
	collapse: { id: 'collections.collapse', defaultMessage: 'Hide items' },
	addSelection: { id: 'collections.add-selection', defaultMessage: 'Add selection' },
	newCollectionName: { id: 'collections.new-collection-name', defaultMessage: 'New collection' },
	deleteTitle: {
		id: 'collections.delete-collection-dialog.title',
		defaultMessage: 'Delete collection',
	},
	deleteBody: {
		id: 'collections.delete-collection-dialog.body',
		defaultMessage:
			'Delete “{name}” and its {count, plural, one {# item} other {# items}}? Copies already placed on canvases stay.',
	},
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
	/** Set when collections are listed: the header shows a back button and the name, not a picker. */
	onBack?(): void
	/** Set for a section of the panel: the header shows a fold toggle and the name, not a picker. */
	onToggleCollapsed?(): void
	collapsed?: boolean
	/** Shown beside the name, e.g. how many items the collection holds. */
	detail?: string
	/** The menu's "Sort items by" submenu, when items can be ordered more than one way. */
	sort?: CollectionMenuSort
}

/** The panel's header: the collection picker, adding the selection, and managing collections. */
export function CollectionsPanelHeader({
	source,
	collections,
	current,
	itemCount,
	onBack,
	onToggleCollapsed,
	collapsed = false,
	detail,
	sort,
}: CollectionsPanelHeaderProps) {
	const editor = useEditor()
	const msg = useTranslation()
	const { addToast } = useToasts()
	const { addDialog } = useDialogs()
	const { saveSelection } = useSaveSelection(source)
	const currentId = current?.id
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
			add:
				currentId !== undefined &&
				editor.getSelectedShapeIds().length > 0 &&
				source.can('addItem', currentId),
			create: source.can('createCollection'),
			rename: currentId !== undefined && source.can('renameCollection', currentId),
			delete: currentId !== undefined && source.can('deleteCollection', currentId),
		}),
		[editor, source, currentId]
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
		source.createCollection(name).then((collection) => {
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

	const menu = (
		<CollectionMenu
			onCreate={can.create ? createCollection : undefined}
			onRename={can.rename ? startRenaming : undefined}
			onDelete={can.delete ? deleteCollection : undefined}
			sort={sort}
		/>
	)

	if (!current) {
		return (
			<header className="tlui-collections-panel__header">
				<span className="tlui-collections-panel__title">{msg(messages.title)}</span>
				{menu}
			</header>
		)
	}

	return (
		<header className="tlui-collections-panel__header">
			{onToggleCollapsed && (
				<TldrawUiButton
					type="icon"
					className="tlui-collections-panel__back"
					tooltip={msg(collapsed ? messages.expand : messages.collapse)}
					title={msg(collapsed ? messages.expand : messages.collapse)}
					aria-expanded={!collapsed}
					onClick={onToggleCollapsed}
				>
					<TldrawUiButtonIcon icon={collapsed ? 'chevron-right' : 'chevron-down'} small />
				</TldrawUiButton>
			)}
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
			{renaming ? (
				<RenameInput
					className="tlui-collections-panel__rename"
					defaultValue={current.name}
					onComplete={renameCollection}
					onCancel={stopRenaming}
				/>
			) : onBack || onToggleCollapsed ? (
				<span className="tlui-collections-panel__title">
					<span className="tlui-collections-panel__name">{current.name}</span>
					{detail && <span className="tlui-collections-panel__detail">{detail}</span>}
				</span>
			) : (
				<CollectionPicker
					collections={collections}
					value={current.id}
					onValueChange={(id) => activeCollectionId.set(editor, id)}
					label={msg(messages.title)}
				/>
			)}
			<div className="tlui-collections-panel__header-actions">
				<TldrawUiButton
					type="icon"
					disabled={!can.add}
					tooltip={msg(messages.addSelection)}
					title={msg(messages.addSelection)}
					onClick={() => saveSelection(current.id)}
				>
					<TldrawUiButtonIcon icon="plus" small />
				</TldrawUiButton>
				{/* Hidden while renaming: a closing menu hands focus back to its trigger, which would blur
				    the input straight away. */}
				{!renaming && menu}
			</div>
		</header>
	)
}
