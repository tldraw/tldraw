import {
	activeLibraryId,
	LibraryMenuItem,
	type LibraryPack,
	type LibrarySource,
	librariesPanelOpen,
	getThumbnailForColorMode,
} from '@tldraw/libraries'
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
import {
	addStarterPack,
	canAddStarterPack,
	isStarterPackAdded,
	STARTER_PACKS,
} from './starterPacks'
import styles from './TlaStarterPacksDialog.module.css'

const messages = defineMessages({
	browse: { defaultMessage: 'Browse starter packs…' },
	itemCount: { defaultMessage: '{count, plural, one {# item} other {# items}}' },
	add: { defaultMessage: 'Add' },
	added: { defaultMessage: 'Added' },
	addedDescription: { defaultMessage: 'Added {pack} to your libraries.' },
	open: { defaultMessage: 'Open' },
	addError: { defaultMessage: "Couldn't add" },
	addErrorDescription: {
		defaultMessage: 'You may not be allowed to create libraries, or copying failed.',
	},
})

const THUMBNAILS_SHOWN = 4

export function TlaBrowseStarterPacksMenuItem({ source }: { source: LibrarySource }) {
	const msg = useTranslation()
	const { addDialog } = useDialogs()
	return (
		<LibraryMenuItem
			label={msg(messages.browse)}
			onClick={() =>
				addDialog({
					component: () => <TlaStarterPacksDialog source={source} />,
				})
			}
		/>
	)
}

function TlaStarterPacksDialog({ source }: { source: LibrarySource }) {
	return (
		<>
			<TldrawUiDialogHeader>
				<TldrawUiDialogTitle>
					<F defaultMessage="Starter packs" />
				</TldrawUiDialogTitle>
				<TldrawUiDialogCloseButton />
			</TldrawUiDialogHeader>
			<TldrawUiDialogBody className={styles.body}>
				<ul className={styles.packs}>
					{STARTER_PACKS.map((pack) => (
						<StarterPack key={pack.id} source={source} pack={pack} />
					))}
				</ul>
			</TldrawUiDialogBody>
		</>
	)
}

function StarterPack({ source, pack }: { source: LibrarySource; pack: LibraryPack }) {
	const editor = useEditor()
	const msg = useTranslation()
	const { addToast } = useToasts()
	const [adding, setAdding] = useState(false)
	const added = useValue('starter pack added', () => isStarterPackAdded(source, pack.id), [
		source,
		pack.id,
	])
	const colorMode = useValue('color mode', () => editor.getColorMode(), [editor])
	const canAdd = useValue('can add starter pack', () => canAddStarterPack(source), [source])

	const add = () => {
		setAdding(true)
		addStarterPack(source, pack)
			.then(
				(library) => {
					activeLibraryId.set(editor, library.id)
					addToast({
						title: msg(messages.added),
						description: msg(messages.addedDescription, { pack: pack.name }),
						actions: [
							{
								label: msg(messages.open),
								type: 'primary',
								onClick: () => {
									activeLibraryId.set(editor, library.id)
									librariesPanelOpen.set(editor, true)
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
						{item.thumbnail && (
							<img
								src={getThumbnailForColorMode(item.thumbnail, colorMode)}
								alt=""
								draggable={false}
							/>
						)}
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
