import { LoadingScreen as LoadingScreenContainer, useEditorComponents } from '@tldraw/editor'

/** @public @react */
export const LoadingScreen = () => {
	const { Spinner } = useEditorComponents()
	return <LoadingScreenContainer>{Spinner ? <Spinner /> : null}</LoadingScreenContainer>
}
