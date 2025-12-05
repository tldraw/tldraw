import {
	TldrawUiDialogBody,
	TldrawUiDialogCloseButton,
	TldrawUiDialogHeader,
	TldrawUiDialogTitle,
	useValue,
} from 'tldraw'
import { FairyAgent } from '../../fairy-agent/FairyAgent'
import { FairyFeedView } from './FairyFeedView'

interface FairyFeedDialogProps {
	orchestratorAgent: FairyAgent | null
	agents: FairyAgent[]
}

export function FairyFeedDialog({ orchestratorAgent, agents }: FairyFeedDialogProps) {
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
