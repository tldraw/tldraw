import { FAIRY_VARIANTS, FairyConfig, FairyVariantType } from '@tldraw/fairy-shared'
import { MouseEvent, useCallback, useState } from 'react'
import {
	TldrawUiButton,
	TldrawUiIcon,
	uniqueId,
	useEditor,
	useQuickReactor,
	useValue,
} from 'tldraw'
import { MAX_FAIRY_COUNT } from '../tla/components/TlaEditor/TlaEditor'
import { useApp } from '../tla/hooks/useAppState'
import '../tla/styles/fairy.css'
import { F, useMsg } from '../tla/utils/i18n'
import { FairyAgent } from './fairy-agent/agent/FairyAgent'
import { fairyMessages } from './fairy-messages'
import { FairyListSidebar } from './FairyListSidebar'
import { getRandomFairyName } from './getRandomFairyName'
import { GroupChatPanel } from './GroupChatPanel'
import { SingleFairyPanel } from './SingleFairyPanel'
import { TodoListPanel } from './TodoListPanel'

function NewFairyButton({ agents }: { agents: FairyAgent[] }) {
	const app = useApp()
	const handleClick = useCallback(() => {
		if (!app) return
		const randomOutfit = {
			body: Object.keys(FAIRY_VARIANTS.body)[
				Math.floor(Math.random() * Object.keys(FAIRY_VARIANTS.body).length)
			] as FairyVariantType<'body'>,
			hat: Object.keys(FAIRY_VARIANTS.hat)[
				Math.floor(Math.random() * Object.keys(FAIRY_VARIANTS.hat).length)
			] as FairyVariantType<'hat'>,
			wings: Object.keys(FAIRY_VARIANTS.wings)[
				Math.floor(Math.random() * Object.keys(FAIRY_VARIANTS.wings).length)
			] as FairyVariantType<'wings'>,
		}

		// Create a unique ID for the new fairy
		const id = uniqueId()

		// Create the config for the new fairy
		const config: FairyConfig = {
			name: getRandomFairyName(),
			outfit: randomOutfit,
			personality: 'Friendly and helpful',
			wand: 'default',
		}

		// Add the config, which will trigger agent creation in FairyApp
		app.z.mutate.user.updateFairyConfig({ id, properties: config })
	}, [app])

	const newFairyLabel = useMsg(fairyMessages.newFairy)

	return (
		<TldrawUiButton
			type="icon"
			className="fairy-toolbar-sidebar-button"
			onClick={handleClick}
			disabled={agents.length >= MAX_FAIRY_COUNT}
		>
			<TldrawUiIcon icon="plus" label={newFairyLabel} />
		</TldrawUiButton>
	)
}

type PanelState = 'todo-list' | 'fairy' | 'closed'

