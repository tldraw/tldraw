import { useMaybeApp } from '../../../hooks/useAppState'
import { TlaEditorTopRightPanel } from '../TlaEditorTopRightPanel'

export function TlaEditorPublishedSharePanel() {
	const app = useMaybeApp()
	return <TlaEditorTopRightPanel isAnonUser={!app} context="published-file" />
}
