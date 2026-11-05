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
 * The collections the selection can be added to, a group per heading, then a new collection when
 * the source allows creating one. Renders as whichever menu it is placed in.
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
			{targets.groups.map((group, index) => (
				<TldrawUiMenuGroup key={group.label ?? index} id={`add-to-collection-targets-${index}`}>
					{/* Menu groups can't show a heading, and context menus hide disabled items, so a plain
					    element is the heading; keyboard navigation passes over it. */}
					{group.label && (
						<div className="tlui-collections-menu-heading" role="presentation">
							{group.label}
						</div>
					)}
					{group.collections.map((collection) => (
						<TldrawUiMenuItem
							key={collection.id}
							id={`add-to-collection-${collection.id}`}
							label={collection.name}
							onSelect={() => onAdd(collection.id)}
						/>
					))}
				</TldrawUiMenuGroup>
			))}
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