export function FairyHUD({ agents }: { agents: FairyAgent[] }) {
	const editor = useEditor()
	const [headerMenuPopoverOpen, setHeaderMenuPopoverOpen] = useState(false)
	const [fairyMenuPopoverOpen, setFairyMenuPopoverOpen] = useState(false)
	const [todoMenuPopoverOpen, setTodoMenuPopoverOpen] = useState(false)
	const isDebugMode = useValue('debug', () => editor.getInstanceState().isDebugMode, [editor])

	const [panelState, setPanelState] = useState<PanelState>('closed')
	const [shownFairy, setShownFairy] = useState<FairyAgent | null>(null)

	const toolbarMessage = useMsg(fairyMessages.toolbar)
	const deselectMessage = useMsg(fairyMessages.deselectFairy)
	const selectMessage = useMsg(fairyMessages.selectFairy)

	// Create a reactive value that tracks which fairies are selected
	const selectedFairies = useValue(
		'selected-fairies',
		() => agents.filter((agent) => agent.$fairyEntity.get()?.isSelected ?? false),
		[agents]
	)

	// Update the chosen fairy when the selected fairies change
	useQuickReactor(
		'update-chosen-fairy',
		() => {
			const currentSelectedFairies = agents.filter(
				(agent) => agent.$fairyEntity.get()?.isSelected ?? false
			)
			if (currentSelectedFairies.length === 1) {
				setShownFairy(currentSelectedFairies[0])
			}
		},
		[agents]
	)

	const selectFairy = useCallback(
		(selectedAgent: FairyAgent) => {
			// Select the specified fairy
			selectedAgent.$fairyEntity.update((f) => (f ? { ...f, isSelected: true } : f))

			// Deselect all other fairies
			agents.forEach((agent) => {
				if (agent.id === selectedAgent.id) return
				agent.$fairyEntity.update((f) => (f ? { ...f, isSelected: false } : f))
			})
		},
		[agents]
	)

	const handleClickFairy = useCallback(
		(clickedAgent: FairyAgent, event: MouseEvent) => {
			const isMultiSelect = event.shiftKey || event.metaKey || event.ctrlKey
			const isSelected = clickedAgent.$fairyEntity.get().isSelected
			const isChosen = clickedAgent.id === shownFairy?.id

			if (isMultiSelect) {
				// Toggle selection without deselecting others
				clickedAgent.$fairyEntity.update((f) => (f ? { ...f, isSelected: !isSelected } : f))
				// Keep panel open if there are selected fairies
				if (!isSelected || selectedFairies.length > 1) {
					setPanelState('fairy')
				}
			} else {
				// Single select mode - deselect all others
				selectFairy(clickedAgent)
				// If the clicked fairy is already chosen and selected, toggle the panel. Otherwise, keep the panel open.
				setPanelState((v) =>
					isChosen && isSelected && v === 'fairy' && selectedFairies.length <= 1
						? 'closed'
						: 'fairy'
				)
			}
		},
		[selectFairy, shownFairy, selectedFairies]
	)

	const handleDoubleClickFairy = useCallback(
		(clickedAgent: FairyAgent) => {
			clickedAgent.zoomTo()
			selectFairy(clickedAgent)
			setPanelState('fairy')
		},
		[selectFairy]
	)

	const handleClickTodoList = useCallback(() => {
		setPanelState((v) => (v === 'todo-list' ? 'closed' : 'todo-list'))
	}, [])

	const handleTogglePanel = useCallback(() => {
		setPanelState((v) => (v === 'fairy' ? 'closed' : 'fairy'))
	}, [])

	const handleContextMenu = (e: MouseEvent<HTMLDivElement>) => {
		e.stopPropagation()
	}

	return (
		<>
			<div
				className={`tla-fairy-hud ${panelState !== 'closed' ? 'tla-fairy-hud--open' : ''}`}
				style={{
					bottom: isDebugMode ? '112px' : '72px',
				}}
				onContextMenu={handleContextMenu}
			>
				<div className="tla-fairy-hud-content">
					{panelState !== 'closed' && (
						<div
							className="fairy-chat-panel"
							data-panel-state="open"
							onWheelCapture={(e) => e.stopPropagation()}
						>
							{!shownFairy && panelState === 'fairy' && (
								<div
									style={{
										height: '100%',
										display: 'flex',
										alignItems: 'center',
										justifyContent: 'center',
									}}
								>
									<F defaultMessage="Select a fairy on the right to chat with" />
								</div>
							)}
							{panelState === 'fairy' && selectedFairies.length <= 1 && shownFairy && (
								<SingleFairyPanel
									agent={shownFairy}
									menuPopoverOpen={fairyMenuPopoverOpen}
									onMenuPopoverOpenChange={setFairyMenuPopoverOpen}
									onClickTodoList={handleClickTodoList}
									onCancel={() => setPanelState('closed')}
								/>
							)}

							{panelState === 'fairy' && selectedFairies.length > 1 && (
								<GroupChatPanel
									selectedFairies={selectedFairies}
									agents={agents}
									menuPopoverOpen={headerMenuPopoverOpen}
									onMenuPopoverOpenChange={setHeaderMenuPopoverOpen}
									onClickTodoList={handleClickTodoList}
								/>
							)}

							{panelState === 'todo-list' && (
								<TodoListPanel
									agents={agents}
									menuPopoverOpen={todoMenuPopoverOpen}
									onMenuPopoverOpenChange={setTodoMenuPopoverOpen}
								/>
							)}
						</div>
					)}

					<FairyListSidebar
						agents={agents}
						panelState={panelState}
						toolbarMessage={toolbarMessage}
						selectMessage={selectMessage}
						deselectMessage={deselectMessage}
						onClickFairy={handleClickFairy}
						onDoubleClickFairy={handleDoubleClickFairy}
						onTogglePanel={handleTogglePanel}
						newFairyButton={<NewFairyButton agents={agents} />}
					/>
				</div>
			</div>
		</>
	)
}
