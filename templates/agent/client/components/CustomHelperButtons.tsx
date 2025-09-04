import {
	DefaultHelperButtons,
	DefaultHelperButtonsContent,
	TldrawUiMenuContextProvider,
	useEditor,
	useValue,
} from 'tldraw'
import { $agentsAtom } from '../agent/agentsAtom'
import { GoToAgentButton } from './GoToAgentButton'

export function CustomHelperButtons() {
	const editor = useEditor()
	const agents = useValue('agents', () => $agentsAtom.get(editor), [editor])
	return (
		<DefaultHelperButtons>
			<TldrawUiMenuContextProvider type="helper-buttons" sourceId="helper-buttons">
				<DefaultHelperButtonsContent />
				{agents.map((agent) => (
					<GoToAgentButton key={agent.id} agent={agent} />
				))}
			</TldrawUiMenuContextProvider>
		</DefaultHelperButtons>
	)
}
