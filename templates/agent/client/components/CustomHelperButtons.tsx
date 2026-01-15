import {
	DefaultHelperButtons,
	DefaultHelperButtonsContent,
	TldrawUiMenuContextProvider,
} from 'tldraw'
import { GoToAgentButton } from './GoToAgentButton'

export function CustomHelperButtons() {
	return (
		<DefaultHelperButtons>
			<TldrawUiMenuContextProvider type="helper-buttons" sourceId="helper-buttons">
				<DefaultHelperButtonsContent />
				<GoToAgentButton />
			</TldrawUiMenuContextProvider>
		</DefaultHelperButtons>
	)
}
