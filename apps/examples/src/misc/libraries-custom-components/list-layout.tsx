import type {
	AddSelectionTileProps,
	ItemTileProps,
	LibrariesComponents,
	TLLibraryItem,
} from '@tldraw/libraries'
import { TldrawUiIcon } from 'tldraw'
import type { Showing } from '../libraries-example'
import { PACKS, packSource } from './pack-source'

const DAY = 24 * 60 * 60 * 1000

function ItemRow({
	item,
	accessibleLabel,
	thumbnailUrl,
	buttonProps,
	menu,
}: ItemTileProps & { item: TLLibraryItem }) {
	return (
		<div className="tlui-libraries-tile libraries-showcase-row">
			<button
				type="button"
				className="libraries-showcase-row__button"
				aria-label={accessibleLabel}
				{...buttonProps}
			>
				<span className="libraries-showcase-row__thumbnail">
					{thumbnailUrl && <img src={thumbnailUrl} alt="" draggable={false} />}
				</span>
				<span className="libraries-showcase-row__name">{item.name ?? 'Unnamed'}</span>
				{item.createdAt !== undefined && (
					<span className="libraries-showcase-row__date">
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
		<div className="tlui-libraries-tile libraries-showcase-row">
			<button
				type="button"
				className="libraries-showcase-row__button"
				aria-disabled={!hasSelection}
				onClick={onAddSelection}
			>
				<span className="libraries-showcase-row__thumbnail libraries-showcase-row__add">
					<TldrawUiIcon icon="plus" label="" small />
				</span>
				<span className="libraries-showcase-row__name">
					{hasSelection ? 'Add selection' : 'Select shapes to add them'}
				</span>
			</button>
		</div>
	)
}

const components: LibrariesComponents = { ItemTile: ItemRow, AddSelectionTile: AddSelectionRow }

export const listLayout: Showing = {
	source: packSource('showcase-list', [PACKS.diagramming, PACKS.wireframing], {
		itemFields: (_item, index) => ({ createdAt: Date.now() - index * 3 * DAY }),
	}),
	components,
	cssVariables: { '--tlui-libraries-columns': '1' },
}
