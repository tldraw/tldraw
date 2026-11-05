import {
	defineMessages,
	getIncrementedName,
	useEditor,
	useToasts,
	useTranslation,
	useValue,
} from 'tldraw'
import type { CollectionSource } from '../lib/CollectionSource'
import type { PackCatalogue } from '../lib/PackCatalogue'
import { CollectionMenu } from '../ui/collection-menu'
import { createNewCollection } from './new-collection'
import { useOpenPackCatalogue } from './pack-catalogue-dialog'
import { activeCollectionId, renamingCollectionId } from './state'

const messages = defineMessages({
	title: { id: 'collections.title', defaultMessage: 'Collections' },
	newCollectionName: { id: 'collections.new-collection-name', defaultMessage: 'New collection' },
	changeErrorTitle: {
		id: 'collections.collection-error.title',
		defaultMessage: "Couldn't change collections",
	},
	changeErrorDescription: {
		id: 'collections.collection-error.description',
		defaultMessage: 'You may not be allowed to, or the collection no longer exists.',
	},
})

/** The panel's header: its title, and a ⋯ menu to make a new collection or browse packs. */
export function CollectionsPanelHeader({
	source,
	catalogue,
}: {
	source: CollectionSource
	catalogue?: PackCatalogue
}) {
	const editor = useEditor()
	const msg = useTranslation()
	const { addToast } = useToasts()
	const openCatalogue = useOpenPackCatalogue(catalogue)
	const canCreate = useValue('can create collection', () => source.can('createCollection'), [
		source,
	])

	const createCollection = () => {
		const name = getIncrementedName(
			msg(messages.newCollectionName),
			source.getCollections().map((collection) => collection.name)
		)
		createNewCollection(source, name).then(
			(collection) => {
				activeCollectionId.set(editor, collection.id)
				renamingCollectionId.set(editor, collection.id)
			},
			() =>
				addToast({
					title: msg(messages.changeErrorTitle),
					description: msg(messages.changeErrorDescription),
					severity: 'error',
				})
		)
	}

	return (
		<header className="tlui-collections-panel__header">
			<span className="tlui-collections-panel__title">{msg(messages.title)}</span>
			<div className="tlui-collections-panel__header-actions">
				<CollectionMenu
					id="collections-panel-menu"
					onCreate={canCreate ? createCollection : undefined}
					onBrowse={openCatalogue}
				/>
			</div>
		</header>
	)
}
