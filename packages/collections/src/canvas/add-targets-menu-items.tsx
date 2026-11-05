import { defineMessages, useTranslation } from 'tldraw'
import type { TLCollectionId } from '../lib/schema'
import { MenuItem } from '../ui/menu-items'
import type { AddTargets } from './use-add-targets'

const messages = defineMessages({
	newCollection: {
		id: 'collections.add-to-new-collection',
		defaultMessage: 'New collection',
	},
})

/**
 * The collections the selection can be added to, then a new collection when the source allows
 * creating one.
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
	const msg = useTranslation()
	return (
		<>
			{targets.collections.map((collection) => (
				<MenuItem
					key={collection.id}
					label={collection.name}
					onClick={() => onAdd(collection.id)}
				/>
			))}
			{targets.canCreate && <MenuItem label={msg(messages.newCollection)} onClick={onAddToNew} />}
		</>
	)
}
