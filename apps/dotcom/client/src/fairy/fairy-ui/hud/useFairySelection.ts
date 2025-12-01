import { FairyProject } from '@tldraw/fairy-shared'
import { MouseEvent, useCallback, useEffect, useState } from 'react'
import { useValue } from 'tldraw'
import { useTldrawAppUiEvents } from '../../../tla/utils/app-ui-events'
import { FairyAgent } from '../../fairy-agent/FairyAgent'
import { useFairyApp } from '../../fairy-app/FairyAppProvider'

export type FairyHUDPanelState = 'fairy' | 'manual' | 'closed'

export function useFairySelection(agents: FairyAgent[]) {
	const fairyApp = useFairyApp()
	const trackEvent = useTldrawAppUiEvents()
	const [manualOpen, setManualOpen] = useState(false)
	const [shownFairy, setShownFairy] = useState<FairyAgent | null>(null)

	// Create a reactive value that tracks which fairies are selected
	const selectedFairies = useValue(
		'selected-fairies',
		() =>
			agents.filter(
				(agent) => (agent.getEntity()?.isSelected && !agent.mode.isSleeping()) ?? false
			),
		[agents]
	)

	// Derive panelState from manualOpen and selectedFairies
	const panelState: FairyHUDPanelState = manualOpen
		? 'manual'
		: selectedFairies.length > 0
			? 'fairy'
			: 'closed'

	const activeOrchestratorAgent = useValue(
		'shown-orchestrator',
		() => {
			if (!shownFairy || !fairyApp) return null
			const project = shownFairy.getProject()
			if (!project) return null

			const orchestratorMember = fairyApp.projects.getProjectOrchestrator(project)
			if (!orchestratorMember) return null

			// Return the actual FairyAgent, not just the member
			return agents.find((agent) => agent.id === orchestratorMember.id) ?? null
		},
		[shownFairy, agents, fairyApp]
	)

	// Update the chosen fairy when the selected fairies change
	useEffect(() => {
		if (selectedFairies.length === 1) {
			setShownFairy(selectedFairies[0])
		}
		if (selectedFairies.length === 0) {
			setShownFairy(null)
		}
	}, [selectedFairies])

	const selectFairy = useCallback(
		(selectedAgent: FairyAgent) => {
			// Select the specified fairy
			selectedAgent.updateEntity((f) => (f ? { ...f, isSelected: true } : f))

			// Deselect all other fairies
			agents.forEach((agent) => {
				if (agent.id === selectedAgent.id) return
				agent.updateEntity((f) => (f ? { ...f, isSelected: false } : f))
			})
		},
		[agents]
	)

	const selectProjectGroup = useCallback(
		(project: FairyProject | null) => {
			if (!project || project.members.length <= 1 || !fairyApp) {
				return false
			}

			// Check if project has an orchestrator (meaning it's been started)
			const orchestratorMember = fairyApp.projects.getProjectOrchestrator(project)

			if (orchestratorMember) {
				// Project has been started, show the orchestrator's chat
				const orchestratorAgent = agents.find((agent) => agent.id === orchestratorMember.id)
				if (orchestratorAgent) {
					selectFairy(orchestratorAgent)
					return true
				}
			}

			// Project hasn't been started yet, show group creation view
			const memberIds = new Set(project.members.map((member) => member.id))

			agents.forEach((agent) => {
				const shouldSelect = memberIds.has(agent.id)
				agent.updateEntity((f) => (f ? { ...f, isSelected: shouldSelect } : f))
			})

			setShownFairy(null)
			return true
		},
		[agents, setShownFairy, selectFairy, fairyApp]
	)

	const handleClickFairy = useCallback(
		(clickedAgent: FairyAgent, event: MouseEvent) => {
			const isMultiSelect = event.shiftKey || event.metaKey || event.ctrlKey
			const isSelected = clickedAgent.getEntity()?.isSelected ?? false
			const isChosen = clickedAgent.id === shownFairy?.id
			const project = clickedAgent.getProject()

			// Close manual if open
			if (manualOpen) {
				setManualOpen(false)
			}

			if (!isMultiSelect && selectProjectGroup(project)) {
				return
			}

			if (isMultiSelect) {
				// Toggle selection without deselecting others
				clickedAgent.updateEntity((f) => (f ? { ...f, isSelected: !isSelected } : f))
			} else {
				// Single select mode
				// If clicking an already selected fairy, deselect it
				if (isSelected && selectedFairies.length === 1) {
					clickedAgent.updateEntity((f) => (f ? { ...f, isSelected: false } : f))
					return
				}

				if (selectedFairies.length > 1 && panelState !== 'fairy') {
					// Multiple fairies already selected, panel not open - keep them all selected and show group chat
					setShownFairy(clickedAgent)
				} else if (selectedFairies.length > 1 && panelState === 'fairy') {
					// Multiple fairies selected, panel already open in group chat - switch to single fairy mode
					selectFairy(clickedAgent)
				} else {
					// Normal single select behavior - deselect all others
					// If the clicked fairy is already chosen and selected, toggle the panel. Otherwise, keep the panel open.
					const shouldClosePanel =
						isChosen && isSelected && panelState === 'fairy' && selectedFairies.length <= 1
					if (shouldClosePanel) {
						agents.forEach((agent) => {
							agent.updateEntity((f) => (f ? { ...f, isSelected: false } : f))
						})
					} else {
						selectFairy(clickedAgent)
					}
				}
			}
		},
		[
			selectFairy,
			shownFairy,
			selectedFairies,
			panelState,
			selectProjectGroup,
			agents,
			manualOpen,
			setManualOpen,
		]
	)

	const handleDoubleClickFairy = useCallback(
		(clickedAgent: FairyAgent) => {
			trackEvent('fairy-double-click', { source: 'fairy-sidebar', fairyId: clickedAgent.id })
			trackEvent('fairy-zoom-to', { source: 'fairy-sidebar', fairyId: clickedAgent.id })
			clickedAgent.position.zoomTo()

			// If the clicked fairy is part of an active project, select the orchestrator instead
			const project = clickedAgent.getProject()
			if (project && fairyApp) {
				const orchestratorMember = fairyApp.projects.getProjectOrchestrator(project)
				if (orchestratorMember) {
					const orchestratorAgent = agents.find((agent) => agent.id === orchestratorMember.id)
					if (orchestratorAgent) {
						selectFairy(orchestratorAgent)
						return
					}
				}
			}

			selectFairy(clickedAgent)
		},
		[selectFairy, agents, trackEvent, fairyApp]
	)

	const handleToggleManual = useCallback(() => {
		// Close manual if open, otherwise deselect all fairies
		const wasOpen = manualOpen
		if (wasOpen) {
			trackEvent('fairy-close-manual', { source: 'fairy-panel' })
		} else {
			trackEvent('fairy-switch-to-manual', { source: 'fairy-panel' })
		}
		setManualOpen(!wasOpen)
	}, [trackEvent, manualOpen])

	return {
		panelState,
		manualOpen,
		shownFairy,
		selectedFairies,
		activeOrchestratorAgent,
		selectFairy,
		handleClickFairy,
		handleDoubleClickFairy,
		handleToggleManual,
	}
}
