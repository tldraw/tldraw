export { CollectionsPanel, type CollectionsPanelProps } from './canvas/collections-panel'
export { CollectionsPanelButton } from './canvas/collections-panel-button'
export { useCollectionSource } from './canvas/context'
export { collectionsPanelOpen, toggleCollectionsPanel } from './canvas/state'
export {
	CollectionNotFoundError,
	CollectionPermissionError,
	type CollectionSource,
	type TLCollectionAction,
	type TLNewCollectionItem,
} from './lib/CollectionSource'
export {
	InMemoryCollectionSource,
	type InMemoryCollectionSourceOptions,
} from './lib/InMemoryCollectionSource'
export {
	CollectionItemContentTooNewError,
	CollectionItemRecordType,
	collectionItemMigrations,
	collectionMigrations,
	CollectionRecordType,
	CURRENT_ITEM_CONTENT_FORMAT_VERSION,
	collectionItemValidator,
	collectionValidator,
	parseCollectionItemContent,
	type TLCollection,
	type TLCollectionId,
	type TLCollectionItem,
	type TLCollectionItemContent,
	type TLCollectionItemId,
	type TLCollectionRecord,
} from './lib/schema'
