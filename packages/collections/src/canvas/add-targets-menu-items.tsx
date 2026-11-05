import { defineMessages, TldrawUiMenuGroup, TldrawUiMenuItem } from 'tldraw'
import type { TLCollectionId } from '../lib/schema'
import type { AddTargets } from './use-add-targets'

const messages = defineMessages({
	newCollection: {
		id: 'collections.add-to-new-collection',
		defaultMessage: 'New collection',
	},
})

/**
 * The collections the selection can be added to, then a new collection when the source allows
 * creating one, each in its own group. Renders as whichever menu it is placed in.
 */
export function AddTargetsMenuItems({
	targets,
	onAdd,
	onAddToNew,
}: {
	targets: AddTargets
	onAdd(collectionId: TLCollectionId): void
	onAddToNew(): void
}) {
	return (
		<>
			{targets.collections.length > 0 && (
				<TldrawUiMenuGroup id="add-to-collection-targets">
					{targets.collections.map((collection) => (
						<TldrawUiMenuItem
							key={collection.id}
							id={`add-to-collection-${collection.id}`}
							label={collection.name}
							onSelect={() => onAdd(collection.id)}
						/>
					))}
				</TldrawUiMenuGroup>
			)}
			{targets.canCreate && (
				<TldrawUiMenuGroup id="add-to-new-collection">
					<TldrawUiMenuItem
						id="add-to-new-collection"
						label={messages.newCollection.id}
						iconLeft="plus"
						onSelect={onAddToNew}
					/>
				</TldrawUiMenuGroup>
			)}
		</>
	)
}
