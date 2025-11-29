import { FairyProject } from '@tldraw/fairy-shared'
import { MouseEvent, useCallback, useEffect, useState } from 'react'
import { useValue } from 'tldraw'
import { FairyAgent } from '../../fairy-agent/agent/FairyAgent'
import { getProjectOrchestrator } from '../../FairyProjects'

export type FairyHUDPanelState = 'fairy' | 'manual' | 'closed'

export function useFairySelection(agents: FairyAgent[]) {
	const [panelState, setPanelState] = useState<FairyHUDPanelState>('closed')
	const [shownFairy, setShownFairy] = useState<FairyAgent | null>(null)

	// Create a reactive value that tracks which fairies are selected
	const selectedFairies = useValue(
		'selected-fairies',
		() =>
			agents.filter(
				(agent) => (agent.$fairyEntity.get()?.isSelected && !agent.isSleeping()) ?? false
			),
		[agents]
	)

	const activeOrchestratorAgent = useValue(
		'shown-orchestrator',
		() => {
			if (!shownFairy) return null
			const project = shownFairy.getProject()
			if (!project) return null

			const orchestratorMember = getProjectOrchestrator(project)
			if (!orchestratorMember) return null

			// Return the actual FairyAgent, not just the member
			return agents.find((agent) => agent.id === orchestratorMember.id) ?? null
		},
		[shownFairy, agents]
	)

	// Update the chosen fairy when the selected fairies change
	useEffect(() => {
		if (selectedFairies.length === 1) {
			setShownFairy(selectedFairies[0])
			setPanelState('fairy')
		}
		if (selectedFairies.length === 0) {
			setShownFairy(null)
			setPanelState('closed')
		}
	}, [selectedFairies])

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

	const selectProjectGroup = useCallback(
		(project: FairyProject | null) => {
			if (!project || project.members.length <= 1) {
				return false
			}

			// Check if project has an orchestrator (meaning it's been started)
			const orchestratorMember = getProjectOrchestrator(project)

			if (orchestratorMember) {
				// Project has been started, show the orchestrator's chat
				const orchestratorAgent = agents.find((agent) => agent.id === orchestratorMember.id)
				if (orchestratorAgent) {
					selectFairy(orchestratorAgent)
					setPanelState('fairy')
					return true
				}
			}

			// Project hasn't been started yet, show group creation view
			const memberIds = new Set(project.members.map((member) => member.id))

			agents.forEach((agent) => {
				const shouldSelect = memberIds.has(agent.id)
				agent.$fairyEntity.update((f) => (f ? { ...f, isSelected: shouldSelect } : f))
			})

			setShownFairy(null)
			setPanelState('fairy')
			return true
		},
		[agents, setPanelState, setShownFairy, selectFairy]
	)

	const handleClickFairy = useCallback(
		(clickedAgent: FairyAgent, event: MouseEvent) => {
			const isMultiSelect = event.shiftKey || event.metaKey || event.ctrlKey
			const isSelected = clickedAgent.$fairyEntity.get().isSelected
			const isChosen = clickedAgent.id === shownFairy?.id
			const project = clickedAgent.getProject()

			if (!isMultiSelect && selectProjectGroup(project)) {
				return
			}

			if (isMultiSelect) {
				// Toggle selection without deselecting others
				clickedAgent.$fairyEntity.update((f) => (f ? { ...f, isSelected: !isSelected } : f))
				// Keep panel open if there are selected fairies
				if (!isSelected || selectedFairies.length > 1) {
					setPanelState('fairy')
				}
			} else {
				// Single select mode
				if (selectedFairies.length > 1 && panelState !== 'fairy') {
					// Multiple fairies already selected, panel not open - keep them all selected and show group chat
					setShownFairy(clickedAgent)
					setPanelState('fairy')
				} else if (selectedFairies.length > 1 && panelState === 'fairy') {
					// Multiple fairies selected, panel already open in group chat - switch to single fairy mode
					selectFairy(clickedAgent)
					setPanelState('fairy')
				} else {
					// Normal single select behavior - deselect all others
					selectFairy(clickedAgent)
					// If the clicked fairy is already chosen and selected, toggle the panel. Otherwise, keep the panel open.
					setPanelState((v) => {
						const shouldClosePanel =
							isChosen && isSelected && v === 'fairy' && selectedFairies.length <= 1
						if (shouldClosePanel) {
							agents.forEach((agent) => {
								agent.$fairyEntity.update((f) => (f ? { ...f, isSelected: false } : f))
							})
						}
						return shouldClosePanel ? 'closed' : 'fairy'
					})
				}
			}
		},
		[selectFairy, shownFairy, selectedFairies, panelState, selectProjectGroup, agents]
	)

	const handleDoubleClickFairy = useCallback(
		(clickedAgent: FairyAgent) => {
			clickedAgent.zoomTo()

			// If the clicked fairy is part of an active project, select the orchestrator instead
			const project = clickedAgent.getProject()
			if (project) {
				const orchestratorMember = getProjectOrchestrator(project)
				if (orchestratorMember) {
					const orchestratorAgent = agents.find((agent) => agent.id === orchestratorMember.id)
					if (orchestratorAgent) {
						selectFairy(orchestratorAgent)
						setPanelState('fairy')
						return
					}
				}
			}

			selectFairy(clickedAgent)
			setPanelState('fairy')
		},
		[selectFairy, agents]
	)

	const handleTogglePanel = useCallback(() => {
		setPanelState((v) => {
			if (v === 'fairy') return 'closed'
			return 'fairy' // closed -> fairy
		})
		// Deselect all fairies when the panel is closed
		agents.forEach((agent) => {
			agent.$fairyEntity.update((f) => (f ? { ...f, isSelected: false } : f))
		})
	}, [agents])

	return {
		panelState,
		setPanelState,
		shownFairy,
		selectedFairies,
		activeOrchestratorAgent,
		selectFairy,
		handleClickFairy,
		handleDoubleClickFairy,
		handleTogglePanel,
	}
}
