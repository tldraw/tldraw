import { MouseEvent } from 'react'
import {
	TldrawUiButtonIcon,
	TldrawUiToolbar,
	TldrawUiToolbarToggleGroup,
	TldrawUiToolbarToggleItem,
	useValue,
} from 'tldraw'
import { FairyAgent } from '../../fairy-agent/agent/FairyAgent'
import { FairyReticleSprite } from '../../fairy-sprite/sprites/FairyReticleSprite'
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

function getSidebarEntries(agents: FairyAgent[]): FairySidebarEntry[] {
	const entries: FairySidebarEntry[] = []
	const seenProjectIds = new Set<string>()
	const projectMembers = new Map<string, { projectTitle: string; agents: FairyAgent[] }>()
	const agentProjectLookup = new Map<string, { projectId: string; projectTitle: string } | null>()

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
				(groupAgent) => groupAgent.$fairyEntity.get()?.isSelected ?? false
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
	onTogglePanel(): void
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
	const sidebarEntries = useValue('fairy-sidebar-entries', () => getSidebarEntries(agents), [
		agents,
	])

	const hasAnySelectedFairies = useValue(
		'has-any-selected-fairies',
		() => agents.some((agent) => agent.$fairyEntity.get()?.isSelected ?? false),
		[agents]
	)

	const hasAnyActiveProjects = useValue(
		'has-any-active-projects',
		() => {
			// Check if any selected fairy is part of an active project
			const selectedAgents = agents.filter((agent) => agent.$fairyEntity.get()?.isSelected ?? false)
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
