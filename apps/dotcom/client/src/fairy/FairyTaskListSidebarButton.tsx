import { ContextMenu as _ContextMenu } from 'radix-ui'
import { TldrawUiButton, TldrawUiIcon } from 'tldraw'
import { useMsg } from '../tla/utils/i18n'
import { FairyAgent } from './fairy-agent/agent/FairyAgent'
import { fairyMessages } from './fairy-messages'
import { FairyTaskListContextMenuContent } from './FairyTaskListContextMenuContent'

export function FairyTaskListSidebarButton({
	onClick,
	hasUnreadTasks,
	agents,
}: {
	onClick(): void
	hasUnreadTasks: boolean
	agents: FairyAgent[]
}) {
	const taskListLabel = useMsg(fairyMessages.taskList)

	return (
		<div style={{ position: 'relative' }}>
			<_ContextMenu.Root dir="ltr">
				<_ContextMenu.Trigger asChild>
					<TldrawUiButton type="icon" className="fairy-toolbar-sidebar-button" onClick={onClick}>
						<TldrawUiIcon icon="clipboard-copied" label={taskListLabel} />
					</TldrawUiButton>
				</_ContextMenu.Trigger>
				<FairyTaskListContextMenuContent agents={agents} />
			</_ContextMenu.Root>
			{hasUnreadTasks && <div className="fairy-todo-unread-indicator" />}
		</div>
	)
}
