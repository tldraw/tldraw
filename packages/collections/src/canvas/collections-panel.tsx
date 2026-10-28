import { defineMessages, EditorPortal, useEditor, useTranslation, useValue } from 'tldraw'
import type { CollectionSource } from '../lib/CollectionSource'
import { CollectionSourceContext } from './context'
import { collectionsPanelOpen } from './state'

const messages = defineMessages({
	title: { id: 'collections.title', defaultMessage: 'Collections' },
	empty: { id: 'collections.empty', defaultMessage: 'No collections yet.' },
})

/** @public */
export interface CollectionsPanelProps {
	source: CollectionSource
}

/**
 * A floating panel on the left of the canvas for browsing a {@link CollectionSource}, shown while
 * {@link collectionsPanelOpen} is set.
 * @public @react
 */
export function CollectionsPanel({ source }: CollectionsPanelProps) {
	const editor = useEditor()
	const msg = useTranslation()
	const open = useValue('collections panel open', () => collectionsPanelOpen.get(editor), [editor])
	const collections = useValue('collections', () => source.getCollections(), [source])

	if (!open) return null

	return (
		<CollectionSourceContext.Provider value={source}>
			<EditorPortal>
				<section
					className="tlui-collections-panel"
					aria-label={msg(messages.title)}
					onContextMenu={(e) => e.stopPropagation()}
				>
					<header className="tlui-collections-panel__header">{msg(messages.title)}</header>
					{collections.length === 0 ? (
						<p className="tlui-collections-panel__empty">{msg(messages.empty)}</p>
					) : (
						<ul className="tlui-collections-panel__list">
							{collections.map((collection) => (
								<li key={collection.id}>{collection.name}</li>
							))}
						</ul>
					)}
				</section>
			</EditorPortal>
		</CollectionSourceContext.Provider>
	)
}
