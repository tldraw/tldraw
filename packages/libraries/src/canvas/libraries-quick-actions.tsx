import {
	DefaultQuickActions,
	DefaultQuickActionsContent,
	defineMessages,
	TldrawUiButtonIcon,
	TldrawUiToolbarButton,
	useEditor,
	useTranslation,
	useUiEvents,
	useValue,
	type TLUiQuickActionsProps,
} from 'tldraw'
import { LibraryIcon } from '../ui/library-icon'
import { useLibrariesEnabled } from './license'
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

/**
 * The button {@link LibrariesQuickActions} adds: opens and closes the {@link LibrariesPanel}, and
 * shows nothing when libraries aren't enabled. Use it to keep the button while choosing which of
 * tldraw's quick actions to show.
 *
 * @example
 * ```tsx
 * const components: TLComponents = {
 * 	QuickActions: () => (
 * 		<DefaultQuickActions>
 * 			<LibrariesToolbarButton />
 * 		</DefaultQuickActions>
 * 	),
 * }
 * ```
 * @public @react
 */
export function LibrariesToolbarButton() {
	const editor = useEditor()
	const msg = useTranslation()
	const trackEvent = useUiEvents()
	const librariesEnabled = useLibrariesEnabled()
	const open = useValue('libraries panel open', () => librariesPanelOpen.get(editor), [editor])

	if (!librariesEnabled) return null

	return (
		<TldrawUiToolbarButton
			type="icon"
			aria-pressed={open}
			isActive={open}
			title={msg(messages.title)}
			onClick={() => {
				trackEvent('toggle-libraries-panel', { source: 'libraries', open: !open })
				toggleLibrariesPanel(editor)
			}}
		>
			<TldrawUiButtonIcon icon={<LibraryIcon />} small />
		</TldrawUiToolbarButton>
	)
}
