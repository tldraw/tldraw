import { F } from '../tla/utils/i18n'
import { FairyAgent } from './fairy-agent/agent/FairyAgent'
import { FairyGroupChat } from './FairyGroupChat'
import { FairyPanelHeader } from './FairyPanelHeader'

interface GroupChatPanelProps {
	selectedFairies: FairyAgent[]
	agents: FairyAgent[]
	menuPopoverOpen: boolean
	onMenuPopoverOpenChange(open: boolean): void
	onClickTodoList(): void
}

export function GroupChatPanel({
	selectedFairies,
	agents,
	menuPopoverOpen,
	onMenuPopoverOpenChange,
	onClickTodoList,
}: GroupChatPanelProps) {
	return (
		<>
			<FairyPanelHeader
				agents={agents}
				menuPopoverOpen={menuPopoverOpen}
				onMenuPopoverOpenChange={onMenuPopoverOpenChange}
				onClickTodoList={onClickTodoList}
			>
				<div className="fairy-id-display">
					<F defaultMessage="Group chat" />
				</div>
			</FairyPanelHeader>
			<FairyGroupChat agents={selectedFairies} />
		</>
	)
}
