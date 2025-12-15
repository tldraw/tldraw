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
	useValue,
} from 'tldraw'
import { FairyAgent } from '../../fairy-agent/FairyAgent'
import { FairyFeedView } from './FairyFeedView'

interface FairyFeedDialogProps {
	orchestratorAgent: FairyAgent | null
	agents: FairyAgent[]
}

export function FairyFeedDialog({ orchestratorAgent, agents }: FairyFeedDialogProps) {
	const [showActivityMonitor, setShowActivityMonitor] = useState(false)

	const projectName = useValue(
		'project-name',
		() => {
			if (!orchestratorAgent) return 'Live feed'

			const project = orchestratorAgent.getProject(true) // Include soft-deleted projects
			if (!project) return 'Live feed'

			const projectName = project.title
			if (!projectName) return 'Live feed'

			return `#${project.title.toLowerCase().replace(/\s+/g, '_')}`
		},
		[orchestratorAgent]
	)

	return (
		<div className="fairy-feed-dialog">
			<TldrawUiDialogHeader className="fairy-feed-dialog-header">
				<TldrawUiDialogTitle>{projectName}</TldrawUiDialogTitle>
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
