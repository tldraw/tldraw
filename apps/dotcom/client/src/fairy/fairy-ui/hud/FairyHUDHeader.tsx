import { useCallback } from 'react'
import {
	TldrawUiButton,
	TldrawUiButtonIcon,
	TldrawUiDropdownMenuContent,
	TldrawUiDropdownMenuRoot,
	TldrawUiDropdownMenuTrigger,
	useEditor,
	useReactor,
	useValue,
} from 'tldraw'
import { F } from '../../../tla/utils/i18n'
import { FairyAgent } from '../../fairy-agent/FairyAgent'
import { getProjectOrchestrator } from '../../fairy-projects'
import { FairyMenuContent } from '../menus/FairyMenuContent'
import { FairyHUDPanelState } from './useFairySelection'

interface FairyHUDHeaderProps {
	panelState: FairyHUDPanelState
	menuPopoverOpen: boolean
	onMenuPopoverOpenChange(open: boolean): void
	shownFairy: FairyAgent | null
	selectedFairies: FairyAgent[]
}

export function FairyHUDHeader({
	panelState,
	menuPopoverOpen,
	onMenuPopoverOpenChange,
	shownFairy,
	selectedFairies,
}: FairyHUDHeaderProps) {
	const fairyConfig = useValue('fairy config', () => shownFairy?.$fairyConfig.get(), [shownFairy])

	// Get the project for the shown fairy
	const project = useValue('project', () => shownFairy?.getProject(), [shownFairy])

	// Check if the project has been started (has an orchestrator)
	const isProjectStarted = project && getProjectOrchestrator(project)

	const fairyClickable = useValue(
		'fairy clickable',
		() => shownFairy && (!isProjectStarted || !project),
		[isProjectStarted, project]
	)

	const editor = useEditor()

	useReactor(
		'fairy-hud-menu',
		() => {
			const menuIsOpen = editor.menus.isMenuOpen('fairy-hud-menu')
			onMenuPopoverOpenChange(menuIsOpen)
		},
		[editor, onMenuPopoverOpenChange]
	)

	const zoomToFairy = useCallback(() => {
		if (!fairyClickable || !shownFairy) return

		shownFairy.positionManager.zoomTo()
	}, [shownFairy, fairyClickable])

	// const hasChatHistory = useValue(
	// 	'has-chat-history',
	// 	() => shownFairy && shownFairy.$chatHistory.get().length > 0,
	// 	[shownFairy]
	// )

	const getDisplayName = () => {
		if (!isProjectStarted || !project) {
			return fairyConfig?.name
		}
		// Project is started - show title if available, otherwise a placeholder
		if (project.title) {
			return project.title
		}
		// Placeholder while the project name is being streamed
		return 'Planning project…'
	}

	// Format names for pre-project header
	const formattedNames = useValue(
		'formatted-fairy-names',
		() => {
			const names = selectedFairies.map(
				(agent) => (agent.$fairyConfig.get()?.name ?? 'fairy').split(' ')[0]
			)
			if (names.length === 0) return ''
			if (names.length === 1) return `${names[0]}`
			if (names.length === 2) return `${names[0]} and ${names[1]}`
			return `${names.slice(0, -1).join(', ')}, and ${names[names.length - 1]}`
		},
		[selectedFairies]
	)

	// Determine center content based on panel state
	const centerContent =
		panelState === 'manual' ? (
			<div className="fairy-id-display">
				<F defaultMessage="Help & Documentation" />
			</div>
		) : selectedFairies.length > 1 ? (
			<div className="fairy-id-display">{formattedNames}</div>
		) : shownFairy && fairyConfig ? (
			<div className="fairy-id-display" onClick={zoomToFairy}>
				<p style={{ cursor: fairyClickable ? 'pointer' : 'default' }}>{getDisplayName()}</p>
			</div>
		) : (
			<div style={{ flex: 1 }}></div>
		)

	// Determine menu content based on panel state
	const dropdownContent = <FairyDropdownContent agents={selectedFairies} />

	const onlySelectedFairy = selectedFairies.length === 1 ? selectedFairies[0] : null

	return (
		<div className="fairy-toolbar-header">
			{centerContent}
			<div className="tlui-row">
				{onlySelectedFairy && (
					<TldrawUiButton
						type="icon"
						className="fairy-toolbar-button"
						// Maybe needs to be reactive
						disabled={onlySelectedFairy.chatManager.getHistory().length === 0}
						onClick={() => {
							onlySelectedFairy?.chatManager.reset()
						}}
					>
						<TldrawUiButtonIcon icon="plus" small />
					</TldrawUiButton>
				)}
				{panelState !== 'manual' && dropdownContent && (
					<TldrawUiDropdownMenuRoot id="fairy-hud-menu" debugOpen={menuPopoverOpen}>
						<TldrawUiDropdownMenuTrigger>
							<TldrawUiButton type="icon" className="fairy-toolbar-button">
								<TldrawUiButtonIcon icon="dots-vertical" small />
							</TldrawUiButton>
						</TldrawUiDropdownMenuTrigger>
						{dropdownContent}
					</TldrawUiDropdownMenuRoot>
				)}
			</div>
		</div>
	)
}

function FairyDropdownContent({ agents }: { agents: FairyAgent[] }) {
	return (
		<TldrawUiDropdownMenuContent
			align="start"
			className="fairy-sidebar-dropdown"
			alignOffset={4}
			sideOffset={4}
			side="bottom"
		>
			<FairyMenuContent agents={agents} menuType="menu" source="chat" />
		</TldrawUiDropdownMenuContent>
	)
}
