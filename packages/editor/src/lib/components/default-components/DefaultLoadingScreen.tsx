import { useEditorComponents } from '../../hooks/EditorComponentsContext'

/** @public @react */
export const DefaultLoadingScreen = () => {
	const { Spinner } = useEditorComponents()
	return (
		<div className="tl-loading" aria-busy="true" tabIndex={0}>
			{Spinner ? <Spinner /> : null}
		</div>
	)
}
