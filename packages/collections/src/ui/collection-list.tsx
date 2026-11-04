import { ReactNode } from 'react'

/** @public */
export interface CollectionListItem<Id extends string = string> {
	id: Id
	name: string
	/** Shown beside the name, e.g. how many items the collection holds. */
	detail?: string
}

/** @public */
export interface CollectionListProps<Id extends string = string> {
	collections: CollectionListItem<Id>[]
	onOpen(id: Id): void
	/** Shown when there are no collections. */
	empty: ReactNode
}

/** @public @react */
export function CollectionList<Id extends string>({
	collections,
	onOpen,
	empty,
}: CollectionListProps<Id>) {
	if (collections.length === 0) return <p className="tlui-collections-panel__empty">{empty}</p>

	return (
		<ul className="tlui-collections-list">
			{collections.map((collection) => (
				<li key={collection.id}>
					<button
						type="button"
						className="tlui-collections-list__row"
						onClick={() => onOpen(collection.id)}
					>
						<span className="tlui-collections-list__name">{collection.name}</span>
						{collection.detail && (
							<span className="tlui-collections-list__detail">{collection.detail}</span>
						)}
					</button>
				</li>
			))}
		</ul>
	)
}
