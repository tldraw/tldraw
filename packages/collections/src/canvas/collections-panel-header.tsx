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
import { CollectionMenu } from '../ui/collection-menu'
import { CollectionPicker } from '../ui/collection-picker'
import { RenameInput } from '../ui/rename-input'
import { ConfirmDeleteDialog } from './confirm-delete-dialog'
import { activeCollectionId, renamingCollectionId } from './state'
import { useSaveSelection } from './use-save-selection'

const messages = defineMessages({
	title: { id: 'collections.title', defaultMessage: 'Collections' },
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
}

/** The panel's header: the collection picker, adding the selection, and managing collections. */
export function CollectionsPanelHeader({
	source,
	collections,
	current,
	itemCount,
}: CollectionsPanelHeaderProps) {
	const editor = useEditor()
	const msg = useTranslation()
	const { addToast } = useToasts()
	const { addDialog } = useDialogs()
	const saveSelection = useSaveSelection(source)
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
			{renaming ? (
				<RenameInput
					className="tlui-collections-panel__rename"
					defaultValue={current.name}
					onComplete={renameCollection}
					onCancel={stopRenaming}
				/>
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
