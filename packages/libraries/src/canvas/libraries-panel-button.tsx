import {
	defineMessages,
	TldrawUiButton,
	TldrawUiButtonIcon,
	useEditor,
	useTranslation,
	useValue,
} from 'tldraw'
import { librariesPanelOpen, toggleLibrariesPanel } from './state'

const messages = defineMessages({
	title: { id: 'libraries.title', defaultMessage: 'Libraries' },
})

/**
 * An icon button that opens and closes the {@link LibrariesPanel}. Place it wherever your app
 * keeps its panel toggles.
 * @public @react
 */
export function LibrariesPanelButton() {
	const editor = useEditor()
	const msg = useTranslation()
	const open = useValue('libraries panel open', () => librariesPanelOpen.get(editor), [editor])
	const label = msg(messages.title)

	return (
		<TldrawUiButton
			type="icon"
			aria-pressed={open}
			tooltip={label}
			title={label}
			onClick={() => toggleLibrariesPanel(editor)}
		>
			<TldrawUiButtonIcon icon="bookmark" />
		</TldrawUiButton>
	)
}
