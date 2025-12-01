import { ContextMenu as _ContextMenu } from 'radix-ui'
import { MouseEvent, useCallback } from 'react'
import {
	TldrawUiButtonIcon,
	TldrawUiMenuContextProvider,
	TldrawUiMenuGroup,
	TldrawUiMenuItem,
	TldrawUiToolbar,
	TldrawUiToolbarToggleGroup,
	TldrawUiToolbarToggleItem,
	useContainer,
	useDialogs,
	useValue,
} from 'tldraw'
import { useApp } from '../../../tla/hooks/useAppState'
import { useMsg } from '../../../tla/utils/i18n'
import { useAreFairiesDebugEnabled } from '../../../tla/utils/local-session-state'
import { FairyAgent } from '../../fairy-agent/FairyAgent'
import { useFairyApp } from '../../fairy-app/FairyAppProvider'
import { fairyMessages } from '../../fairy-messages'
import { FairyReticleSprite } from '../../fairy-sprite/sprites/FairyReticleSprite'
import { FairyDebugDialog } from '../debug/FairyDebugDialog'
import { FairyHUDPanelState } from '../hud/useFairySelection'
import { FairySidebarButton } from './FairySidebarButton'

type FairySidebarEntry =
	| {
			type: 'group'
			projectId: string
			projectTitle: string
			agents: FairyAgent[]
			isActive: boolean
	  }
	| { type: 'single'; agent: FairyAgent }

function useSidebarEntries(agents: FairyAgent[]): FairySidebarEntry[] {
	return useValue(
		'fairy-sidebar-entries',
		() => {
			const entries: FairySidebarEntry[] = []
			const seenProjectIds = new Set<string>()
			const projectMembers = new Map<string, { projectTitle: string; agents: FairyAgent[] }>()
			const agentProjectLookup = new Map<
				string,
				{ projectId: string; projectTitle: string } | null
			>()

			for (const agent of agents) {
				const project = agent.getProject()
				if (project) {
					const existingGroup = projectMembers.get(project.id)
					if (existingGroup) {
						existingGroup.agents.push(agent)
					} else {
						projectMembers.set(project.id, {
							projectTitle: project.title,
							agents: [agent],
						})
					}
					agentProjectLookup.set(agent.id, {
						projectId: project.id,
						projectTitle: project.title,
					})
				} else {
					agentProjectLookup.set(agent.id, null)
				}
			}

			for (const agent of agents) {
				const projectInfo = agentProjectLookup.get(agent.id)
				if (!projectInfo) {
					entries.push({ type: 'single', agent })
					continue
				}

				const { projectId, projectTitle } = projectInfo
				if (seenProjectIds.has(projectId)) {
					continue
				}

				seenProjectIds.add(projectId)
				const group = projectMembers.get(projectId)

				if (group && group.agents.length > 1) {
					const isActive = group.agents.some(
						(groupAgent) => groupAgent.getEntity()?.isSelected ?? false
					)

					entries.push({
						type: 'group',
						projectId,
						projectTitle,
						agents: group.agents,
						isActive,
					})
				} else {
					entries.push({ type: 'single', agent })
				}
			}

			return entries
		},
		[agents]
	)
}

interface FairyListSidebarProps {
	agents: FairyAgent[]
	panelState: FairyHUDPanelState
	toolbarMessage: string
	selectMessage: string
	deselectMessage: string
	manualLabel: string
	onClickFairy(agent: FairyAgent, event: MouseEvent): void
	onDoubleClickFairy(agent: FairyAgent): void
	onToggleManual(): void
}

