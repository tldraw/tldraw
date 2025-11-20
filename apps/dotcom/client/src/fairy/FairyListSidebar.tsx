import { ContextMenu as _ContextMenu } from 'radix-ui'
import { MouseEvent } from 'react'
import { TldrawUiButton, TldrawUiButtonIcon, TldrawUiIcon, TldrawUiToolbar } from 'tldraw'
import { MAX_FAIRY_COUNT } from '../tla/components/TlaEditor/TlaEditor'
import { FairyAgent } from './fairy-agent/agent/FairyAgent'
import { FairySidebarButton } from './FairySidebarButton'
import { FairyTaskListContextMenuContent } from './FairyTaskListContextMenuContent'

interface FairyListSidebarProps {
	agents: FairyAgent[]
	panelState: 'task-list' | 'fairy' | 'closed'
	toolbarMessage: string
	selectMessage: string
	deselectMessage: string
	onClickFairy(agent: FairyAgent, event: MouseEvent): void
	onDoubleClickFairy(agent: FairyAgent): void
	onTogglePanel(): void
	onCreateFairy(): void
	newFairyLabel: string
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
	onCreateFairy,
	newFairyLabel,
}: FairyListSidebarProps) {
	const slots = Array.from({ length: MAX_FAIRY_COUNT }, (_, index) => {
		return agents[index] || null
	})

	const nextAvailableSlot = agents.length < MAX_FAIRY_COUNT ? agents.length : -1

	return (
		<div className="fairy-buttons-container">
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
			<TldrawUiToolbar label={toolbarMessage} orientation="vertical">
				{slots.map((agent, index) => {
					if (agent) {
						return (
							<FairySidebarButton
								key={agent.id}
								agent={agent}
								onClick={(e) => onClickFairy(agent, e)}
								onDoubleClick={() => onDoubleClickFairy(agent)}
								selectMessage={selectMessage}
								deselectMessage={deselectMessage}
							/>
						)
					}

					const isNextAvailable = index === nextAvailableSlot
					return (
						<TldrawUiButton
							key={`empty-slot-${index}`}
							type="icon"
							className="fairy-toolbar-sidebar-button"
							onClick={isNextAvailable ? onCreateFairy : undefined}
							disabled={!isNextAvailable}
						>
							<TldrawUiIcon icon="plus" label={newFairyLabel} />
						</TldrawUiButton>
					)
				})}
			</TldrawUiToolbar>
		</div>
	)
}
