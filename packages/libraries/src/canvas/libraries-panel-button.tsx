import {
	defineMessages,
	TldrawUiButton,
	TldrawUiButtonIcon,
	useEditor,
	useTranslation,
	useUiEvents,
	useValue,
} from 'tldraw'
import { LibraryIcon } from '../ui/library-icon'
import { useLibrariesEnabled } from './license'
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
	const trackEvent = useUiEvents()
	const librariesEnabled = useLibrariesEnabled()
	const open = useValue('libraries panel open', () => librariesPanelOpen.get(editor), [editor])
	const label = msg(messages.title)

	if (!librariesEnabled) return null

	return (
		<TldrawUiButton
			type="icon"
			aria-pressed={open}
			tooltip={label}
			title={label}
			onClick={() => {
				trackEvent('toggle-libraries-panel', { source: 'libraries', open: !open })
				toggleLibrariesPanel(editor)
			}}
		>
			<TldrawUiButtonIcon icon={<LibraryIcon />} />
		</TldrawUiButton>
	)
}
