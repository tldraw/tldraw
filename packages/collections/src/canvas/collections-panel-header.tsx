import {
	defineMessages,
	getIncrementedName,
	useEditor,
	useToasts,
	useTranslation,
	useValue,
} from 'tldraw'
import type { CollectionSource } from '../lib/CollectionSource'
import type { TLCollection } from '../lib/schema'
import { CollectionMenu } from '../ui/collection-menu'
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

export interface CollectionsPanelHeaderProps {
	source: CollectionSource
	collections: TLCollection[]
}

/** The panel's header: its title, and a menu for what applies to the panel, such as a new collection. */
export function CollectionsPanelHeader({ source, collections }: CollectionsPanelHeaderProps) {
	const editor = useEditor()
	const msg = useTranslation()
	const { addToast } = useToasts()
	const canCreate = useValue('can create collections', () => source.can('createCollection'), [
		source,
	])
	const renaming = useValue(
		'renaming a collection',
		() => renamingCollectionId.get(editor) !== null,
		[editor]
	)

	const createCollection = () => {
		const name = getIncrementedName(
			msg(messages.newCollectionName),
			collections.map((collection) => collection.name)
		)
		source.createCollection(name).then(
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
			{/* Hidden while a section's name is being edited: a closing menu hands focus back to its
			    trigger, which would blur the new collection's name input straight away. */}
			{!renaming && (
				<CollectionMenu
					id="collections-collection-menu-panel"
					onCreate={canCreate ? createCollection : undefined}
				/>
			)}
		</header>
	)
}
