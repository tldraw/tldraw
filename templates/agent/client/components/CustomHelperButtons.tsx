import { DefaultHelperButtonsContent, TldrawUiMenuContextProvider } from 'tldraw'
import { GoToAgentButton } from './GoToAgentButton'

function CustomHelperButtonsContent() {
	return (
		<>
			<DefaultHelperButtonsContent />
			<GoToAgentButton />
		</>
	)
}

export function CustomHelperButtons({ children }: { children?: React.ReactNode }) {
	const content = children ?? <CustomHelperButtonsContent />
	return (
		<div className="tlui-helper-buttons">
			<TldrawUiMenuContextProvider type="helper-buttons" sourceId="helper-buttons">
				{content}
			</TldrawUiMenuContextProvider>
		</div>
	)
}
