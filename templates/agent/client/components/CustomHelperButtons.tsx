import {
	DefaultHelperButtons,
	DefaultHelperButtonsContent,
	TldrawUiMenuContextProvider,
} from 'tldraw'
import { GoToAgentButton } from './GoToAgentButton'

export function CustomHelperButtons({ agentId }: { agentId: string }) {
	return (
		<DefaultHelperButtons>
			<TldrawUiMenuContextProvider type="helper-buttons" sourceId="helper-buttons">
				<DefaultHelperButtonsContent />
				<GoToAgentButton agentId={agentId} />
			</TldrawUiMenuContextProvider>
		</DefaultHelperButtons>
	)
}
