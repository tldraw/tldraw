import { useCallback, useState } from 'react'
import {
	defineMessages,
	getIncrementedName,
	TldrawUiButton,
	TldrawUiButtonIcon,
	TldrawUiButtonLabel,
	TldrawUiDialogBody,
	TldrawUiDialogCloseButton,
	TldrawUiDialogHeader,
	TldrawUiDialogTitle,
	useDialogs,
	useEditor,
	useToasts,
	useTranslation,
	useValue,
} from 'tldraw'
import type { CollectionPack } from '../lib/CollectionPack'
import type { CollectionSource } from '../lib/CollectionSource'
import { copyPack, getPackCopyMeta } from '../lib/copyPack'
import { activeCollectionId, collectionsPanelOpen } from './state'

const messages = defineMessages({
	title: { id: 'collections.catalogue.title', defaultMessage: 'Browse collections' },
	itemCount: {
		id: 'collections.item-count',
		defaultMessage: '{count, plural, one {# item} other {# items}}',
	},
	add: { id: 'collections.catalogue.add', defaultMessage: 'Add' },
	added: { id: 'collections.catalogue.added', defaultMessage: 'Added' },
	addedTitle: { id: 'collections.catalogue.added-toast.title', defaultMessage: 'Added' },
	addedTo: {
		id: 'collections.catalogue.added-toast.description',
		defaultMessage: 'Added {pack} to {owner}.',
	},
	addedToPrivate: {
		id: 'collections.catalogue.added-toast.description-private',
		defaultMessage: 'Added {pack} to your private collections.',
	},
	addedDescription: {
		id: 'collections.catalogue.added-toast.description-no-owner',
		defaultMessage: 'Added {pack}.',
	},
	open: { id: 'collections.saved.open', defaultMessage: 'Open' },
	addErrorTitle: { id: 'collections.catalogue.add-error.title', defaultMessage: "Couldn't add" },
	addErrorDescription: {
		id: 'collections.catalogue.add-error.description',
		defaultMessage: 'You may not be allowed to create collections, or copying failed.',
	},
})

const THUMBNAILS_SHOWN = 4

const defaultOwnerOf = (source: CollectionSource) =>
	source.getDefaultOwnerId ? source.getDefaultOwnerId() : undefined

/**
 * Opens the catalogue of packs, or is undefined when there are no packs. Adding a pack copies it
 * into the source's default owner.
 */
export function useOpenPackCatalogue(
	source: CollectionSource,
	catalogue: readonly CollectionPack[] | undefined
) {
	const { addDialog } = useDialogs()
	const open = useCallback(() => {
		if (!catalogue) return
		addDialog({ component: () => <PackCatalogueDialog source={source} catalogue={catalogue} /> })
	}, [addDialog, source, catalogue])
	return catalogue && catalogue.length > 0 ? open : undefined
}

function PackCatalogueDialog({
	source,
	catalogue,
}: {
	source: CollectionSource
	catalogue: readonly CollectionPack[]
}) {
	const msg = useTranslation()
	return (
		<>
			<TldrawUiDialogHeader>
				<TldrawUiDialogTitle>{msg(messages.title)}</TldrawUiDialogTitle>
				<TldrawUiDialogCloseButton />
			</TldrawUiDialogHeader>
			<TldrawUiDialogBody className="tlui-collections-catalogue">
				<ul className="tlui-collections-catalogue__packs">
					{catalogue.map((pack) => (
						<PackRow key={pack.id} source={source} pack={pack} />
					))}
				</ul>
			</TldrawUiDialogBody>
		</>
	)
}

function PackRow({ source, pack }: { source: CollectionSource; pack: CollectionPack }) {
	const editor = useEditor()
	const msg = useTranslation()
	const { addToast } = useToasts()
	const [adding, setAdding] = useState(false)
	// Added while the default owner holds a copy of this pack; deleting the copy offers it again.
	const added = useValue(
		'pack added',
		() => {
			const ownerId = defaultOwnerOf(source)
			return source
				.getCollections()
				.some((c) => c.ownerId === ownerId && getPackCopyMeta(c)?.packId === pack.id)
		},
		[source, pack.id]
	)
	const canAdd = useValue('can add pack', () => source.can('createCollection'), [source])

	const add = () => {
		const ownerId = defaultOwnerOf(source)
		const owners = source.getCollectionOwners ? source.getCollectionOwners() : []
		const owner = owners.find((o) => o.id === ownerId)
		const name = getIncrementedName(
			pack.name,
			source.getCollections().map((c) => c.name)
		)
		const addedDescription = () => {
			if (!owner) return msg(messages.addedDescription, { pack: pack.name })
			if (owner.private) return msg(messages.addedToPrivate, { pack: pack.name })
			return msg(messages.addedTo, { pack: pack.name, owner: owner.name })
		}
		setAdding(true)
		copyPack(source, pack, { name, ...(ownerId === undefined ? {} : { ownerId }) })
			.then(
				(collection) => {
					activeCollectionId.set(editor, collection.id)
					addToast({
						title: msg(messages.addedTitle),
						description: addedDescription(),
						actions: [
							{
								label: msg(messages.open),
								type: 'primary',
								onClick: () => {
									activeCollectionId.set(editor, collection.id)
									collectionsPanelOpen.set(editor, true)
								},
							},
						],
					})
				},
				() =>
					addToast({
						title: msg(messages.addErrorTitle),
						description: msg(messages.addErrorDescription),
						severity: 'error',
					})
			)
			.finally(() => setAdding(false))
	}

	return (
		<li className="tlui-collections-catalogue__pack">
			<div className="tlui-collections-catalogue__thumbnails" aria-hidden>
				{pack.items.slice(0, THUMBNAILS_SHOWN).map((item) => (
					<span key={item.id} className="tlui-collections-catalogue__thumbnail">
						{item.thumbnailUrl && <img src={item.thumbnailUrl} alt="" draggable={false} />}
					</span>
				))}
			</div>
			<div className="tlui-collections-catalogue__footer">
				<div className="tlui-collections-catalogue__text">
					<span className="tlui-collections-catalogue__name">{pack.name}</span>
					<span className="tlui-collections-catalogue__detail">
						{msg(messages.itemCount, { count: pack.items.length })}
					</span>
				</div>
				<TldrawUiButton
					type={added ? 'normal' : 'primary'}
					className="tlui-collections-catalogue__toggle"
					disabled={added || adding || !canAdd}
					onClick={add}
				>
					{added && <TldrawUiButtonIcon icon="check" small />}
					<TldrawUiButtonLabel>{msg(added ? messages.added : messages.add)}</TldrawUiButtonLabel>
				</TldrawUiButton>
			</div>
		</li>
	)
}
