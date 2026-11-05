import { useCallback } from 'react'
import {
	defineMessages,
	TldrawUiButton,
	TldrawUiButtonIcon,
	TldrawUiButtonLabel,
	TldrawUiDialogBody,
	TldrawUiDialogCloseButton,
	TldrawUiDialogHeader,
	TldrawUiDialogTitle,
	useDialogs,
	useTranslation,
	useValue,
} from 'tldraw'
import type { CollectionPack } from '../lib/CollectionPack'
import type { PackCatalogue } from '../lib/PackCatalogue'

const messages = defineMessages({
	title: { id: 'collections.catalogue.title', defaultMessage: 'Browse collections' },
	itemCount: {
		id: 'collections.item-count',
		defaultMessage: '{count, plural, one {# item} other {# items}}',
	},
	add: { id: 'collections.catalogue.add', defaultMessage: 'Add' },
	added: { id: 'collections.catalogue.added', defaultMessage: 'Added' },
	remove: { id: 'collections.catalogue.remove', defaultMessage: 'Remove from panel' },
})

const THUMBNAILS_SHOWN = 4

/**
 * Opens the catalogue of packs, or is undefined when there's no catalogue or it offers no packs.
 */
export function useOpenPackCatalogue(catalogue: PackCatalogue | undefined) {
	const { addDialog } = useDialogs()
	const open = useCallback(() => {
		if (!catalogue) return
		addDialog({ component: () => <PackCatalogueDialog catalogue={catalogue} /> })
	}, [addDialog, catalogue])
	return catalogue && catalogue.getPacks().length > 0 ? open : undefined
}

function PackCatalogueDialog({ catalogue }: { catalogue: PackCatalogue }) {
	const msg = useTranslation()
	return (
		<>
			<TldrawUiDialogHeader>
				<TldrawUiDialogTitle>{msg(messages.title)}</TldrawUiDialogTitle>
				<TldrawUiDialogCloseButton />
			</TldrawUiDialogHeader>
			<TldrawUiDialogBody className="tlui-collections-catalogue">
				<ul className="tlui-collections-catalogue__packs">
					{catalogue.getPacks().map((pack) => (
						<PackRow key={pack.id} catalogue={catalogue} pack={pack} />
					))}
				</ul>
			</TldrawUiDialogBody>
		</>
	)
}

function PackRow({ catalogue, pack }: { catalogue: PackCatalogue; pack: CollectionPack }) {
	const msg = useTranslation()
	const added = useValue('pack added', () => catalogue.isPackAdded(pack.id), [catalogue, pack.id])
	return (
		<li className="tlui-collections-catalogue__pack">
			<div className="tlui-collections-catalogue__text">
				<span className="tlui-collections-catalogue__name">{pack.name}</span>
				<span className="tlui-collections-catalogue__detail">
					{msg(messages.itemCount, { count: pack.items.length })}
				</span>
			</div>
			<TldrawUiButton
				type={added ? 'normal' : 'primary'}
				className="tlui-collections-catalogue__toggle"
				title={added ? msg(messages.remove) : undefined}
				onClick={() => (added ? catalogue.removePack(pack.id) : catalogue.addPack(pack.id))}
			>
				{added && <TldrawUiButtonIcon icon="check" small />}
				<TldrawUiButtonLabel>{msg(added ? messages.added : messages.add)}</TldrawUiButtonLabel>
			</TldrawUiButton>
			<div className="tlui-collections-catalogue__thumbnails" aria-hidden>
				{pack.items.slice(0, THUMBNAILS_SHOWN).map((item) => (
					<span key={item.id} className="tlui-collections-catalogue__thumbnail">
						{item.thumbnailUrl && <img src={item.thumbnailUrl} alt="" draggable={false} />}
					</span>
				))}
			</div>
		</li>
	)
}
