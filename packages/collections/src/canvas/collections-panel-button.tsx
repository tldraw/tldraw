import {
	defineMessages,
	TldrawUiButton,
	TldrawUiButtonIcon,
	useEditor,
	useTranslation,
	useValue,
} from 'tldraw'
import { collectionsPanelOpen, toggleCollectionsPanel } from './state'

const messages = defineMessages({
	title: { id: 'collections.title', defaultMessage: 'Collections' },
})

/**
 * An icon button that opens and closes the {@link CollectionsPanel}. Place it wherever your app
 * keeps its panel toggles.
 * @public @react
 */
export function CollectionsPanelButton() {
	const editor = useEditor()
	const msg = useTranslation()
	const open = useValue('collections panel open', () => collectionsPanelOpen.get(editor), [editor])
	const label = msg(messages.title)

	return (
		<TldrawUiButton
			type="icon"
			aria-pressed={open}
			tooltip={label}
			title={label}
			onClick={() => toggleCollectionsPanel(editor)}
		>
			<TldrawUiButtonIcon icon="bookmark" />
		</TldrawUiButton>
	)
}
