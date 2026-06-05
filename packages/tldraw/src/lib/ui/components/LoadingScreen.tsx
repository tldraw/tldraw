import { LoadingScreen as LoadingScreenContainer, useEditorComponents } from '@tldraw/editor'

/** @public @react */
export function LoadingScreen() {
	const { Spinner } = useEditorComponents()
	return <LoadingScreenContainer>{Spinner ? <Spinner /> : null}</LoadingScreenContainer>
}
