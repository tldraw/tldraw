import {
	defineMessages,
	TldrawUiButton,
	TldrawUiButtonLabel,
	useEditor,
	useToasts,
	useTranslation,
} from 'tldraw'
import type { CollectionSource } from '../lib/CollectionSource'
import { activeCollectionId, renamingCollectionId } from './state'

const messages = defineMessages({
	empty: { id: 'collections.empty', defaultMessage: 'No collections yet.' },
	hint: {
		id: 'collections.empty-hint',
		defaultMessage: 'Select shapes and choose Add to collection to start one.',
	},
	create: { id: 'collections.empty-create', defaultMessage: 'New collection' },
	newCollectionName: { id: 'collections.new-collection-name', defaultMessage: 'New collection' },
	createErrorTitle: {
		id: 'collections.collection-error.title',
		defaultMessage: "Couldn't change collections",
	},
	createErrorDescription: {
		id: 'collections.collection-error.description',
		defaultMessage: 'You may not be allowed to, or the collection no longer exists.',
	},
})

/**
 * What the panel shows before there are any collections. `'message'`: only says so. `'hint'`: also
 * says how to start one. `'create'`: also offers a button that creates one, when the source allows.
 * @public
 */
export type FirstUse = 'message' | 'hint' | 'create'

/** The panel's body when the source has no collections. */
export function NoCollections({
	source,
	firstUse,
}: {
	source: CollectionSource
	firstUse: FirstUse
}) {
	const editor = useEditor()
	const msg = useTranslation()
	const { addToast } = useToasts()
	const canCreate = firstUse === 'create' && source.can('createCollection')

	const create = () =>
		source.createCollection(msg(messages.newCollectionName)).then(
			(collection) => {
				activeCollectionId.set(editor, collection.id)
				renamingCollectionId.set(editor, collection.id)
			},
			() =>
				addToast({
					title: msg(messages.createErrorTitle),
					description: msg(messages.createErrorDescription),
					severity: 'error',
				})
		)

	return (
		<div className="tlui-collections-panel__empty">
			<p>{msg(messages.empty)}</p>
			{firstUse === 'hint' && <p>{msg(messages.hint)}</p>}
			{canCreate && (
				<TldrawUiButton type="primary" onClick={create}>
					<TldrawUiButtonLabel>{msg(messages.create)}</TldrawUiButtonLabel>
				</TldrawUiButton>
			)}
		</div>
	)
}
