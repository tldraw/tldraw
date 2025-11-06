import { FairyAgent } from './fairy-agent/agent/FairyAgent'
import { FairyChatHistory } from './fairy-agent/chat/FairyChatHistory'
import { FairyBasicInput } from './fairy-agent/input/FairyBasicInput'
import { SingleFairyPanelHeader } from './FairyPanelHeader'

interface SingleFairyPanelProps {
	agent: FairyAgent
	menuPopoverOpen: boolean
	onMenuPopoverOpenChange(open: boolean): void
	onClickTodoList(): void
	onCancel(): void
}

export function SingleFairyPanel({
	agent,
	menuPopoverOpen,
	onMenuPopoverOpenChange,
	onClickTodoList,
	onCancel,
}: SingleFairyPanelProps) {
	return (
		<>
			<SingleFairyPanelHeader
				agent={agent}
				menuPopoverOpen={menuPopoverOpen}
				onMenuPopoverOpenChange={onMenuPopoverOpenChange}
				onClickTodoList={onClickTodoList}
			/>
			<FairyChatHistory agent={agent} />
			<FairyBasicInput agent={agent} onCancel={onCancel} />
		</>
	)
}
