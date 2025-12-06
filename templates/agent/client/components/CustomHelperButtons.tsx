import {
	DefaultHelperButtons,
	DefaultHelperButtonsContent,
	TldrawUiMenuContextProvider,
} from 'tldraw'
import { TldrawAgent } from '../agent/TldrawAgent'
import { GoToAgentButton } from './GoToAgentButton'

export function CustomHelperButtons({ agent }: { agent: TldrawAgent }) {
	return (
		<DefaultHelperButtons>
			<TldrawUiMenuContextProvider type="helper-buttons" sourceId="helper-buttons">
				<DefaultHelperButtonsContent />
				<GoToAgentButton agent={agent} />
			</TldrawUiMenuContextProvider>
		</DefaultHelperButtons>
	)
}
