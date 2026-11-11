import {
	DefaultQuickActions,
	DefaultQuickActionsContent,
	defineMessages,
	TldrawUiButtonIcon,
	TldrawUiToolbarButton,
	useEditor,
	useTranslation,
	useValue,
	type TLUiQuickActionsProps,
} from 'tldraw'
import { LibraryIcon } from '../ui/library-icon'
import { librariesPanelOpen, toggleLibrariesPanel } from './state'

const messages = defineMessages({
	title: { id: 'libraries.title', defaultMessage: 'Libraries' },
})

/**
 * A `QuickActions` override: tldraw's quick actions followed by a button that opens and closes the
 * {@link LibrariesPanel}, so the button sits before the actions menu: in the menu panel on wide
 * screens, and in the toolbar on narrow ones.
 *
 * @example
 * ```tsx
 * <Tldraw components={{ QuickActions: LibrariesQuickActions }} />
 * ```
 * @public @react
 */
export function LibrariesQuickActions({ children }: TLUiQuickActionsProps) {
	return (
		<DefaultQuickActions>
			{children ?? <DefaultQuickActionsContent />}
			<LibrariesToolbarButton />
		</DefaultQuickActions>
	)
}

function LibrariesToolbarButton() {
	const editor = useEditor()
	const msg = useTranslation()
	const open = useValue('libraries panel open', () => librariesPanelOpen.get(editor), [editor])

	return (
		<TldrawUiToolbarButton
			type="icon"
			aria-pressed={open}
			isActive={open}
			title={msg(messages.title)}
			onClick={() => toggleLibrariesPanel(editor)}
		>
			<TldrawUiButtonIcon icon={<LibraryIcon />} small />
		</TldrawUiToolbarButton>
	)
}
