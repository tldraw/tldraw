import { LoadingScreen } from '../../TldrawEditor'
import { useEditorComponents } from '../../hooks/EditorComponentsContext'

/** @public @react */
export const DefaultLoadingScreen = () => {
	const { Spinner } = useEditorComponents()
	return <LoadingScreen>{Spinner ? <Spinner /> : null}</LoadingScreen>
}
