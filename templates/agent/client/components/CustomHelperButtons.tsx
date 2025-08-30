import { TldrawUiMenuContextProvider } from 'tldraw'
import { GoToAgentButton } from './GoToAgentButton'

function CustomHelperButtonsContent() {
	return (
		<>
			{/* cant import these for some reason? */}
			{/* <ExitPenMode /> */}
			<GoToAgentButton />
			{/* <StopFollowing /> */}
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
