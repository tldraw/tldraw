import { useCallback } from 'react'
import {
	TldrawUiButton,
	TldrawUiButtonIcon,
	TldrawUiDropdownMenuRoot,
	TldrawUiDropdownMenuTrigger,
	useEditor,
	useReactor,
	useValue,
} from 'tldraw'
import { F } from '../../../tla/utils/i18n'
import { FairyAgent } from '../../fairy-agent/agent/FairyAgent'
import { getProjectOrchestrator } from '../../fairy-projects'
import { FairyDropdownContent } from '../menus/FairyDropdownContent'
import { FairyHUDPanelState } from './useFairySelection'

interface FairyHUDHeaderProps {
	panelState: FairyHUDPanelState
	menuPopoverOpen: boolean
	onMenuPopoverOpenChange(open: boolean): void
	onClosePanel(): void
	shownFairy: FairyAgent | null
	selectedFairies: FairyAgent[]
}

export function FairyHUDHeader({
	panelState,
	menuPopoverOpen,
	onMenuPopoverOpenChange,
	onClosePanel,
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

	// Determine center content based on panel state
	const centerContent =
		panelState === 'manual' ? (
			<div className="fairy-id-display">
				<F defaultMessage="Help & Documentation" />
			</div>
		) : selectedFairies.length > 1 ? (
			<div className="fairy-id-display">
				<F defaultMessage="New project" />
			</div>
		) : shownFairy && fairyConfig ? (
			<div className="fairy-id-display" onClick={zoomToFairy}>
				<p style={{ cursor: fairyClickable ? 'pointer' : 'default' }}>{getDisplayName()}</p>
			</div>
		) : (
			<div style={{ flex: 1 }}></div>
		)

	// Determine menu content based on panel state
	const dropdownContent =
		shownFairy && selectedFairies.length <= 1 ? (
			<FairyDropdownContent agent={shownFairy} alignOffset={4} sideOffset={4} side="bottom" />
		) : null

	return (
		<div className="fairy-toolbar-header">
			{centerContent}
			<div className="tlui-row">
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
				<TldrawUiButton type="icon" className="fairy-toolbar-button" onClick={onClosePanel}>
					<TldrawUiButtonIcon icon="cross-2" small />
				</TldrawUiButton>
			</div>
		</div>
	)
}
