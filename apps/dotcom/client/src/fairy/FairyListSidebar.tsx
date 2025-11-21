import { ContextMenu as _ContextMenu } from 'radix-ui'
import { MouseEvent, ReactNode } from 'react'
import { TldrawUiButton, TldrawUiButtonIcon, TldrawUiToolbar, useValue } from 'tldraw'
import { MAX_FAIRY_COUNT } from '../tla/components/TlaEditor/TlaEditor'
import { FairyAgent } from './fairy-agent/agent/FairyAgent'
import { FairySidebarButton } from './FairySidebarButton'
import { FairyTaskListContextMenuContent } from './FairyTaskListContextMenuContent'

type FairySidebarEntry =
	| {
			type: 'group'
			projectId: string
			projectTitle: string
			agents: FairyAgent[]
			isActive: boolean
	  }
	| { type: 'single'; agent: FairyAgent }

export function getSidebarEntries(agents: FairyAgent[]): FairySidebarEntry[] {
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
	panelState: 'task-list' | 'fairy' | 'cant-chat' | 'closed'
	toolbarMessage: string
	selectMessage: string
	deselectMessage: string
	onClickFairy(agent: FairyAgent, event: MouseEvent): void
	onDoubleClickFairy(agent: FairyAgent): void
	onTogglePanel(): void
	renderNewFairyButton(disabled: boolean): ReactNode
}

export function FairyListSidebar({
	agents,
	panelState,
	toolbarMessage,
	selectMessage,
	deselectMessage,
	onClickFairy,
	onDoubleClickFairy,
	onTogglePanel,
	renderNewFairyButton,
}: FairyListSidebarProps) {
	const sidebarEntries = useValue('fairy-sidebar-entries', () => getSidebarEntries(agents), [
		agents,
	])

	const renderFairySidebarButton = (agent: FairyAgent) => (
		<FairySidebarButton
			key={agent.id}
			agent={agent}
			onClick={(e) => onClickFairy(agent, e)}
			onDoubleClick={() => onDoubleClickFairy(agent)}
			selectMessage={selectMessage}
			deselectMessage={deselectMessage}
		/>
	)

	return (
		<>
			<div className="fairy-toolbar-header">
				<_ContextMenu.Root dir="ltr">
					<_ContextMenu.Trigger asChild>
						<TldrawUiButton type="icon" className="fairy-toolbar-button" onClick={onTogglePanel}>
							<TldrawUiButtonIcon
								icon={panelState !== 'closed' ? 'chevron-right' : 'chevron-left'}
							/>
						</TldrawUiButton>
					</_ContextMenu.Trigger>
					<FairyTaskListContextMenuContent agents={agents} />
				</_ContextMenu.Root>
			</div>
			<div className="fairy-list">
				<TldrawUiToolbar label={toolbarMessage} orientation="vertical">
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
								</div>
							)
						}

						return renderFairySidebarButton(entry.agent)
					})}
					{Array.from({ length: MAX_FAIRY_COUNT - agents.length }).map((_, i) => (
						<div key={`placeholder-${i}`}>{renderNewFairyButton(i > 0)}</div>
					))}
				</TldrawUiToolbar>
			</div>
		</>
	)
}
