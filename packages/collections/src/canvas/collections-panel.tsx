import {
	defineMessages,
	EditorPortal,
	TldrawUiButton,
	TldrawUiButtonIcon,
	useEditor,
	useToasts,
	useTranslation,
	useValue,
} from 'tldraw'
import type { CollectionSource } from '../lib/CollectionSource'
import type { TLCollectionItemId } from '../lib/schema'
import { CollectionPicker } from '../ui/collection-picker'
import { ItemGrid } from '../ui/item-grid'
import { CollectionSourceContext } from './context'
import { placeCollectionItem } from './place-item'
import { activeCollectionId, collectionsPanelOpen } from './state'
import { useSaveSelection } from './use-save-selection'

const messages = defineMessages({
	title: { id: 'collections.title', defaultMessage: 'Collections' },
	empty: { id: 'collections.empty', defaultMessage: 'No collections yet.' },
	emptyCollection: {
		id: 'collections.empty-collection',
		defaultMessage: 'Nothing saved here yet.',
	},
	untitledItem: { id: 'collections.untitled-item', defaultMessage: 'Untitled' },
	addSelection: { id: 'collections.add-selection', defaultMessage: 'Add selection' },
	placeErrorTitle: { id: 'collections.place-error.title', defaultMessage: "Couldn't place item" },
	placeErrorDescription: {
		id: 'collections.place-error.description',
		defaultMessage: 'It may have been deleted. Try again, or pick another item.',
	},
})

/** @public */
export interface CollectionsPanelProps {
	source: CollectionSource
}

/**
 * A floating panel on the left of the canvas for browsing a {@link CollectionSource}, shown while
 * {@link collectionsPanelOpen} is set. Clicking an item places a copy of it on the canvas.
 * @public @react
 */
export function CollectionsPanel({ source }: CollectionsPanelProps) {
	const editor = useEditor()
	const msg = useTranslation()
	const { addToast } = useToasts()
	const open = useValue('collections panel open', () => collectionsPanelOpen.get(editor), [editor])
	const collections = useValue('collections', () => source.getCollections(), [source])
	const activeId = useValue('active collection', () => activeCollectionId.get(editor), [editor])
	// A stale id (the collection was deleted) falls back to the first collection rather than an empty panel.
	const current = collections.find((collection) => collection.id === activeId) ?? collections[0]
	const currentId = current?.id
	const items = useValue('collection items', () => (currentId ? source.getItems(currentId) : []), [
		source,
		currentId,
	])
	const canAdd = useValue(
		'can add to collection',
		() =>
			currentId !== undefined &&
			editor.getSelectedShapeIds().length > 0 &&
			source.can('addItem', currentId),
		[editor, source, currentId]
	)
	const saveSelection = useSaveSelection(source)

	if (!open) return null

	const placeItem = (itemId: TLCollectionItemId) => {
		placeCollectionItem(editor, source, itemId).catch(() => {
			addToast({
				title: msg(messages.placeErrorTitle),
				description: msg(messages.placeErrorDescription),
				severity: 'error',
			})
		})
	}

	return (
		<CollectionSourceContext.Provider value={source}>
			<EditorPortal>
				<section
					className="tlui-collections-panel"
					aria-label={msg(messages.title)}
					onContextMenu={(e) => e.stopPropagation()}
				>
					{current ? (
						<>
							<header className="tlui-collections-panel__header">
								<CollectionPicker
									collections={collections}
									value={current.id}
									onValueChange={(id) => activeCollectionId.set(editor, id)}
									label={msg(messages.title)}
								/>
								<TldrawUiButton
									type="icon"
									disabled={!canAdd}
									tooltip={msg(messages.addSelection)}
									title={msg(messages.addSelection)}
									onClick={() => saveSelection(current.id)}
								>
									<TldrawUiButtonIcon icon="plus" small />
								</TldrawUiButton>
							</header>
							<ItemGrid
								items={items.map((item) => ({
									id: item.id,
									label: item.name ?? msg(messages.untitledItem),
									thumbnailUrl: item.thumbnailUrl,
								}))}
								onSelectItem={placeItem}
								empty={msg(messages.emptyCollection)}
							/>
						</>
					) : (
						<>
							<header className="tlui-collections-panel__header">
								<span className="tlui-collections-panel__title">{msg(messages.title)}</span>
							</header>
							<p className="tlui-collections-panel__empty">{msg(messages.empty)}</p>
						</>
					)}
				</section>
			</EditorPortal>
		</CollectionSourceContext.Provider>
	)
}
