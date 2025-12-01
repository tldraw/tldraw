import { MouseEvent, useCallback, useEffect, useState } from 'react'
import { useValue } from 'tldraw'
import { useTldrawAppUiEvents } from '../../../tla/utils/app-ui-events'
import { markManualAsOpened } from '../../../tla/utils/local-session-state'
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

	// Update the shown fairy when selected fairies change
	// If fairies in a project are selected, show the project view
	useEffect(() => {
		if (selectedFairies.length === 0) {
			setShownFairy(null)
			return
		}

		if (selectedFairies.length === 1) {
			setShownFairy(selectedFairies[0])
			return
		}

		// Multiple fairies selected - check if they're in a project
		const firstProject = selectedFairies[0]?.getProject()
		if (firstProject && firstProject.members.length > 1 && fairyApp) {
			const orchestratorMember = fairyApp.projects.getProjectOrchestrator(firstProject)
			if (orchestratorMember) {
				// Project has been started, show the orchestrator's chat
				const orchestratorAgent = agents.find((agent) => agent.id === orchestratorMember.id)
				if (orchestratorAgent) {
					setShownFairy(orchestratorAgent)
					return
				}
			}
			// Project hasn't been started yet, show group creation view
			setShownFairy(null)
		}
	}, [selectedFairies, agents, fairyApp])

	// Select a fairy (or all fairies in its project if it's in one)
	const selectFairy = useCallback(
		(selectedAgent: FairyAgent) => {
			const project = selectedAgent.getProject()
			const isInProject = project && project.members.length > 1

			if (isInProject) {
				// Select all fairies in the project, deselect others
				const memberIds = new Set(project.members.map((member) => member.id))
				agents.forEach((agent) => {
					const shouldSelect = memberIds.has(agent.id)
					agent.updateEntity((f) => (f ? { ...f, isSelected: shouldSelect } : f))
				})
			} else {
				// Select just this fairy, deselect others
				agents.forEach((agent) => {
					const shouldSelect = agent.id === selectedAgent.id
					agent.updateEntity((f) => (f ? { ...f, isSelected: shouldSelect } : f))
				})
			}
		},
		[agents]
	)

	// Deselect a fairy (or all fairies in its project if it's in one)
	const deselectFairy = useCallback(
		(agent: FairyAgent) => {
			const project = agent.getProject()
			const isInProject = project && project.members.length > 1

			if (isInProject) {
				// Deselect all fairies in the project
				const memberIds = new Set(project.members.map((member) => member.id))
				agents.forEach((a) => {
					if (memberIds.has(a.id)) {
						a.updateEntity((f) => (f ? { ...f, isSelected: false } : f))
					}
				})
			} else {
				agent.updateEntity((f) => (f ? { ...f, isSelected: false } : f))
			}
		},
		[agents]
	)

	const handleClickFairy = useCallback(
		(clickedAgent: FairyAgent, event: MouseEvent) => {
			const isMultiSelect = event.shiftKey || event.metaKey || event.ctrlKey
			const isSelected = clickedAgent.getEntity()?.isSelected ?? false
			const isChosen = clickedAgent.id === shownFairy?.id
			const project = clickedAgent.getProject()
			const isInProject = project && project.members.length > 1

			// Close manual if open
			if (manualOpen) {
				setManualOpen(false)
			}

			// Multi-select is disabled for fairies in projects
			if (isMultiSelect && isInProject) {
				return
			}

			// Multi-select is also disabled if any currently selected fairy is in a project
			if (isMultiSelect) {
				const hasSelectedProject = selectedFairies.some((agent) => {
					const p = agent.getProject()
					return p && p.members.length > 1
				})
				if (hasSelectedProject) {
					return
				}
				// Toggle selection without deselecting others
				clickedAgent.updateEntity((f) => (f ? { ...f, isSelected: !isSelected } : f))
				return
			}

			// Single click behavior
			if (isSelected) {
				// Clicking an already selected fairy
				const shouldClosePanel = isChosen && panelState === 'fairy'
				if (shouldClosePanel) {
					deselectFairy(clickedAgent)
				} else if (selectedFairies.length > 1) {
					// Multiple fairies selected, focus on this one
					selectFairy(clickedAgent)
				} else {
					// Single fairy selected, clicking again deselects
					deselectFairy(clickedAgent)
				}
			} else {
				// Clicking an unselected fairy - select it (and its project if applicable)
				selectFairy(clickedAgent)
			}
		},
		[selectFairy, deselectFairy, shownFairy, selectedFairies, panelState, manualOpen, setManualOpen]
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
			markManualAsOpened()
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
