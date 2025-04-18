import { LoadingScreen as LoadingScreenContainer, useEditorComponents } from '@tldraw/editor'
import { TldrawUiContextProvider } from '../context/TldrawUiContextProvider'

/** @public @react */
export const LoadingScreen = () => {
	const { Spinner } = useEditorComponents()
	return (
		<TldrawUiContextProvider>
			<LoadingScreenContainer>{Spinner ? <Spinner /> : null}</LoadingScreenContainer>
		</TldrawUiContextProvider>
	)
}
