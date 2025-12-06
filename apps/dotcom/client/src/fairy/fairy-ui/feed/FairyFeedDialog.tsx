import {
	TldrawUiDialogBody,
	TldrawUiDialogCloseButton,
	TldrawUiDialogHeader,
	TldrawUiDialogTitle,
	useValue,
} from 'tldraw'
import { FairyAgent } from '../../fairy-agent/FairyAgent'
import { useFairyApp } from '../../fairy-app/FairyAppProvider'
import { FairyFeedView } from './FairyFeedView'

interface FairyFeedDialogProps {
	orchestratorAgent: FairyAgent | null
}

export function FairyFeedDialog({ orchestratorAgent }: FairyFeedDialogProps) {
	const fairyApp = useFairyApp()
	// Get agents reactively from context so the dialog updates when agents change
	const agents = useValue('fairy-agents', () => fairyApp?.agents.getAgents() ?? [], [fairyApp])
	const projectName = useValue(
		'project-name',
		() => {
			if (!orchestratorAgent) return 'Live Chat'

			const project = orchestratorAgent.getProject()
			if (!project) return 'Live Chat'

			const projectName = project.title
			if (!projectName) return 'Live Chat'

			return `#${project.title.toLowerCase().replace(/\s+/g, '_')}`
		},
		[orchestratorAgent]
	)

	return (
		<div className="fairy-feed-dialog">
			<TldrawUiDialogHeader className="fairy-feed-dialog-header">
				<TldrawUiDialogTitle>{projectName}</TldrawUiDialogTitle>
				<TldrawUiDialogCloseButton />
			</TldrawUiDialogHeader>
			<TldrawUiDialogBody className="fairy-feed-dialog-body">
				<FairyFeedView orchestratorAgent={orchestratorAgent} agents={agents} />
			</TldrawUiDialogBody>
		</div>
	)
}