export function FairyListSidebar({
	agents,
	panelState,
	toolbarMessage,
	selectMessage,
	deselectMessage,
	manualLabel,
	onClickFairy,
	onDoubleClickFairy,
	onToggleManual,
}: FairyListSidebarProps) {
	const sidebarEntries = useSidebarEntries(agents)

	const hasAnySelectedFairies = useValue(
		'has-any-selected-fairies',
		() => agents.some((agent) => agent.getEntity()?.isSelected ?? false),
		[agents]
	)

	const hasAnyActiveProjects = useValue(
		'has-any-active-projects',
		() => {
			// Check if any selected fairy is part of an active project
			const selectedAgents = agents.filter((agent) => agent.getEntity()?.isSelected ?? false)
			return selectedAgents.some((agent) => {
				const project = agent.getProject()
				if (!project) return false
				// Project is active if it has an orchestrator or duo-orchestrator
				return project.members.some(
					(member) => member.role === 'orchestrator' || member.role === 'duo-orchestrator'
				)
			})
		},
		[agents]
	)

	const renderFairySidebarButton = (agent: FairyAgent) => (
		<FairySidebarButton
			key={agent.id}
			agent={agent}
			onClick={(e) => onClickFairy(agent, e)}
			onDoubleClick={() => onDoubleClickFairy(agent)}
			selectMessage={selectMessage}
			deselectMessage={deselectMessage}
			hasAnySelectedFairies={hasAnySelectedFairies}
			hasAnyActiveProjects={hasAnyActiveProjects}
		/>
	)

	const isManualActive = panelState === 'manual'

	return (
		<div className="fairy-list">
			<TldrawUiToolbar label={toolbarMessage} orientation="vertical">
				<TldrawUiToolbarToggleGroup type="single" value={isManualActive ? 'on' : 'off'}>
					<ManualButtonWithMenu
						isManualActive={isManualActive}
						manualLabel={manualLabel}
						onToggleManual={onToggleManual}
					/>
				</TldrawUiToolbarToggleGroup>
				{sidebarEntries.map((entry) => {
					if (entry.type === 'group') {
						return (
							<div
								key={`project-${entry.projectId}`}
								className="fairy-sidebar-group"
								role="group"
								aria-label={`Fairies on project ${entry.projectTitle}`}
								data-is-active={entry.isActive}
							>
								{entry.agents.map(renderFairySidebarButton)}
								{entry.isActive && (
									<div className="fairy-selected-sprite-overlay">
										<FairyReticleSprite fairyCount={entry.agents.length} inset={4} />
									</div>
								)}
							</div>
						)
					}

					return renderFairySidebarButton(entry.agent)
				})}
			</TldrawUiToolbar>
		</div>
	)
}

function ManualButtonWithMenu({
	isManualActive,
	manualLabel,
	onToggleManual,
}: {
	isManualActive: boolean
	manualLabel: string
	onToggleManual(): void
}) {
	const app = useApp()
	const fairyApp = useFairyApp()
	const dialogs = useDialogs()
	const container = useContainer()
	const areFairiesDebugEnabled = useAreFairiesDebugEnabled()
	const allAgents = useValue('fairy-agents', () => (fairyApp ? fairyApp.agents.getAgents() : []), [
		fairyApp,
	])

	const openManualLabel = useMsg(fairyMessages.openManual)
	const closeManualLabel = useMsg(fairyMessages.closeManual)
	const debugViewLabel = useMsg(fairyMessages.debugView)
	const resetEverythingLabel = useMsg(fairyMessages.resetEverything)

	const openDebugDialog = useCallback(() => {
		dialogs.addDialog({
			component: ({ onClose }) => <FairyDebugDialog agents={allAgents} onClose={onClose} />,
		})
	}, [dialogs, allAgents])

	const resetEverything = useCallback(() => {
		// Stop all running tasks
		allAgents.forEach((agent: FairyAgent) => {
			agent.cancel()
		})

		// Clear the todo list and projects
		if (fairyApp) {
			fairyApp.tasks.clearTasksAndProjects()
		}

		// Reset all chats
		allAgents.forEach((agent: FairyAgent) => {
			agent.reset()
		})

		// Delete all fairies
		app.z.mutate.user.deleteAllFairyConfigs()
		allAgents.forEach((agent: FairyAgent) => {
			agent.dispose()
		})
	}, [allAgents, app, fairyApp])

	return (
		<_ContextMenu.Root dir="ltr">
			<_ContextMenu.Trigger asChild>
				<TldrawUiToolbarToggleItem
					className="fairy-manual-button"
					type="icon"
					value="on"
					data-state={isManualActive ? 'on' : 'off'}
					data-isactive={isManualActive}
					onClick={onToggleManual}
					title={manualLabel}
					aria-label={manualLabel}
				>
					<TldrawUiButtonIcon icon="manual" />
				</TldrawUiToolbarToggleItem>
			</_ContextMenu.Trigger>
			<_ContextMenu.Portal container={container}>
				<_ContextMenu.Content
					className="tlui-menu"
					collisionPadding={4}
					onPointerDown={(e) => e.stopPropagation()}
				>
					<TldrawUiMenuContextProvider type="context-menu" sourceId="fairy-panel">
						<TldrawUiMenuGroup id="manual-toggle-menu">
							<TldrawUiMenuItem
								id={isManualActive ? 'close-manual' : 'open-manual'}
								onSelect={onToggleManual}
								label={isManualActive ? closeManualLabel : openManualLabel}
							/>
						</TldrawUiMenuGroup>
						{areFairiesDebugEnabled && (
							<TldrawUiMenuGroup id="manual-debug-menu">
								<TldrawUiMenuItem
									id="debug-fairies"
									onSelect={openDebugDialog}
									label={debugViewLabel}
								/>
								<TldrawUiMenuItem
									id="reset-everything"
									onSelect={resetEverything}
									label={resetEverythingLabel}
								/>
							</TldrawUiMenuGroup>
						)}
					</TldrawUiMenuContextProvider>
				</_ContextMenu.Content>
			</_ContextMenu.Portal>
		</_ContextMenu.Root>
	)
}
