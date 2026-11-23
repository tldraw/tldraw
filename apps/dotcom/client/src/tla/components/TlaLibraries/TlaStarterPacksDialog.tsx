import {
	activeLibraryId,
	getLibraryErrorReason,
	LibraryMenuItem,
	type LibrarySource,
	librariesPanelOpen,
	getThumbnailForColorMode,
} from '@tldraw/libraries'
import { useEffect, useState } from 'react'
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
	TldrawUiMenuItem,
	useDialogs,
	useEditor,
	useToasts,
	useTranslation,
	useUiEvents,
	useValue,
} from 'tldraw'
import { useTldrawAppUiEvents } from '../../utils/app-ui-events'
import {
	addStarterPack,
	canAddStarterPack,
	getStarterPackSummaries,
	isStarterPackAdded,
	loadStarterPack,
	loadStarterPackSummaries,
	type StarterPackSummary,
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
	loadError: { defaultMessage: "Couldn't load starter packs" },
})

export function TlaBrowseStarterPacksMenuItem({ source }: { source: LibrarySource }) {
	const msg = useTranslation()
	const { addDialog } = useDialogs()
	const trackEvent = useUiEvents()
	return (
		<LibraryMenuItem
			label={msg(messages.browse)}
			onClick={() => {
				trackEvent('open-browse-libraries', { source: 'libraries' })
				addDialog({
					component: () => <TlaStarterPacksDialog source={source} />,
				})
			}}
		/>
	)
}

export function TlaBrowseStarterPacksCommandPaletteItem({ source }: { source: LibrarySource }) {
	const msg = useTranslation()
	const { addDialog } = useDialogs()
	const trackEvent = useUiEvents()
	return (
		<TldrawUiMenuItem
			id="tla-browse-starter-packs"
			label={msg(messages.browse)}
			readonlyOk
			onSelect={(eventSource) => {
				trackEvent('open-browse-libraries', { source: eventSource })
				addDialog({
					component: () => <TlaStarterPacksDialog source={source} />,
				})
			}}
		/>
	)
}

function TlaStarterPacksDialog({ source }: { source: LibrarySource }) {
	const msg = useTranslation()
	const { addToast } = useToasts()
	const packs = useValue('starter pack summaries', getStarterPackSummaries, [])

	useEffect(() => {
		if (packs) return
		loadStarterPackSummaries().catch(() =>
			addToast({ title: msg(messages.loadError), severity: 'error' })
		)
	}, [packs, addToast, msg])

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
					{packs?.map((pack) => (
						<StarterPack key={pack.id} source={source} pack={pack} />
					))}
				</ul>
			</TldrawUiDialogBody>
		</>
	)
}

function StarterPack({ source, pack }: { source: LibrarySource; pack: StarterPackSummary }) {
	const editor = useEditor()
	const msg = useTranslation()
	const { addToast } = useToasts()
	const trackEvent = useTldrawAppUiEvents()
	const [adding, setAdding] = useState(false)
	const added = useValue('starter pack added', () => isStarterPackAdded(source, pack.id), [
		source,
		pack.id,
	])
	const colorMode = useValue('color mode', () => editor.getColorMode(), [editor])
	const canAdd = useValue('can add starter pack', () => canAddStarterPack(source), [source])

	const add = () => {
		setAdding(true)
		loadStarterPack(pack.id)
			.then((fullPack) => addStarterPack(source, fullPack))
			.then(
				(library) => {
					trackEvent('add-starter-pack', { source: 'libraries', pack_id: pack.id })
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
				(error) => {
					trackEvent('library-error', {
						source: 'libraries',
						action: 'add-starter-pack',
						reason: getLibraryErrorReason(error),
					})
					addToast({
						title: msg(messages.addError),
						description: msg(messages.addErrorDescription),
						severity: 'error',
					})
				}
			)
			.finally(() => setAdding(false))
	}

	return (
		<li className={styles.pack}>
			<div className={styles.thumbnails} aria-hidden>
				{pack.previews.map((item) => (
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
						{msg(messages.itemCount, { count: pack.itemCount })}
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
