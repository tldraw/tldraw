import { ContextMenu as _ContextMenu } from 'radix-ui'
import { MouseEvent, ReactNode } from 'react'
import { TldrawUiButton, TldrawUiButtonIcon, TldrawUiToolbar } from 'tldraw'
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
	newFairyButton: ReactNode
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
	newFairyButton,
}: FairyListSidebarProps) {
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
			<div className="fairy-list-scrollable">
				<TldrawUiToolbar label={toolbarMessage} orientation="vertical">
					{agents.map((agent) => {
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
					})}
				</TldrawUiToolbar>
			</div>
			{/* New Fairy Button - always at the bottom */}
			<div style={{ marginTop: '4px' }}>{newFairyButton}</div>
		</div>
	)
}
