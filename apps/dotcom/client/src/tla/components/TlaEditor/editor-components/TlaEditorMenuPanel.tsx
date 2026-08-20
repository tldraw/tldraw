import { useParams } from 'react-router-dom'
import { useMaybeApp } from '../../../hooks/useAppState'
import { TlaEditorTopLeftPanel } from '../TlaEditorTopLeftPanel'

export function TlaEditorMenuPanel() {
	const app = useMaybeApp()
	// Legacy routes (/r, /ro, /v, /s) have no fileSlug, so the signed-in file menu would build
	// file URLs and download requests from an undefined file id.
	const { fileSlug } = useParams<{ fileSlug: string }>()
	return <TlaEditorTopLeftPanel isAnonUser={!app || !fileSlug} />
}
