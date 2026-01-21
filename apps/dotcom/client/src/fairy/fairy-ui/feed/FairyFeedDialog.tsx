import {
	TldrawUiDialogBody,
	TldrawUiDialogCloseButton,
	TldrawUiDialogHeader,
	TldrawUiDialogTitle,
} from 'tldraw'
import { FairyAgent } from '../../fairy-agent/FairyAgent'
import { FairyFeedView } from './FairyFeedView'

interface FairyFeedDialogProps {
	orchestratorAgent: FairyAgent | null
	agents: FairyAgent[]
}

export function FairyFeedDialog({ orchestratorAgent, agents }: FairyFeedDialogProps) {
	const title = 'Live Feed'

	return (
		<div className="fairy-feed-dialog">
			<TldrawUiDialogHeader className="fairy-feed-dialog-header">
				<TldrawUiDialogTitle>{title}</TldrawUiDialogTitle>
				<div className="fairy-feed-dialog-header-actions">
					<TldrawUiDialogCloseButton />
				</div>
			</TldrawUiDialogHeader>
			<TldrawUiDialogBody className="fairy-feed-dialog-body">
				<FairyFeedView orchestratorAgent={orchestratorAgent} agents={agents} />
			</TldrawUiDialogBody>
		</div>
	)
}
