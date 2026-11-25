import {
	type AddSelectionTileProps,
	type ItemTileProps,
	type LibrariesComponents,
	LibrariesPanel,
	librariesPanelOpen,
	LibrariesQuickActions,
	type TLLibraryItem,
} from '@tldraw/libraries'
import { TLComponents, Tldraw, TldrawUiIcon } from 'tldraw'
import '@tldraw/libraries/libraries.css'
import 'tldraw/tldraw.css'
import { PACKS, packSource } from '../../../libraries-fixtures/packs'
import './libraries-list-layout.css'

const DAY = 24 * 60 * 60 * 1000

const source = packSource('libraries-list-layout', [PACKS.diagramming, PACKS.wireframing], {
	itemFields: (_item, index) => ({ createdAt: Date.now() - index * 3 * DAY }),
})

// [1]
function ItemRow({
	item,
	accessibleLabel,
	thumbnailUrl,
	buttonProps,
	menu,
}: ItemTileProps & { item: TLLibraryItem }) {
	return (
		<div className="tlui-libraries-tile libraries-list-row">
			<button
				type="button"
				className="libraries-list-row__button"
				aria-label={accessibleLabel}
				{...buttonProps}
			>
				<span className="libraries-list-row__thumbnail">
					{thumbnailUrl && <img src={thumbnailUrl} alt="" draggable={false} />}
				</span>
				<span className="libraries-list-row__name">{item.name ?? 'Unnamed'}</span>
				{item.createdAt !== undefined && (
					<span className="libraries-list-row__date">
						{new Date(item.createdAt).toLocaleDateString(undefined, {
							month: 'short',
							day: 'numeric',
						})}
					</span>
				)}
			</button>
			{menu && <div className="tlui-libraries-tile__menu">{menu}</div>}
		</div>
	)
}

function AddSelectionRow({ hasSelection, onAddSelection }: AddSelectionTileProps) {
	return (
		<div className="tlui-libraries-tile libraries-list-row">
			<button
				type="button"
				className="libraries-list-row__button"
				aria-disabled={!hasSelection}
				onClick={onAddSelection}
			>
				<span className="libraries-list-row__thumbnail libraries-list-row__add">
					<TldrawUiIcon icon="plus" label="" small />
				</span>
				<span className="libraries-list-row__name">
					{hasSelection ? 'Add selection' : 'Select shapes to add them'}
				</span>
			</button>
		</div>
	)
}

const librariesComponents: LibrariesComponents = {
	ItemTile: ItemRow,
	AddSelectionTile: AddSelectionRow,
}

const components: TLComponents = {
	InFrontOfTheCanvas: () => <LibrariesPanel source={source} components={librariesComponents} />,
	QuickActions: LibrariesQuickActions,
}

export default function LibrariesListLayoutExample() {
	return (
		// [2]
		<div className="tldraw__editor libraries-list-layout">
			<Tldraw
				components={components}
				onMount={(editor) => {
					librariesPanelOpen.set(editor, true)
				}}
			/>
		</div>
	)
}

/*
[1]
An `ItemTile` override can replace the tile entirely. Spreading `buttonProps` onto its button
keeps clicking and dragging the item, and rendering `menu` keeps the menu its right-click opens.

[2]
`--tlui-libraries-columns` sets how many tiles sit in a row. Set on an element around the panel,
one column turns the grid into a list.
*/
