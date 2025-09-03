import {
	DefaultHelperButtons,
	DefaultHelperButtonsContent,
	TldrawUiMenuContextProvider,
	useEditor,
} from 'tldraw'
import { useTldrawAgent } from '../agent/useTldrawAgent'
import { AGENT_ID } from '../App'
import { GoToAgentButton } from './GoToAgentButton'

export function CustomHelperButtons() {
	const editor = useEditor()
	const agent = useTldrawAgent(editor, AGENT_ID)
	return (
		<DefaultHelperButtons>
			<TldrawUiMenuContextProvider type="helper-buttons" sourceId="helper-buttons">
				<DefaultHelperButtonsContent />
				{agent && <GoToAgentButton agent={agent} />}
			</TldrawUiMenuContextProvider>
		</DefaultHelperButtons>
	)
}
