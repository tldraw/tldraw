import {
	activeLibraryId,
	LibraryMenuItem,
	librariesPanelOpen,
	getThumbnailForColorMode,
} from '@tldraw/libraries'
import { useEffect } from 'react'
import {
	defineMessages,
	F,
	TldrawUiButton,
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
	type TLLibrary,
} from 'tldraw'
import {
	getStarterPackLibraryId,
	type StarterPackEntry,
	type StarterPacksSource,
} from './starterPacks'
import styles from './TlaStarterPacksDialog.module.css'

const messages = defineMessages({
	browse: { defaultMessage: 'Browse starter packs…' },
	itemCount: { defaultMessage: '{count, plural, one {# item} other {# items}}' },
	loading: { defaultMessage: 'Loading…' },
	add: { defaultMessage: 'Add' },
	remove: { defaultMessage: 'Remove' },
	added: { defaultMessage: 'Added' },
	addedDescription: { defaultMessage: 'Added {pack} to your libraries.' },
	open: { defaultMessage: 'Open' },
})

const THUMBNAILS_SHOWN = 4

/** Drops a pack the user added from their list, from the pack's own ⋯ menu in the panel. */
export function TlaRemoveStarterPackMenuItem({
	packs,
	library,
}: {
	packs: StarterPacksSource
	library: TLLibrary
}) {
	const msg = useTranslation()
	const packId = library.meta.packId
	if (typeof packId !== 'string') return null
	return (
		<LibraryMenuItem label={msg(messages.remove)} onClick={() => packs.setAdded(packId, false)} />
	)
}

export function TlaBrowseStarterPacksMenuItem({ packs }: { packs: StarterPacksSource }) {
	const msg = useTranslation()
	const { addDialog } = useDialogs()
	return (
		<LibraryMenuItem
			label={msg(messages.browse)}
			onClick={() =>
				addDialog({
					component: () => <TlaStarterPacksDialog packs={packs} />,
				})
			}
		/>
	)
}

function TlaStarterPacksDialog({ packs }: { packs: StarterPacksSource }) {
	const msg = useTranslation()
	const entries = useValue('starter pack entries', () => packs.getEntries(), [packs])
	// Also retries a list that failed to load at startup.
	useEffect(() => {
		void packs.refresh()
	}, [packs])
	return (
		<>
			<TldrawUiDialogHeader>
				<TldrawUiDialogTitle>
					<F defaultMessage="Starter packs" />
				</TldrawUiDialogTitle>
				<TldrawUiDialogCloseButton />
			</TldrawUiDialogHeader>
			<TldrawUiDialogBody className={styles.body}>
				{entries.length === 0 ? (
					<p className={styles.detail}>{msg(messages.loading)}</p>
				) : (
					<ul className={styles.packs}>
						{entries.map((entry) => (
							<StarterPack key={entry.id} packs={packs} entry={entry} />
						))}
					</ul>
				)}
			</TldrawUiDialogBody>
		</>
	)
}

function StarterPack({ packs, entry }: { packs: StarterPacksSource; entry: StarterPackEntry }) {
	const editor = useEditor()
	const msg = useTranslation()
	const { addToast } = useToasts()
	const added = useValue('starter pack added', () => packs.isAdded(entry.id), [packs, entry.id])
	const pack = useValue('starter pack', () => packs.getPack(entry.id), [packs, entry.id])
	const failed = useValue('starter pack failed', () => packs.hasFailed(entry.id), [packs, entry.id])
	const colorMode = useValue('color mode', () => editor.getColorMode(), [editor])
	const name = pack?.name ?? entry.name

	if (failed) return null

	// Adding stores the pack's id, nothing else: the pack shows read-only under tldraw, and
	// removing it loses nothing.
	const toggle = () => {
		if (added) {
			packs.setAdded(entry.id, false)
			return
		}
		packs.setAdded(entry.id, true)
		const libraryId = getStarterPackLibraryId(entry.id)
		activeLibraryId.set(editor, libraryId)
		addToast({
			title: msg(messages.added),
			description: msg(messages.addedDescription, { pack: name }),
			actions: [
				{
					label: msg(messages.open),
					type: 'primary',
					onClick: () => {
						activeLibraryId.set(editor, libraryId)
						librariesPanelOpen.set(editor, true)
					},
				},
			],
		})
	}

	return (
		<li className={styles.pack}>
			<div className={styles.thumbnails} aria-hidden>
				{pack
					? pack.items.slice(0, THUMBNAILS_SHOWN).map((item) => (
							<span key={item.id} className={styles.thumbnail}>
								{item.thumbnail && (
									<img
										src={getThumbnailForColorMode(item.thumbnail, colorMode)}
										alt=""
										draggable={false}
									/>
								)}
							</span>
						))
					: Array.from({ length: THUMBNAILS_SHOWN }, (_, i) => (
							<span key={i} className={`${styles.thumbnail} ${styles.loading}`} />
						))}
			</div>
			<div className={styles.footer}>
				<div className={styles.text}>
					<span className={styles.name}>{name}</span>
					<span className={styles.detail}>
						{pack ? msg(messages.itemCount, { count: pack.items.length }) : msg(messages.loading)}
					</span>
				</div>
				<TldrawUiButton
					type={added ? 'normal' : 'primary'}
					className={styles.toggle}
					onClick={toggle}
				>
					<TldrawUiButtonLabel>{msg(added ? messages.remove : messages.add)}</TldrawUiButtonLabel>
				</TldrawUiButton>
			</div>
		</li>
	)
}
