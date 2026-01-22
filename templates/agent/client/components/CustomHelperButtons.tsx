import {
	DefaultHelperButtons,
	DefaultHelperButtonsContent,
	TldrawUiMenuContextProvider,
} from 'tldraw'
import { GoToAgentButtons } from './GoToAgentButton'

export function CustomHelperButtons() {
	return (
		<DefaultHelperButtons>
			<TldrawUiMenuContextProvider type="helper-buttons" sourceId="helper-buttons">
				<DefaultHelperButtonsContent />
				<GoToAgentButtons />
			</TldrawUiMenuContextProvider>
		</DefaultHelperButtons>
	)
}
