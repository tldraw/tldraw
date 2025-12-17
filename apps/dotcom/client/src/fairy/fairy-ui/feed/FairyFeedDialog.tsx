import { ActivityIcon } from '@tldraw/fairy-shared'
import { useState } from 'react'
import {
	TldrawUiButton,
	TldrawUiButtonIcon,
	TldrawUiDialogBody,
	TldrawUiDialogCloseButton,
	TldrawUiDialogHeader,
	TldrawUiDialogTitle,
	TldrawUiTooltip,
} from 'tldraw'
import { FairyAgent } from '../../fairy-agent/FairyAgent'
import { FairyFeedView } from './FairyFeedView'

interface FairyFeedDialogProps {
	orchestratorAgent: FairyAgent | null
	agents: FairyAgent[]
}

export function FairyFeedDialog({ orchestratorAgent, agents }: FairyFeedDialogProps) {
	const [showActivityMonitor, setShowActivityMonitor] = useState(false)

	const title = 'Activity Feed'

	return (
		<div className="fairy-feed-dialog">
			<TldrawUiDialogHeader className="fairy-feed-dialog-header">
				<TldrawUiDialogTitle>{title}</TldrawUiDialogTitle>
				<div className="fairy-feed-dialog-header-actions">
					<TldrawUiTooltip content="Activity Monitor" side="bottom">
						<TldrawUiButton
							type="icon"
							className="fairy-feed-dialog-action-button"
							onClick={() => setShowActivityMonitor(!showActivityMonitor)}
						>
							<TldrawUiButtonIcon icon={<ActivityIcon />} small />
						</TldrawUiButton>
					</TldrawUiTooltip>
					<TldrawUiDialogCloseButton />
				</div>
			</TldrawUiDialogHeader>
			<TldrawUiDialogBody className="fairy-feed-dialog-body">
				<FairyFeedView
					orchestratorAgent={orchestratorAgent}
					agents={agents}
					showActivityMonitor={showActivityMonitor}
				/>
			</TldrawUiDialogBody>
		</div>
	)
}
