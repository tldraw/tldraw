import type { CSSProperties } from 'react'
import {
	defineMessages,
	TldrawUiButton,
	TldrawUiButtonIcon,
	TldrawUiButtonLabel,
	useEditor,
	useTranslation,
	useValue,
} from 'tldraw'
import type { CollectionSource } from '../lib/CollectionSource'
import type { TLCollectionId } from '../lib/schema'
import type { ItemGridAppearance } from '../ui/item-grid'
import { type SaveSelectionOptions, useSaveSelection } from './use-save-selection'

const messages = defineMessages({
	addToCollection: { id: 'collections.add-to-collection', defaultMessage: 'Add to collection' },
})

/**
 * What the panel shows for a collection with no items. `'message'`: says so. `'add'`: faint
 * placeholder tiles with a button that adds the selection to the collection.
 * @public
 */
export type EmptyCollection = 'message' | 'add'

const PLACEHOLDER_ROWS = 3

/** Placeholder tiles in the grid's shape, under a button that adds the selection. */
export function AddFirstItem({
	source,
	collectionId,
	appearance = {},
	saving,
}: {
	source: CollectionSource
	collectionId: TLCollectionId
	appearance?: ItemGridAppearance
	saving?: SaveSelectionOptions
}) {
	const editor = useEditor()
	const msg = useTranslation()
	const { saveSelection } = useSaveSelection(source, saving)
	const canAdd = useValue(
		'can add first item',
		() => editor.getSelectedShapeIds().length > 0 && source.can('addItem', collectionId),
		[editor, source, collectionId]
	)
	const columns = appearance.columns ?? 2

	return (
		<div className="tlui-collections-add-first">
			<ul
				aria-hidden
				className="tlui-collections-grid tlui-collections-add-first__placeholders"
				data-tile-style={appearance.style ?? 'well'}
				style={{ '--tlui-collections-columns': columns } as CSSProperties}
			>
				{Array.from({ length: columns * PLACEHOLDER_ROWS }, (_, i) => (
					<li key={i} className="tlui-collections-tile">
						<div className="tlui-collections-tile__thumbnail" />
					</li>
				))}
			</ul>
			<TldrawUiButton
				type="normal"
				className="tlui-collections-add-first__button"
				disabled={!canAdd}
				onClick={() => saveSelection(collectionId)}
			>
				<TldrawUiButtonIcon icon="plus" small />
				<TldrawUiButtonLabel>{msg(messages.addToCollection)}</TldrawUiButtonLabel>
			</TldrawUiButton>
		</div>
	)
}
