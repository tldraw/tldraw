import {
	activeCollectionId,
	CollectionMenuItem,
	type CollectionPack,
	type CollectionSource,
	collectionsPanelOpen,
} from '@tldraw/collections'
import { useState } from 'react'
import {
	defineMessages,
	F,
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
import { addStarterPack, isStarterPackAdded, STARTER_PACKS } from './starterPacks'
import styles from './TlaStarterPacksDialog.module.css'

const messages = defineMessages({
	browse: { defaultMessage: 'Browse collections…' },
	itemCount: { defaultMessage: '{count, plural, one {# item} other {# items}}' },
	add: { defaultMessage: 'Add' },
	added: { defaultMessage: 'Added' },
	addedDescription: { defaultMessage: 'Added {pack} to your private collections.' },
	open: { defaultMessage: 'Open' },
	addError: { defaultMessage: "Couldn't add" },
	addErrorDescription: {
		defaultMessage: 'You may not be allowed to create collections, or copying failed.',
	},
})

const THUMBNAILS_SHOWN = 4

export function TlaBrowseStarterPacksMenuItem({
	source,
	ownerId,
}: {
	source: CollectionSource
	ownerId: string
}) {
	const msg = useTranslation()
	const { addDialog } = useDialogs()
	return (
		<CollectionMenuItem
			label={msg(messages.browse)}
			onClick={() =>
				addDialog({
					component: () => <TlaStarterPacksDialog source={source} ownerId={ownerId} />,
				})
			}
		/>
	)
}

function TlaStarterPacksDialog({ source, ownerId }: { source: CollectionSource; ownerId: string }) {
	return (
		<>
			<TldrawUiDialogHeader>
				<TldrawUiDialogTitle>
					<F defaultMessage="Browse collections" />
				</TldrawUiDialogTitle>
				<TldrawUiDialogCloseButton />
			</TldrawUiDialogHeader>
			<TldrawUiDialogBody className={styles.body}>
				<ul className={styles.packs}>
					{STARTER_PACKS.map((pack) => (
						<StarterPack key={pack.id} source={source} pack={pack} ownerId={ownerId} />
					))}
				</ul>
			</TldrawUiDialogBody>
		</>
	)
}

function StarterPack({
	source,
	pack,
	ownerId,
}: {
	source: CollectionSource
	pack: CollectionPack
	ownerId: string
}) {
	const editor = useEditor()
	const msg = useTranslation()
	const { addToast } = useToasts()
	const [adding, setAdding] = useState(false)
	const added = useValue('starter pack added', () => isStarterPackAdded(source, pack.id, ownerId), [
		source,
		pack.id,
		ownerId,
	])
	const canAdd = useValue('can add starter pack', () => source.can('createCollection'), [source])

	const add = () => {
		setAdding(true)
		addStarterPack(source, pack, ownerId)
			.then(
				(collection) => {
					activeCollectionId.set(editor, collection.id)
					addToast({
						title: msg(messages.added),
						description: msg(messages.addedDescription, { pack: pack.name }),
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
						title: msg(messages.addError),
						description: msg(messages.addErrorDescription),
						severity: 'error',
					})
			)
			.finally(() => setAdding(false))
	}

	return (
		<li className={styles.pack}>
			<div className={styles.thumbnails} aria-hidden>
				{pack.items.slice(0, THUMBNAILS_SHOWN).map((item) => (
					<span key={item.id} className={styles.thumbnail}>
						{item.thumbnailUrl && <img src={item.thumbnailUrl} alt="" draggable={false} />}
					</span>
				))}
			</div>
			<div className={styles.footer}>
				<div className={styles.text}>
					<span className={styles.name}>{pack.name}</span>
					<span className={styles.detail}>
						{msg(messages.itemCount, { count: pack.items.length })}
					</span>
				</div>
				<TldrawUiButton
					type={added ? 'normal' : 'primary'}
					className={styles.toggle}
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
